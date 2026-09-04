import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scan } from './scan.entity';
import { ProgressService } from '../progress/progress.service';
import { SafeBrowsingService } from './safe-browsing.service';
import { ReportedBlocklistService } from './reported-blocklist.service';
import { analyze } from './detection.engine';
import {
  InputType,
  ScanResult,
  TriggeredSignal,
  Verdict,
  VERDICT_ORDER,
} from './types';
import { verdictForScore, clampScore } from './scoring';
import { ALL_SIGNALS } from './signals/catalog';
import { URL_SIGNALS } from './signals/url-signals';
import { MESSAGE_SIGNALS } from './signals/message-signals';
import { normalizeForHash } from './normalize';

const THREAT_VERDICTS: Verdict[] = ['Likely Phishing', 'Dangerous'];
const isThreatVerdict = (v: string) => THREAT_VERDICTS.includes(v as Verdict);

// simple in-memory rate limiter: 10 scans/min per user
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateMap = new Map<string, number[]>();

function checkRateLimit(userId: string) {
  const now = Date.now();
  const arr = rateMap.get(userId) || [];
  const windowed = arr.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (windowed.length >= RATE_LIMIT_MAX) {
    throw new HttpException('Too many scans — please wait a minute.', HttpStatus.TOO_MANY_REQUESTS);
  }
  windowed.push(now);
  rateMap.set(userId, windowed);
}

@Injectable()
export class DetectionService {
  constructor(
    @InjectRepository(Scan) private readonly scans: Repository<Scan>,
    private readonly progress: ProgressService,
    private readonly safeBrowsing: SafeBrowsingService,
    private readonly reported: ReportedBlocklistService,
  ) {}

  /**
   * Run the rule engine, then (only if the optional Safe Browsing enrichment is
   * enabled) fold a positive Safe Browsing match in as an extra signal. Also
   * enrich with community-reported blocklist (weight 35) if the artefact was
   * previously flagged by the community. The engine result is always valid on
   * its own; enrichments can only add.
   */
  private async runEngine(input: string, inputType: InputType): Promise<ScanResult> {
    const result = analyze(input, inputType);

    // Enrich with community-reported blocklist (after engine)
    const norm = normalizeForHash(input, inputType);
    if (inputType === 'url') {
      const reg = (norm as any).regDomain as string | null;
      if (reg && this.reported.hasUrlDomain(reg)) {
        // avoid double-counting if already has url-known-phishing-host or url-user-reported
        const has = result.signals.some((s) => s.id === 'url-user-reported' || s.id === 'url-known-phishing-host');
        if (!has) {
          result.signals.push({
            id: 'url-user-reported',
            label: 'Previously reported by the community',
            explanation: `This domain (${reg}) was previously scanned by the community and flagged as phishing.`,
            weight: 35,
            category: 'brand-impersonation',
            detail: `community report for ${reg}`,
          });
          result.score = clampScore(result.signals.reduce((s, x) => s + (x.weight || 0), 0));
          result.verdict = verdictForScore(result.score);
        }
      }
      // also check static? already done in url-analyzer, no need
    } else {
      // message
      if (this.reported.hasMessageHash(norm.hash)) {
        const has = result.signals.some((s) => s.id === 'msg-user-reported');
        if (!has) {
          result.signals.push({
            id: 'msg-user-reported',
            label: 'Previously reported phishing message',
            explanation: 'This exact message was previously scanned by the community and flagged as phishing.',
            weight: 35,
            category: 'smishing',
            detail: `community report ${norm.hash.slice(0, 8)}…`,
          });
          result.score = clampScore(result.signals.reduce((s, x) => s + (x.weight || 0), 0));
          // verdict recompute
          let v: Verdict = 'Safe';
          if (result.score >= 75) v = 'Dangerous';
          else if (result.score >= 50) v = 'Likely Phishing';
          else if (result.score >= 25) v = 'Suspicious';
          result.verdict = v;
        }
      }
    }

    if (result.inputType === 'url' && this.safeBrowsing.enabled && result.normalized) {
      const gsb = await this.safeBrowsing.check(result.normalized);
      if (gsb?.listed) {
        const sig: TriggeredSignal = {
          id: 'gsb-match',
          label: 'Flagged by Google Safe Browsing',
          explanation:
            'Google Safe Browsing lists this URL as a known threat. This is an optional online check layered on top of the offline rules.',
          weight: 45,
          category: 'social-engineering',
          detail: gsb.threatTypes.join(', ') || undefined,
        };
        result.signals.push(sig);
        result.score = clampScore(
          result.signals.reduce((s, x) => s + (x.weight || 0), 0),
        );
        result.verdict = verdictForScore(result.score);
      }
    }
    return result;
  }

  /** Public "Try it" scan — analysed and returned, but NEVER saved. */
  async scanPublic(input: string, inputType: InputType) {
    const result = await this.runEngine(input, inputType);
    return { result, saved: false };
  }

