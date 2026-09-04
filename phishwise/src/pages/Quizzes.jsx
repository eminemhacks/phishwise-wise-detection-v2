import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../lib/store.jsx";
import { QUIZZES } from "../data/quizzes.js";
import { Breadcrumbs, PageHeader } from "../components/layout.jsx";
import {
  Icon, Button, Card, Chip, DifficultyChip, ProgressBar, ProgressRing,
  Tabs, EmptyState, Modal,
} from "../components/ui.jsx";

const TYPE_LABEL = { mcq: "Multiple choice", tf: "True / False", scenario: "Scenario" };

/* ---------------- Quiz list ---------------- */
export function QuizList() {
  const { progress } = useApp();
  const [tab, setTab] = useState("quizzes");

  const bestFor = (quizId) => {
    const attempts = progress.quizHistory.filter((h) => h.quizId === quizId);
    if (!attempts.length) return null;
    return Math.max(...attempts.map((a) => a.pct));
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Quizzes" }]} />
      <PageHeader
        title="Assessments & quizzes"
        subtitle="Test your instincts with multiple-choice, true/false, and real-world scenario questions."
      />

      <Tabs
        tabs={[
          { id: "quizzes", label: "All quizzes" },
          { id: "history", label: `History (${progress.quizHistory.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "quizzes" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {QUIZZES.map((q) => {
            const best = bestFor(q.id);
            return (
              <Card key={q.id} className="flex flex-col p-5 transition hover:shadow-lift">
                <div className="mb-3 flex items-start justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-signal-50 dark:bg-signal-900/30">
                    <Icon name={q.icon} size={19} className="text-signal-600 dark:text-signal-400" />
                  </span>
                  {q.timed && (
                    <Chip tone="amber">
                      <Icon name="Timer" size={13} /> Timed · {Math.round(q.timeLimit / 60)} min
                    </Chip>
                  )}
                </div>
                <h3 className="font-display text-[15px] font-semibold text-ink-900 dark:text-white">{q.title}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-[13px] leading-relaxed text-ink-500 dark:text-ink-300">
                  {q.desc}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <DifficultyChip level={q.difficulty} />
                  <span className="inline-flex items-center gap-1 text-ink-400">
                    <Icon name="ListChecks" size={13} /> {q.questions.length} questions
                  </span>
                  {best !== null && (
                    <span className={`ml-auto inline-flex items-center gap-1 font-semibold ${best >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-amberx-600 dark:text-amberx-400"}`}>
                      <Icon name="Trophy" size={13} /> Best {best}%
                    </span>
                  )}
                </div>
                <Button as={Link} to={`/quizzes/${q.id}`} variant={best === null ? "primary" : "secondary"} className="mt-4 w-full">
                  {best === null ? "Start quiz" : "Retake quiz"} <Icon name="ArrowRight" size={15} />
                </Button>
              </Card>
            );
          })}
        </div>
      ) : progress.quizHistory.length === 0 ? (
        <EmptyState
          icon="History"
          title="No attempts yet"
          body="Take your first quiz and your results will show up here."
          action={<Button onClick={() => setTab("quizzes")}>Browse quizzes</Button>}
        />
      ) : (
        <Card className="divide-y divide-ink-100 dark:divide-ink-700">
          {progress.quizHistory.map((h, i) => {
            const quiz = QUIZZES.find((q) => q.id === h.quizId);
            return (
              <div key={i} className="flex items-center gap-4 p-4">
                <ProgressRing value={h.pct} size={52} stroke={5} label={`${h.pct}%`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold text-ink-900 dark:text-white">
                    {quiz?.title || h.quizId}
                  </p>
                  <p className="text-xs text-ink-400 dark:text-ink-400">
                    {h.score}/{h.total} correct · +{h.xp} XP ·{" "}
                    {new Date(h.date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <Chip tone={h.pct >= 80 ? "green" : h.pct >= 50 ? "amber" : "rose"}>
                  {h.pct >= 80 ? "Passed" : h.pct >= 50 ? "Fair" : "Needs work"}
                </Chip>
                <Button as={Link} to={`/quizzes/${h.quizId}`} variant="ghost" className="hidden sm:inline-flex">
                  Retake
                </Button>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

/* ---------------- Quiz player ---------------- */
export function QuizPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { recordQuiz } = useApp();
  const quiz = QUIZZES.find((q) => q.id === id);

  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [picked, setPicked] = useState(null); // index picked for current question
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState([]); // {pickedIdx, correct}
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(quiz?.timeLimit ?? 0);
  const [confirmExit, setConfirmExit] = useState(false);

  useEffect(() => {
    if (!started || !quiz?.timed || finished) return;
    if (timeLeft <= 0) {
      finishQuiz(answers);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, timeLeft, finished]);

  if (!quiz) {
    return (
      <EmptyState
        icon="FileQuestion"
        title="Quiz not found"
        body="This quiz may have been moved."
        action={<Button as={Link} to="/quizzes">Back to quizzes</Button>}
      />
    );
  }

  const q = quiz.questions[current];
  const total = quiz.questions.length;

  function finishQuiz(finalAnswers) {
    const correct = finalAnswers.filter((a) => a.correct).length;
    recordQuiz(quiz, correct);
    setFinished(true);
  }

  const select = (idx) => {
    if (revealed) return;
    setPicked(idx);
  };

  const submitAnswer = () => {
    if (picked === null) return;
    setRevealed(true);
  };

  const nextQuestion = () => {
    const entry = { pickedIdx: picked, correct: picked === q.answer };
    const newAnswers = [...answers, entry];
    setAnswers(newAnswers);
    setPicked(null);
    setRevealed(false);
    if (current + 1 < total) {
      setCurrent(current + 1);
    } else {
      finishQuiz(newAnswers);
    }
  };

  const restart = () => {
    setStarted(false);
    setCurrent(0);
    setPicked(null);
    setRevealed(false);
    setAnswers([]);
    setFinished(false);
    setTimeLeft(quiz.timeLimit ?? 0);
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  /* ----- intro screen ----- */
  if (!started) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Breadcrumbs items={[{ label: "Quizzes", to: "/quizzes" }, { label: quiz.title }]} />
        <Card className="p-7 text-center">
          <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-50 dark:bg-signal-900/30">
            <Icon name={quiz.icon} size={26} className="text-signal-600 dark:text-signal-400" />
          </span>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">{quiz.title}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500 dark:text-ink-300">{quiz.desc}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <DifficultyChip level={quiz.difficulty} />
            <Chip tone="ink"><Icon name="ListChecks" size={13} /> {total} questions</Chip>
            {quiz.timed ? (
              <Chip tone="amber"><Icon name="Timer" size={13} /> {Math.round(quiz.timeLimit / 60)} minute limit</Chip>
            ) : (
              <Chip tone="ink"><Icon name="Infinity" size={13} /> Untimed</Chip>
            )}
          </div>
          <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-[13px] text-ink-600 dark:text-ink-300">
            <li className="flex gap-2"><Icon name="CheckCircle2" size={16} className="mt-0.5 shrink-0 text-signal-500" /> Answer each question, then submit to see instant feedback and an explanation.</li>
            <li className="flex gap-2"><Icon name="CheckCircle2" size={16} className="mt-0.5 shrink-0 text-signal-500" /> Your score converts directly to XP — 100% earns the full 100 XP.</li>
            <li className="flex gap-2"><Icon name="CheckCircle2" size={16} className="mt-0.5 shrink-0 text-signal-500" /> You can retake the quiz anytime to improve your best score.</li>
          </ul>
          <Button onClick={() => setStarted(true)} variant="primary" className="mt-7 w-full sm:w-auto">
            <Icon name="Play" size={16} /> Begin quiz
          </Button>
        </Card>
      </div>
    );
  }

  /* ----- result screen ----- */
  if (finished) {
    const correct = answers.filter((a) => a.correct).length;
    const pct = Math.round((correct / total) * 100);
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="p-7 text-center">
          <ProgressRing value={pct} size={110} stroke={10} label={`${pct}%`} className="mx-auto" />
          <h1 className="mt-4 font-display text-2xl font-bold text-ink-900 dark:text-white">
            {pct >= 80 ? "Sharp eyes! 🎯" : pct >= 50 ? "Solid effort" : "Worth a re-read"}
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">
            You answered {correct} of {total} correctly on <strong>{quiz.title}</strong>.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Chip tone="amber"><Icon name="Zap" size={13} /> +{pct} XP earned</Chip>
            <Chip tone={pct >= 80 ? "green" : "ink"}>
              {pct >= 80 ? "Passed" : "Below 80% pass mark"}
            </Chip>
          </div>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={restart} variant="secondary"><Icon name="RotateCcw" size={16} /> Retake quiz</Button>
            <Button as={Link} to="/quizzes" variant="primary">Back to quizzes</Button>
          </div>
        </Card>

        {/* review */}
        <Card className="divide-y divide-ink-100 p-0 dark:divide-ink-700">
          <p className="p-4 font-display text-sm font-semibold text-ink-900 dark:text-white">Answer review</p>
          {quiz.questions.map((qq, i) => {
            const a = answers[i];
            const ok = a?.correct;
            return (
              <div key={i} className="space-y-1.5 p-4">
                <div className="flex items-start gap-2">
                  <Icon
                    name={ok ? "CheckCircle2" : "XCircle"}
                    size={17}
                    className={`mt-0.5 shrink-0 ${ok ? "text-emerald-500" : "text-rose-500"}`}
                  />
                  <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{qq.q}</p>
                </div>
                <p className="pl-6 text-[13px] text-ink-500 dark:text-ink-300">
                  {!ok && a?.pickedIdx != null && <>Your answer: <span className="text-rose-600 dark:text-rose-400">{qq.options[a.pickedIdx]}</span> · </>}
                  Correct: <span className="font-medium text-emerald-600 dark:text-emerald-400">{qq.options[qq.answer]}</span>
                </p>
                <p className="pl-6 text-[13px] leading-relaxed text-ink-500 dark:text-ink-300">{qq.explain}</p>
              </div>
            );
          })}
        </Card>
      </div>
    );
  }

  /* ----- question screen ----- */
  const isCorrect = revealed && picked === q.answer;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setConfirmExit(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800 dark:text-ink-300 dark:hover:text-white"
        >
          <Icon name="X" size={16} /> Exit
        </button>
        {quiz.timed && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${
              timeLeft <= 30
                ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                : "bg-amberx-50 text-amberx-700 dark:bg-amberx-900/30 dark:text-amberx-400"
            }`}
            role="timer"
            aria-label={`Time remaining ${fmt(timeLeft)}`}
          >
            <Icon name="Timer" size={15} /> {fmt(timeLeft)}
          </span>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-400 dark:text-ink-400">
          <span>Question {current + 1} of {total}</span>
          <Chip tone="ink">{TYPE_LABEL[q.type]}</Chip>
        </div>
        <ProgressBar value={((current + (revealed ? 1 : 0)) / total) * 100} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.18 }}
        >
          <Card className="p-6">
            {q.type === "scenario" && (
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                <Icon name="Drama" size={14} /> Scenario
              </p>
            )}
            <h2 className="font-display text-lg font-semibold leading-snug text-ink-900 dark:text-white">{q.q}</h2>

            <div className="mt-5 space-y-2.5" role="radiogroup" aria-label="Answer options">
              {q.options.map((opt, idx) => {
                let style =
                  "border-ink-200 bg-white hover:border-signal-300 dark:border-ink-600 dark:bg-ink-800 dark:hover:border-signal-500";
                if (revealed) {
                  if (idx === q.answer)
                    style = "border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/25";
                  else if (idx === picked)
                    style = "border-rose-400 bg-rose-50 dark:border-rose-500 dark:bg-rose-900/25";
                  else style = "border-ink-200 bg-white opacity-60 dark:border-ink-600 dark:bg-ink-800";
                } else if (picked === idx) {
                  style = "border-signal-500 bg-signal-50 ring-2 ring-signal-200 dark:bg-signal-900/30 dark:ring-signal-800";
                }
                return (
                  <button
                    key={idx}
                    role="radio"
                    aria-checked={picked === idx}
                    onClick={() => select(idx)}
                    disabled={revealed}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm font-medium text-ink-800 transition dark:text-ink-100 ${style}`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink-300 text-[11px] font-bold text-ink-500 dark:border-ink-500 dark:text-ink-300">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {revealed && idx === q.answer && <Icon name="CheckCircle2" size={18} className="text-emerald-500" />}
                    {revealed && idx === picked && idx !== q.answer && <Icon name="XCircle" size={18} className="text-rose-500" />}
                  </button>
                );
              })}
            </div>

            {revealed && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-5 rounded-xl border p-4 ${
                  isCorrect
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                    : "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20"
                }`}
              >
                <p className={`flex items-center gap-1.5 text-sm font-semibold ${isCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                  <Icon name={isCorrect ? "PartyPopper" : "Info"} size={16} />
                  {isCorrect ? "Correct!" : "Not quite."}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-700 dark:text-ink-200">{q.explain}</p>
              </motion.div>
            )}

            <div className="mt-6 flex justify-end">
              {!revealed ? (
                <Button onClick={submitAnswer} variant="primary" disabled={picked === null} className={picked === null ? "cursor-not-allowed opacity-50" : ""}>
                  Submit answer
                </Button>
              ) : (
                <Button onClick={nextQuestion} variant="dark">
                  {current + 1 < total ? "Next question" : "See results"} <Icon name="ArrowRight" size={16} />
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      <Modal open={confirmExit} onClose={() => setConfirmExit(false)} title="Leave this quiz?">
        <p className="text-sm text-ink-600 dark:text-ink-300">
          Your progress on this attempt won't be saved. You can retake the quiz anytime.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmExit(false)}>Keep going</Button>
          <Button variant="danger" onClick={() => navigate("/quizzes")}>Exit quiz</Button>
        </div>
      </Modal>
    </div>
  );
}
