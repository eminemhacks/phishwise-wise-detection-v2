/**
 * URL signal catalog.
 *
 * Each entry is one heuristic rule. The detection logic that decides *whether*
 * a rule fires lives in url-analyzer.ts; this file is the single, well-commented
 * source of truth for what each rule means, how much it is worth (`weight`), and
 * which lessons teach the underlying trick. Keeping the catalog separate from the
 * matching logic is what makes the engine easy to defend and extend.
 *
 * Lesson ids referenced here are the real seed ids from
 * database/seeds/lessons.data.ts (do not invent new ones).
 */

import { SignalDef } from '../types';

// ── Reference data used by the analyzer ───────────────────────────────

/** TLDs disproportionately abused for phishing / cheap throwaway domains.
 *  Expanded 2026-08 using Phishing.Database ACTIVE mining: top abused TLDs beyond
 *  freenom. Weight lowered to 12 to avoid flagging benign .site/.online alone.
 */
export const SUSPICIOUS_TLDS = [
  'tk', 'ml', 'ga', 'cf', 'gq', // freenom free TLDs
  'zip', 'mov', // confusable-with-filename TLDs
  'xyz', 'top', 'club', 'online', 'site', 'live', 'icu', 'rest',
  'work', 'fit', 'wang', 'cn', 'ru', 'su', 'buzz', 'country', 'kim', 'loan',
  // mined from Phishing.Database ACTIVE (freq > 500 in 100k sample)
  'shop', 'cc', 'link', 'click', 'cfd', 'sbs', 'cam', 'bar', 'quest', 'date',
  'win', 'download', 'stream', 'party', 'trade', 'accountant',
];

/** Link-shortener hosts that hide the true destination. */
export const SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
  'cutt.ly', 'rebrand.ly', 'shorturl.at', 'rb.gy', 'bit.do', 'tiny.cc',
  't.ly', 'v.gd', 'shorte.st', 'tiny.one', 'is.gd', 'u.to',
];

/** Free / disposable hosting suffixes heavily abused for phishing.
 *  Mined from Phishing.Database ACTIVE top-hosts (100k links). If the
 *  registrable domain IS one of these and a subdomain exists, the host is
 *  free-tier — weight 20 makes it Suspicious by itself with path/no-https.
 */
export const FREE_HOSTING_SUFFIXES = [
  '000webhostapp.com',
  'weebly.com',
  'weeblysite.com',
  'godaddysites.com',
  'wixsite.com',
  'workers.dev',
  'pages.dev',
  'vercel.app',
  'netlify.app',
  'web.app',
  'firebaseapp.com',
  'appspot.com',
  'azurewebsites.net',
  'cloudfront.net',
  's3.amazonaws.com',
  'wcomhost.com',
  'cf-ipfs.com',
  'my.id',
  'site123.me',
  'business.site',
  '000webhost.com',
];

/** Words that scream "log in here" when baked into a domain or path.
 *  Expanded via Phishing.Database path-token mining (top 40 tokens in 50k ACTIVE links).
 */
export const CREDENTIAL_KEYWORDS = [
  'login', 'signin', 'verify', 'secure', 'account', 'update', 'confirm',
  'auth', 'validation', 'webscr', 'unlock', 'recover', 'wallet', 'billing',
  'bank', 'banking', 'customer', 'support', 'invoice', 'payment', 'admin',
  'service', 'checkout', 'ebanking', 'webmail', 'appleid',
];

/** Path fragments typical of credential-harvesting pages.
 *  Expanded: /banks/* and /directing/* patterns dominate ACTIVE links (banks/cibc, atb, tangerine).
 */
export const CREDENTIAL_PATHS = [
  '/login', '/signin', '/verify', '/secure', '/account/update',
  '/confirm', '/webscr', '/update-account', '/password',
  '/admin', '/banking', '/customer', '/banks/', '/directing/',
  '/ebanking', '/webmail', '/checkout', '/invoice', '/wallet',
  '/.well-known/', '/.env',
];

// ── The catalog ───────────────────────────────────────────────────────

