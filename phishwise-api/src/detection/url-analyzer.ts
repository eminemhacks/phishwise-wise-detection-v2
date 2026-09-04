/**
 * URL analyzer.
 *
 * Runs every rule in url-signals.ts against a single URL and returns the fired
 * signals, a 0\u2013100 score and a verdict. Pure and synchronous \u2014 no network calls,
 * no external libraries \u2014 so it is fully deterministic and unit-testable.
 *
 * Registrable-domain resolution uses a small, embedded public-suffix table
 * rather than a heavy dependency; it covers .com plus the common Nigerian and
 * international two-label suffixes, which is ample for this project. (A future
 * upgrade could swap in a full PSL library behind the same helper.)
 */

import { TriggeredSignal, UrlAnalysis } from './types';
import { buildRelatedLessons } from './signals/catalog';
import {
  CREDENTIAL_KEYWORDS,
  CREDENTIAL_PATHS,
  FREE_HOSTING_SUFFIXES,
  SHORTENERS,
  SUSPICIOUS_TLDS,
  URL_SIGNALS,
} from './signals/url-signals';
import { BRANDS } from './signals/brands';
import { scoreFromSignals, verdictForScore } from './scoring';
import { PHISHING_BLOCKLIST } from './signals/phishing-blocklist';

const SIG = new Map(URL_SIGNALS.map((s) => [s.id, s]));

/** Two-label public suffixes we recognise (registrable domain = 3 labels). */
const TWO_LABEL_SUFFIXES = new Set([
  'com.ng', 'org.ng', 'gov.ng', 'edu.ng', 'net.ng', 'sch.ng',
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'me.uk',
  'co.za', 'com.au', 'net.au', 'org.au', 'co.nz', 'com.gh', 'com.gh',
  'co.ke', 'com.br', 'co.in', 'com.gh', 'com.ng',
]);

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

function fire(id: string, detail?: string): TriggeredSignal | null {
  const def = SIG.get(id);
  if (!def) return null;
  return {
    id: def.id,
    label: def.label,
    explanation: def.explanation,
    weight: def.weight,
    category: def.category,
    detail,
  };
}

/** Registrable domain (eTLD+1) using the embedded suffix table. */
export function registrableDomain(host: string): string {
  const labels = host.toLowerCase().split('.').filter(Boolean);
  if (labels.length <= 2) return labels.join('.');
  const lastTwo = labels.slice(-2).join('.');
  if (TWO_LABEL_SUFFIXES.has(lastTwo)) return labels.slice(-3).join('.');
  return labels.slice(-2).join('.');
}

/** Levenshtein edit distance (small strings, iterative DP). */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/** Collapse common look-alike substitutions so typos map onto real words. */
function deconfuse(s: string): string {
  return s
    .toLowerCase()
    .replace(/rn/g, 'm')
    .replace(/vv/g, 'w')
    .replace(/0/g, 'o')
    .replace(/1/g, 'l')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/\$/g, 's');
}

function vowelRatio(s: string): number {
  const letters = s.replace(/[^a-z]/gi, '');
  if (!letters.length) return 0;
  const vowels = (letters.match(/[aeiou]/gi) || []).length;
  return vowels / letters.length;
}

function digitRatio(s: string): number {
  if (!s.length) return 0;
  return (s.match(/\d/g) || []).length / s.length;
}

/**
 * Analyse a single URL. Never throws: unparseable input yields a Safe result
 * with a note rather than crashing the request.
 */
