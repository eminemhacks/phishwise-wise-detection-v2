import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { useApp } from "../lib/store.jsx";
import { LESSONS, CATEGORIES } from "../data/lessons.js";
import { QUIZZES } from "../data/quizzes.js";
import { Breadcrumbs, PageHeader } from "../components/layout.jsx";
import { Icon, Button, Card, StatCard, EmptyState, Chip } from "../components/ui.jsx";

const PIE_COLORS = ["#0d9f92", "#f59e0b", "#6366f1", "#ec4899", "#10b981", "#f97316", "#3b82f6", "#8b5cf6"];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(120,130,150,.25)",
  background: "rgba(255,255,255,.97)",
  fontSize: 12.5,
  color: "#1d2433",
};

export default function Reports() {
  const { user, progress, level, toast } = useApp();

  const lessonPct = Math.round((progress.completedLessons.length / LESSONS.length) * 100);
  const avgScore = progress.quizHistory.length
    ? Math.round(progress.quizHistory.reduce((s, h) => s + h.pct, 0) / progress.quizHistory.length)
    : 0;
  const passed = progress.quizHistory.filter((h) => h.pct >= 80).length;

  /* XP over recent activity — synthesize a cumulative series from quiz history + a base */
  const xpSeries = useMemo(() => {
    const base = [{ label: "Start", xp: 0 }];
    let cum = 0;
    const lessonXp = progress.completedLessons.reduce((s, id) => s + (LESSONS.find((l) => l.id === id)?.xp || 0), 0);
    if (lessonXp) {
      cum += lessonXp;
      base.push({ label: "Lessons", xp: cum });
    }
    progress.quizHistory.forEach((h, i) => {
      cum += h.xp;
      base.push({ label: `Quiz ${i + 1}`, xp: cum });
    });
    if (base.length === 1) base.push({ label: "Now", xp: progress.xp });
    else base[base.length - 1].xp = Math.max(base.at(-1).xp, progress.xp);
    return base;
  }, [progress]);

  /* completion per category */
  const categoryData = useMemo(
    () =>
      CATEGORIES.map((c) => {
        const inCat = LESSONS.filter((l) => l.category === c.id);
        const done = inCat.filter((l) => progress.completedLessons.includes(l.id)).length;
        return { name: c.name.split(" ")[0], done, total: inCat.length };
      }),
    [progress]
  );

  /* quiz score donut: passed / fair / needs work */
  const quizDonut = useMemo(() => {
    const passedN = progress.quizHistory.filter((h) => h.pct >= 80).length;
    const fair = progress.quizHistory.filter((h) => h.pct >= 50 && h.pct < 80).length;
    const low = progress.quizHistory.filter((h) => h.pct < 50).length;
    return [
      { name: "Passed (≥80%)", value: passedN },
      { name: "Fair (50–79%)", value: fair },
      { name: "Needs work (<50%)", value: low },
    ].filter((d) => d.value > 0);
  }, [progress]);

  const hasActivity = progress.completedLessons.length > 0 || progress.quizHistory.length > 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "My Reports" }]} />
      <PageHeader
        title="My progress reports"
        subtitle={`A visual summary of your learning journey, ${user?.name?.split(" ")[0] || "learner"}.`}
        action={
          <Button variant="secondary" onClick={() => toast("Export started", "Your PDF report is being prepared (demo).", "success")}>
            <Icon name="Download" size={16} /> Export report
          </Button>
        }
      />

      {/* summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="BookOpenCheck" label="Lessons completed" value={`${progress.completedLessons.length}/${LESSONS.length}`} trend={`${lessonPct}% of curriculum`} trendUp={lessonPct >= 50} />
        <StatCard icon="ClipboardCheck" label="Quizzes passed" value={`${passed}/${progress.quizHistory.length || 0}`} trend={progress.quizHistory.length ? "80% pass mark" : "No attempts yet"} trendUp={passed > 0} />
        <StatCard icon="Percent" label="Average quiz score" value={`${avgScore}%`} trend={avgScore >= 80 ? "Excellent form" : avgScore > 0 ? "Keep practising" : "—"} trendUp={avgScore >= 80} />
        <StatCard icon="Zap" label="Total XP" value={progress.xp.toLocaleString()} trend={`Level: ${level.name}`} trendUp />
      </div>

      {!hasActivity ? (
        <EmptyState
          icon="LineChart"
          title="No activity to chart yet"
          body="Complete a lesson or take a quiz and your analytics will light up here."
          action={<Button as={Link} to="/lessons">Start learning</Button>}
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* XP line chart */}
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-ink-900 dark:text-white">XP growth</h2>
                <Chip tone="amber"><Icon name="TrendingUp" size={13} /> Cumulative</Chip>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={xpSeries} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,130,150,.2)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#8b93a5" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#8b93a5" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="xp" stroke="#0d9f92" strokeWidth={2.5} dot={{ r: 3.5, fill: "#0d9f92" }} name="XP" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* quiz outcome donut */}
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-ink-900 dark:text-white">Quiz outcomes</h2>
                <Chip tone="teal">{progress.quizHistory.length} attempts</Chip>
              </div>
              {quizDonut.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-ink-400">
                  Take a quiz to see your outcome mix.
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={quizDonut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                        {quizDonut.map((_, i) => (
                          <Cell key={i} fill={["#10b981", "#f59e0b", "#f43f5e"][i % 3]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          {/* category bar chart */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-ink-900 dark:text-white">
                Lessons completed by category
              </h2>
              <Chip tone="ink">{LESSONS.length} lessons total</Chip>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,130,150,.2)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#8b93a5" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#8b93a5" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="done" name="Completed" fill="#0d9f92" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="total" name="Available" fill="#cdd3de" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* insights */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-signal-600 dark:text-signal-400">
                <Icon name="Sparkles" size={14} /> Insight
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-600 dark:text-ink-300">
                {lessonPct >= 75
                  ? "You've covered most of the curriculum — finish the remaining lessons to unlock your certificate."
                  : lessonPct >= 30
                  ? "Good momentum. Aim for one micro-lesson per day to keep your streak compounding."
                  : "Start with the Foundation stage of the learning path — it builds everything else."}
              </p>
            </Card>
            <Card className="p-5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amberx-600 dark:text-amberx-400">
                <Icon name="Target" size={14} /> Focus area
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-600 dark:text-ink-300">
                {avgScore && avgScore < 80
                  ? "Your quiz average is under the 80% pass mark — review explanations after each attempt and retake."
                  : "Try the timed URL Detective quiz to pressure-test your link-reading instincts."}
              </p>
            </Card>
            <Card className="p-5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                <Icon name="Flame" size={14} /> Streak status
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-600 dark:text-ink-300">
                {progress.streak >= 7
                  ? `A ${progress.streak}-day streak — you're in the habit zone. Don't break the chain.`
                  : `Current streak: ${progress.streak} day${progress.streak === 1 ? "" : "s"}. Seven days unlocks the Consistency badge.`}
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
