import { useMemo, useState, useEffect } from "react";
import { useApp } from "../lib/store.jsx";
import { contentApi } from "../lib/api";
import { BADGES, LEADERBOARD, todaysChallenge, LEVELS } from "../data/mock.js";
import { LESSONS } from "../data/lessons.js";
import { Breadcrumbs, PageHeader } from "../components/layout.jsx";
import {
  Icon, Button, Card, Chip, ProgressBar, ProgressRing, Tabs, Modal, Avatar,
} from "../components/ui.jsx";

const TIER_STYLE = {
  bronze: "from-orange-200 to-amber-100 text-amber-800 dark:from-orange-900/50 dark:to-amber-900/40 dark:text-amber-300",
  silver: "from-slate-200 to-slate-100 text-slate-700 dark:from-slate-700 dark:to-slate-800 dark:text-slate-200",
  gold: "from-amberx-300 to-yellow-200 text-yellow-800 dark:from-amberx-700/60 dark:to-yellow-900/50 dark:text-amberx-300",
};

function BadgeCard({ badge, unlocked }) {
  return (
    <Card
      className={`flex flex-col items-center p-5 text-center transition ${
        unlocked ? "hover:shadow-lift" : "opacity-60 grayscale"
      }`}
    >
      <span
        className={`mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${TIER_STYLE[badge.tier]}`}
      >
        <Icon name={unlocked ? badge.icon : "Lock"} size={24} />
      </span>
      <p className="font-display text-sm font-semibold text-ink-900 dark:text-white">{badge.name}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-500 dark:text-ink-300">{badge.desc}</p>
      <Chip tone={unlocked ? "green" : "ink"} className="mt-3 capitalize">
        {unlocked ? "Unlocked" : `${badge.tier} · locked`}
      </Chip>
    </Card>
  );
}

