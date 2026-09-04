import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../lib/store";
import { detectionApi } from "../lib/api";
import { PageHeader } from "../components/layout";
import { Icon, Card, Button, Chip, ProgressBar, ProgressRing, EmptyState, DifficultyChip } from "../components/ui";
import { LESSONS, CATEGORIES } from "../data/lessons";
import { BADGES, todaysChallenge } from "../data/mock";

function DailyChallengeCard() {
  const { progress, completeDailyChallenge } = useApp();
  const ch = todaysChallenge();
  const today = new Date().toISOString().slice(0, 10);
  const done = progress.dailyChallenge[today];
  const [picked, setPicked] = useState(null);

  return (
    <Card className="relative overflow-hidden p-5">
      <Icon name="Swords" className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 text-amber-500/10" />
      <div className="flex items-center justify-between">
        <Chip tone="amber"><Icon name="Swords" className="w-3 h-3" /> Daily challenge</Chip>
        <Chip tone="teal">+{ch.xp} XP</Chip>
      </div>
      <h3 className="mt-3 font-bold">{ch.title}</h3>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">{ch.desc}</p>
      {done ? (
        <div className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-sm font-medium ${done.correct ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
          <Icon name={done.correct ? "CheckCircle2" : "Clock"} className="w-5 h-5" />
          {done.correct ? "Completed today — come back tomorrow!" : "Answered today — a new challenge arrives tomorrow."}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {ch.options.map((o, i) => (
            <button key={i} onClick={() => setPicked(i)}
              className={`w-full rounded-xl border p-3 text-left text-sm transition ${picked === i ? "border-signal-500 bg-signal-500/10 font-medium" : "border-ink-200 hover:border-signal-300 dark:border-ink-700"}`}>
              {o}
            </button>
          ))}
          <Button className="w-full" disabled={picked === null} onClick={() => completeDailyChallenge(picked === ch.answer)}>Submit answer</Button>
        </div>
      )}
    </Card>
  );
}

function DetectorCard() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let alive = true;
    detectionApi.myStats().then((s) => alive && setStats(s)).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <Card className="relative overflow-hidden border-signal-200 p-5 dark:border-signal-800/60">
      <Icon name="ScanSearch" className="pointer-events-none absolute -right-5 -top-5 h-28 w-28 text-signal-500/10" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Chip tone="teal"><Icon name="ShieldCheck" className="h-3 w-3" /> Phishing detector</Chip>
          <h2 className="mt-2 font-bold text-lg">Spotted something suspicious?</h2>
          <p className="mt-1 max-w-md text-sm text-ink-500 dark:text-ink-300">
            Paste a link or a message and get an instant, explainable risk score with the exact red flags — and the lessons behind them.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button as={Link} to="/detector" size="sm"><Icon name="ScanSearch" className="h-4 w-4" /> Open detector</Button>
            <Button as={Link} to="/scan-history" size="sm" variant="secondary"><Icon name="History" className="h-4 w-4" /> Scan history</Button>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-signal-600 dark:text-signal-400">{stats?.totalScans ?? 0}</p>
            <p className="text-xs text-ink-400">scans run</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-rose-500">{stats?.threatsCaught ?? 0}</p>
            <p className="text-xs text-ink-400">threats caught</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { user, progress, level } = useApp();
  const completedSet = new Set(progress.completedLessons);
  const overallPct = Math.round((progress.completedLessons.length / LESSONS.length) * 100);

  const continueLesson = useMemo(() => LESSONS.find((l) => !completedSet.has(l.id)), [progress.completedLessons]);
  const recommended = useMemo(() => LESSONS.filter((l) => !completedSet.has(l.id)).slice(1, 4), [progress.completedLessons]);
  const recentQuizzes = progress.quizHistory.slice(0, 3);
  const recentBadges = progress.badges.slice(-3).map((id) => BADGES.find((b) => b.id === id)).filter(Boolean);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-7xl">
      {/* Welcome banner */}
      <Card className="relative mb-6 overflow-hidden border-0 bg-gradient-to-br from-ink-900 via-ink-800 to-signal-800 p-6 text-white sm:p-8">
        <Icon name="ShieldCheck" className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 opacity-10" />
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-sm text-signal-200">{greeting},</p>
            <h1 className="text-2xl font-bold sm:text-3xl">{user?.name} 👋</h1>
            <p className="mt-1.5 max-w-md text-sm text-ink-200">
              {progress.streak > 0 ? `You're on a ${progress.streak}-day streak. One lesson keeps it alive.` : "Complete any lesson or quiz today to start a streak."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button as={Link} to="/detector" variant="amber" size="sm"><Icon name="ScanSearch" className="w-4 h-4" /> Analyze something suspicious</Button>
              <Button as={Link} to={continueLesson ? `/lessons/${continueLesson.id}` : "/lessons"} size="sm" className="bg-white/15 hover:bg-white/25"><Icon name="Play" className="w-4 h-4" /> Continue learning</Button>
              <Button as={Link} to="/quizzes" size="sm" className="bg-white/15 hover:bg-white/25"><Icon name="ClipboardList" className="w-4 h-4" /> Take a quiz</Button>
            </div>
          </div>
          {/* Gamification widget */}
          <div className="flex items-center gap-5 rounded-2xl bg-white/10 p-5 backdrop-blur">
            <ProgressRing value={level.pct} size={84} stroke={7} label={`Lv ${level.level}`} sub={level.name} />
            <div className="space-y-1.5 text-sm">
              <p className="flex items-center gap-2"><Icon name="Sparkles" className="w-4 h-4 text-amberx-400" /><span className="font-bold">{progress.xp}</span><span className="text-ink-300">XP earned</span></p>
              <p className="flex items-center gap-2"><Icon name="Flame" className="w-4 h-4 text-amberx-400" /><span className="font-bold">{progress.streak}</span><span className="text-ink-300">day streak</span></p>
              <p className="flex items-center gap-2"><Icon name="Award" className="w-4 h-4 text-amberx-400" /><span className="font-bold">{progress.badges.length}</span><span className="text-ink-300">/ {BADGES.length} badges</span></p>
              <p className="text-xs text-ink-300">{level.next ? `${level.toNext} XP to ${level.next.name}` : "Max level reached!"}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2/3 */}
        <div className="space-y-6 lg:col-span-2">
          <DetectorCard />
          {/* Continue learning */}
          <section aria-label="Continue learning">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-lg">Continue learning</h2>
              <Link to="/lessons" className="text-sm font-medium text-signal-600 hover:underline">View library →</Link>
            </div>
            {continueLesson ? (
              <Card className="flex flex-wrap items-center gap-5 p-5">
                <div className={`rounded-2xl p-4 ${CATEGORIES.find((c) => c.id === continueLesson.category)?.bg}`}>
                  <Icon name={CATEGORIES.find((c) => c.id === continueLesson.category)?.icon || "BookOpen"} className={`w-7 h-7 ${CATEGORIES.find((c) => c.id === continueLesson.category)?.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone="teal">{CATEGORIES.find((c) => c.id === continueLesson.category)?.name}</Chip>
                    <DifficultyChip level={continueLesson.difficulty} />
                  </div>
                  <h3 className="mt-1.5 font-bold">{continueLesson.title}</h3>
                  <p className="text-sm text-ink-500 dark:text-ink-400 line-clamp-1">{continueLesson.summary}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-xs text-ink-400"><p>{continueLesson.minutes} min</p><p>+{continueLesson.xp} XP</p></div>
                  <Button as={Link} to={`/lessons/${continueLesson.id}`}>Start <Icon name="ArrowRight" className="w-4 h-4" /></Button>
                </div>
              </Card>
            ) : (
              <EmptyState icon="PartyPopper" title="Library complete!" body="You've finished every lesson. Retake quizzes to sharpen your scores." action={<Button as={Link} to="/quizzes">Browse quizzes</Button>} />
            )}
            <Card className="mt-4 p-5">
              <div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold">Overall learning progress</span><span className="text-ink-400">{progress.completedLessons.length} / {LESSONS.length} lessons</span></div>
              <ProgressBar value={overallPct} />
            </Card>
          </section>

          {/* Recent quiz performance */}
          <section aria-label="Recent quiz performance">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-lg">Recent quiz performance</h2>
              <Link to="/quizzes" className="text-sm font-medium text-signal-600 hover:underline">All quizzes →</Link>
            </div>
            {recentQuizzes.length ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {recentQuizzes.map((q, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-center justify-between">
                      <ProgressRing value={q.pct} size={52} stroke={5} />
                      <Chip tone={q.pct >= 80 ? "green" : q.pct >= 60 ? "amber" : "rose"}>{q.pct >= 80 ? "Great" : q.pct >= 60 ? "Pass" : "Retry"}</Chip>
                    </div>
                    <p className="mt-2 text-sm font-semibold line-clamp-1">{q.title}</p>
                    <p className="text-xs text-ink-400">{q.score}/{q.total} correct · +{q.xp} XP</p>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState icon="ClipboardList" title="No quizzes taken yet" body="Test what you know — scenario quizzes give up to 100 XP each." action={<Button as={Link} to="/quizzes" variant="secondary">Take your first quiz</Button>} />
            )}
          </section>

          {/* Recommended lessons */}
          <section aria-label="Recommended lessons">
            <h2 className="mb-3 font-bold text-lg">Recommended for you</h2>
            {recommended.length ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {recommended.map((l) => {
                  const cat = CATEGORIES.find((c) => c.id === l.category);
                  return (
                    <Link key={l.id} to={`/lessons/${l.id}`} className="card group p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
                      <div className={`mb-3 inline-flex rounded-xl p-2 ${cat?.bg} ${cat?.color}`}><Icon name={cat?.icon || "BookOpen"} className="w-5 h-5" /></div>
                      <p className="text-sm font-bold leading-snug group-hover:text-signal-600">{l.title}</p>
                      <p className="mt-1.5 text-xs text-ink-400">{l.minutes} min · +{l.xp} XP</p>
                    </Link>
                  );
                })}
              </div>
            ) : <EmptyState icon="Sparkles" title="All caught up" body="New lessons will appear here when published." />}
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <DailyChallengeCard />
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Recent achievements</h3>
              <Link to="/achievements" className="text-xs font-medium text-signal-600 hover:underline">View all</Link>
            </div>
            {recentBadges.length ? (
              <div className="space-y-3">
                {recentBadges.map((b) => (
                  <div key={b.id} className="flex items-center gap-3">
                    <div className="rounded-xl bg-amber-500/15 p-2.5 text-amber-600 dark:text-amber-400"><Icon name={b.icon} className="w-5 h-5" /></div>
                    <div><p className="text-sm font-semibold">{b.name}</p><p className="text-xs text-ink-400">{b.desc}</p></div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-400">No badges yet — your first lesson unlocks <span className="font-medium text-ink-600 dark:text-ink-200">First Steps</span>.</p>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 font-bold">This week at a glance</h3>
            <div className="space-y-3 text-sm">
              {[
                { icon: "BookOpen", label: "Lessons completed", value: progress.completedLessons.length },
                { icon: "ClipboardCheck", label: "Quiz attempts", value: progress.quizHistory.length },
                { icon: "Bookmark", label: "Saved lessons", value: progress.bookmarks.length },
                { icon: "Sparkles", label: "Total XP", value: progress.xp },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink-500 dark:text-ink-300"><Icon name={r.icon} className="w-4 h-4 text-signal-500" />{r.label}</span>
                  <span className="font-bold">{r.value}</span>
                </div>
              ))}
            </div>
            <Button as={Link} to="/reports" variant="secondary" size="sm" className="mt-4 w-full">View full report <Icon name="BarChart3" className="w-4 h-4" /></Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
