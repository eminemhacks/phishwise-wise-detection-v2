# PhishWise — Phishing Detection, in Plain English

*A personal guide to how the detector works, written so you can explain and defend every part of it (including in a viva). No jargon assumed.*

---

## 1. What the detector does

A user pastes one of two things:

1. **A URL / link** — e.g. `http://gtbank-secure.tk/account/update`
2. **A message / email** — the full text of an SMS, WhatsApp message, or email body

The system reads it and returns four things:

- **A risk score from 0 to 100.**
- **A verdict band**: *Safe*, *Suspicious*, *Likely Phishing*, or *Dangerous*.
- **An itemised list of every red flag it found**, each with a plain-language reason and how many points it added.
- **Links to the lessons** that teach whatever trick was detected.

For a message, it also **pulls out every link inside the text** and analyses each one on its own.

The single most important idea: **it is a rule-based (heuristic) engine, not machine learning.** Every point in the score comes from one named rule. You can add the numbers by hand and get the exact score shown. That is the whole reason it was built this way — it is completely explainable, needs no dataset or training, makes no external calls, and can never surprise you in a demo.

---

## 2. How the score works (the part examiners always ask about)

The maths is deliberately the simplest thing that is honest:

> **score = the sum of the weights of every rule that fired, capped at 100.**

That's it. No hidden model, no weighting tricks. If three rules fire worth 40, 22 and 18, the score is 80.

The score then falls into a band:

| Score | Verdict |
|---|---|
| 0–24 | **Safe** |
| 25–49 | **Suspicious** |
| 50–74 | **Likely Phishing** |
| 75–100 | **Dangerous** |

The weights were tuned so that:
- one strong indicator on its own (e.g. a look-alike brand domain, worth 40) already reaches *Suspicious*;
- two strong indicators together reach *Likely Phishing*;
- a stack of indicators reaches *Dangerous*;
- clean input scores 0 and stays *Safe*.

**Why additive-and-capped instead of something cleverer?** Because you can defend every single point. A machine-learning score of "83% phishing" is a black box you'd have to explain away in a viva. "80 = 40 + 22 + 18, and here are the three reasons" is bulletproof.

> Code: `phishwise-api/src/detection/scoring.ts`

---

## 3. What it looks for (the signal catalog)

There are **23 rules** in total, split into URL rules and message rules. They live in one place, each with an id, a human label, a plain-language explanation, a weight, a category, and the lessons it maps to.

> Code: `phishwise-api/src/detection/signals/url-signals.ts` and `message-signals.ts`

### URL rules (15)

| Rule | Weight | What it catches |
|---|---:|---|
| Look-alike / typosquatting domain | 40 | `paypa1.com`, `micros0ft-alerts.net`, `gtbank-secure…` — a domain pretending to be a known brand |
| Dangerous URL scheme | 45 | `javascript:` or `data:` links that run code instead of loading a site |
| Homoglyph / punycode | 30 | Foreign look-alike letters or `xn--` domains |
| Raw IP address host | 30 | `http://192.168.0.1/login` — hides who owns the site |
| Trusted brand in the subdomain | 26 | `gtbank.secure-login.com` — the real domain is `secure-login.com` |
| "@" trick in the URL | 28 | Everything before an `@` is ignored by the browser |
| Security word planted in the domain | 22 | `paypal-secure-login.com` |
| Percent-encoding to disguise the host | 20 | Encoded characters hiding the real destination |
| High-risk TLD | 18 | `.tk`, `.zip`, `.xyz`, `.top` — cheap/free, heavily abused |
| Excessive subdomains | 18 | Padding the address to bury the real domain |
| Link shortener | 15 | `bit.ly`, `tinyurl` hiding where the link really goes |
| Random-looking host | 15 | Machine-generated, disposable-looking domains |
| Credential-harvesting path | 12 | `/login`, `/verify`, `/account/update` |
| No HTTPS on a sensitive page | 12 | Plain `http://` login page |
| Unusually long URL | 8 | Length used to bury the real domain |

