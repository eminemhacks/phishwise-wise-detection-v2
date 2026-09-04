/**
 * PhishWise detection-engine test corpus.
 *
 * A labelled set of known-phishing and known-good inputs (URLs + messages,
 * including the Nigeria-local vishing / smishing / prize scams) with an
 * asserted verdict band for each. Runnable standalone:
 *
 *     npm run test:detection          (from phishwise-api/)
 *
 * It exits non-zero if any case lands outside its expected band, so it also
 * works as a CI gate. No test framework is required.
 */

import { analyzeUrl, analyzeMessage } from '../detection.engine';
import { Verdict, VERDICT_ORDER } from '../types';

type Kind = 'url' | 'message';
interface Case {
  name: string;
  kind: Kind;
  input: string;
  /** Lowest acceptable verdict band (inclusive). */
  min: Verdict;
  /** Highest acceptable verdict band (inclusive). */
  max: Verdict;
}

const rank = (v: Verdict) => VERDICT_ORDER.indexOf(v);

const CASES: Case[] = [
  // ── Benign URLs (should be Safe) ────────────────────────────────
  { name: 'Real bank login', kind: 'url', input: 'https://www.gtbank.com/login', min: 'Safe', max: 'Safe' },
  { name: 'Real PayPal signin', kind: 'url', input: 'https://www.paypal.com/signin', min: 'Safe', max: 'Safe' },
  { name: 'Google homepage', kind: 'url', input: 'https://www.google.com', min: 'Safe', max: 'Safe' },
  { name: 'Gmail deep link', kind: 'url', input: 'https://mail.google.com/mail/u/0/#inbox', min: 'Safe', max: 'Safe' },
  { name: 'GitHub repo', kind: 'url', input: 'https://github.com/Alabs02/phishwise', min: 'Safe', max: 'Safe' },

  // ── Phishing URLs (should be Suspicious+ / mostly Likely+) ──────
  { name: 'Digit-swap PayPal', kind: 'url', input: 'http://paypa1.com/login', min: 'Likely Phishing', max: 'Dangerous' },
  { name: 'Wrapped Microsoft', kind: 'url', input: 'http://micros0ft-alerts.net/verify', min: 'Likely Phishing', max: 'Dangerous' },
  { name: 'GTBank + suspicious TLD', kind: 'url', input: 'http://gtbank-secure.tk/account/update', min: 'Likely Phishing', max: 'Dangerous' },
  { name: 'PayPal secure-login lure', kind: 'url', input: 'https://paypal-secure-login.com/', min: 'Likely Phishing', max: 'Dangerous' },
  { name: 'Raw IP login', kind: 'url', input: 'http://192.168.0.1/login', min: 'Likely Phishing', max: 'Dangerous' },
  { name: 'Brand-in-subdomain chain', kind: 'url', input: 'http://gtbank.com.ng.verify-account.co/login', min: 'Dangerous', max: 'Dangerous' },
  { name: '@-trick URL', kind: 'url', input: 'http://gtbank.com@evil-login.xyz/verify', min: 'Suspicious', max: 'Dangerous' },
  { name: 'Bare shortener', kind: 'url', input: 'bit.ly/3xTz9', min: 'Safe', max: 'Suspicious' },

  // ── Benign messages (should be Safe) ────────────────────────────
  { name: 'Lunch plan', kind: 'message', input: 'Hi John, are we still on for lunch tomorrow at noon? Let me know.', min: 'Safe', max: 'Safe' },
  { name: 'Shipping notice', kind: 'message', input: 'Your order has shipped and should arrive Friday. Thanks for shopping with us.', min: 'Safe', max: 'Safe' },
  { name: 'Standup reminder', kind: 'message', input: 'Reminder: team standup at 9am. Agenda is in the shared doc.', min: 'Safe', max: 'Safe' },

  // ── Nigeria-local phishing messages ─────────────────────────────
  {
    name: 'Vishing / fake account officer',
    kind: 'message',
    input:
      'Dear Customer, this is your bank. Your account will be suspended. Kindly call our customer care and read out the OTP sent to you to reverse the transaction.',
    min: 'Dangerous',
    max: 'Dangerous',
  },
  {
    name: 'Smishing / BVN block',
    kind: 'message',
    input:
      'Your BVN has been blocked. Re-validate your BVN now: http://nimc-verify.tk/update to avoid deactivation.',
    min: 'Dangerous',
    max: 'Dangerous',
  },
  {
    name: 'Prize / MTN promo',
    kind: 'message',
    input:
      'CONGRATULATIONS!!! You have won 2,000,000 in the MTN promo. To claim your prize, send your BVN and pay a processing fee.',
    min: 'Likely Phishing',
    max: 'Dangerous',
  },
  {
    name: 'Fake job offer',
    kind: 'message',
    input:
      'You have been shortlisted for a work from home job. Earn 50,000 daily. Click here to update your BVN.',
    min: 'Likely Phishing',
    max: 'Dangerous',
  },
];

function run() {
  let pass = 0;
  let fail = 0;
  const rows: string[] = [];

  for (const c of CASES) {
    const res = c.kind === 'url' ? analyzeUrl(c.input) : analyzeMessage(c.input);
    const ok = rank(res.verdict) >= rank(c.min) && rank(res.verdict) <= rank(c.max);
    if (ok) pass++;
    else fail++;
    rows.push(
      [
        ok ? 'PASS' : 'FAIL',
        c.kind.padEnd(7),
        String(res.score).padStart(3),
        res.verdict.padEnd(16),
        `${res.signals.length}sig`.padStart(5),
        c.name,
        ok ? '' : `  <-- expected ${c.min}..${c.max}`,
      ].join('  '),
    );
  }

  // eslint-disable-next-line no-console
  console.log('\nPhishWise detection engine \u2014 test corpus\n' + '='.repeat(72));
  // eslint-disable-next-line no-console
  console.log('STATUS  KIND      SCR  VERDICT           SIG  CASE');
  // eslint-disable-next-line no-console
  console.log('-'.repeat(72));
  // eslint-disable-next-line no-console
  rows.forEach((r) => console.log(r));
  // eslint-disable-next-line no-console
  console.log('-'.repeat(72));
  // eslint-disable-next-line no-console
  console.log(`Result: ${pass}/${CASES.length} passed, ${fail} failed.\n`);

  if (fail > 0) process.exit(1);
}

run();