  /** Authenticated scan — saved, and rewarded via the gamification engine. */
  async scanForUser(userId: string, input: string, inputType: InputType) {
    checkRateLimit(userId);

    const { hash, normalized, regDomain } = normalizeForHash(input, inputType) as any;
    // Dedup check: same user + same normalized hash
    const existing = await this.scans.findOne({ where: { userId, inputHash: hash } });
    if (existing) {
      // No XP, no new report, return existing scan with duplicate flag
      return {
        scan: this.toDetail(existing),
        saved: true,
        awardedXp: 0,
        newBadges: [],
        progress: null,
        isDuplicate: true,
        duplicateOf: existing.id,
        message: 'Already scanned — no extra XP. See your previous result.',
      };
    }

    const result = await this.runEngine(input, inputType);
    const threat = isThreatVerdict(result.verdict);

    const saved = await this.scans.save(
      this.scans.create({
        userId,
        inputType,
        input,
        inputHash: hash,
        score: result.score,
        verdict: result.verdict,
        threat,
        result,
      }),
    );

    // Community blocklist enrichment for future scans (only threats)
    if (threat) {
      try {
        if (inputType === 'url' && regDomain) {
          await this.reported.addUrl(regDomain, input, hash, result.verdict);
        } else if (inputType === 'message') {
          await this.reported.addMessage(hash, input.slice(0, 300), result.verdict);
        }
      } catch (e) {
        // non-fatal: log but don't fail scan
        console.warn('Failed to add to reported blocklist', e);
      }
    }

    // Up-to-date totals feed the shared badge engine.
    const [scanCount, threatsCaught] = await Promise.all([
      this.scans.count({ where: { userId } }),
      this.scans.count({ where: { userId, threat: true } }),
    ]);

    const reward = await this.progress.applyScan(userId, {
      isThreat: threat,
      scanCount,
      threatsCaught,
    });

    return {
      scan: this.toDetail(saved),
      saved: true,
      awardedXp: reward.awardedXp,
      newBadges: reward.newBadges,
      progress: reward.progress,
      isDuplicate: false,
    };
  }

  /** A user's scan history (newest first, list shape). */
  async history(userId: string) {
    const rows = await this.scans.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => this.toListItem(r));
  }

  async getScan(userId: string, id: string) {
    const row = await this.scans.findOne({ where: { id, userId } });
    if (!row) throw new NotFoundException('Scan not found.');
    return this.toDetail(row);
  }

  async deleteScan(userId: string, id: string) {
    const res = await this.scans.delete({ id, userId });
    if (!res.affected) throw new NotFoundException('Scan not found.');
    return { id, deleted: true };
  }

  /** Per-user detection stats (for the dashboard / achievements widgets). */
  async myStats(userId: string) {
    const rows = await this.scans.find({ where: { userId } });
    return this.aggregate(rows);
  }

  /** Platform-wide detection analytics for the admin console. */
  async adminStats() {
    const rows = await this.scans.find();
    const base = this.aggregate(rows);
    const reported = await this.reported.counts();
    return {
      ...base,
      inputTypes: {
        url: rows.filter((r) => r.inputType === 'url').length,
        message: rows.filter((r) => r.inputType === 'message').length,
      },
      communityBlocklist: reported,
    };
  }

  /** Read-only rule catalog (for the admin "how detection works" view). */
  ruleCatalog() {
    const shape = (s: (typeof ALL_SIGNALS)[number]) => ({
      id: s.id,
      label: s.label,
      explanation: s.explanation,
      weight: s.weight,
      category: s.category,
      lessons: s.lessons,
    });
    return {
      bands: [
        { verdict: 'Safe', range: '0–24' },
        { verdict: 'Suspicious', range: '25–49' },
        { verdict: 'Likely Phishing', range: '50–74' },
        { verdict: 'Dangerous', range: '75–100' },
      ],
      url: URL_SIGNALS.map(shape),
      message: MESSAGE_SIGNALS.map(shape),
      total: ALL_SIGNALS.length,
    };
  }

  // ── helpers ────────────────────────────────────────────
  private aggregate(rows: Scan[]) {
    const verdictCounts: Record<Verdict, number> = {
      Safe: 0,
      Suspicious: 0,
      'Likely Phishing': 0,
      Dangerous: 0,
    };
    const signalCounts = new Map<string, { label: string; count: number }>();

    for (const r of rows) {
      if (verdictCounts[r.verdict as Verdict] != null) {
        verdictCounts[r.verdict as Verdict]++;
      }
      const res = r.result as ScanResult;
      const sigs = res?.signals ?? [];
      for (const s of sigs) {
        const entry = signalCounts.get(s.id) ?? { label: s.label, count: 0 };
        entry.count++;
        signalCounts.set(s.id, entry);
      }
    }

    const topSignals = [...signalCounts.entries()]
      .map(([id, v]) => ({ id, label: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      totalScans: rows.length,
      threatsCaught: rows.filter((r) => r.threat).length,
      verdictCounts,
      verdictDistribution: VERDICT_ORDER.map((v) => ({
        verdict: v,
        count: verdictCounts[v],
      })),
      topSignals,
    };
  }

  private toListItem(r: Scan) {
    return {
      id: r.id,
      inputType: r.inputType,
      preview: r.input.length > 90 ? r.input.slice(0, 90) + '…' : r.input,
      score: r.score,
      verdict: r.verdict,
      threat: r.threat,
      createdAt: r.createdAt.toISOString(),
    };
  }

  private toDetail(r: Scan) {
    return {
      id: r.id,
      inputType: r.inputType,
      input: r.input,
      score: r.score,
      verdict: r.verdict,
      threat: r.threat,
      result: r.result,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
