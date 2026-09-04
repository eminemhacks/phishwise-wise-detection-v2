import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * OPTIONAL enrichment: Google Safe Browsing (free tier) URL lookup.
 *
 * Design contract (handoff Section 3.3):
 *   - The core engine is fully offline. This is the ONLY component that makes an
 *     outbound call, and it is OFF BY DEFAULT.
 *   - Enabled only when SAFE_BROWSING_ENABLED=true AND a key is present.
 *   - Fails gracefully: any missing key, network error, or non-200 response
 *     returns null, and the caller simply proceeds with the rule-based result.
 *   - The system NEVER depends on it \u2014 a scan is fully valid with this disabled.
 *
 * To enable (documented in SETUP / .env.example):
 *   1. Get a free key: https://developers.google.com/safe-browsing/v4/get-started
 *   2. Set GOOGLE_SAFE_BROWSING_API_KEY and SAFE_BROWSING_ENABLED=true in .env
 */
@Injectable()
export class SafeBrowsingService {
  private readonly logger = new Logger('SafeBrowsing');

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return (
      this.config.get<boolean>('safeBrowsing.enabled') === true &&
      !!this.config.get<string>('safeBrowsing.apiKey')
    );
  }

  /**
   * Returns { listed, threatTypes } when the URL matches a Safe Browsing list,
   * or null in every other case (disabled, no key, no match, or error).
   */
  async check(
    url: string,
  ): Promise<{ listed: boolean; threatTypes: string[] } | null> {
    if (!this.enabled) return null;
    const key = this.config.get<string>('safeBrowsing.apiKey');
    const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`;
    const body = {
      client: { clientId: 'phishwise', clientVersion: '1.0.0' },
      threatInfo: {
        threatTypes: [
          'MALWARE',
          'SOCIAL_ENGINEERING',
          'UNWANTED_SOFTWARE',
          'POTENTIALLY_HARMFUL_APPLICATION',
        ],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url }],
      },
    };

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        this.logger.warn(`Safe Browsing returned ${res.status}; ignoring.`);
        return null;
      }
      const data: any = await res.json();
      const matches = data?.matches ?? [];
      if (!matches.length) return { listed: false, threatTypes: [] };
      return {
        listed: true,
        threatTypes: [...new Set(matches.map((m: any) => m.threatType))] as string[],
      };
    } catch (err) {
      this.logger.warn(`Safe Browsing lookup failed; proceeding offline. (${(err as Error).message})`);
      return null;
    }
  }
}
