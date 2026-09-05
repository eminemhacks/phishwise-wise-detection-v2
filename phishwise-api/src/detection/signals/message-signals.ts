/**
 * Message / email signal catalog (including the Nigeria-local scam rules
 * required by the handoff, Section 3.5).
 *
 * As with the URL catalog, this file only *describes* the rules and the phrase
 * banks the analyzer matches against. The matching logic lives in
 * message-analyzer.ts. Local phrasings are baked directly into the phrase banks
 * so the demo lights up on realistic Nigerian bank / telco / prize scams.
 */

import { SignalDef } from '../types';

// ── Phrase banks (lowercased; matched as substrings / word-ish patterns) ──

/** Pressure / threat language pushing the victim to act without thinking.
 *  Expanded 2026-09 via it4lia 181k + phishing_pot mining: added Nigerian debit/lock + generic suspicious-activity
 */
export const URGENCY_PHRASES = [
  'act now', 'act immediately', 'act within', 'urgent', 'immediately',
  'as soon as possible', 'right away', 'within 24 hours', 'within 24hrs',
  'within 48 hours', 'expires today', 'expire today', 'final notice',
  'last warning', 'account will be suspended', 'account has been suspended',
  'account will be closed', 'account has been locked', 'account is locked',
  'will be deactivated', 'will be blocked', 'will be terminated',
  'avoid deactivation', 'failure to', 'or your account', 'limited time',
  'verify immediately', 'confirm immediately', 'do not ignore',
  // mined from 181k (phishing vs legit, FP <3%)
  'suspicious activity', 'unusual sign-in', 'unusual activity',
  'your account has been locked', 'your account is restricted',
  'immediate action required', 'action required',
  'security alert', 'secure your account',
];

/** Requests for secrets that no legitimate institution asks for by message.
 *  Expanded via 181k mining: added Nigerian re-validation + generic auth
 */
export const CREDENTIAL_PHRASES = [
  'password', 'otp', 'one time password', 'one-time password', 'pin',
  'card number', 'cvv', 'atm pin', 'bvn', 'nin', 'bank verification number',
  'national identification number', 'account number and pin', 'security code',
  'verification code', 'token', 'internet banking password', 'login details',
  'confirm your card', 'update your bvn', 'update your nin', 'validate your bvn',
  // mined
  're-validate your bvn', 'revalidate your account', 'update your account information',
  'confirm your identity', 'verify your identity', 'authentication required',
];

/** Reward / prize / advance-fee bait. */
export const REWARD_PHRASES = [
  'you have won', "you've won", 'you won', 'congratulations you',
  'lucky winner', 'winner', 'lottery', 'jackpot', 'grand prize',
  'claim your prize', 'claim your reward', 'claim your gift', 'cash prize',
  'you have been selected', 'you are selected', 'free gift', 'free airtime',
  'free data', 'inheritance', 'next of kin', 'beneficiary', 'promo',
  'promotion has selected', 'dispatch your prize', 'processing fee to claim',
];

/** Impersonal openings used because the attacker does not know your name. */
export const GENERIC_GREETINGS = [
  'dear customer', 'dear user', 'dear account holder', 'dear client',
  'dear valued customer', 'dear member', 'dear sir/madam', 'dear sir/ma',
  'attention customer', 'dear beneficiary',
];

/** Nigeria-local vishing (fake bank / telco phone-call) cues. */
export const VISHING_PHRASES = [
  'call this number', 'call the number below', 'call our customer care',
  'kindly call', 'please call', 'dial', 'from the bank', 'this is your bank',
  'calling from', 'bank official', 'account officer', 'our agent will call',
  'read out the code', 'read the code', 'read out the otp', 'give us the otp',
  'tell us the code', 'to reverse the transaction', 'to reverse this transfer',
  'to resolve', 'to cancel the transaction', 'do not hang up', 'stay on the line',
];

/** Nigeria-local smishing / job-scam cues. */
export const SMISHING_PHRASES = [
  'your account has been debited', 'your bvn has been blocked',
  'your bvn is blocked', 'your nin is not linked', 'your sim will be blocked',
  'your line will be barred', 're-validate your bvn', 'revalidate your account',
  'your account will be deactivated', 'reactivate your account',
  'job offer', 'you have been shortlisted', 'employment opportunity',
  'work from home and earn', 'earn \u20a6', 'earn ngn', 'daily income',
  'investment opportunity', 'double your money', 'guaranteed returns',
  'click the link to reactivate', 'click here to update your bvn',
];

