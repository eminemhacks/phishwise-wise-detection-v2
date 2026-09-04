import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportedPhishingUrl, ReportedPhishingMessage } from './reported-phishing.entity';

/**
 * In-memory cache for community-reported phishing (derived from threat scans).
 * Separate from the static 176k PHISHING_BLOCKLIST Set.
 * - URLs: keyed by registrable domain (unique)
 * - Messages: keyed by normalized sha256 hash
 */
@Injectable()
export class ReportedBlocklistService implements OnModuleInit {
  private urlDomains = new Set<string>();
  private msgHashes = new Set<string>();

  constructor(
    @InjectRepository(ReportedPhishingUrl)
    private readonly urls: Repository<ReportedPhishingUrl>,
    @InjectRepository(ReportedPhishingMessage)
    private readonly msgs: Repository<ReportedPhishingMessage>,
  ) {}

  async onModuleInit() {
    await this.refresh();
  }

  async refresh() {
    const [urlRows, msgRows] = await Promise.all([
      this.urls.find({ select: ['regDomain'] }),
      this.msgs.find({ select: ['msgHash'] }),
    ]);
    this.urlDomains = new Set(urlRows.map((r) => r.regDomain));
    this.msgHashes = new Set(msgRows.map((r) => r.msgHash));
  }

  hasUrlDomain(regDomain: string): boolean {
    return this.urlDomains.has(regDomain.toLowerCase());
  }

  hasMessageHash(hash: string): boolean {
    return this.msgHashes.has(hash);
  }

  /** Add URL domain to community blocklist (only if threat). Returns true if newly added. */
  async addUrl(regDomain: string, exampleUrl: string, exampleHash: string, verdict: string): Promise<boolean> {
    const lower = regDomain.toLowerCase();
    if (this.urlDomains.has(lower)) {
      // bump report_count
      await this.urls.increment({ regDomain: lower }, 'reportCount', 1);
      await this.urls.update({ regDomain: lower }, { lastReportedAt: new Date() } as any);
      return false;
    }
    try {
      await this.urls.save(
        this.urls.create({
          regDomain: lower,
          exampleUrl,
          exampleHash,
          firstVerdict: verdict,
          reportCount: 1,
        }),
      );
      this.urlDomains.add(lower);
      return true;
    } catch (e: any) {
      // unique violation under race — treat as existing
      if (e?.code === '23505') {
        this.urlDomains.add(lower);
        return false;
      }
      throw e;
    }
  }

  async addMessage(msgHash: string, preview: string, verdict: string): Promise<boolean> {
    const lower = msgHash.toLowerCase();
    if (this.msgHashes.has(lower)) {
      await this.msgs.increment({ msgHash: lower }, 'reportCount', 1);
      await this.msgs.update({ msgHash: lower }, { lastReportedAt: new Date() } as any);
      return false;
    }
    try {
      await this.msgs.save(
        this.msgs.create({
          msgHash: lower,
          preview: preview.slice(0, 300),
          firstVerdict: verdict,
          reportCount: 1,
        }),
      );
      this.msgHashes.add(lower);
      return true;
    } catch (e: any) {
      if (e?.code === '23505') {
        this.msgHashes.add(lower);
        return false;
      }
      throw e;
    }
  }

  // For admin stats
  async counts(): Promise<{ urls: number; messages: number }> {
    const [u, m] = await Promise.all([this.urls.count(), this.msgs.count()]);
    return { urls: u, messages: m };
  }
}
