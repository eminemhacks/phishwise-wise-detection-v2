import { useMemo, useState, useEffect } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { useApp } from "../lib/store.jsx";
import { adminApi, contentApi, detectionApi } from "../lib/api";
import { LESSONS, CATEGORIES } from "../data/lessons.js";
import { QUIZZES } from "../data/quizzes.js";
import {
  ADMIN_NOTIFICATIONS, ENGAGEMENT_SERIES, QUIZ_STATS,
  CATEGORY_COMPLETION, BADGE_DISTRIBUTION,
} from "../data/mock.js";
import { Breadcrumbs, PageHeader } from "../components/layout-admin";
import {
  Icon, Button, Card, Chip, StatCard, Tabs, Modal, Field, Avatar, EmptyState, DifficultyChip,
} from "../components/ui.jsx";

// Turn an ISO timestamp into a compact "2h ago" / "3d ago" label.
function relativeTime(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

const PIE_COLORS = ["#0d9f92", "#f59e0b", "#6366f1", "#ec4899", "#10b981", "#f97316", "#3b82f6", "#8b5cf6"];
const VERDICT_COLORS = {
  Safe: "#10b981",
  Suspicious: "#f59e0b",
  "Likely Phishing": "#f97316",
  Dangerous: "#e11d48",
};
const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(120,130,150,.25)",
  background: "rgba(255,255,255,.97)",
  fontSize: 12.5,
  color: "#1d2433",
};

