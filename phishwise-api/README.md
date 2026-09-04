# PhishWise — API (NestJS + PostgreSQL)

The backend for **PhishWise**, a gamified phishing-awareness training platform. It provides real JWT authentication (with email verification and password reset), a server-authoritative gamification engine (XP, levels, badges, streaks), lesson/quiz content, progress tracking, and admin management + analytics.

## Tech Stack

- **NestJS 10** (modular architecture, guards, DI)
- **PostgreSQL** via **TypeORM** (entities + SQL migrations)
- **JWT** access + refresh tokens (rotation) with **Passport**
- **bcryptjs** password hashing
- **Nodemailer** for verification / reset emails (console-preview fallback when no SMTP)
- **class-validator** request validation

## Prerequisites

- **Node.js 18+**
- **PostgreSQL 13+** — either running natively, or via Docker (see Option B below)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    then edit .env with your Postgres credentials and secrets
```

### Database — Option A: Docker (recommended)

A `docker-compose.yml` is included that spins up PostgreSQL 16 with credentials
matching `.env.example` (so no config changes needed). It also creates the
`phishwise` database for you, so you can skip the manual `createdb` step.

```bash
docker compose up -d        # starts Postgres on localhost:5432
```

(Or without compose: `docker run --name phishwise-db -e POSTGRES_USER=phishwise -e POSTGRES_PASSWORD=phishwise -e POSTGRES_DB=phishwise -p 5432:5432 -d postgres:16`)

The official image already includes the `citext` and `uuid-ossp` extensions the
migration needs. Data persists in a named volume across restarts;
`docker compose down -v` wipes it.

### Database — Option B: native PostgreSQL

If you have Postgres installed locally instead, create the database once:

```bash
createdb phishwise          # or: psql -c "CREATE DATABASE phishwise;"
```

### Then: migrate, seed, and run

```bash
npm run migration:run       # creates all tables + extensions
npm run seed                # loads lessons/quizzes + demo users
npm run start:dev           # http://localhost:4000/api
```

A quick health check: `GET http://localhost:4000/api/health` → `{ "status": "ok", ... }`.

## Environment Variables

See `.env.example` for the full list. Key ones:

| Variable                              | Purpose                                                        |
| ------------------------------------- | ------------------------------------------------------------- |
| `PORT`                                | API port (default `4000`)                                     |
| `CORS_ORIGIN`                         | Allowed frontend origin(s), comma-separated                   |
| `DB_*`                                | PostgreSQL connection                                         |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing secrets — **set these to long random strings** |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL`  | Token lifetimes (default `15m` / `7d`)                        |
| `MAIL_*`                              | SMTP settings. **Leave `MAIL_HOST` empty** to log emails (and verification/reset links) to the console instead of sending them — ideal for the demo. |
| `APP_URL`                             | Public frontend URL used inside email links                   |

## Email verification & password reset

When `MAIL_HOST` is empty, the server uses a console transport: registration and password-reset emails (including their clickable links) are printed to the API terminal. Copy the link into your browser to complete the flow. Configure real SMTP credentials to send actual email.

## Demo Accounts

Seeded and **pre-verified** (password `demo-pass`):

- `admin@phishwise.demo` — admin role (content CRUD, user management, analytics)
- `learner@phishwise.demo` — learner role

New sign-ups via `/auth/register` require email verification before login.
The role convention from the original demo is preserved: an email starting with `admin` is given the admin role.

## API Surface

```
Auth        POST   /auth/register | /auth/login | /auth/logout | /auth/refresh
            POST   /auth/verify-email | /auth/resend-verification
            POST   /auth/forgot-password | /auth/reset-password | /auth/change-password
            GET    /auth/me
Users       PATCH  /users/me
Content     GET    /categories | /lessons | /lessons/:id | /lessons/learning-path
            GET    /quizzes | /quizzes/:id | /daily-challenge | /leaderboard
Progress    GET    /progress
            POST   /progress/lessons/:id/complete | /progress/lessons/:id/bookmark
            POST   /progress/quizzes/record | /progress/daily-challenge | /progress/reset
Admin       GET    /admin/users          PATCH /admin/users/:id/status
            POST   /admin/lessons        PATCH/DELETE /admin/lessons/:id
            POST   /admin/quizzes        PATCH/DELETE /admin/quizzes/:id
            GET    /admin/analytics/overview | quiz-stats | category-completion | badge-distribution
```

All routes except `health`, content reads, and the auth endpoints require a Bearer access token. Admin routes additionally require the `admin` role.

## Architecture Notes

- **Server-authoritative gamification.** XP, level thresholds, badge rules, and streak logic live in `src/gamification/` and are recomputed on the server for every lesson completion, quiz submission, and daily challenge. The client cannot fabricate progress.
- **Daily challenge** answers are never sent to the client (`GET /daily-challenge` omits the answer); the client posts whether the user was correct and the server awards XP.
- **Tokens for email flows** are stored only as SHA-256 hashes with expiry and single-use consumption. Refresh tokens are hashed and rotated on every refresh.
- **Uniform responses** on forgot-password and resend-verification avoid leaking which emails are registered.

## Project Structure

```
src/
├─ main.ts                 # bootstrap: CORS, global validation, /api prefix
├─ app.module.ts           # root module, global JWT guard + exception filter
├─ config/                 # typed configuration from env
├─ common/                 # guards (JWT, roles), decorators, exception filter
├─ auth/                   # register, login, JWT strategy, email/reset tokens
├─ users/                  # profile updates
├─ lessons/                # content: categories, lessons, quizzes, leaderboard
├─ progress/               # progress entity + gamification mutations
├─ gamification/           # levels, badges, streak engine, daily challenges
├─ admin/                  # user management, content CRUD, analytics
├─ mail/                   # SMTP / console mail service
└─ database/
   ├─ data-source.ts       # TypeORM CLI data source
   ├─ migrations/          # InitSchema (tables, enums, citext)
   └─ seeds/               # content + demo-user seeder
```
