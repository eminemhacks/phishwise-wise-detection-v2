import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../lib/store.jsx";
import { LESSONS, CATEGORIES, LEARNING_PATH } from "../data/lessons.js";
import { Breadcrumbs, PageHeader } from "../components/layout.jsx";
import {
  Icon, Button, Card, Chip, DifficultyChip, ProgressBar, ProgressRing,
  Tabs, EmptyState,
} from "../components/ui.jsx";

/* ---------------- Lesson card ---------------- */
function LessonCard({ lesson }) {
  const { progress, toggleBookmark } = useApp();
  const done = progress.completedLessons.includes(lesson.id);
  const saved = progress.bookmarks.includes(lesson.id);
  const cat = CATEGORIES.find((c) => c.id === lesson.category);

  return (
    <Card className="group relative flex flex-col p-5 transition hover:shadow-lift">
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${cat.bg}`}>
          <Icon name={cat.icon} size={19} className={cat.color} />
        </span>
        <button
          onClick={() => toggleBookmark(lesson.id)}
          aria-label={saved ? "Remove bookmark" : "Bookmark lesson"}
          className={`rounded-lg p-1.5 transition ${saved ? "text-amberx-500" : "text-ink-300 hover:text-ink-500 dark:text-ink-500 dark:hover:text-ink-300"}`}
        >
          <Icon name={saved ? "BookmarkCheck" : "Bookmark"} size={18} />
        </button>
      </div>

      <Link to={`/lessons/${lesson.id}`} className="flex flex-1 flex-col">
        <h3 className="font-display text-[15px] font-semibold leading-snug text-ink-900 group-hover:text-signal-700 dark:text-white dark:group-hover:text-signal-400">
          {lesson.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-500 dark:text-ink-300">
          {lesson.summary}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <DifficultyChip level={lesson.difficulty} />
          <span className="inline-flex items-center gap-1 text-ink-400 dark:text-ink-400">
            <Icon name="Clock" size={13} /> {lesson.minutes} min
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-amberx-600 dark:text-amberx-400">
            <Icon name="Zap" size={13} /> {lesson.xp} XP
          </span>
          {done && (
            <span className="ml-auto inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <Icon name="CheckCircle2" size={14} /> Done
            </span>
          )}
        </div>
      </Link>
    </Card>
  );
}

/* ---------------- Learning path roadmap ---------------- */
function LearningPath() {
  const { progress } = useApp();
  return (
    <Card className="p-6">
      <div className="mb-1 flex items-center gap-2">
        <Icon name="Map" size={18} className="text-signal-600 dark:text-signal-400" />
        <h2 className="font-display text-base font-semibold text-ink-900 dark:text-white">
          Learning path roadmap
        </h2>
      </div>
      <p className="mb-6 text-[13px] text-ink-500 dark:text-ink-300">
        A suggested route from first principles to confident defender. Work through each stage in order.
      </p>
      <ol className="relative space-y-6 border-l-2 border-ink-100 pl-6 dark:border-ink-700">
        {LEARNING_PATH.map((stage, i) => {
          const stageLessons = LESSONS.filter((l) => stage.lessons.includes(l.id));
          const doneCount = stageLessons.filter((l) => progress.completedLessons.includes(l.id)).length;
          const complete = doneCount === stageLessons.length;
          return (
            <li key={stage.id} className="relative">
              <span
                className={`absolute -left-[31px] flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  complete
                    ? "border-signal-500 bg-signal-500 text-white"
                    : "border-ink-200 bg-white text-ink-500 dark:border-ink-600 dark:bg-ink-800 dark:text-ink-300"
                }`}
              >
                {complete ? <Icon name="Check" size={14} /> : i + 1}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-sm font-semibold text-ink-900 dark:text-white">{stage.name}</h3>
                <Chip tone={complete ? "green" : "ink"}>{doneCount}/{stageLessons.length} lessons</Chip>
              </div>
              <p className="mt-0.5 text-[13px] text-ink-500 dark:text-ink-300">{stage.desc}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {stageLessons.map((l) => {
                  const done = progress.completedLessons.includes(l.id);
                  return (
                    <Link
                      key={l.id}
                      to={`/lessons/${l.id}`}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                        done
                          ? "border-signal-200 bg-signal-50 text-signal-700 dark:border-signal-800 dark:bg-signal-900/30 dark:text-signal-300"
                          : "border-ink-200 bg-white text-ink-600 hover:border-signal-300 hover:text-signal-700 dark:border-ink-600 dark:bg-ink-800 dark:text-ink-300 dark:hover:text-signal-400"
                      }`}
                    >
                      {done && <Icon name="Check" size={12} />}
                      {l.title}
                    </Link>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