**How the look-alike check actually works** (this is the cleverest bit, worth understanding):
1. It works out the **registrable domain** (the part that matters — e.g. for `a.b.gtbank.com` that's `gtbank.com`). Known-legit domains (a built-in list of real bank/brand domains) are whitelisted and skipped.
2. It "de-confuses" the name by undoing common swaps (`0→o`, `1→l`, `3→e`, `rn→m`), so `paypa1` becomes `paypal`.
3. It then flags a domain if it is a **near-miss spelling** of a brand (edit-distance ≤ threshold), an **exact match after de-confusing**, or **wraps the brand in extra words** (`paypal-secure-login`).

> Code: `phishwise-api/src/detection/url-analyzer.ts` (the `analyzeUrl` function and the brand loop)

### Message rules (8, including the Nigeria-local ones)

| Rule | Weight | What it catches |
|---|---:|---|
| Asks for password/OTP/PIN/BVN/NIN | 30 | The thing no real bank asks for by message |
| Fake bank/telco call script (**vishing**) | 32 | "kindly call… read out the OTP… to reverse the transfer" |
| Fake alert / BVN-NIN block / job scam (**smishing**) | 28 | "your BVN has been blocked", "you've been shortlisted…" |
| Prize / lottery / "you've won" bait | 24 | MTN promo winner, inheritance, claim-your-prize |
| Urgency & threat pressure | 18 | "account will be suspended", "within 24 hours" |
| Generic greeting | 10 | "Dear Customer" instead of your name |
| Grammar / formatting red flags | 8 | ALL-CAPS shouting, `!!!`, spaced-out `V E R I F Y` |
| Contains a suspicious link | 12–35 | See below — this one is dynamic |

**The three Nigeria-local rules (vishing, smishing, prize bait)** are the demo's highlight. They match real local phrasings baked into phrase lists — fake account-officer calls, "re-validate your BVN", SIM-block threats, "earn ₦50,000 daily" job scams, MTN-promo winners, and so on.

**How links inside a message are handled** (so nothing is double-counted): every URL in the text is extracted and run through the full URL analyzer. The **single worst** link is then folded back into the message score as one transparent signal — 12 points if that link is *Suspicious*, 25 if *Likely Phishing*, 35 if *Dangerous*. You see the worst link's own verdict listed separately under "Links found in this message".

> Code: `phishwise-api/src/detection/message-analyzer.ts`

**One subtlety worth knowing:** short words like `pin`, `otp`, `nin` are matched with **word boundaries**, so "sho**ppin**g" and "mor**nin**g" don't wrongly trigger the OTP/PIN rule. This was a real bug found and fixed during testing.

---

## 4. Which lessons show up under a result

Each rule is tagged with the seed lessons that teach it (e.g. the look-alike rule points to *Anatomy of a Suspicious Link*; the vishing rule points to *Smishing & Vishing*). The result shows the combined set. On the two worst verdicts it also always adds *Clicked a Bad Link? Do This Now* so a worried user is told what to do next. This is the "education at the teachable moment" idea — the detector catches the threat, the lessons explain the trick.

> Code: `phishwise-api/src/detection/signals/catalog.ts` (`buildRelatedLessons`)

---

## 5. Saved vs not saved (public "Try it" vs signed-in)

- On the **landing page** there's a public "Try the detector" widget. Anyone — including an examiner — can test it instantly with no account. **Public scans are never saved.** The widget nudges you to sign up "to save your scan history and track threats you've caught."
- When you're **logged in**, scans are saved to **Detector → Scan History**, and you can open any past scan to see its full breakdown or delete it.

> Two endpoints enforce this: `POST /detection/scan` (public, never saves) and `POST /detection/scans` (authenticated, saves). Code: `phishwise-api/src/detection/detection.controller.ts`

---

## 6. How scanning earns rewards

Scanning plugs into the **same** server-side gamification engine the lessons/quizzes already use (it was extended, not copied):

- **+8 XP** per scan, **+7 more** when the scan catches a real threat (Likely Phishing or Dangerous).
- Four new badges: **First Catch** (1 scan), **Sharp Detector** (10 scans), **Scan Veteran** (25 scans), **Threat Hunter** (5 threats caught).

XP is deliberately low so scanning can't out-earn actual learning. All of this is recomputed on the server, so it can't be faked from the browser.

> Code: `phishwise-api/src/gamification/gamification.engine.ts` (badges + `SCAN_XP`) and `progress.service.ts` (`applyScan`)

---

## 7. The optional online check (off by default)

The engine is **100% offline** by default — no outbound calls, so it always works in a demo and raises no privacy concerns. There is **one optional** extra: a **Google Safe Browsing** lookup for URLs, which you turn on with two lines in `.env`. If the key is missing or the call fails, it silently falls back to the offline rules. **The system never depends on it** — a scan is fully valid with it switched off. If you enable it and a URL is on Google's list, it adds one extra 45-point signal.

> Code: `phishwise-api/src/detection/safe-browsing.service.ts`. Free key: <https://developers.google.com/safe-browsing/v4/get-started>

---

## 8. The machine-learning question (your "future work" answer)

You have **no ML in this build, on purpose.** If asked "why not machine learning?", the honest, strong answer is:

> "A rule-based engine is fully explainable — I can justify every point of every score. ML would need a labelled dataset, training, and a serving pipeline, and it would give a black-box probability I couldn't defend line by line. I designed the system so an ML model could be added later as a *second opinion* without touching the rules, and I've written that up as future work."

That extension point is real and already in the code — a typed `SecondOpinionProvider` interface and a `blendSecondOpinion` function that are intentionally left inert, with comments showing exactly how a future model would plug in.

> Code: `phishwise-api/src/detection/detection.engine.ts`

---

## 9. Honest limitations (say these before you're asked)

- It's a **heuristic** — it can produce **false positives** (flagging something harmless) and **false negatives** (missing a clever attack). The UI says this on every result. Don't oversell it as perfect protection.
- It does **not** open links or scan attachments — that would need sandboxing/antivirus and is deliberately out of scope. Faking it would be dishonest for a security project.
- The brand and TLD lists are curated, not exhaustive — they're easy to extend, and that's noted as future work.

---

## 10. Where everything lives + how to run it

```
phishwise-api/src/detection/
├─ signals/
│  ├─ url-signals.ts        ← the 15 URL rules (weights, reasons, lessons)
│  ├─ message-signals.ts    ← the 8 message + Nigeria-local rules
│  ├─ brands.ts             ← the brands it can recognise (NG banks/telcos + globals)
│  └─ catalog.ts            ← combines rules + maps them to lessons
├─ url-analyzer.ts          ← all the URL matching logic
├─ message-analyzer.ts      ← message phrase matching + link extraction
├─ scoring.ts               ← the 0–100 sum + the 4 bands
├─ detection.engine.ts      ← the public entry point + the ML seam
├─ detection.service.ts     ← saving, stats, admin aggregates, Safe Browsing
├─ detection.controller.ts  ← the API endpoints
├─ scan.entity.ts           ← the "scans" database table
├─ safe-browsing.service.ts ← optional online check
└─ __tests__/engine.spec.ts ← the 20-case test corpus
```

**Run the engine tests** (from `phishwise-api/`):
```bash
npm run test:detection
```
This runs 20 labelled cases — known-phishing and known-good URLs and messages, including the Nigerian vishing/smishing/prize scams — and prints a pass/fail table. All 20 currently pass.

**Try it in the app:** sign in, open **Detection → Analyze**, click *Try an example*, then *Analyze*. Your scan appears under **Scan History**.

---

## 11. The one-paragraph version (for when you're put on the spot)

> "PhishWise's detector takes a URL or a pasted message and scores it 0–100 with a transparent, rule-based engine. Every point comes from one of 23 named signals — look-alike domains, IP hosts, urgency language, OTP/BVN requests, Nigerian vishing and smishing scripts, prize bait, and so on — and each signal carries a plain-language reason and links to the lesson that teaches it. Messages have their links extracted and analysed too. The score maps to Safe / Suspicious / Likely Phishing / Dangerous. It runs fully offline and deterministically, so it's demo-safe and completely explainable. I deliberately used rules, not machine learning, so I can defend every score; I designed an ML 'second-opinion' seam for future work. Signed-in scans are saved and earn XP and detection badges; a public version on the landing page lets anyone try it without an account."
