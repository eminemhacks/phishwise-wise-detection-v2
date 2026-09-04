/**
 * Message / email analyzer.
 *
 * Fires the phrase-based message rules (urgency, credential solicitation,
 * reward bait, generic greeting, plus the Nigeria-local vishing / smishing
 * rules), then extracts every URL in the text and runs each through the URL
 * analyzer. The single worst embedded link is folded back into the message
 * score as a transparent, dynamically-weighted signal so nothing is hidden and
 * nothing is double-counted.
 */

import { MessageAnalysis, TriggeredSignal, UrlAnalysis, VERDICT_ORDER } from './types';
import { analyzeUrl, extractUrls } from './url-analyzer';
import { buildRelatedLessons } from './signals/catalog';
import {
  CREDENTIAL_PHRASES,
  GENERIC_GREETINGS,
  MESSAGE_SIGNALS,
  REWARD_PHRASES,
  SMISHING_PHRASES,
  URGENCY_PHRASES,
  VISHING_PHRASES,
} from './signals/message-signals';

const SIG = new Map(MESSAGE_SIGNALS.map((s) => [s.id, s]));

function fire(id: string, detail?: string, weightOverride?: number): TriggeredSignal | null {
  const def = SIG.get(id);
  if (!def) return null;
  return {
    id: def.id,
    label: def.label,
    explanation: def.explanation,
    weight: weightOverride ?? def.weight,
    category: def.category,
    detail,
  };
}

/**
 * Match a phrase against the (already-lowercased) text with alphanumeric word
 * boundaries, so short tokens like "pin"/"otp"/"nin" don't fire inside larger
 * words (e.g. "sho[ppin]g", "mor[nin]g"). Boundaries are only enforced on an
 * edge when that edge character is alphanumeric, so currency phrases such as
 * "earn \u20a6" still match "earn \u20a650,000".
 */
function phraseMatches(hay: string, phrase: string): boolean {
  const p = phrase.toLowerCase();
  if (!p) return false;
  const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lead = /[a-z0-9]/.test(p[0]) ? '(?<![a-z0-9])' : '';
  const trail = /[a-z0-9]/.test(p[p.length - 1]) ? '(?![a-z0-9])' : '';
  return new RegExp(lead + esc + trail).test(hay);
}

/** First matching phrase from a bank, or null. */
function firstHit(haystack: string, phrases: string[]): string | null {
  for (const p of phrases) if (phraseMatches(haystack, p)) return p;
  return null;
}

/** Simple formatting-anomaly heuristic (shouting / punctuation spam). */
function hasFormattingAnomaly(original: string): boolean {
  const capsWords = (original.match(/\b[A-Z]{4,}\b/g) || []).length;
  const bangs = (original.match(/!/g) || []).length;
  const spacedOut = /(?:[A-Za-z]\s){4,}[A-Za-z]/.test(original); // "V E R I F Y"
  return capsWords >= 3 || bangs >= 3 || spacedOut;
}

/** Dynamic weight contributed by the single worst embedded link. */
function embeddedUrlWeight(worst: UrlAnalysis | null): number {
  if (!worst) return 0;
  switch (worst.verdict) {
    case 'Dangerous':
      return 35;
    case 'Likely Phishing':
      return 25;
    case 'Suspicious':
      return 12;
    default:
      return 0;
  }
}

export function analyzeMessage(rawInput: string): MessageAnalysis {
  const input = (rawInput || '').trim();
  const hay = input.toLowerCase();
  const signals: TriggeredSignal[] = [];
  const add = (s: TriggeredSignal | null) => {
    if (s) signals.push(s);
  };

  // ── Phrase-based rules ──────────────────────────────────────────
  const cred = firstHit(hay, CREDENTIAL_PHRASES);
  if (cred) add(fire('msg-credential-solicitation', `mentions \u201c${cred}\u201d`));

  const vish = firstHit(hay, VISHING_PHRASES);
  if (vish) add(fire('msg-vishing', `phone-call cue: \u201c${vish}\u201d`));

  const smish = firstHit(hay, SMISHING_PHRASES);
  if (smish) add(fire('msg-smishing', `alert/job cue: \u201c${smish}\u201d`));

  const reward = firstHit(hay, REWARD_PHRASES);
  if (reward) add(fire('msg-reward-bait', `prize/bait cue: \u201c${reward}\u201d`));

  const urgent = firstHit(hay, URGENCY_PHRASES);
  if (urgent) add(fire('msg-urgency', `pressure phrase: \u201c${urgent}\u201d`));

  const greet = firstHit(hay, GENERIC_GREETINGS);
  if (greet) add(fire('msg-generic-greeting', `opens with \u201c${greet}\u201d`));

  if (hasFormattingAnomaly(input)) add(fire('msg-formatting-anomaly'));

  // ── Embedded URLs ───────────────────────────────────────────────
  const urls = extractUrls(input);
  const extractedUrls: UrlAnalysis[] = urls.map((u) => analyzeUrl(u));

  let worst: UrlAnalysis | null = null;
  for (const r of extractedUrls) {
    if (!worst || VERDICT_ORDER.indexOf(r.verdict) > VERDICT_ORDER.indexOf(worst.verdict)) {
      worst = r;
    }
  }
  const embWeight = embeddedUrlWeight(worst);
  if (worst && embWeight > 0) {
    add(fire('msg-embedded-bad-url', `worst link \u201c${worst.input}\u201d rated ${worst.verdict}`, embWeight));
  }

  // ── Score & bundle ──────────────────────────────────────────────
  const raw = signals.reduce((sum, s) => sum + (s.weight || 0), 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  let verdict = VERDICT_ORDER[0];
  if (score >= 75) verdict = 'Dangerous';
  else if (score >= 50) verdict = 'Likely Phishing';
  else if (score >= 25) verdict = 'Suspicious';

  // Related lessons pull from message signals AND any embedded-URL signals.
  const lessonSourceSignals = [...signals, ...extractedUrls.flatMap((u) => u.signals)];

  return {
    inputType: 'message',
    input,
    score,
    verdict,
    signals,
    extractedUrls,
    relatedLessons: buildRelatedLessons(lessonSourceSignals, verdict),
  };
}