/* ---------------- Library ---------------- */
export function LessonLibrary() {
  const { progress } = useApp();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");

  const filtered = useMemo(() => {
    return LESSONS.filter((l) => {
      if (tab === "bookmarks" && !progress.bookmarks.includes(l.id)) return false;
      if (tab === "completed" && !progress.completedLessons.includes(l.id)) return false;
      if (category !== "all" && l.category !== category) return false;
      if (difficulty !== "all" && l.difficulty !== difficulty) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!l.title.toLowerCase().includes(q) && !l.summary.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tab, query, category, difficulty, progress]);

  const pct = Math.round((progress.completedLessons.length / LESSONS.length) * 100);
  const nextLesson = LESSONS.find((l) => !progress.completedLessons.includes(l.id));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Lessons" }]} />
      <PageHeader
        title="Lesson library"
        subtitle="Micro-lessons that take five minutes or less. Pick a topic and build your defenses."
        action={
          nextLesson && (
            <Button as={Link} to={`/lessons/${nextLesson.id}`} variant="primary">
              <Icon name="Play" size={16} /> Continue learning
            </Button>
          )
        }
      />

      {/* progress overview */}
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <ProgressRing value={pct} size={68} stroke={7} label={`${pct}%`} />
        <div className="flex-1">
          <p className="font-display text-sm font-semibold text-ink-900 dark:text-white">
            Learning progress overview
          </p>
          <p className="text-[13px] text-ink-500 dark:text-ink-300">
            {progress.completedLessons.length} of {LESSONS.length} lessons completed ·{" "}
            {progress.bookmarks.length} bookmarked
          </p>
          <ProgressBar value={pct} className="mt-2" />
        </div>
      </Card>

      {/* filters */}
      <div className="flex flex-col gap-3">
        <Tabs
          tabs={[
            { id: "all", label: "All lessons" },
            { id: "bookmarks", label: `Bookmarked (${progress.bookmarks.length})` },
            { id: "completed", label: `Completed (${progress.completedLessons.length})` },
            { id: "path", label: "Learning path" },
          ]}
          active={tab}
          onChange={setTab}
        />
        {tab !== "path" && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Icon name="Search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                className="input pl-9"
                placeholder="Search lessons…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search lessons"
              />
            </div>
            <select className="input sm:w-56" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select className="input sm:w-40" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Filter by difficulty">
              <option value="all">Any difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        )}
      </div>

      {tab === "path" ? (
        <LearningPath />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={tab === "bookmarks" ? "Bookmark" : "SearchX"}
          title={tab === "bookmarks" ? "No bookmarks yet" : "No lessons match"}
          body={
            tab === "bookmarks"
              ? "Tap the bookmark icon on any lesson to save it for later."
              : "Try a different search term or clear your filters."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((l) => (
            <LessonCard key={l.id} lesson={l} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Lesson detail blocks ---------------- */
function Block({ block }) {
  switch (block.type) {
    case "text":
      return <p className="text-[15px] leading-relaxed text-ink-700 dark:text-ink-200">{block.body}</p>;
    case "tip":
      return (
        <div className="flex gap-3 rounded-xl border border-signal-200 bg-signal-50 p-4 dark:border-signal-800 dark:bg-signal-900/25">
          <Icon name="Lightbulb" size={18} className="mt-0.5 shrink-0 text-signal-600 dark:text-signal-400" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-signal-700 dark:text-signal-300">Pro tip</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-700 dark:text-ink-200">{block.body}</p>
          </div>
        </div>
      );
    case "warning":
      return (
        <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-900/20">
          <Icon name="AlertTriangle" size={18} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">Watch out</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-700 dark:text-ink-200">{block.body}</p>
          </div>
        </div>
      );
    case "example":
      return (
        <div className="rounded-xl border border-ink-200 bg-ink-50 p-4 dark:border-ink-600 dark:bg-ink-800/60">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-300">
            <Icon name="FileSearch" size={14} /> Real-world example
          </p>
          <p className="font-mono text-[13px] leading-relaxed text-ink-700 dark:text-ink-200">{block.body}</p>
        </div>
      );
    case "checklist":
      return (
        <ul className="space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-700 dark:text-ink-200">
              <Icon name="CheckCircle2" size={17} className="mt-0.5 shrink-0 text-signal-500" />
              {item}
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

/* ---------------- Lesson detail ---------------- */
export function LessonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { progress, completeLesson, toggleBookmark } = useApp();
  const lesson = LESSONS.find((l) => l.id === id);
  const [readPct, setReadPct] = useState(0);
  const articleRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    setReadPct(0);
  }, [id]);

  useEffect(() => {
    const main = document.getElementById("main-scroll") || window;
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      const total = rect.height - viewH * 0.5;
      const scrolled = Math.min(Math.max(viewH * 0.5 - rect.top, 0), Math.max(total, 1));
      setReadPct(Math.round((scrolled / Math.max(total, 1)) * 100));
    };
    main.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      main.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, [id]);

  if (!lesson) {
    return (
      <EmptyState
        icon="FileQuestion"
        title="Lesson not found"
        body="This lesson may have been moved. Head back to the library."
        action={<Button as={Link} to="/lessons">Back to lessons</Button>}
      />
    );
  }

  const cat = CATEGORIES.find((c) => c.id === lesson.category);
  const done = progress.completedLessons.includes(lesson.id);
  const saved = progress.bookmarks.includes(lesson.id);
  const idx = LESSONS.findIndex((l) => l.id === lesson.id);
  const next =
    LESSONS.slice(idx + 1).find((l) => !progress.completedLessons.includes(l.id)) ||
    LESSONS.find((l) => !progress.completedLessons.includes(l.id) && l.id !== lesson.id);

  const handleComplete = () => {
    if (done) return;
    completeLesson(lesson.id);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* read progress */}
      <div className="sticky top-0 z-10 -mx-1 rounded-full bg-ink-100 dark:bg-ink-700" aria-hidden>
        <div
          className="h-1.5 rounded-full bg-signal-500 transition-[width] duration-150"
          style={{ width: `${done ? 100 : readPct}%` }}
        />
      </div>

      <Breadcrumbs
        items={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Lessons", to: "/lessons" },
          { label: lesson.title },
        ]}
      />

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="teal">
            <Icon name={cat.icon} size={13} /> {cat.name}
          </Chip>
          <DifficultyChip level={lesson.difficulty} />
          <span className="inline-flex items-center gap-1 text-xs text-ink-400">
            <Icon name="Clock" size={13} /> {lesson.minutes} min read
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amberx-600 dark:text-amberx-400">
            <Icon name="Zap" size={13} /> {lesson.xp} XP
          </span>
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink-900 dark:text-white sm:text-3xl">
          {lesson.title}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-500 dark:text-ink-300">{lesson.summary}</p>
      </div>

      <motion.article
        ref={articleRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        {lesson.blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </motion.article>

      {/* actions */}
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {done ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <Icon name="CheckCircle2" size={18} /> Completed — {lesson.xp} XP earned
            </span>
          ) : (
            <Button onClick={handleComplete} variant="primary">
              <Icon name="CheckCircle2" size={16} /> Mark as completed (+{lesson.xp} XP)
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => toggleBookmark(lesson.id)}>
            <Icon name={saved ? "BookmarkCheck" : "Bookmark"} size={16} />
            {saved ? "Saved" : "Save for later"}
          </Button>
        </div>
      </Card>

      {/* suggested next */}
      {next && (
        <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-400">
              Suggested next lesson
            </p>
            <p className="mt-1 font-display text-[15px] font-semibold text-ink-900 dark:text-white">{next.title}</p>
            <p className="text-[13px] text-ink-500 dark:text-ink-300">
              {next.minutes} min · {next.xp} XP
            </p>
          </div>
          <Button onClick={() => navigate(`/lessons/${next.id}`)} variant="dark">
            Up next <Icon name="ArrowRight" size={16} />
          </Button>
        </Card>
      )}
    </div>
  );
}
