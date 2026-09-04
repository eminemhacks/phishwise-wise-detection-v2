# PhishWise — Frontend (React + Vite)

The web client for **PhishWise**, a gamified phishing-awareness micro-learning platform built as a final-year cybersecurity project. This is the React single-page app; it talks to the **PhishWise API** (NestJS + PostgreSQL) for authentication and all user data.

> This app no longer simulates auth or progress in `localStorage`. Sign-in, lessons, quizzes, XP, badges, streaks, the leaderboard, and all admin data come from the backend API. (Only your light/dark theme preference is cached locally.)

## Tech Stack

- **React 18** + **Vite 5**
- **Tailwind CSS 3.4** (class-based dark mode)
- **react-router-dom v6**
- **Recharts** (charts) · **Framer Motion** (animation) · **lucide-react** (icons)

## Prerequisites

The backend must be running first. See `../phishwise-api/README.md` for the API setup (PostgreSQL, migrations, seed). By default the API runs on `http://localhost:4000`.

## Getting Started

```bash
npm install
cp .env.example .env      # adjust VITE_API_URL if your API isn't on :4000
npm run dev
```

Open **http://localhost:5173**.

To build for production:

```bash
npm run build
npm run preview
```

## Environment

| Variable       | Default                      | Purpose                         |
| -------------- | ---------------------------- | ------------------------------- |
| `VITE_API_URL` | `http://localhost:4000/api`  | Base URL of the PhishWise API   |

## Demo Logins

The API seed creates pre-verified demo accounts (password **`demo-pass`**):

| Role    | Email                     |
| ------- | ------------------------- |
| Admin   | `admin@phishwise.demo`    |
| Learner | `learner@phishwise.demo`  |

New accounts you register go through real email verification — the link is printed to the API server console when no SMTP server is configured.

## How auth works now

- Login returns a short-lived **access token** + a **refresh token**, stored in `localStorage` and sent as `Authorization: Bearer …`.
- The API client (`src/lib/api.js`) automatically refreshes the access token on a `401` and replays the request once.
- On app load, an existing session is restored by calling `/auth/me`; a loading splash shows until that resolves.

## Project Structure

```
src/
├─ lib/
│  ├─ api.js          # API client: token storage, auto-refresh, endpoint helpers
│  └─ store.jsx       # global state — auth + progress backed by the API
├─ data/              # static presentation constants (badges, levels, FAQs, copy)
├─ components/        # design-system primitives + app shell
└─ pages/             # Landing, Auth (login/register/verify/reset/onboarding),
                       Dashboard, Lessons, Quizzes, Achievements, Reports,
                       Profile, Help, Admin (Overview/Content/Users/Analytics)
```

Note: the files in `src/data/` still hold the lesson and quiz *content* used for rendering detail pages. This is the same content the API seeds into the database, kept client-side so lesson/quiz bodies render instantly. Anything user-specific or write-backed (progress, users, analytics, leaderboard, content CRUD) goes through the API.