function Leaderboard() {
  const { user, progress } = useApp();
  const [serverRows, setServerRows] = useState(null);

  useEffect(() => {
    let alive = true;
    contentApi
      .leaderboard()
      .then((rows) => { if (alive) setServerRows(rows); })
      .catch(() => { if (alive) setServerRows(null); });
    return () => { alive = false; };
  }, []);

  const rows = useMemo(() => {
    if (serverRows && serverRows.length) {
      return serverRows.map((r) => ({
        name: r.isCurrentUser ? `${r.name} (you)` : r.name,
        xp: r.xp,
        streak: r.streak,
        badges: r.badges,
        me: r.isCurrentUser,
      }));
    }
    // Fallback: blend the static board with the current user.
    const me = {
      name: `${user?.name || "You"} (you)`,
      xp: progress.xp,
      streak: progress.streak,
      badges: progress.badges.length,
      me: true,
    };
    return [...LEADERBOARD, me].sort((a, b) => b.xp - a.xp);
  }, [serverRows, user, progress]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-ink-100 p-4 dark:border-ink-700">
        <h2 className="font-display text-sm font-semibold text-ink-900 dark:text-white">Weekly leaderboard</h2>
        <Chip tone="teal"><Icon name="Users" size={13} /> {rows.length} learners</Chip>
      </div>
      <ol>
        {rows.map((r, i) => {
          const lvl = LEVELS.filter((l) => r.xp >= l.minXp).at(-1);
          return (
            <li
              key={r.name}
              className={`flex items-center gap-3 border-b border-ink-50 px-4 py-3 last:border-0 dark:border-ink-700/60 ${
                r.me ? "bg-signal-50/70 dark:bg-signal-900/20" : ""
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  i === 0
                    ? "bg-amberx-100 text-amberx-700 dark:bg-amberx-900/40 dark:text-amberx-400"
                    : i === 1
                    ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    : i === 2
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                    : "text-ink-400 dark:text-ink-400"
                }`}
              >
                {i + 1}
              </span>
              <Avatar name={r.name.replace(" (you)", "")} size={34} />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${r.me ? "text-signal-700 dark:text-signal-300" : "text-ink-800 dark:text-ink-100"}`}>
                  {r.name}
                </p>
                <p className="text-[11px] text-ink-400 dark:text-ink-400">{lvl?.name}</p>
              </div>
              <span className="hidden items-center gap-1 text-xs text-ink-500 sm:inline-flex dark:text-ink-300">
                <Icon name="Flame" size={13} className="text-orange-500" /> {r.streak}d
              </span>
              <span className="hidden items-center gap-1 text-xs text-ink-500 sm:inline-flex dark:text-ink-300">
                <Icon name="Award" size={13} className="text-amberx-500" /> {r.badges}
              </span>
              <span className="w-20 text-right text-sm font-bold tabular-nums text-ink-900 dark:text-white">
                {r.xp.toLocaleString()} XP
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function CertificatePreview({ open, onClose }) {
  const { user, progress, level } = useApp();
  const pct = Math.round((progress.completedLessons.length / LESSONS.length) * 100);
  return (
    <Modal open={open} onClose={onClose} title="Certificate preview" wide>
      <div className="rounded-2xl border-4 border-double border-signal-600/60 bg-gradient-to-br from-white to-signal-50 p-8 text-center dark:from-ink-800 dark:to-ink-900">
        <span className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-600 text-white">
          <Icon name="ShieldCheck" size={28} />
        </span>
        <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-signal-700 dark:text-signal-400">
          PhishWise · Certificate of Completion
        </p>
        <h3 className="mt-4 font-display text-2xl font-bold text-ink-900 dark:text-white">
          {user?.name || "PhishWise Learner"}
        </h3>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-600 dark:text-ink-300">
          has demonstrated proficiency in phishing awareness and cyber hygiene, completing{" "}
          <strong>{progress.completedLessons.length}</strong> micro-lessons ({pct}% of the curriculum) and reaching the
          rank of <strong>{level.name}</strong>.
        </p>
        <div className="mx-auto mt-6 flex max-w-xs items-end justify-between text-left text-xs text-ink-500 dark:text-ink-400">
          <div>
            <p className="border-t border-ink-300 pt-1 font-medium dark:border-ink-500">Programme Director</p>
            <p>PhishWise Academy</p>
          </div>
          <div className="text-right">
            <p className="border-t border-ink-300 pt-1 font-medium dark:border-ink-500">Date issued</p>
            <p>{new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-ink-400 dark:text-ink-400">
        Demo preview — certificate unlocks fully at 100% lesson completion.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button variant="primary"><Icon name="Download" size={15} /> Download (demo)</Button>
      </div>
    </Modal>
  );
}

export default function Achievements() {
  const { progress, level, completeDailyChallenge } = useApp();
  const [tab, setTab] = useState("badges");
  const [certOpen, setCertOpen] = useState(false);
  const challenge = todaysChallenge();
  const todayKey = new Date().toISOString().slice(0, 10);
  const challengeDone = !!progress.dailyChallenge?.[todayKey];
  const [picked, setPicked] = useState(null);

  const levelPct = level.pct;

  const answerChallenge = (idx) => {
    if (challengeDone || picked !== null) return;
    setPicked(idx);
    completeDailyChallenge(idx === challenge.answer);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Achievements" }]} />
      <PageHeader
        title="Achievements & rewards"
        subtitle="Track XP, unlock badges, keep your streak alive, and climb the leaderboard."
        action={
          <Button variant="secondary" onClick={() => setCertOpen(true)}>
            <Icon name="ScrollText" size={16} /> Certificate preview
          </Button>
        }
      />

      {/* rewards summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 p-5">
          <ProgressRing value={levelPct} size={62} stroke={6} label={`L${level.level}`} />
          <div>
            <p className="text-xs font-medium text-ink-400 dark:text-ink-400">Current level</p>
            <p className="font-display text-base font-bold text-ink-900 dark:text-white">{level.name}</p>
            <p className="text-xs text-ink-500 dark:text-ink-300">
              {level.next ? `${level.toNext} XP to ${level.next.name}` : "Max level reached"}
            </p>
          </div>
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-ink-400 dark:text-ink-400">
            <Icon name="Zap" size={14} className="text-amberx-500" /> Total XP
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-ink-900 dark:text-white">{progress.xp.toLocaleString()}</p>
          <ProgressBar value={levelPct} className="mt-2" tone="amber" />
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-ink-400 dark:text-ink-400">
            <Icon name="Flame" size={14} className="text-orange-500" /> Learning streak
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-ink-900 dark:text-white">{progress.streak} days</p>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">Learn daily to keep it alive</p>
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-ink-400 dark:text-ink-400">
            <Icon name="Award" size={14} className="text-amberx-500" /> Badges unlocked
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-ink-900 dark:text-white">
            {progress.badges.length}<span className="text-base font-medium text-ink-400"> / {BADGES.length}</span>
          </p>
          <ProgressBar value={(progress.badges.length / BADGES.length) * 100} className="mt-2" />
        </Card>
      </div>

      <Tabs
        tabs={[
          { id: "badges", label: `Badges (${progress.badges.length}/${BADGES.length})` },
          { id: "leaderboard", label: "Leaderboard" },
          { id: "daily", label: "Daily challenge" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "badges" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {BADGES.map((b) => (
            <BadgeCard key={b.id} badge={b} unlocked={progress.badges.includes(b.id)} />
          ))}
        </div>
      )}

      {tab === "leaderboard" && <Leaderboard />}

      {tab === "daily" && (
        <Card className="mx-auto max-w-2xl p-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amberx-50 dark:bg-amberx-900/30">
              <Icon name="Target" size={19} className="text-amberx-600 dark:text-amberx-400" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-ink-900 dark:text-white">Today's challenge</h2>
              <p className="text-xs text-ink-400 dark:text-ink-400">{`A fresh question every day · +${challenge.xp} XP`}</p>
            </div>
            {challengeDone && <Chip tone="green" className="ml-auto"><Icon name="Check" size={13} /> Done today</Chip>}
          </div>
          <p className="mt-5 text-[15px] font-medium leading-relaxed text-ink-800 dark:text-ink-100">{challenge.desc}</p>
          <div className="mt-4 space-y-2.5">
            {challenge.options.map((opt, idx) => {
              const show = challengeDone || picked !== null;
              let style = "border-ink-200 bg-white hover:border-amberx-300 dark:border-ink-600 dark:bg-ink-800";
              if (show) {
                if (idx === challenge.answer) style = "border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/25";
                else if (idx === picked) style = "border-rose-400 bg-rose-50 dark:border-rose-500 dark:bg-rose-900/25";
                else style = "border-ink-200 opacity-60 dark:border-ink-600";
              }
              return (
                <button
                  key={idx}
                  onClick={() => answerChallenge(idx)}
                  disabled={show}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm font-medium text-ink-800 transition dark:text-ink-100 ${style}`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink-300 text-[11px] font-bold text-ink-500 dark:border-ink-500 dark:text-ink-300">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
          {(challengeDone || picked !== null) && (
            <p className="mt-4 rounded-xl bg-ink-50 p-3.5 text-[13px] leading-relaxed text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              <Icon name="Info" size={14} className="mr-1 inline" /> The correct answer is highlighted above. A new challenge drops tomorrow — keep the streak going.
            </p>
          )}
        </Card>
      )}

      <CertificatePreview open={certOpen} onClose={() => setCertOpen(false)} />
    </div>
  );
}
