import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../lib/store.jsx";
import { Breadcrumbs, PageHeader } from "../components/layout.jsx";
import {
  Icon, Button, Card, Chip, Tabs, Field, Avatar, PasswordStrength, Modal, ProgressBar,
} from "../components/ui.jsx";
import { LESSONS } from "../data/lessons.js";
import { authApi } from "../lib/api";
import { BADGES } from "../data/mock.js";

export default function Profile() {
  const { user, updateUser, progress, level, theme, setTheme, resetProgress, toast, logout } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState("profile");

  /* profile form */
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [org, setOrg] = useState(user?.org || "");
  const [profileErrors, setProfileErrors] = useState({});
  const [saving, setSaving] = useState(false);

  /* password form */
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwErrors, setPwErrors] = useState({});
  const [showPw, setShowPw] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!name.trim()) errs.name = "Name is required.";
    setProfileErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await updateUser({ name: name.trim() });
      toast("Profile updated", "Your details were saved.", "success");
    } catch (err) {
      toast("Couldn't save", err.message || "Please try again.", "info");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!curPw) errs.cur = "Enter your current password.";
    if (newPw.length < 8) errs.new = "New password must be at least 8 characters.";
    if (newPw !== confirmPw) errs.confirm = "Passwords do not match.";
    setPwErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await authApi.changePassword(curPw, newPw);
      setCurPw(""); setNewPw(""); setConfirmPw("");
      toast("Password changed", "Your password was updated successfully.", "success");
    } catch (err) {
      setPwErrors({ cur: err.message || "Couldn't change password." });
    }
  };

  const pct = Math.round((progress.completedLessons.length / LESSONS.length) * 100);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Profile" }]} />
      <PageHeader title="Profile & settings" subtitle="Manage your account, security, and preferences." />

      {/* identity card */}
      <Card className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center">
        <Avatar name={user?.name} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">{user?.name}</h2>
            <Chip tone={user?.role === "admin" ? "violet" : "teal"} className="capitalize">{user?.role}</Chip>
          </div>
          <p className="text-sm text-ink-500 dark:text-ink-300">{user?.email}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-500 dark:text-ink-300">
            <span className="inline-flex items-center gap-1"><Icon name="Zap" size={13} className="text-amberx-500" /> {progress.xp} XP · {level.name}</span>
            <span className="inline-flex items-center gap-1"><Icon name="Flame" size={13} className="text-orange-500" /> {progress.streak}-day streak</span>
            <span className="inline-flex items-center gap-1"><Icon name="Award" size={13} className="text-amberx-500" /> {progress.badges.length}/{BADGES.length} badges</span>
          </div>
        </div>
        <div className="w-full sm:w-48">
          <p className="mb-1 text-xs font-medium text-ink-400 dark:text-ink-400">Curriculum progress</p>
          <ProgressBar value={pct} />
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">{pct}% complete</p>
        </div>
      </Card>

      <Tabs
        tabs={[
          { id: "profile", label: "Edit profile" },
          { id: "security", label: "Security" },
          { id: "preferences", label: "Preferences" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "profile" && (
        <Card className="max-w-xl p-6">
          <form onSubmit={saveProfile} className="space-y-4" noValidate>
            <Field label="Full name" error={profileErrors.name}>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
            <Field label="Email address" hint="Your email is your account ID and can't be changed here.">
              <input className="input opacity-70 cursor-not-allowed" type="email" value={email} readOnly autoComplete="email" />
            </Field>
            <Field label="Organisation / school" hint="Optional — shown on your certificate.">
              <input className="input" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="e.g. University of Abuja" />
            </Field>
            <div className="pt-1">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? <><Icon name="Loader2" size={16} className="animate-spin" /> Saving…</> : <><Icon name="Save" size={16} /> Save changes</>}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {tab === "security" && (
        <div className="grid max-w-3xl gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="mb-4 font-display text-sm font-semibold text-ink-900 dark:text-white">Change password</h3>
            <form onSubmit={changePassword} className="space-y-4" noValidate>
              <Field label="Current password" error={pwErrors.cur}>
                <input className="input" type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} autoComplete="current-password" />
              </Field>
              <Field label="New password" error={pwErrors.new}>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPw ? "text" : "password"}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 dark:hover:text-ink-200"
                  >
                    <Icon name={showPw ? "EyeOff" : "Eye"} size={16} />
                  </button>
                </div>
                <PasswordStrength value={newPw} />
              </Field>
              <Field label="Confirm new password" error={pwErrors.confirm}>
                <input className="input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" />
              </Field>
              <Button type="submit" variant="primary"><Icon name="KeyRound" size={16} /> Update password</Button>
            </form>
          </Card>

          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="mb-3 font-display text-sm font-semibold text-ink-900 dark:text-white">Account security</h3>
              <ul className="space-y-3">
                <li className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Icon name="ShieldCheck" size={17} className="mt-0.5 text-emerald-500" />
                    <div>
                      <p className="text-sm font-medium text-ink-800 dark:text-ink-100">Two-factor authentication</p>
                      <p className="text-xs text-ink-400 dark:text-ink-400">Protect sign-ins with a second step.</p>
                    </div>
                  </div>
                  <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => toast("2FA", "Two-factor setup is a demo placeholder.", "info")}>Enable</Button>
                </li>
                <li className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Icon name="MonitorSmartphone" size={17} className="mt-0.5 text-signal-500" />
                    <div>
                      <p className="text-sm font-medium text-ink-800 dark:text-ink-100">Active sessions</p>
                      <p className="text-xs text-ink-400 dark:text-ink-400">1 device · Abuja, NG (this browser)</p>
                    </div>
                  </div>
                  <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => toast("Sessions", "All other sessions signed out (demo).", "success")}>Sign out others</Button>
                </li>
                <li className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Icon name="BellRing" size={17} className="mt-0.5 text-amberx-500" />
                    <div>
                      <p className="text-sm font-medium text-ink-800 dark:text-ink-100">Login alerts</p>
                      <p className="text-xs text-ink-400 dark:text-ink-400">Email me about new sign-ins.</p>
                    </div>
                  </div>
                  <Chip tone="green">On</Chip>
                </li>
              </ul>
            </Card>

            <Card className="border-rose-200 p-6 dark:border-rose-900/60">
              <h3 className="mb-1 font-display text-sm font-semibold text-rose-600 dark:text-rose-400">Danger zone</h3>
              <p className="mb-4 text-xs text-ink-500 dark:text-ink-300">
                Reset wipes your XP, badges, streak, and lesson/quiz progress on this device.
              </p>
              <Button variant="danger" onClick={() => setResetOpen(true)}>
                <Icon name="Trash2" size={15} /> Reset my progress
              </Button>
            </Card>
          </div>
        </div>
      )}

      {tab === "preferences" && (
        <Card className="max-w-xl divide-y divide-ink-100 p-0 dark:divide-ink-700">
          <div className="flex items-center justify-between gap-3 p-5">
            <div className="flex items-start gap-2.5">
              <Icon name={theme === "dark" ? "Moon" : "Sun"} size={18} className="mt-0.5 text-signal-500" />
              <div>
                <p className="text-sm font-medium text-ink-800 dark:text-ink-100">Appearance</p>
                <p className="text-xs text-ink-400 dark:text-ink-400">Currently using {theme} mode.</p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="!px-3 !py-1.5 text-xs">
              Switch to {theme === "dark" ? "light" : "dark"}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 p-5">
            <div className="flex items-start gap-2.5">
              <Icon name="Mail" size={18} className="mt-0.5 text-signal-500" />
              <div>
                <p className="text-sm font-medium text-ink-800 dark:text-ink-100">Weekly digest email</p>
                <p className="text-xs text-ink-400 dark:text-ink-400">A summary of your streak and new lessons.</p>
              </div>
            </div>
            <Chip tone="green">On</Chip>
          </div>
          <div className="flex items-center justify-between gap-3 p-5">
            <div className="flex items-start gap-2.5">
              <Icon name="LogOut" size={18} className="mt-0.5 text-rose-500" />
              <div>
                <p className="text-sm font-medium text-ink-800 dark:text-ink-100">Sign out</p>
                <p className="text-xs text-ink-400 dark:text-ink-400">End your session on this device.</p>
              </div>
            </div>
            <Button variant="danger" className="!px-3 !py-1.5 text-xs" onClick={() => { logout(); navigate("/login"); }}>
              Log out
            </Button>
          </div>
        </Card>
      )}

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset all progress?">
        <p className="text-sm text-ink-600 dark:text-ink-300">
          This clears your XP, level, badges, streak, bookmarks, and quiz history stored in this browser. It can't be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setResetOpen(false)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => {
              resetProgress();
              setResetOpen(false);
            }}
          >
            Yes, reset everything
          </Button>
        </div>
      </Modal>
    </div>
  );
}
