import { useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "./ErrorBoundary.jsx";
import { Icon, Button, Avatar, Chip } from "./ui";
import { useApp } from "../lib/store";
import { NOTIFICATIONS, ADMIN_NOTIFICATIONS } from "../data/mock";
import { LESSONS } from "../data/lessons";
import { AnimatePresence, motion } from "framer-motion";

export function Logo({ light = false, className = "" }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-display text-lg font-bold ${light ? "text-white" : "text-ink-900 dark:text-white"} ${className}`}>
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-signal-500 to-ink-700 text-white shadow-sm">
        <Icon name="ShieldCheck" className="w-5 h-5" />
      </span>
      Phish<span className="text-signal-500">Wise</span>
    </Link>
  );
}

const DETECTION_NAV = [
  { to: "/detector", label: "Analyze", icon: "ScanSearch" },
  { to: "/scan-history", label: "Scan History", icon: "History" },
];

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { to: "/lessons", label: "Lessons", icon: "BookOpen" },
  { to: "/quizzes", label: "Quizzes", icon: "ClipboardList" },
  { to: "/achievements", label: "Achievements", icon: "Trophy" },
  { to: "/reports", label: "My Reports", icon: "BarChart3" },
  { to: "/profile", label: "Profile", icon: "UserRound" },
  { to: "/help", label: "Help & FAQ", icon: "LifeBuoy" },
];

const ADMIN_NAV = [
  { to: "/admin/content", label: "Manage Content", icon: "FolderCog" },
  { to: "/admin/users", label: "Manage Users", icon: "Users" },
  { to: "/admin/analytics", label: "View Analysis", icon: "PieChart" },
];

function SideLink({ item, collapsed, onClick }) {
  return (
    <NavLink to={item.to} end={item.end} onClick={onClick} title={collapsed ? item.label : undefined}
      className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-signal-600/15 text-signal-300" : "text-ink-300 hover:bg-white/5 hover:text-white"}`}>
      <Icon name={item.icon} className="w-5 h-5 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

function NotificationsPanel({ admin }) {
  const list = admin ? ADMIN_NOTIFICATIONS : NOTIFICATIONS;
  return (
    <div className="card absolute right-0 top-12 z-40 w-80 max-w-[calc(100vw-2rem)] p-2 shadow-lift">
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-sm font-bold">Notifications</p>
        <Chip tone="teal">{list.filter((n) => n.unread).length} new</Chip>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {list.map((n) => (
          <div key={n.id} className={`flex gap-3 rounded-xl px-3 py-2.5 ${n.unread ? "bg-signal-500/5" : ""}`}>
            <div className="mt-0.5 rounded-lg bg-ink-100 p-1.5 dark:bg-ink-800"><Icon name={n.icon} className="w-4 h-4 text-signal-600 dark:text-signal-300" /></div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">{n.title}</p>
              <p className="text-xs text-ink-500 dark:text-ink-400">{n.body}</p>
              <p className="mt-0.5 text-[11px] text-ink-400">{n.time}</p>
            </div>
          </div>
        ))}
      </div>
      <button className="w-full rounded-xl py-2 text-center text-xs font-medium text-signal-600 hover:bg-ink-50 dark:hover:bg-ink-800">Mark all as read</button>
    </div>
  );
}

function SearchOverlay({ open, onClose }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const results = useMemo(() => q.trim() ? LESSONS.filter((l) => (l.title + l.summary).toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [], [q]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-ink-950/60 p-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div className="card mx-auto max-w-xl p-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-ink-100 px-2 pb-3 dark:border-ink-800">
          <Icon name="Search" className="w-5 h-5 text-ink-400" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lessons… e.g. phishing, password, Wi-Fi" className="w-full bg-transparent text-sm outline-none" aria-label="Search lessons" />
          <kbd className="rounded border border-ink-200 px-1.5 text-[10px] text-ink-400 dark:border-ink-700">ESC</kbd>
        </div>
        <div className="mt-2">
          {q && results.length === 0 && <p className="px-3 py-6 text-center text-sm text-ink-400">No lessons match “{q}”.</p>}
          {results.map((l) => (
            <button key={l.id} onClick={() => { onClose(); navigate(`/lessons/${l.id}`); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-ink-50 dark:hover:bg-ink-800">
              <Icon name="BookOpen" className="w-4 h-4 text-signal-500" />
              <div>
                <p className="text-sm font-medium">{l.title}</p>
                <p className="text-xs text-ink-400 line-clamp-1">{l.summary}</p>
              </div>
            </button>
          ))}
          {!q && <p className="px-3 py-4 text-xs text-ink-400">Type to search the lesson library.</p>}
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }) {
  const { user, logout, theme, setTheme, level, progress } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith("/admin");
  const isAdmin = user?.role === "admin";

  const sidebar = (mobile = false) => (
    <div className={`flex h-full flex-col ${isAdminArea ? "bg-[#150f2e]" : "bg-ink-950"} text-white`}>
      <div className="flex items-center justify-between px-4 py-5">
        {!collapsed || mobile ? <Logo light /> : <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-signal-500 to-ink-700"><Icon name="ShieldCheck" className="w-5 h-5" /></span>}
        {mobile && <button onClick={() => setMobileOpen(false)} aria-label="Close menu"><Icon name="X" /></button>}
      </div>
      {isAdminArea && (!collapsed || mobile) && <div className="mx-4 mb-2 rounded-lg bg-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-300">Admin console</div>}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main navigation">
        {isAdmin ? (
          <>
            {(!collapsed || mobile) && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">Administration</p>}
            {ADMIN_NAV.map((i) => <SideLink key={i.to} item={i} collapsed={collapsed && !mobile} onClick={() => setMobileOpen(false)} />)}
          </>
        ) : (
          <>
            {!collapsed && !mobile && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">Detection</p>}
            {DETECTION_NAV.map((i) => <SideLink key={i.to} item={i} collapsed={collapsed && !mobile} onClick={() => setMobileOpen(false)} />)}
            {!collapsed && !mobile && <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-ink-500">Learning</p>}
            {(collapsed && !mobile) && <div className="my-3 border-t border-white/10" />}
            {NAV.map((i) => <SideLink key={i.to} item={i} collapsed={collapsed && !mobile} onClick={() => setMobileOpen(false)} />)}
          </>
        )}
      </nav>
      <div className="border-t border-white/10 p-3">
        {(!collapsed || mobile) && (
          <div className="mb-2 rounded-xl bg-white/5 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-signal-300">Level {level.level} · {level.name}</span>
              <span className="text-ink-400">{progress.xp} XP</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-signal-400" style={{ width: `${level.pct}%` }} /></div>
          </div>
        )}
        <button onClick={() => { logout(); navigate("/"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-300 hover:bg-white/5 hover:text-white" title="Log out">
          <Icon name="LogOut" className="w-5 h-5 shrink-0" />{(!collapsed || mobile) && "Log out"}
        </button>
        <button onClick={() => setCollapsed((c) => !c)} className="mt-1 hidden w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-ink-500 hover:text-white lg:flex" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <Icon name={collapsed ? "PanelLeftOpen" : "PanelLeftClose"} className="w-5 h-5 shrink-0" />{!collapsed && "Collapse"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 hidden lg:block transition-all ${collapsed ? "w-[76px]" : "w-64"}`}>{sidebar(false)}</aside>
      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-ink-950/60 lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", damping: 28, stiffness: 300 }} className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden">{sidebar(true)}</motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className={`transition-all ${collapsed ? "lg:pl-[76px]" : "lg:pl-64"}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/85 backdrop-blur dark:border-ink-800 dark:bg-ink-950/85">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button className="rounded-lg p-2 hover:bg-ink-100 dark:hover:bg-ink-800 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Icon name="Menu" /></button>
            <button onClick={() => setSearchOpen(true)} className="hidden flex-1 max-w-md items-center gap-2 rounded-xl border border-ink-200 px-3.5 py-2 text-sm text-ink-400 hover:border-signal-400 dark:border-ink-700 sm:flex">
              <Icon name="Search" className="w-4 h-4" /> Search lessons…
            </button>
            <button onClick={() => setSearchOpen(true)} className="rounded-lg p-2 hover:bg-ink-100 dark:hover:bg-ink-800 sm:hidden" aria-label="Search"><Icon name="Search" /></button>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="mr-1 hidden items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 md:flex" title="Daily streak">
                <Icon name="Flame" className="w-4 h-4" /> {progress.streak} day{progress.streak === 1 ? "" : "s"}
              </div>
              <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-lg p-2 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="Toggle dark mode">
                <Icon name={theme === "dark" ? "Sun" : "Moon"} className="w-5 h-5" />
              </button>
              <div className="relative">
                <button onClick={() => setNotifOpen((o) => !o)} className="relative rounded-lg p-2 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="Notifications">
                  <Icon name="Bell" className="w-5 h-5" />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
                </button>
                {notifOpen && <NotificationsPanel admin={isAdminArea} />}
              </div>
              <Link to="/profile" className="ml-1 flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-ink-100 dark:hover:bg-ink-800">
                <Avatar name={user?.name} size="sm" />
                <span className="hidden text-sm font-medium md:block">{user?.name?.split(" ")[0]}</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8" onClick={() => notifOpen && setNotifOpen(false)}>
          <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>
        </main>
      </div>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-ink-400">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <Icon name="ChevronRight" className="w-3.5 h-3.5" />}
          {it.to ? <Link to={it.to} className="hover:text-signal-600">{it.label}</Link> : <span className="font-medium text-ink-700 dark:text-ink-200">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({ title, sub, subtitle, right, action }) {
  const subText = sub ?? subtitle;
  const rightEl = right ?? action;
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subText && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{subText}</p>}
      </div>
      {rightEl}
    </div>
  );
}

export function PublicNav() {
  const { user, theme, setTheme } = useApp();
  const [open, setOpen] = useState(false);
  const links = [["Features", "#features"], ["How it works", "#how"], ["Modules", "#modules"], ["FAQ", "/help"]];
  return (
    <header className="sticky top-0 z-30 border-b border-ink-100/70 bg-ink-50/85 backdrop-blur dark:border-ink-800 dark:bg-ink-950/85">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-medium text-ink-600 dark:text-ink-300 md:flex">
          {links.map(([l, h]) => h.startsWith("#") ? <a key={l} href={h} className="hover:text-signal-600">{l}</a> : <Link key={l} to={h} className="hover:text-signal-600">{l}</Link>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-lg p-2 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="Toggle dark mode"><Icon name={theme === "dark" ? "Sun" : "Moon"} className="w-5 h-5" /></button>
          {user ? (
            <Button as={Link} to="/dashboard">Open dashboard <Icon name="ArrowRight" className="w-4 h-4" /></Button>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost">Log in</Button>
              <Button as={Link} to="/register">Get started free</Button>
            </>
          )}
        </div>
        <button className="rounded-lg p-2 hover:bg-ink-100 dark:hover:bg-ink-800 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu"><Icon name={open ? "X" : "Menu"} /></button>
      </div>
      {open && (
        <div className="border-t border-ink-100 px-4 py-3 dark:border-ink-800 md:hidden">
          {links.map(([l, h]) => h.startsWith("#") ? <a key={l} href={h} onClick={() => setOpen(false)} className="block py-2 text-sm font-medium">{l}</a> : <Link key={l} to={h} onClick={() => setOpen(false)} className="block py-2 text-sm font-medium">{l}</Link>)}
          <div className="mt-2 flex gap-2">
            <Button as={Link} to="/login" variant="secondary" className="flex-1">Log in</Button>
            <Button as={Link} to="/register" className="flex-1">Get started</Button>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-950">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-500 dark:text-ink-400">Gamified micro-learning for phishing awareness. A final-year project — designed in Figma, debated over coffee, and built to explain every risk point.</p>
          <p className="scribble mt-2 text-sm text-amber-600 dark:text-amber-400">handcrafted · thesis 2026 · Lagos ✎</p>
        </div>
        <div>
          <p className="mb-3 text-sm font-bold">Platform</p>
          {[["Lessons", "/lessons"], ["Quizzes", "/quizzes"], ["Achievements", "/achievements"], ["Reports", "/reports"]].map(([l, h]) => <Link key={l} to={h} className="block py-1 text-sm text-ink-500 hover:text-signal-600 dark:text-ink-400">{l}</Link>)}
        </div>
        <div>
          <p className="mb-3 text-sm font-bold">Support</p>
          {[["Help & FAQ", "/help"], ["Contact support", "/help"], ["Privacy policy", "#"], ["Terms of use", "#"]].map(([l, h]) => h === "#" ? <a key={l} href="#" onClick={(e) => e.preventDefault()} className="block py-1 text-sm text-ink-500 hover:text-signal-600 dark:text-ink-400">{l}</a> : <Link key={l} to={h} className="block py-1 text-sm text-ink-500 hover:text-signal-600 dark:text-ink-400">{l}</Link>)}
        </div>
      </div>
      <div className="border-t border-ink-100 py-4 text-center text-xs text-ink-400 dark:border-ink-800">© 2026 PhishWise · Design & Implementation of a Gamified Micro-Learning Platform · Demo build</div>
    </footer>
  );
}
