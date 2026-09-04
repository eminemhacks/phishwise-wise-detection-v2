# PhishWise — Run Checklist (Windows 11)

Work top to bottom. Don't move on until each ✅ check passes.

---

## ☐ 0. One-time installs
- [ ] Node.js 18+ installed → verify: `node -v`
- [ ] Docker Desktop installed (docker.com) → installer may enable WSL 2; allow it

---

## ☐ 1. Start Docker Desktop
- [ ] Launch Docker Desktop
- [ ] Wait for the whale icon in the system tray to stop animating ("running")
- [ ] ✅ Check: `docker ps` returns a table (even if empty), NOT an error
      → If it errors, Docker isn't ready yet. Wait and retry.

---

## ☐ 2. Backend — database
Open **Terminal 1** (Git Bash or PowerShell):
```
cd phishwise-api
npm install
```
Copy the env file:
- Git Bash:    `cp .env.example .env`
- PowerShell:  `copy .env.example .env`

- [ ] Open `.env` and set BOTH:
      `JWT_ACCESS_SECRET=` (any long random string)
      `JWT_REFRESH_SECRET=` (a different long random string)
      (Leave MAIL_HOST empty — emails print to this terminal.)

Start Postgres:
```
docker compose up -d
```
- [ ] ✅ Check: `docker compose ps` shows `phishwise-db` as **healthy**
      → If "starting", wait ~5s and check again.

---

## ☐ 3. Backend — migrate, seed, run
Still in Terminal 1:
```
npm run migration:run
npm run seed
npm run test:detection
npm run start:dev
```
- [ ] If `migration:run` errors with "connection refused", the DB was still
      booting — just run it again.
- [ ] ✅ Check: `npm run test:detection` prints "20/20 passed" (the phishing
      detection engine test corpus).
- [ ] ✅ Check: open http://localhost:4000/api/health
      → should show {"status":"ok",...}
- [ ] Leave this terminal running (it's your live API + email console).

---

## ☐ 4. Frontend
Open **Terminal 2**:
```
cd phishwise
npm install
```
Copy the env file:
- Git Bash:    `cp .env.example .env`
- PowerShell:  `copy .env.example .env`
```
npm run dev
```
- [ ] ✅ Check: open http://localhost:5173

---

## ☐ 5. Log in
Demo accounts (password: `demo-pass`):
- Admin:   `admin@phishwise.demo`
- Learner: `learner@phishwise.demo`

Or register a new account → the verification link prints in **Terminal 1**
(the API console). Paste it into your browser, then log in.

---

## ☐ 6. Try the detector
- [ ] From the sidebar open **Detection → Analyze**.
- [ ] Click **Try an example**, then **Analyze** — you should see a risk score,
      a verdict band, an itemised list of signals, and related lessons.
- [ ] ✅ Check: the scan appears under **Detection → Scan History**.
- [ ] Logged out, the **landing page** has a public "Try the detector" widget
      (those scans are not saved).

---

## Common snags
| Symptom | Fix |
| --- | --- |
| `docker` command errors | Docker Desktop not fully started — wait for the whale icon |
| `migration:run` connection refused | DB still booting — re-run it, or wait for `healthy` |
| Frontend: "Can't reach the PhishWise server" | API not running, or wrong port — check Terminal 1 + `/api/health` |
| CORS error in browser console | Set `CORS_ORIGIN=http://localhost:5173` in API `.env`, restart API |
| Login says "verify your email" | Use a demo account, or grab the link from Terminal 1 |

## Stopping / restarting later
- Stop DB (keeps data):   `docker compose down`
- Start DB again:         `docker compose up -d`
- Wipe DB completely:     `docker compose down -v`  (then re-run migrate + seed)
