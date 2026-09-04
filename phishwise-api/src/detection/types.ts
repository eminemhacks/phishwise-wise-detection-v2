/**
 * Shared types for the PhishWise rule-based detection engine.
 *
 * The engine is deliberately framework-free (no NestJS, no TypeORM) so it can be
 * unit-tested in complete isolation and reasoned about line-by-line in a viva.
 * Every number that ends up in a user's risk score traces back to exactly one
 * SignalDef.weight below — there is no hidden model, no training data, nothing
 * that cannot be explained.
 */

/** Broad families a signal belongs to. Drives the signal → lesson mapping. */
export type SignalCategory =
  | 'brand-impersonation'
  | 'url-structure'
  | 'obfuscation'
  | 'transport-security'
  | 'credential-harvesting'
  | 'urgency'
  | 'reward-bait'
  | 'social-engineering'
  | 'vishing'
  | 'smishing'
  | 'formatting';

/** A verdict band. Order matters (index used for severity comparisons). */
export type Verdict = 'Safe' | 'Suspicious' | 'Likely Phishing' | 'Dangerous';

export const VERDICT_ORDER: Verdict[] = [
  'Safe',
  'Suspicious',
  'Likely Phishing',
  'Dangerous',
];

/** Which kind of input was analysed. */
export type InputType = 'url' | 'message';

/**
 * A rule definition in the catalog. `weight` is the number of risk points this
 * rule contributes to the 0–100 score when it fires. `lessons` are seed lesson
 * ids that teach the trick this rule detects (see database/seeds/lessons.data.ts).
 */
export interface SignalDef {
  id: string;
  label: string;
  explanation: string;
  weight: number;
  category: SignalCategory;
  /** Seed lesson ids surfaced to the user when this rule fires. */
  lessons: string[];
}

/**
 * A rule that actually fired on a given input. This is the public shape the
 * brief mandates: { id, label, explanation, weight, category }. `detail` is an
 * optional, human-readable note about *why* it fired on this specific input
 * (e.g. "impersonates gtbank.com"), which makes the result far more convincing.
 */
export interface TriggeredSignal {
  id: string;
  label: string;
  explanation: string;
  weight: number;
  category: SignalCategory;
  detail?: string;
}

/** A lesson surfaced alongside a result. */
export interface RelatedLesson {
  id: string;
  title: string;
  href: string;
}

/** Result of analysing a single URL. */
export interface UrlAnalysis {
  inputType: 'url';
  input: string;
  normalized: string | null;
  score: number;
  verdict: Verdict;
  signals: TriggeredSignal[];
  relatedLessons: RelatedLesson[];
}

/** Result of analysing a message (may embed several UrlAnalysis sub-results). */
export interface MessageAnalysis {
  inputType: 'message';
  input: string;
  score: number;
  verdict: Verdict;
  signals: TriggeredSignal[];
  extractedUrls: UrlAnalysis[];
  relatedLessons: RelatedLesson[];
}

export type ScanResult = UrlAnalysis | MessageAnalysis;

/**
 * Optional second-opinion contract. NOT IMPLEMENTED in this build — this is the
 * documented seam described in the handoff (Section 3.1). A future ML classifier
 * would implement this interface and the engine would blend its probability into
 * the final score. Kept here so the extension point is explicit and typed.
 */
export interface SecondOpinionProvider {
  /** Returns a phishing probability in [0,1], or null if unavailable. */
  score(input: string, inputType: InputType): Promise<number | null>;
}