// ── The catalog ───────────────────────────────────────────────────────

export const MESSAGE_SIGNALS: SignalDef[] = [
  {
    id: 'msg-credential-solicitation',
    label: 'Asks for passwords, OTP, PIN, BVN or NIN',
    explanation:
      'The message asks you to supply a secret \u2014 a password, one-time code (OTP), PIN, card number, BVN or NIN. No genuine bank, telco or agency asks for these by SMS, email or chat.',
    weight: 30,
    category: 'credential-harvesting',
    lessons: ['mfa-everywhere', 'spot-phishing-email', 'smishing-vishing'],
  },
  {
    id: 'msg-vishing',
    label: 'Fake bank / telco call script (vishing)',
    explanation:
      'The message impersonates a bank or telco and pushes you toward a phone call \u2014 to \u201cverify\u201d, \u201creverse a transfer\u201d or read out a code. This is vishing: the classic Nigerian fake-account-officer scam.',
    weight: 32,
    category: 'vishing',
    lessons: ['smishing-vishing', 'pretexting'],
  },
  {
    id: 'msg-smishing',
    label: 'Fake alert / BVN-NIN or job-offer scam (smishing)',
    explanation:
      'Hallmarks of an SMS/WhatsApp scam: a fake debit alert, a \u201cyour BVN/NIN is blocked\u201d threat, SIM-barring pressure, or an unsolicited job / \u201cearn money\u201d offer with a link.',
    weight: 28,
    category: 'smishing',
    lessons: ['smishing-vishing', 'fake-profiles'],
  },
  {
    id: 'msg-reward-bait',
    label: 'Prize / lottery / \u201cyou\u2019ve won\u201d bait',
    explanation:
      'The message claims you have won a prize, lottery, gift or inheritance, or been \u201cselected\u201d in a promo. This is bait to make you click, reply, or pay a small \u201cprocessing fee\u201d.',
    weight: 24,
    category: 'reward-bait',
    lessons: ['fake-profiles', 'smishing-vishing'],
  },
  {
    id: 'msg-urgency',
    label: 'Urgency & threat pressure',
    explanation:
      'The message manufactures urgency \u2014 suspension, deactivation, a 24-hour deadline \u2014 to rush you past your judgement. Pressure is a persuasion tactic, not bank policy.',
    weight: 18,
    category: 'urgency',
    lessons: ['spot-phishing-email', 'spear-phishing'],
  },
  {
    id: 'msg-generic-greeting',
    label: 'Generic, impersonal greeting',
    explanation:
      'It opens with \u201cDear Customer\u201d / \u201cDear User\u201d instead of your name \u2014 a sign of a bulk message blasted to many addresses rather than a real one-to-one notice.',
    weight: 10,
    category: 'social-engineering',
    lessons: ['spot-phishing-email'],
  },
  {
    id: 'msg-formatting-anomaly',
    label: 'Grammar / formatting red flags',
    explanation:
      'Shouty ALL-CAPS, strings of exclamation marks or oddly spaced text are common in scam blasts and rarely appear in genuine, professionally written notices.',
    weight: 8,
    category: 'formatting',
    lessons: ['spot-phishing-email'],
  },
  {
    id: 'msg-embedded-bad-url',
    label: 'Contains a suspicious link',
    explanation:
      'A link inside the message was itself rated risky by the URL analyzer. The contribution here scales with how dangerous the worst embedded link is.',
    // Weight is assigned dynamically by the analyzer from the worst embedded URL
    // (see message-analyzer.ts). The value below is the ceiling / documentation value.
    weight: 35,
    category: 'url-structure',
    lessons: ['anatomy-of-a-url'],
  },
  {
    id: 'msg-user-reported',
    label: 'Previously reported phishing message',
    explanation:
      'This exact message was previously scanned by the community and flagged as phishing. Community reports are treated as corroboration.',
    weight: 35,
    category: 'smishing',
    lessons: ['smishing-vishing', 'spot-phishing-email'],
  },
  {
    id: 'msg-known-phishing-message',
    label: 'Known phishing message (offline blocklist)',
    explanation:
      'This exact message appears in an offline snapshot of 181k phishing emails (Nazario + Nigerian Fraud + phishing_pot). Exact hash match against curated phishing corpora — treated as high-confidence.',
    weight: 35,
    category: 'smishing',
    lessons: ['smishing-vishing', 'incident-response-basics'],
  },
];