/* ============ ADMIN OVERVIEW ============ */
export function AdminOverview() {
  const { toast } = useApp();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    let alive = true;
    Promise.all([adminApi.overview(), adminApi.users()])
      .then(([ov, us]) => {
        if (!alive) return;
        setStats(ov);
        setUsers(
          us.map((u) => ({
            id: u.id,
            name: u.name,
            status: u.status === "active" ? "Active" : u.status === "suspended" ? "Suspended" : "Inactive",
            completion: u.completion ?? 0,
            xp: u.xp ?? 0,
            lastActive: u.lastActive ? relativeTime(u.lastActive) : "—",
          })),
        );
      })
      .catch((e) => alive && toast("Couldn't load overview", e.message, "info"));
    return () => { alive = false; };
  }, [toast]);

  const fmt = (n) => (n ?? 0).toLocaleString();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Overview" }]} />
      <PageHeader
        title="Admin overview"
        subtitle="Platform health at a glance — users, content, and engagement."
        action={
          <Button variant="secondary" onClick={() => toast("Export started", "Platform summary export queued (demo).", "success")}>
            <Icon name="Download" size={16} /> Export summary
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="Users" label="Total users" value={fmt(stats?.users)} trend={`${stats?.activeUsers ?? 0} active`} trendUp />
        <StatCard icon="Activity" label="Active learners" value={fmt(stats?.activeUsers)} trend="currently active" trendUp />
        <StatCard icon="BookOpenCheck" label="Lessons completed" value={fmt(stats?.lessonsCompleted)} trend={`${stats?.lessons ?? 0} published`} trendUp />
        <StatCard icon="ClipboardCheck" label="Quiz attempts" value={fmt(stats?.quizAttempts)} trend={`${stats?.avgQuizScore ?? 0}% avg score`} trendUp />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* engagement spark */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-ink-900 dark:text-white">Weekly engagement</h2>
            <Chip tone="teal"><Icon name="TrendingUp" size={13} /> 8-week trend</Chip>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ENGAGEMENT_SERIES} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,130,150,.2)" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#8b93a5" />
                <YAxis tick={{ fontSize: 11 }} stroke="#8b93a5" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="activeUsers" name="Active users" stroke="#0d9f92" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="lessons" name="Lessons done" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="quizzes" name="Quiz attempts" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* admin notifications */}
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-ink-100 p-4 dark:border-ink-700">
            <h2 className="font-display text-sm font-semibold text-ink-900 dark:text-white">Admin notifications</h2>
            <Chip tone="rose">{ADMIN_NOTIFICATIONS.filter((n) => n.unread).length} new</Chip>
          </div>
          <ul className="divide-y divide-ink-50 dark:divide-ink-700/60">
            {ADMIN_NOTIFICATIONS.map((n) => (
              <li key={n.id} className="flex gap-3 p-4">
                <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.unread ? "bg-signal-50 text-signal-600 dark:bg-signal-900/30 dark:text-signal-400" : "bg-ink-50 text-ink-400 dark:bg-ink-800 dark:text-ink-400"}`}>
                  <Icon name={n.icon} size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink-800 dark:text-ink-100">{n.title}</p>
                  <p className="text-xs leading-relaxed text-ink-500 dark:text-ink-300">{n.body}</p>
                  <p className="mt-0.5 text-[11px] text-ink-400 dark:text-ink-500">{n.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* top performers + flagged */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-0">
          <p className="border-b border-ink-100 p-4 font-display text-sm font-semibold text-ink-900 dark:border-ink-700 dark:text-white">
            Top performers
          </p>
          <ul className="divide-y divide-ink-50 dark:divide-ink-700/60">
            {[...users].sort((a, b) => b.xp - a.xp).slice(0, 4).map((u) => (
              <li key={u.id} className="flex items-center gap-3 p-3.5">
                <Avatar name={u.name} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-800 dark:text-ink-100">{u.name}</p>
                  <p className="text-xs text-ink-400">{u.completion}% completion</p>
                </div>
                <Chip tone="green">{u.xp} XP</Chip>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-0">
          <p className="border-b border-ink-100 p-4 font-display text-sm font-semibold text-ink-900 dark:border-ink-700 dark:text-white">
            Needs attention
          </p>
          <ul className="divide-y divide-ink-50 dark:divide-ink-700/60">
            {users.filter((u) => u.status !== "Active" || u.completion < 30).slice(0, 4).map((u) => (
              <li key={u.id} className="flex items-center gap-3 p-3.5">
                <Avatar name={u.name} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-800 dark:text-ink-100">{u.name}</p>
                  <p className="text-xs text-ink-400">Last active: {u.lastActive}</p>
                </div>
                <Chip tone={u.status === "Suspended" ? "rose" : u.status === "Inactive" ? "amber" : "ink"}>{u.status}</Chip>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/* ============ CONTENT MANAGEMENT ============ */
export function AdminContent() {
  const { toast } = useApp();
  const [tab, setTab] = useState("lessons");

  /* editable copies — seeded from static content, refreshed from the API */
  const [lessonRows, setLessonRows] = useState(
    LESSONS.map((l, i) => ({ ...l, published: i % 7 !== 5 }))
  );
  const [quizRows, setQuizRows] = useState(QUIZZES.map((q) => ({ ...q, published: true })));

  useEffect(() => {
    let alive = true;
    Promise.allSettled([contentApi.lessons(), contentApi.quizzes()]).then((res) => {
      if (!alive) return;
      const [ls, qs] = res;
      if (ls.status === "fulfilled" && ls.value.length) setLessonRows(ls.value);
      if (qs.status === "fulfilled" && qs.value.length)
        setQuizRows(qs.value.map((q) => ({ ...q, desc: q.description })));
    });
    return () => { alive = false; };
  }, []);

  const [editing, setEditing] = useState(null); // {kind, row|null}
  const [deleting, setDeleting] = useState(null); // {kind, row}
  const [form, setForm] = useState({});
  const [formErr, setFormErr] = useState({});

  const openEditor = (kind, row) => {
    setForm(
      row
        ? { title: row.title, category: row.category || "", difficulty: row.difficulty, minutes: row.minutes || 5, xp: row.xp || 50, desc: row.desc || row.summary || "" }
        : { title: "", category: CATEGORIES[0].id, difficulty: "Easy", minutes: 5, xp: 50, desc: "" }
    );
    setFormErr({});
    setEditing({ kind, row });
  };

  const saveEditor = async () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required.";
    if (!form.desc.trim()) errs.desc = "Add a short description.";
    setFormErr(errs);
    if (Object.keys(errs).length) return;
    const { kind, row } = editing;
    try {
      if (kind === "lesson") {
        if (row) {
          const updated = await adminApi.updateLesson(row.id, {
            title: form.title, category: form.category, difficulty: form.difficulty,
            minutes: +form.minutes, xp: +form.xp, summary: form.desc,
          });
          setLessonRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, ...updated } : r)));
        } else {
          const id = `custom-${Date.now()}`;
          const created = await adminApi.createLesson({
            id, title: form.title, category: form.category, difficulty: form.difficulty,
            minutes: +form.minutes, xp: +form.xp, summary: form.desc, blocks: [], published: false,
          });
          setLessonRows((rs) => [created, ...rs]);
        }
      } else {
        if (row) {
          const updated = await adminApi.updateQuiz(row.id, {
            title: form.title, difficulty: form.difficulty, description: form.desc,
          });
          setQuizRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, ...updated, desc: updated.description } : r)));
        } else {
          const id = `quiz-${Date.now()}`;
          const created = await adminApi.createQuiz({
            id, title: form.title, category: form.category, difficulty: form.difficulty,
            minutes: +form.minutes, description: form.desc, questions: [], published: false,
          });
          setQuizRows((rs) => [{ ...created, desc: created.description, icon: "ClipboardList" }, ...rs]);
        }
      }
      toast(row ? "Content updated" : "Content created", `${form.title} was saved.`, "success");
      setEditing(null);
    } catch (e) {
      toast("Couldn't save", e.message, "info");
    }
  };

  const confirmDelete = async () => {
    const { kind, row } = deleting;
    try {
      if (kind === "lesson") {
        await adminApi.deleteLesson(row.id);
        setLessonRows((rs) => rs.filter((r) => r.id !== row.id));
      } else {
        await adminApi.deleteQuiz(row.id);
        setQuizRows((rs) => rs.filter((r) => r.id !== row.id));
      }
      toast("Deleted", `${row.title} was removed.`, "info");
      setDeleting(null);
    } catch (e) {
      toast("Couldn't delete", e.message, "info");
      setDeleting(null);
    }
  };

  const togglePublish = async (kind, row) => {
    const setter = kind === "lesson" ? setLessonRows : setQuizRows;
    const next = !row.published;
    // optimistic
    setter((rs) => rs.map((r) => (r.id === row.id ? { ...r, published: next } : r)));
    try {
      if (kind === "lesson") await adminApi.updateLesson(row.id, { published: next });
      else await adminApi.updateQuiz(row.id, { published: next });
      toast(next ? "Published" : "Unpublished", `${row.title} is now ${next ? "visible to" : "hidden from"} learners.`, "success");
    } catch (e) {
      // revert
      setter((rs) => rs.map((r) => (r.id === row.id ? { ...r, published: !next } : r)));
      toast("Couldn't update", e.message, "info");
    }
  };

  const rows = tab === "lessons" ? lessonRows : quizRows;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Content" }]} />
      <PageHeader
        title="Content management"
        subtitle="Create, edit, publish, and retire lessons and quizzes."
        action={
          <Button variant="primary" onClick={() => openEditor(tab === "lessons" ? "lesson" : "quiz", null)}>
            <Icon name="Plus" size={16} /> New {tab === "lessons" ? "lesson" : "quiz"}
          </Button>
        }
      />

      <Tabs
        tabs={[
          { id: "lessons", label: `Lessons (${lessonRows.length})` },
          { id: "quizzes", label: `Quizzes (${quizRows.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-700 dark:text-ink-400">
              <th className="px-4 py-3 font-semibold">Title</th>
              {tab === "lessons" && <th className="px-4 py-3 font-semibold">Category</th>}
              <th className="px-4 py-3 font-semibold">Difficulty</th>
              <th className="px-4 py-3 font-semibold">{tab === "lessons" ? "Length" : "Questions"}</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50 dark:divide-ink-700/60">
            {rows.map((r) => {
              const cat = CATEGORIES.find((c) => c.id === r.category);
              return (
                <tr key={r.id} className="hover:bg-ink-50/60 dark:hover:bg-ink-800/50">
                  <td className="max-w-[260px] px-4 py-3">
                    <p className="truncate font-medium text-ink-900 dark:text-white">{r.title}</p>
                    <p className="truncate text-xs text-ink-400">{r.summary || r.desc}</p>
                  </td>
                  {tab === "lessons" && (
                    <td className="px-4 py-3">
                      {cat ? <Chip tone="teal"><Icon name={cat.icon} size={12} /> {cat.name}</Chip> : <span className="text-xs text-ink-400">—</span>}
                    </td>
                  )}
                  <td className="px-4 py-3"><DifficultyChip level={r.difficulty} /></td>
                  <td className="px-4 py-3 text-ink-600 dark:text-ink-300">
                    {tab === "lessons" ? `${r.minutes} min · ${r.xp} XP` : `${r.questions.length} questions${r.timed ? " · timed" : ""}`}
                  </td>
                  <td className="px-4 py-3">
                    <Chip tone={r.published ? "green" : "ink"}>{r.published ? "Published" : "Draft"}</Chip>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => togglePublish(tab === "lessons" ? "lesson" : "quiz", r)} title={r.published ? "Unpublish" : "Publish"} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-700 dark:hover:text-white">
                        <Icon name={r.published ? "EyeOff" : "Eye"} size={16} />
                      </button>
                      <button onClick={() => openEditor(tab === "lessons" ? "lesson" : "quiz", r)} title="Edit" className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-700 dark:hover:text-white">
                        <Icon name="Pencil" size={16} />
                      </button>
                      <button onClick={() => setDeleting({ kind: tab === "lessons" ? "lesson" : "quiz", row: r })} title="Delete" className="rounded-lg p-2 text-ink-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400">
                        <Icon name="Trash2" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* editor modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.row ? `Edit ${editing.kind}` : `New ${editing?.kind}`}>
        <div className="space-y-4">
          <Field label="Title" error={formErr.title}>
            <input className="input" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          {editing?.kind === "lesson" && (
            <Field label="Category">
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Difficulty">
              <select className="input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                <option>Easy</option><option>Medium</option><option>Hard</option>
              </select>
            </Field>
            {editing?.kind === "lesson" && (
              <Field label="Minutes">
                <input className="input" type="number" min="1" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} />
              </Field>
            )}
          </div>
          <Field label="Short description" error={formErr.desc}>
            <textarea className="input min-h-[80px] resize-y" value={form.desc || ""} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" onClick={saveEditor}><Icon name="Save" size={15} /> Save</Button>
          </div>
        </div>
      </Modal>

      {/* delete confirm */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete this content?">
        <p className="text-sm text-ink-600 dark:text-ink-300">
          <strong>{deleting?.row?.title}</strong> will be removed from the platform. Learners will lose access immediately. (Demo — affects local state only.)
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}><Icon name="Trash2" size={15} /> Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ============ USER MANAGEMENT ============ */
export function AdminUsers() {
  const { toast } = useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [completion, setCompletion] = useState("all");
  const [acting, setActing] = useState(null); // {user, action}

  // Map API user → table row shape (capitalised Role/Status, derived fields).
  const mapUser = (u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role === "admin" ? "Admin" : u.role === "moderator" ? "Moderator" : "Learner",
    status: u.status === "active" ? "Active" : u.status === "suspended" ? "Suspended" : "Inactive",
    lessons: u.lessons ?? 0,
    xp: u.xp ?? 0,
    completion: u.completion ?? 0,
    lastActive: u.lastActive ? relativeTime(u.lastActive) : "—",
  });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminApi
      .users()
      .then((rows) => { if (alive) setUsers(rows.map(mapUser)); })
      .catch((e) => { if (alive) toast("Couldn't load users", e.message, "info"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [toast]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (query && !u.name.toLowerCase().includes(query.toLowerCase()) && !u.email.toLowerCase().includes(query.toLowerCase())) return false;
      if (role !== "all" && u.role !== role) return false;
      if (status !== "all" && u.status !== status) return false;
      if (completion === "high" && u.completion < 70) return false;
      if (completion === "mid" && (u.completion < 30 || u.completion >= 70)) return false;
      if (completion === "low" && u.completion >= 30) return false;
      return true;
    });
  }, [users, query, role, status, completion]);

  const applyAction = async () => {
    const { user, action } = acting;
    const newStatus = action === "suspend" ? "suspended" : action === "deactivate" ? "inactive" : "active";
    setActing(null);
    try {
      await adminApi.setStatus(user.id, newStatus);
      setUsers((us) =>
        us.map((u) =>
          u.id === user.id
            ? { ...u, status: newStatus === "suspended" ? "Suspended" : newStatus === "inactive" ? "Inactive" : "Active" }
            : u
        )
      );
      toast(
        action === "reactivate" ? "User reactivated" : action === "suspend" ? "User suspended" : "User deactivated",
        `${user.name}'s account status was updated.`,
        action === "reactivate" ? "success" : "info"
      );
    } catch (e) {
      toast("Action failed", e.message, "info");
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Users" }]} />
      <PageHeader title="User management" subtitle={`${users.length} registered accounts · search, filter, and moderate.`} />

      {/* filters */}
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Icon name="Search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search by name or email…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search users" />
        </div>
        <select className="input lg:w-40" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role">
          <option value="all">All roles</option><option>Learner</option><option>Admin</option>
        </select>
        <select className="input lg:w-40" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option><option>Active</option><option>Inactive</option><option>Suspended</option>
        </select>
        <select className="input lg:w-52" value={completion} onChange={(e) => setCompletion(e.target.value)} aria-label="Filter by completion">
          <option value="all">Any completion</option>
          <option value="high">High (≥70%)</option>
          <option value="mid">Medium (30–69%)</option>
          <option value="low">Low (&lt;30%)</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="UserX" title="No users match" body="Try clearing your search or filters." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-700 dark:text-ink-400">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Lessons</th>
                <th className="px-4 py-3 font-semibold">XP</th>
                <th className="px-4 py-3 font-semibold">Completion</th>
                <th className="px-4 py-3 font-semibold">Last active</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50 dark:divide-ink-700/60">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-ink-50/60 dark:hover:bg-ink-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size={34} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-900 dark:text-white">{u.name}</p>
                        <p className="truncate text-xs text-ink-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Chip tone={u.role === "Admin" ? "violet" : "ink"}>{u.role}</Chip></td>
                  <td className="px-4 py-3">
                    <Chip tone={u.status === "Active" ? "green" : u.status === "Suspended" ? "rose" : "amber"}>{u.status}</Chip>
                  </td>
                  <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{u.lessons} lessons</td>
                  <td className="px-4 py-3 font-medium text-ink-800 dark:text-ink-100">{u.xp} XP</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-700">
                        <div className="h-full rounded-full bg-signal-500" style={{ width: `${u.completion}%` }} />
                      </div>
                      <span className="text-xs tabular-nums text-ink-500 dark:text-ink-300">{u.completion}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-500 dark:text-ink-300">{u.lastActive}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {u.status === "Active" ? (
                        <>
                          <button onClick={() => setActing({ user: u, action: "deactivate" })} title="Deactivate" className="rounded-lg p-2 text-ink-400 hover:bg-amberx-50 hover:text-amberx-600 dark:hover:bg-amberx-900/30 dark:hover:text-amberx-400">
                            <Icon name="UserMinus" size={16} />
                          </button>
                          <button onClick={() => setActing({ user: u, action: "suspend" })} title="Suspend" className="rounded-lg p-2 text-ink-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400">
                            <Icon name="Ban" size={16} />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setActing({ user: u, action: "reactivate" })} title="Reactivate" className="rounded-lg p-2 text-ink-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400">
                          <Icon name="UserCheck" size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!acting} onClose={() => setActing(null)} title={
        acting?.action === "suspend" ? "Suspend this user?" :
        acting?.action === "deactivate" ? "Deactivate this user?" : "Reactivate this user?"
      }>
        <p className="text-sm text-ink-600 dark:text-ink-300">
          {acting?.action === "suspend" && <><strong>{acting?.user?.name}</strong> will lose access immediately and be flagged for review.</>}
          {acting?.action === "deactivate" && <><strong>{acting?.user?.name}</strong>'s account will be paused — they can be reactivated later.</>}
          {acting?.action === "reactivate" && <><strong>{acting?.user?.name}</strong> will regain full access to the platform.</>}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setActing(null)}>Cancel</Button>
          <Button variant={acting?.action === "reactivate" ? "primary" : "danger"} onClick={applyAction}>Confirm</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ============ ANALYTICS ============ */
export function AdminAnalytics() {
  const { toast } = useApp();
  const [overview, setOverview] = useState(null);
  const [quizStats, setQuizStats] = useState(QUIZ_STATS);
  const [catData, setCatData] = useState(CATEGORY_COMPLETION);
  const [badgeData, setBadgeData] = useState(BADGE_DISTRIBUTION);
  const [detStats, setDetStats] = useState(null);
  const [rules, setRules] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      adminApi.overview(),
      adminApi.quizStats(),
      adminApi.categoryCompletion(),
      adminApi.badgeDistribution(),
      detectionApi.adminStats(),
      detectionApi.rules(),
    ]).then((results) => {
      if (!alive) return;
      const [ov, qs, cc, bd, ds, rl] = results;
      if (ov.status === "fulfilled") setOverview(ov.value);
      // Only replace static demo data when the server actually has rows,
      // so empty databases still render a meaningful chart.
      if (qs.status === "fulfilled" && qs.value.length) setQuizStats(qs.value);
      if (cc.status === "fulfilled" && cc.value.some((c) => c.value > 0)) setCatData(cc.value);
      if (bd.status === "fulfilled" && bd.value.length) setBadgeData(bd.value);
      if (ds.status === "fulfilled") setDetStats(ds.value);
      if (rl.status === "fulfilled") setRules(rl.value);
    }).catch((e) => alive && toast("Couldn't load analytics", e.message, "info"));
    return () => { alive = false; };
  }, [toast]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Analytics" }]} />
      <PageHeader
        title="Reports & analytics"
        subtitle="Engagement, quiz performance, completion mix, and badge distribution."
        action={
          <Button variant="secondary" onClick={() => toast("Export started", "Analytics CSV export queued (demo).", "success")}>
            <Icon name="Download" size={16} /> Export data
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="Percent" label="Average quiz score" value={`${overview?.avgQuizScore ?? 79}%`} trend="across all attempts" trendUp />
        <StatCard icon="Award" label="Quiz attempts" value={(overview?.quizAttempts ?? 0).toLocaleString()} trend="all time" trendUp />
        <StatCard icon="BookOpenCheck" label="Lessons completed" value={(overview?.lessonsCompleted ?? 0).toLocaleString()} trend="all learners" trendUp />
        <StatCard icon="Users" label="Active learners" value={(overview?.activeUsers ?? 0).toLocaleString()} trend={`${overview?.users ?? 0} total`} trendUp />
      </div>

      {/* ── Detection analytics ─────────────────────────────── */}
      <div className="rounded-2xl border border-signal-200 bg-signal-50/40 p-4 dark:border-signal-800/50 dark:bg-signal-900/10 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-signal-600 text-white"><Icon name="ScanSearch" size={17} /></span>
          <h2 className="font-display text-base font-semibold text-ink-900 dark:text-white">Detection analytics</h2>
          <Chip tone="teal" className="ml-auto">{(detStats?.totalScans ?? 0).toLocaleString()} scans</Chip>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="ScanSearch" label="Total scans" value={(detStats?.totalScans ?? 0).toLocaleString()} trend="all time" trendUp tone="teal" />
          <StatCard icon="ShieldAlert" label="Threats caught" value={(detStats?.threatsCaught ?? 0).toLocaleString()} trend="likely phishing+" tone="rose" />
          <StatCard icon="Link2" label="URL scans" value={(detStats?.inputTypes?.url ?? 0).toLocaleString()} tone="violet" />
          <StatCard icon="MessageSquare" label="Message scans" value={(detStats?.inputTypes?.message ?? 0).toLocaleString()} tone="amber" />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* verdict distribution */}
          <Card className="p-5">
            <h3 className="mb-4 font-display text-sm font-semibold text-ink-900 dark:text-white">Verdict distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={(detStats?.verdictDistribution ?? []).filter((v) => v.count > 0)} dataKey="count" nameKey="verdict" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {(detStats?.verdictDistribution ?? []).filter((v) => v.count > 0).map((v, i) => <Cell key={i} fill={VERDICT_COLORS[v.verdict] || "#94a3b8"} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11.5 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {(detStats?.totalScans ?? 0) === 0 && <p className="text-center text-xs text-ink-400">No scans recorded yet.</p>}
          </Card>

          {/* top triggered signals */}
          <Card className="p-5">
            <h3 className="mb-4 font-display text-sm font-semibold text-ink-900 dark:text-white">Most-triggered signals</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={detStats?.topSignals ?? []} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,130,150,.2)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#8b93a5" allowDecimals={false} />
                  <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 10 }} stroke="#8b93a5" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Times triggered" fill="#e11d48" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {!(detStats?.topSignals ?? []).length && <p className="text-center text-xs text-ink-400">No signals triggered yet.</p>}
          </Card>
        </div>

        {/* read-only rule catalog */}
        {rules && (
          <details className="mt-4 rounded-xl border border-ink-100 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
            <summary className="cursor-pointer text-sm font-semibold text-ink-800 dark:text-ink-100">
              Detection rule catalog ({rules.total} rules) · read-only
            </summary>
            <p className="mt-2 text-xs text-ink-400">
              Verdict bands: {rules.bands.map((b) => `${b.verdict} (${b.range})`).join(" · ")}
            </p>
            <div className="mt-3 max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white dark:bg-ink-900">
                  <tr className="border-b border-ink-100 text-ink-400 dark:border-ink-800">
                    <th className="py-2 pr-3 font-medium">Rule</th>
                    <th className="py-2 pr-3 font-medium">Category</th>
                    <th className="py-2 pr-3 text-right font-medium">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {[...rules.url, ...rules.message].map((r) => (
                    <tr key={r.id} className="border-b border-ink-50 dark:border-ink-800/60">
                      <td className="py-2 pr-3 font-medium text-ink-800 dark:text-ink-100">{r.label}</td>
                      <td className="py-2 pr-3 text-ink-500 dark:text-ink-300">{r.category}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink-500 dark:text-ink-300">{r.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>

      {/* engagement line */}
      <Card className="p-5">
        <h2 className="mb-4 font-display text-sm font-semibold text-ink-900 dark:text-white">Learning trend — 8 weeks</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ENGAGEMENT_SERIES} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,130,150,.2)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#8b93a5" />
              <YAxis tick={{ fontSize: 11 }} stroke="#8b93a5" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="activeUsers" name="Active users" stroke="#0d9f92" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="lessons" name="Lessons completed" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="quizzes" name="Quiz attempts" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* quiz pass rates bar */}
        <Card className="p-5">
          <h2 className="mb-4 font-display text-sm font-semibold text-ink-900 dark:text-white">Quiz pass rates</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quizStats} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,130,150,.2)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#8b93a5" />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} stroke="#8b93a5" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="passRate" name="Pass rate %" fill="#0d9f92" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* category completion donut */}
        <Card className="p-5">
          <h2 className="mb-4 font-display text-sm font-semibold text-ink-900 dark:text-white">Lesson completion by category</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={catData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                  {catData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11.5 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* badge distribution */}
      <Card className="p-5">
        <h2 className="mb-4 font-display text-sm font-semibold text-ink-900 dark:text-white">Badge distribution</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={badgeData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,130,150,.2)" />
              <XAxis dataKey="name" tick={{ fontSize: 10.5 }} stroke="#8b93a5" interval={0} angle={-18} textAnchor="end" height={55} />
              <YAxis tick={{ fontSize: 11 }} stroke="#8b93a5" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Learners holding" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
