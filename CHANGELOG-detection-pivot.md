# PhishWise — Detection-First Pivot · Changelog

This release re-centres PhishWise around a **rule-based phishing detection engine**.
Everything from the previous education/gamification build is preserved; detection
is layered on top and promoted to the primary capability.

## Added

### Backend (`phishwise-api/`)
- **`src/detection/` module** — a self-contained, framework-free, offline rule engine:
  - `signals/` — the commented signal catalog: `url-signals.ts` (15 URL rules),
    `message-signals.ts` (8 message + Nigeria-local rules), `brands.ts`
    (impersonation targets, Nigeria-weighted), and `catalog.ts` (signal → lesson mapping).
  - `url-analyzer.ts` — registrable-domain resolution, look-alike/typosquat/homoglyph
    detection, IP hosts, `@`-tricks, suspicious TLDs, shorteners, credential paths, etc.
  - `message-analyzer.ts` — urgency, credential/OTP/BVN/NIN solicitation, prize bait,
    generic greetings, vishing/smishing, formatting anomalies, and URL extraction
    (each embedded link is run through the URL analyzer).
  - `scoring.ts` — transparent 0–100 additive scoring and the 4 verdict bands.
  - `detection.engine.ts` — public entry point; documents the **ML "second-opinion" seam**
    (`SecondOpinionProvider` / `blendSecondOpinion`) — intentionally NOT implemented.
  - `scan.entity.ts` + migration `1730000000000-AddScans.ts` — the `scans` table.
  - `detection.service.ts` / `detection.controller.ts` / `detection.module.ts`.
  - `safe-browsing.service.ts` — optional Google Safe Browsing enrichment (off by default).
  - `__tests__/engine.spec.ts` — labelled test corpus (`npm run test:detection`).
- **Endpoints** (respecting the global JWT guard / `@Public()`):
  - `POST /api/detection/scan` — public "Try it" (not saved)
  - `POST /api/detection/scans` — authenticated (saved + rewarded)
  - `GET  /api/detection/scans` — my history · `GET /api/detection/scans/:id` · `DELETE`
  - `GET  /api/detection/me/stats` — my detection stats
  - `GET  /api/detection/rules` — read-only rule catalog (public/educational)
  - `GET  /api/detection/admin/stats` — admin aggregates (role-guarded)
- **Gamification extended (not forked):** `SCAN_XP` + 4 detection badges
  (`first-catch`, `sharp-detector`, `scan-veteran`, `threat-hunter`) added to the existing
  server-authoritative engine; `ProgressService.applyScan` awards XP and recomputes badges.

### Frontend (`phishwise/`)
- **`src/pages/Detector.jsx`** — the Detector page, a shared `ScanResultView`
  (score gauge, verdict band, itemised signals, extracted-URL breakdown, related lessons),
  the **Scan History** page, and the public **`TryItWidget`** for the landing page.
- **`detectionApi`** added to `src/lib/api.js`; **`runScan`** action added to `src/lib/store.jsx`.
- New sidebar **Detection** section (Analyze + Scan History).
- Landing page hero now leads with the live public detector and up-sells Scan History.
- Dashboard re-centred on detection (detector CTA + live scan/threat stats) with learning demoted below.
- Detection badges surface automatically in Achievements; admin Platform Reports gain a
  **Detection analytics** section + read-only rule catalog.

## Preserved (unchanged behaviour)
- All auth, lessons, quizzes, achievements, reports, admin content/user management,
  the shared design system (`ui.jsx`/`layout.jsx`), the `Tabs` `{ id, label }` contract,
  and the `ErrorBoundary` wrapper.

## How to run the new features
```bash
# backend
cd phishwise-api
npm install
npm run migration:run      # includes the new scans table
npm run seed
npm run test:detection     # 20/20 engine tests
npm run start:dev

# frontend (second terminal)
cd phishwise
npm install
npm run dev                # http://localhost:5173  →  Detection → Analyze
```

## Verification performed
- Detection engine unit corpus: **20/20 pass** (URLs + messages incl. NG vishing/smishing/prize).
- `nest build` (backend) and `vite build` (frontend): **pass**.
- Live end-to-end against PostgreSQL: public + authenticated scans, save-only-when-authenticated,
  XP + badge award, history, per-user stats, and admin authorization (learner → 403).
- Headless render smoke-test of **all 19 routes** (learner + admin), back/forward navigation,
  and a functional in-browser detector scan: **no blank/black screens, all pass**.

## Notes / honest limitations
- The engine is **heuristic** — it can produce false positives and false negatives. Weights are
  tuned so obvious phishing lands in Likely Phishing/Dangerous and clean input in Safe, but it is
  a guide, not a guarantee. The UI states this on every result.
- **No machine learning** in this build by design (fully explainable, no dataset/serving, demo-safe).
  The ML angle is architected as a pluggable seam and written up as future work.
- File/attachment scanning is intentionally **out of scope**.
