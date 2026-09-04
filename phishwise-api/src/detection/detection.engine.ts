/**
 * PhishWise detection engine \u2014 public entry point.
 *
 * This is the only file the rest of the app needs to talk to. It exposes two
 * pure functions, analyzeUrl and analyzeMessage, that return the fully-formed
 * ScanResult objects the API and frontend consume. Everything here is
 * rule-based, offline and deterministic.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ML SECOND-OPINION SEAM (intentionally NOT implemented in this build)
 * ───────────────────────────────────────────────────────────────────────────
 * The handoff (Section 3.1) requires the engine to be architected so a machine
 * -learning classifier could be *added later* as a second opinion, without
 * rewriting the rule engine. That extension point is the `SecondOpinionProvider`
 * interface in types.ts and the `blendSecondOpinion` helper below.
 *
 * A future ML model would:
 *   1. implement SecondOpinionProvider.score(input, type) \u2192 probability in [0,1]
 *   2. be passed into blendSecondOpinion(ruleResult, provider)
 *   3. nudge the final score (e.g. weighted average of rule score and ML score),
 *      and append an informational "ML model" signal to the itemised list.
 *
 * We deliberately ship only the rule engine: it is fully explainable in a viva,
 * needs no dataset/training/serving, has no paid dependencies, and is safe to
 * demo. See Chapter 5 (Future Work) of the report for the ML write-up.
 */

import {
  ScanResult,
  SecondOpinionProvider,
  UrlAnalysis,
  MessageAnalysis,
} from './types';
import { analyzeUrl as analyzeUrlImpl } from './url-analyzer';
import { analyzeMessage as analyzeMessageImpl } from './message-analyzer';

export function analyzeUrl(input: string): UrlAnalysis {
  return analyzeUrlImpl(input);
}

export function analyzeMessage(input: string): MessageAnalysis {
  return analyzeMessageImpl(input);
}

/** Dispatch on input type. */
export function analyze(input: string, inputType: 'url' | 'message'): ScanResult {
  return inputType === 'url' ? analyzeUrl(input) : analyzeMessage(input);
}

/**
 * Reserved extension point. Given a rule-based result and an (optional) ML
 * provider, this is where a future model's probability would be blended in.
 *
 * NOT wired into any live code path today \u2014 present only so the seam is typed
 * and obvious. Returns the rule result unchanged when no provider is supplied.
 */
export async function blendSecondOpinion(
  ruleResult: ScanResult,
  provider?: SecondOpinionProvider,
): Promise<ScanResult> {
  if (!provider) return ruleResult;
  // Example of how a future model would be combined (kept inert on purpose):
  //
  //   const p = await provider.score(ruleResult.input, ruleResult.inputType);
  //   if (p != null) {
  //     const mlScore = Math.round(p * 100);
  //     const blended = Math.round(0.7 * ruleResult.score + 0.3 * mlScore);
  //     ruleResult.signals.push({
  //       id: 'ml-second-opinion',
  //       label: 'ML model second opinion',
  //       explanation: `A machine-learning model estimated ${mlScore}% phishing likelihood.`,
  //       weight: 0, // informational; blended separately, not summed
  //       category: 'social-engineering',
  //     });
  //     ruleResult.score = Math.max(0, Math.min(100, blended));
  //   }
  //
  return ruleResult;
}
