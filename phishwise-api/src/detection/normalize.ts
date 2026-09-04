import * as crypto from 'crypto';
import { registrableDomain } from './url-analyzer';

/**
 * Normalization for dedup / blocklist keys.
 * - URLs: lowercased host, strip fragment, remove tracking params (utm_*, fbclid, gclid, etc),
 *   remove trailing slash (except root), lower host/path for case-insensitive compare.
 * - Messages: collapse whitespace, trim, lowercase.
 * Returns a stable sha256 hex hash and the normalized string.
 */

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_name', 'gclid', 'fbclid', 'msclkid', 'yclid', 'dclid',
]);

export function normalizeUrlForHash(raw: string): { normalized: string; hash: string; regDomain: string | null } {
  const trimmed = (raw || '').trim();
  // Try to parse with scheme
  const hadScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  const withScheme = hadScheme ? trimmed : `http://${trimmed}`;
  try {
    const url = new URL(withScheme);
    // host lower
    url.hostname = url.hostname.toLowerCase();
    // remove tracking params
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        url.searchParams.delete(key);
      }
    }
    // sort remaining params for stability
    url.searchParams.sort();
    // strip fragment
    url.hash = '';
    // normalize pathname: remove trailing slash except "/"
    let path = url.pathname;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    url.pathname = path;
    // force https? keep original scheme lowercased
    url.protocol = url.protocol.toLowerCase();
    // port: remove default
    if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) {
      url.port = '';
    }
    const normalized = url.toString();
    const hash = sha256(normalized.toLowerCase());
    let reg: string | null = null;
    try { reg = registrableDomain(url.hostname); } catch { reg = null; }
    return { normalized, hash, regDomain: reg };
  } catch {
    // Fallback: simple normalize
    const normalized = trimmed.toLowerCase().replace(/\/+$/, '');
    return { normalized, hash: sha256(normalized), regDomain: null };
  }
}

export function normalizeMessageForHash(raw: string): { normalized: string; hash: string } {
  const normalized = (raw || '').trim().replace(/\s+/g, ' ').toLowerCase();
  return { normalized, hash: sha256(normalized) };
}

export function normalizeForHash(input: string, inputType: 'url' | 'message'): { normalized: string; hash: string; regDomain?: string | null } {
  if (inputType === 'url') return normalizeUrlForHash(input);
  return normalizeMessageForHash(input);
}

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}
