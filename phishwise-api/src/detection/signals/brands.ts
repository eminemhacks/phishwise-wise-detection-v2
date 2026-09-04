/**
 * Brands the detector knows how to recognise for impersonation checks.
 *
 * A URL is flagged as a lookalike when its registrable domain is NOT one of a
 * brand's legitimate domains but is *confusably close* to the brand keyword
 * (see url-analyzer: edit-distance, embedded-brand, and homoglyph checks).
 *
 * The list is intentionally Nigeria-weighted (banks, telcos, government IDs)
 * because those are the highest-value impersonation targets for the local demo,
 * plus the global brands most commonly spoofed worldwide.
 */

export interface BrandDef {
  /** Lowercase keyword that appears in the brand's name / domain. */
  keyword: string;
  /** Human-facing brand name. */
  name: string;
  /** Legitimate registrable domains for this brand (never flagged). */
  legit: string[];
}

export const BRANDS: BrandDef[] = [
  // ── Nigerian banks ──────────────────────────────────────────────
  { keyword: 'gtbank', name: 'GTBank', legit: ['gtbank.com', 'gtco.com'] },
  { keyword: 'gtco', name: 'GTCO', legit: ['gtco.com'] },
  { keyword: 'zenithbank', name: 'Zenith Bank', legit: ['zenithbank.com'] },
  { keyword: 'accessbank', name: 'Access Bank', legit: ['accessbankplc.com'] },
  { keyword: 'firstbank', name: 'First Bank', legit: ['firstbanknigeria.com'] },
  { keyword: 'uba', name: 'UBA', legit: ['ubagroup.com'] },
  { keyword: 'fcmb', name: 'FCMB', legit: ['fcmb.com'] },
  { keyword: 'sterling', name: 'Sterling Bank', legit: ['sterling.ng'] },
  { keyword: 'kuda', name: 'Kuda', legit: ['kuda.com'] },
  { keyword: 'opay', name: 'OPay', legit: ['opayweb.com'] },
  { keyword: 'palmpay', name: 'PalmPay', legit: ['palmpay.com'] },
  { keyword: 'moniepoint', name: 'Moniepoint', legit: ['moniepoint.com'] },

  // ── Nigerian telcos & government ────────────────────────────────
  { keyword: 'mtn', name: 'MTN', legit: ['mtn.ng', 'mtnonline.com'] },
  { keyword: 'glo', name: 'Glo', legit: ['gloworld.com'] },
  { keyword: 'airtel', name: 'Airtel', legit: ['airtel.com.ng', 'airtel.com'] },
  { keyword: 'nimc', name: 'NIMC (NIN)', legit: ['nimc.gov.ng'] },

  // ── Global brands most commonly spoofed ─────────────────────────
  { keyword: 'paypal', name: 'PayPal', legit: ['paypal.com'] },
  { keyword: 'microsoft', name: 'Microsoft', legit: ['microsoft.com', 'live.com', 'office.com', 'outlook.com'] },
  { keyword: 'apple', name: 'Apple', legit: ['apple.com', 'icloud.com'] },
  { keyword: 'google', name: 'Google', legit: ['google.com', 'gmail.com'] },
  { keyword: 'amazon', name: 'Amazon', legit: ['amazon.com'] },
  { keyword: 'facebook', name: 'Facebook', legit: ['facebook.com'] },
  { keyword: 'instagram', name: 'Instagram', legit: ['instagram.com'] },
  { keyword: 'whatsapp', name: 'WhatsApp', legit: ['whatsapp.com'] },
  { keyword: 'netflix', name: 'Netflix', legit: ['netflix.com'] },
  { keyword: 'dhl', name: 'DHL', legit: ['dhl.com'] },
  // ── Additional high-frequency phishing targets (mined from Phishing.Database) ──
  { keyword: 'chase', name: 'Chase', legit: ['chase.com'] },
  { keyword: 'wellsfargo', name: 'Wells Fargo', legit: ['wellsfargo.com'] },
  { keyword: 'cibc', name: 'CIBC', legit: ['cibc.com', 'cibc.mobi'] },
  { keyword: 'desjardins', name: 'Desjardins', legit: ['desjardins.com'] },
  { keyword: 'scotia', name: 'Scotiabank', legit: ['scotiabank.com'] },
  { keyword: 'tangerine', name: 'Tangerine', legit: ['tangerine.ca'] },
  { keyword: 'atb', name: 'ATB Financial', legit: ['atb.com'] },
  { keyword: 'hsbc', name: 'HSBC', legit: ['hsbc.com', 'hsbc.co.uk'] },
  { keyword: 'santander', name: 'Santander', legit: ['santander.com', 'santander.co.uk'] },
  { keyword: 'bmo', name: 'BMO', legit: ['bmo.com'] },
];
