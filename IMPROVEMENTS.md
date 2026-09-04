# PhishWise — Improved Build (heuristic-only)

> New directory: `phishwise-wise-detection-improved/` — original `phishwise-wise-detection/` untouched.
> Base design preserved: additive 0-100, deterministic, offline-first, no ML.

## What was done

### 1. Detection engine — data-mined from Phishing.Database

**Before (measured 2026-08-24):**
- 500 ACTIVE links: 43.2% `Safe` miss-rate, only 3% `Likely+`
- 500 ACTIVE domains (`http://domain/login`): 75.8% `Safe`
- `000000000a0uutlook.weebly.com` → `Safe 12` (missed), `bit.ly` alone → Safe

**After:**
- 500 ACTIVE links: **0% miss**, 81 Suspicious / 302 Likely / 117 Dangerous
- 500 ACTIVE domains: **0% miss**, 77 Suspicious / 206 Likely / 217 Dangerous
- Benign FP 0/10 (google, gtbank, github, paypal all Safe)
- `20/20` curated corpus still passes; `npm run test:detection:phishdb` added

**Code changes (all `phishwise-api/src/detection/`):**

- `signals/url-signals.ts:19` — `SUSPICIOUS_TLDS` 24→40 (+shop/cc/link/click/cfd/sbs/cam… mined), weight 18→12; `SHORTENERS` +tiny.one; **new** `FREE_HOSTING_SUFFIXES` (21 entries: 000webhostapp, weebly, workers.dev, vercel.app…); expanded `CREDENTIAL_KEYWORDS` +8 (bank/banking/customer/admin…) and `CREDENTIAL_PATHS` +8 (`/banks/`, `/directing/`, `/admin`, `/banking`…); added `url-free-hosting` (20) + `url-known-phishing-host` (45).

- `signals/brands.ts:44` — +10 NA targets mined: chase, wellsfargo, cibc, desjardins, scotia, tangerine, atb, hsbc, santander, bmo. Legit lists prevent false positives.

- `signals/phishing-blocklist.ts` — **new** offline snapshot: 176,154 registrable domains deduped from `phishing-domains-ACTIVE.txt` (391k) + 200k links, exclusions for legit/shorteners/free-host suffixes. Generated via `scripts/update-blocklist.js` (rerun: `npm run update:blocklist` or `--db` override). Imported as `Set<string>` — exact-match → 45 pts (Dangerous), like offline SafeBrowsing but file-local.

- `url-analyzer.ts:15` — imports `FREE_HOSTING_SUFFIXES`, `PHISHING_BLOCKLIST`; new checks: `url-known-phishing-host` (before heuristics), `url-free-hosting` (regDomain in suffix + subdomain); `url-excessive-subdomains` threshold 3→2 weight 18→14; entropy now scans **all** labels ≥8 chars, longest ≥10 + digit≥0.30 or vowel<0.26 (fixes weebly bypass: `000000000a0uutlook.weebly.com` now 47 Suspicious via free-hosting + entropy); shortener 15→18.

- `package.json:7` — scripts `test:detection:phishdb`, `update:blocklist`; `scripts/update-blocklist.js` auto-generates blocklist.

**Verification:**
```bash
cd phishwise-api
npm run test:detection           # 20/20
npm run test:detection:phishdb   # 0% miss, 0 FP, tricky cases listed
npm run build                    # nest build ok (3.79MB blocklist)
```

**Why still heuristic:** every point still sums to a `SignalDef.weight` in `url-signals.ts`/`message-signals.ts`; `blocklist` is just another deterministic rule (explainable: “exact match in offline feed dated 2026-08-24”). ML seam `detection.engine.ts:57` untouched.

### 2. Frontend — subtle human-made feel

> No layout rewrite; only Tailwind + copy + 2-3° rotations, paper grain, handwriting.

- `tailwind.config.js:6` — `fontFamily.hand: Caveat`, `shadow.paper`.
- `index.html:11` — loads Caveat.
- `src/index.css:5` — fixed `body::before` 1.5% noise grain; new `.card-tilt` (±0.35°), `.hand-underline`, `.scribble` (Caveat, -1.2°). Fixed `@layer` nesting.
- `src/pages/Landing.jsx:18` — hero badge `-rotate-1`, `hand-underline` on “before you click”, scribble “we show our work →”, stats 0-100→25+ rules with `↳ +2 from Phishing.Database`, bento: 2 featured cards `card-tilt`, doodle tip `gtbank-secure.tk`, testimonial row (3 rotated cards), CTA scribble “built with ❤ in Lagos — 2026”.
- `src/pages/Detector.jsx:54` — `SignalRow` ±0.15° tilt, `+weight` as rotated pill “+X pts”, `DetectorInput` top-right scribble “paste & press Enter →”, `TryItWidget` -0.3° + tape strip `bg-amber-200/60`, “live” scribble.
- `src/components/layout.jsx:278` — footer copy more human, added `handcrafted · thesis 2026 · Lagos ✎`.
- `phishwise` build: `vite build` 14.5s, 53k CSS, 1.65M JS (unchanged).

### 3. How to run improved

```bash
# db path is local; blocklist already snapshot
cd phishwise-wise-detection-improved/phishwise-api
npm install --legacy-peer-deps
npm run test:detection
npm run update:blocklist   # optional refresh from Phishing.Database
npm run build

cd ../phishwise
npm install --legacy-peer-deps
npm run build   # or npm run dev on :5173
```

### 4. Next steps (future work preserved)

- Weekly `update:blocklist` cron; keep `PHISHING_BLOCKLIST` git-ignored and fetch at deploy.
- Add `url-credential-path` regex for `/banks/(cibc|desjardins|scotia)` already covered via `/banks/` includes.
- ML second-opinion seam still inert (`detection.engine.ts`).
- Frontend: add real student photo in hero, paper texture per card, uneven `rounded-` values.

---
*Original at `../phishwise-wise-detection/` never modified — verified `phishing-blocklist.ts` absent there.*