export const URL_SIGNALS: SignalDef[] = [
  {
    id: 'url-lookalike-brand',
    label: 'Look-alike / typosquatting domain',
    explanation:
      'The domain closely mimics a well-known brand (character swaps, added words, or a near-miss spelling) but is not the brand\u2019s real domain. This is the single most common phishing trick.',
    weight: 40,
    category: 'brand-impersonation',
    lessons: ['anatomy-of-a-url', 'spot-phishing-email'],
  },
  {
    id: 'url-brand-in-subdomain',
    label: 'Trusted brand hidden in the subdomain',
    explanation:
      'A known brand name appears to the left of the real domain (e.g. gtbank.secure-login.com). Browsers only trust the registrable domain \u2014 here that is the attacker\u2019s, not the brand\u2019s.',
    weight: 26,
    category: 'brand-impersonation',
    lessons: ['anatomy-of-a-url'],
  },
  {
    id: 'url-homoglyph',
    label: 'Homoglyph / punycode domain',
    explanation:
      'The domain uses look-alike characters from other alphabets (or an xn-- punycode form) to imitate real letters \u2014 for example a Cyrillic \u201c\u0430\u201d standing in for a Latin \u201ca\u201d.',
    weight: 30,
    category: 'obfuscation',
    lessons: ['anatomy-of-a-url'],
  },
  {
    id: 'url-ip-host',
    label: 'Raw IP address instead of a domain',
    explanation:
      'The link points at a bare IP address (e.g. http://192.168.0.1/login). Legitimate services almost always use a named domain; an IP hides who really owns the destination.',
    weight: 30,
    category: 'url-structure',
    lessons: ['anatomy-of-a-url'],
  },
  {
    id: 'url-userinfo-at',
    label: '\u201c@\u201d trick in the URL',
    explanation:
      'Everything before an \u201c@\u201d in a web address is ignored by the browser. Attackers put a trusted-looking name there so the real host (after the @) slips past a quick glance.',
    weight: 28,
    category: 'obfuscation',
    lessons: ['anatomy-of-a-url'],
  },
  {
    id: 'url-dangerous-scheme',
    label: 'Dangerous URL scheme',
    explanation:
      'The link uses a data: or javascript: scheme, which can run code or render a fake page directly in the browser instead of loading a normal website.',
    weight: 45,
    category: 'obfuscation',
    lessons: ['anatomy-of-a-url'],
  },
  {
    id: 'url-percent-encoding',
    label: 'Percent-encoding used to disguise the host',
    explanation:
      'The host portion contains percent-encoded characters, a technique used to obscure the true destination from people skim-reading the link.',
    weight: 20,
    category: 'obfuscation',
    lessons: ['anatomy-of-a-url'],
  },
  {
    id: 'url-credential-keyword-host',
    label: 'Security word planted in the domain',
    explanation:
      'Words like \u201csecure\u201d, \u201clogin\u201d or \u201cverify\u201d sit inside the registrable domain itself (e.g. paypal-secure-login.com) to make a fraudulent site feel official.',
    weight: 22,
    category: 'credential-harvesting',
    lessons: ['anatomy-of-a-url', 'spot-phishing-email'],
  },
  {
    id: 'url-free-hosting',
    label: 'Free hosting / disposable site',
    explanation:
      'The link lives on a free disposable host (e.g. 000webhostapp, weebly, workers.dev, vercel). Attackers abuse these because they are free and throwaway — a login page here is almost never legitimate.',
    weight: 20,
    category: 'obfuscation',
    lessons: ['anatomy-of-a-url'],
  },
  {
    id: 'url-known-phishing-host',
    label: 'Known phishing domain (offline blocklist)',
    explanation:
      'The domain appears in an offline snapshot of the Phishing.Database ACTIVE feed. This is an exact match against 390k+ confirmed phishing hosts — treated as high-confidence.',
    weight: 45,
    category: 'brand-impersonation',
    lessons: ['anatomy-of-a-url', 'incident-response-basics'],
  },
  {
    id: 'url-user-reported',
    label: 'Previously reported by the community',
    explanation:
      'This domain was previously scanned by a user and flagged as phishing (Likely Phishing or Dangerous). Community reports are treated as lower-weight corroboration than the curated blocklist.',
    weight: 35,
    category: 'brand-impersonation',
    lessons: ['anatomy-of-a-url', 'incident-response-basics'],
  },
  {
    id: 'url-suspicious-tld',
    label: 'High-risk top-level domain',
    explanation:
      'The domain ends in a TLD frequently abused for phishing because it is free or cheap to register (for example .tk, .zip, .xyz, .top). Weight is intentionally low — it only tips the balance with other flags.',
    weight: 12,
    category: 'url-structure',
    lessons: ['anatomy-of-a-url'],
  },
  {
    id: 'url-excessive-subdomains',
    label: 'Excessive subdomains',
    explanation:
      'The address is padded with many subdomain labels to push the real domain out of view and make the link look longer and more \u201cofficial\u201d than it is.',
    weight: 14,
    category: 'url-structure',
    lessons: ['anatomy-of-a-url'],
  },
  {
    id: 'url-high-entropy-host',
    label: 'Random-looking host name',
    explanation:
      'The host looks machine-generated (long, high proportion of digits, no real words) \u2014 typical of disposable domains spun up in bulk for phishing campaigns.',
    weight: 15,
    category: 'obfuscation',
    lessons: ['anatomy-of-a-url'],
  },
  {
    id: 'url-shortener',
    label: 'Link shortener hiding the destination',
    explanation:
      'A URL-shortener (bit.ly, tinyurl, t.co, \u2026) conceals where the link actually goes. Shorteners are convenient, but in an unexpected message they are a way to smuggle a malicious link past you.',
    weight: 18,
    category: 'obfuscation',
    lessons: ['anatomy-of-a-url'],
  },
  {
    id: 'url-credential-path',
    label: 'Credential-harvesting path',
    explanation:
      'The path targets a login or verification page (/login, /verify, /secure, /account/update). Harmless on a real site \u2014 but a strong amplifier when combined with the other flags here.',
    weight: 12,
    category: 'credential-harvesting',
    lessons: ['spot-phishing-email', 'mfa-everywhere'],
  },
  {
    id: 'url-no-https',
    label: 'No HTTPS on a sensitive page',
    explanation:
      'The link uses plain http:// rather than https://. Any credentials submitted travel unencrypted, and reputable login pages have used HTTPS for years.',
    weight: 12,
    category: 'transport-security',
    lessons: ['https-and-padlocks', 'public-wifi'],
  },
  {
    id: 'url-excessive-length',
    label: 'Unusually long URL',
    explanation:
      'The URL is very long, a common way to bury the real domain and a suspicious path behind a wall of characters.',
    weight: 8,
    category: 'url-structure',
    lessons: ['anatomy-of-a-url'],
  },
];