export function analyzeUrl(rawInput: string): UrlAnalysis {
  const input = (rawInput || '').trim();
  const signals: TriggeredSignal[] = [];
  const add = (s: TriggeredSignal | null) => {
    if (s) signals.push(s);
  };

  // Dangerous schemes are checked on the raw string before any URL parsing.
  if (/^\s*(javascript|data):/i.test(input)) {
    add(fire('url-dangerous-scheme', input.split(':')[0].toLowerCase() + ': scheme'));
    const score = scoreFromSignals(signals);
    const verdict = verdictForScore(score);
    return {
      inputType: 'url',
      input,
      normalized: null,
      score,
      verdict,
      signals,
      relatedLessons: buildRelatedLessons(signals, verdict),
    };
  }

  // Track whether the user explicitly typed http:// (only then penalise no-HTTPS).
  const hadExplicitHttp = /^http:\/\//i.test(input);
  const hadScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input);
  const withScheme = hadScheme ? input : `http://${input}`;

  // "@" userinfo trick, detected on the authority of the raw (scheme-added) string.
  const authorityPart = withScheme.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split(/[/?#]/)[0];
  if (authorityPart.includes('@')) {
    add(fire('url-userinfo-at', `text before "@" is ignored by the browser`));
  }

  let url: URL | null = null;
  try {
    url = new URL(withScheme);
  } catch {
    url = null;
  }

  if (!url) {
    // Could not parse \u2014 return a neutral, safe result.
    return {
      inputType: 'url',
      input,
      normalized: null,
      score: 0,
      verdict: 'Safe',
      signals: [],
      relatedLessons: [],
    };
  }

  const host = url.hostname.toLowerCase();
  const rawHostFromAuthority = authorityPart.split('@').pop() || host;

  // Percent-encoding used inside the host to obscure it.
  if (/%[0-9a-f]{2}/i.test(rawHostFromAuthority)) {
    add(fire('url-percent-encoding'));
  }

  // Homoglyph / punycode.
  if (host.includes('xn--') || /[^\u0000-\u007f]/.test(rawInput)) {
    add(fire('url-homoglyph', host.includes('xn--') ? 'punycode (xn--) host' : 'non-ASCII characters in host'));
  }

  // Raw IP host.
  const isIp = IPV4.test(host) || host.startsWith('[');
  if (isIp) {
    add(fire('url-ip-host', host));
  }

  const regDomain = registrableDomain(host);
  const sld = regDomain.split('.')[0] || '';
  const tld = host.split('.').pop() || '';
  const labels = host.split('.').filter(Boolean);
  const subdomainLabels = labels.slice(0, Math.max(0, labels.length - regDomain.split('.').length));

  // Is this a known-good brand domain? If so, skip brand / credential-host checks.
  const isLegit = !isIp && BRANDS.some((b) => b.legit.includes(regDomain));

  if (!isIp && !isLegit) {
    for (const brand of BRANDS) {
      const kw = brand.keyword;

      // Brand keyword hidden as a subdomain label of an unrelated domain.
      if (subdomainLabels.some((l) => l === kw || deconfuse(l) === kw)) {
        add(fire('url-brand-in-subdomain', `\u201c${kw}\u201d is a subdomain of ${regDomain}, not ${brand.name}`));
        break;
      }

      // Exact/near-miss of the brand keyword in the registrable domain's main label.
      const dc = deconfuse(sld);
      const embedded = sld.includes(kw) || dc.includes(kw);
      const dist = Math.min(editDistance(sld, kw), editDistance(dc, kw));
      const typoThreshold = Math.max(1, Math.floor(kw.length / 5));
      // A near-miss spelling (edit distance within threshold) OR a domain that
      // is only the brand once look-alike characters (0\u2192o, 1\u2192l\u2026) are undone.
      const isTypo =
        (dist > 0 && dist <= typoThreshold) || (dc === kw && sld !== kw);
      const isEmbeddedVariant =
        embedded && sld !== kw && (sld.includes('-') || sld.length > kw.length + 1);

      if (isTypo || isEmbeddedVariant) {
        const why = isTypo
          ? `\u201c${sld}\u201d is one or two edits from \u201c${kw}\u201d (${brand.name})`
          : `\u201c${sld}\u201d wraps the \u201c${kw}\u201d brand in extra words`;
        add(fire('url-lookalike-brand', why));
        break;
      }
    }
  }

  // Security word planted inside the registrable domain (not a known brand).
  if (!isIp && !isLegit) {
    const hit = CREDENTIAL_KEYWORDS.find((w) => sld.includes(w));
    if (hit) add(fire('url-credential-keyword-host', `\u201c${hit}\u201d is inside the domain \u201c${regDomain}\u201d`));
  }

  // Known phishing host (offline blocklist) — highest confidence, checked before other heuristics.
  if (!isIp && PHISHING_BLOCKLIST.has(regDomain)) {
    add(fire('url-known-phishing-host', `exact match for ${regDomain} in offline phishing feed`));
  }

  // Free / disposable hosting suffix (e.g. 000webhostapp, weebly, workers.dev).
  if (!isIp && FREE_HOSTING_SUFFIXES.includes(regDomain) && subdomainLabels.length >= 1) {
    add(fire('url-free-hosting', `${regDomain} with ${subdomainLabels.length} subdomain(s)`));
  }

  // Suspicious TLD.
  if (!isIp && SUSPICIOUS_TLDS.includes(tld)) {
    add(fire('url-suspicious-tld', `.${tld}`));
  }

  // Link shortener.
  if (SHORTENERS.includes(regDomain)) {
    add(fire('url-shortener', regDomain));
  }

  // Excessive subdomains (2+ labels in front of the registrable domain — lowered from 3 after mining).
  if (subdomainLabels.length >= 2) {
    add(fire('url-excessive-subdomains', `${subdomainLabels.length} subdomain labels`));
  }

  // Random-looking / high-entropy host — now checks sld AND any subdomain label (fixes weebly/000webhost misses).
  const highEntropyLabels = [sld, ...subdomainLabels].filter((l) => l.length >= 8);
  const hasHighEntropy = highEntropyLabels.some((l) => digitRatio(l) >= 0.30 || vowelRatio(l) < 0.26);
  const longestLabel = [...highEntropyLabels].sort((a, b) => b.length - a.length)[0] || '';
  if (!isIp && !isLegit && longestLabel.length >= 10 && hasHighEntropy) {
    add(fire('url-high-entropy-host', `\u201c${longestLabel}\u201d looks machine-generated`));
  }

  // Credential-harvesting path.
  const path = (url.pathname || '').toLowerCase();
  if (CREDENTIAL_PATHS.some((p) => path.includes(p)) || /\/(login|signin|verify|secure|confirm)(\/|$)/.test(path)) {
    add(fire('url-credential-path', url.pathname));
  }

  // No HTTPS on an explicitly http:// link.
  if (hadExplicitHttp) {
    add(fire('url-no-https'));
  }

  // Excessive length.
  if (input.length > 75) {
    add(fire('url-excessive-length', `${input.length} characters`));
  }

  const score = scoreFromSignals(signals);
  const verdict = verdictForScore(score);
  return {
    inputType: 'url',
    input,
    normalized: url.href,
    score,
    verdict,
    signals,
    relatedLessons: buildRelatedLessons(signals, verdict),
  };
}

/** Extract candidate URLs / bare domains from free text (used by messages). */
export function extractUrls(text: string): string[] {
  const found = new Set<string>();
  // http(s):// URLs
  const withScheme = text.match(/\bhttps?:\/\/[^\s<>()"']+/gi) || [];
  for (const u of withScheme) found.add(u.replace(/[.,;:]+$/, ''));
  // bare domains like paypa1.com/verify or gtbank-secure.tk
  const bare =
    text.match(/\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<>()"']*)?/gi) || [];
  for (const b of bare) {
    const clean = b.replace(/[.,;:]+$/, '');
    // Skip if it was already captured with a scheme.
    if (![...found].some((f) => f.includes(clean))) found.add(clean);
  }
  return [...found];
}
