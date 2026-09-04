# PhishWise — Full-Stack Setup Guide

PhishWise is now a full-stack application:

```
phishwise/        → React + Vite frontend (the web client)
phishwise-api/    → NestJS + PostgreSQL backend (auth, data, gamification)
```

The frontend talks to the backend over HTTP. There is **no more `localStorage` simulation** — authentication and all user progress are real and persisted in PostgreSQL.

---

## Prerequisites

- **Node.js 18+**
- **PostgreSQL 13+** — running natively, or via **Docker** (easiest, see below)

---

## 1. Start the backend

```bash
cd phishwise-api
npm install
cp .env.example .env
```

Edit `.env` and set at minimum your Postgres credentials (`DB_*`) and two long random strings for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. Leave `MAIL_HOST` empty to have verification/reset emails printed to the console.

**Start PostgreSQL.** The simplest option is the included Docker Compose file, which uses the same credentials as `.env.example` and creates the database for you:

```bash
docker compose up -d          # Postgres on localhost:5432
```

(If you have Postgres installed natively instead, just run `createdb phishwise` once.)

Then run migrations, seed, and start the API:

```bash
npm run migration:run         # creates tables, enums, extensions (incl. the new scans table)
npm run seed                  # loads lessons/quizzes + demo users
npm run test:detection        # optional: run the detection-engine test corpus (20 cases)
npm run start:dev             # API on http://localhost:4000/api
```

Verify: open `http://localhost:4000/api/health` → should return `{ "status": "ok" }`.

---

## 2. Start the frontend

In a second terminal:

```bash
cd phishwise
npm install
cp .env.example .env          # default VITE_API_URL points at :4000
npm run dev                   # app on http://localhost:5173
```

Open **http://localhost:5173**.

---

## 3. Log in

Demo accounts (pre-verified, password **`demo-pass`**):

| Role    | Email                     |
| ------- | ------------------------- |
| Admin   | `admin@phishwise.demo`    |
| Learner | `learner@phishwise.demo`  |

Or register a new account — the verification link will appear in the **backend terminal** (since SMTP is disabled by default). Paste it into your browser to verify, then log in.

---

## The phishing detector (detection-first)

PhishWise now leads with a **rule-based phishing detector**. Paste a **URL** or a **message/email** and the engine returns a **0–100 risk score**, a **verdict** (Safe / Suspicious / Likely Phishing / Dangerous), an **itemised list of every triggered signal** with a plain-language reason, the **links extracted from a message** (each analysed on its own), and **related lessons** that teach whatever trick was detected.

- **Public "Try it"** lives on the landing page — no login, and public scans are **not saved**.
- **Signed-in scans are saved** to *Detector → Scan History*, and award XP + detection badges (First Catch, Sharp Detector, Scan Veteran, Threat Hunter).
- The engine is **fully offline and deterministic** — no external calls, no ML, no paid APIs. Every score point traces back to one rule in the catalog (`phishwise-api/src/detection/signals/`).
- Admins get a **Detection analytics** section (scan volume, verdict distribution, most-triggered signals) plus a read-only rule catalog under *Admin → Platform Reports*.

**Run the engine tests:** `npm run test:detection` (from `phishwise-api/`) runs a labelled corpus of known-phishing and known-good URLs and messages (including Nigerian vishing/smishing/prize scams) and asserts each lands in the right verdict band.

### Optional: Google Safe Browsing enrichment (off by default)

The detector never depends on the network, but you can optionally layer Google's free Safe Browsing lookup on top for URL scans:

1. Get a free key: <https://developers.google.com/safe-browsing/v4/get-started>
2. In `phishwise-api/.env` set `SAFE_BROWSING_ENABLED=true` and `GOOGLE_SAFE_BROWSING_API_KEY=<your-key>`.

If the key is missing or the call fails, the system silently falls back to the offline rules — a scan is always valid without it.

---

## What changed from the original demo

| Concern              | Before (demo)                        | Now                                                 |
| -------------------- | ------------------------------------ | --------------------------------------------------- |
| Primary purpose      | Education / gamification only         | **Phishing detection first**, education alongside   |
| Detection engine     | None                                 | Rule-based URL + message analyzer (23 signals)      |
| Scan history         | None                                 | Saved per signed-in user; public scans not saved    |
| Authentication       | Faked; any email/password accepted   | Real JWT auth, bcrypt-hashed passwords              |
| Email verification   | None                                 | Required for new sign-ups (console or SMTP)         |
| Password reset       | Simulated screen                     | Real tokenised reset flow via email link            |
| User progress        | `localStorage`                       | PostgreSQL, server-authoritative                    |
| XP / badges / streaks| Computed in the browser              | Computed on the server (can't be tampered with)     |
| Detection badges     | None                                 | Server-awarded for scanning + catching threats      |
| Leaderboard          | Static mock array                    | Built from real users                               |
| Admin users/analytics| Static mock arrays                   | Live aggregates from the database                   |
| Content CRUD         | Local component state                | Persisted via admin API endpoints                   |

---

## Troubleshooting

- **Frontend says "Can't reach the PhishWise server"** → the API isn't running, or `VITE_API_URL` doesn't match the API's port. Start the API and check `/api/health`.
- **CORS errors in the browser console** → set `CORS_ORIGIN=http://localhost:5173` in the API `.env` and restart it.
- **`migration:run` fails** → confirm PostgreSQL is running and the `DB_*` values in `.env` are correct, and that the `phishwise` database exists.
- **Login says "verify your email"** → check the API terminal for the verification link (demo mode), or use a seeded demo account.
