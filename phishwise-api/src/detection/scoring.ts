/**
 * Scoring & verdict banding.
 *
 * The model is intentionally the simplest thing that is fully defensible: the
 * risk score is the sum of the weights of every rule that fired, capped at 100.
 * There is no hidden maths \u2014 a user (or an examiner) can add the weights in the
 * itemised list by hand and arrive at exactly the number shown.
 *
 *   score   = min(100, \u03a3 weight of triggered signals)
 *   verdict = band the score falls into
 *
 * Bands are tuned (together with the weights in the catalogs) so that a single
 * strong indicator (e.g. a look-alike brand domain, weight 40) already reaches
 * \u201cSuspicious\u201d, two strong indicators reach \u201cLikely Phishing\u201d, and a stack of
 * indicators reaches \u201cDangerous\u201d, while clean input scores 0 \u2192 \u201cSafe\u201d.
 */

import { TriggeredSignal, Verdict } from './types';

export interface VerdictBand {
  verdict: Verdict;
  min: number; // inclusive lower bound
  max: number; // inclusive upper bound
}

export const VERDICT_BANDS: VerdictBand[] = [
  { verdict: 'Safe', min: 0, max: 24 },
  { verdict: 'Suspicious', min: 25, max: 49 },
  { verdict: 'Likely Phishing', min: 50, max: 74 },
  { verdict: 'Dangerous', min: 75, max: 100 },
];

/** Cap a raw weight sum into the 0\u2013100 range. */
export function clampScore(raw: number): number {
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/** Sum weights of fired signals, capped at 100. */
export function scoreFromSignals(signals: TriggeredSignal[]): number {
  const raw = signals.reduce((sum, s) => sum + (s.weight || 0), 0);
  return clampScore(raw);
}

/** Map a 0\u2013100 score onto its verdict band. */
export function verdictForScore(score: number): Verdict {
  const s = clampScore(score);
  for (const band of VERDICT_BANDS) {
    if (s >= band.min && s <= band.max) return band.verdict;
  }
  return 'Safe';
}
