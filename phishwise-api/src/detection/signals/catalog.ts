/**
 * The complete signal catalog and the signal \u2192 lesson mapping.
 *
 * This is the one place that unifies the URL and message rule sets, exposes them
 * for the admin \u201crule catalog\u201d view, and turns the lesson ids attached to each
 * fired rule into concrete { id, title, href } links the UI can render.
 *
 * LESSON_TITLES mirrors database/seeds/lessons.data.ts. It is kept as a static
 * map so the engine stays framework-free and unit-testable; the service layer
 * may override titles from the live DB, but it is never required to.
 */

import { RelatedLesson, SignalDef, TriggeredSignal, Verdict, VERDICT_ORDER } from '../types';
import { URL_SIGNALS } from './url-signals';
import { MESSAGE_SIGNALS } from './message-signals';

export const ALL_SIGNALS: SignalDef[] = [...URL_SIGNALS, ...MESSAGE_SIGNALS];

const SIGNAL_BY_ID = new Map(ALL_SIGNALS.map((s) => [s.id, s]));

export function getSignal(id: string): SignalDef | undefined {
  return SIGNAL_BY_ID.get(id);
}

/** id \u2192 title for the 17 seed lessons (see lessons.data.ts). */
export const LESSON_TITLES: Record<string, string> = {
  'spot-phishing-email': 'Spotting a Phishing Email in 60 Seconds',
  'anatomy-of-a-url': 'Anatomy of a Suspicious Link',
  'spear-phishing': 'Spear Phishing & CEO Fraud',
  'email-attachments': 'Attachments: Handle With Care',
  'email-account-protection': 'Locking Down Your Inbox',
  passphrases: 'Passphrases Beat P@ssw0rds',
  'mfa-everywhere': 'Two-Factor Authentication, Explained',
  pretexting: 'Pretexting: The Art of the Believable Lie',
  'baiting-tailgating': 'Baiting, Tailgating & Physical Tricks',
  'https-and-padlocks': 'HTTPS, Padlocks & Browser Warnings',
  'public-wifi': 'Public Wi-Fi Without the Risk',
  'smishing-vishing': 'Smishing & Vishing: Phishing by Phone',
  'app-permissions': 'App Permissions & Updates',
  oversharing: 'Oversharing: What Your Posts Reveal',
  'fake-profiles': 'Fake Profiles, Romance & Job Scams',
  'updates-backups': 'Updates, Backups & the 3-2-1 Rule',
  'incident-response-basics': 'Clicked a Bad Link? Do This Now',
};

/**
 * Build the ordered, de-duplicated related-lessons list for a set of fired
 * signals. On the two most severe verdict bands we always append the incident
 * -response lesson so a worried user is told what to do next.
 */
export function buildRelatedLessons(
  signals: TriggeredSignal[],
  verdict: Verdict,
  titleOverrides?: Record<string, string>,
): RelatedLesson[] {
  const ids: string[] = [];
  const push = (id: string) => {
    if (!ids.includes(id)) ids.push(id);
  };

  for (const s of signals) {
    const def = getSignal(s.id);
    for (const id of def?.lessons ?? []) push(id);
  }

  if (VERDICT_ORDER.indexOf(verdict) >= VERDICT_ORDER.indexOf('Likely Phishing')) {
    push('incident-response-basics');
  }

  const titles = { ...LESSON_TITLES, ...(titleOverrides ?? {}) };
  return ids
    .filter((id) => titles[id])
    .map((id) => ({ id, title: titles[id], href: `/lessons/${id}` }));
}
