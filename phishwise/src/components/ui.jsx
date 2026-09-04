import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../lib/store";

export function Icon({ name, className = "w-5 h-5", ...rest }) {
  const C = Icons[name] || Icons.Circle;
  return <C className={className} aria-hidden="true" {...rest} />;
}

export function Button({ children, variant = "primary", size = "md", className = "", as: As = "button", ...rest }) {
  const variants = {
    primary: "bg-signal-600 hover:bg-signal-700 text-white shadow-sm",
    dark: "bg-ink-900 hover:bg-ink-800 text-white dark:bg-signal-600 dark:hover:bg-signal-700",
    secondary: "bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-700 hover:bg-ink-50 dark:hover:bg-ink-700 text-ink-800 dark:text-ink-100",
    ghost: "hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-700 dark:text-ink-200",
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
    amber: "bg-amberx-500 hover:bg-amberx-600 text-ink-950 font-semibold",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3 text-base" };
  return (
    <As className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {children}
    </As>
  );
}

export function Card({ children, className = "", ...rest }) {
  return <div className={`card ${className}`} {...rest}>{children}</div>;
}

export function Chip({ children, tone = "ink", className = "" }) {
  const tones = {
    ink: "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200",
    teal: "bg-signal-100 text-signal-800 dark:bg-signal-900 dark:text-signal-200",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>{children}</span>;
}

export function DifficultyChip({ level }) {
  const tone = level === "Easy" ? "green" : level === "Medium" ? "amber" : "rose";
  return <Chip tone={tone}>{level}</Chip>;
}

export function ProgressBar({ value, className = "", tone = "teal" }) {
  const tones = { teal: "bg-signal-500", amber: "bg-amberx-500", ink: "bg-ink-500" };
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800 ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin="0" aria-valuemax="100">
      <div className={`h-full rounded-full ${tones[tone]} transition-all duration-700`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 64, stroke = 6, label, sub, className = "" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-ink-100 dark:stroke-ink-800" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-signal-500 transition-all duration-700" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (Math.min(100, value) / 100) * c} />
      </svg>
      <div className="absolute text-center leading-tight">
        <div className="text-sm font-bold">{label ?? `${value}%`}</div>
        {sub && <div className="text-[10px] text-ink-400">{sub}</div>}
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
          <motion.div initial={{ y: 24, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ type: "spring", damping: 26, stiffness: 320 }} onClick={(e) => e.stopPropagation()} className={`card w-full ${wide ? "max-w-2xl" : "max-w-md"} p-6 max-h-[85vh] overflow-y-auto`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h3 className="text-lg font-bold">{title}</h3>
              <button onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1 hover:bg-ink-100 dark:hover:bg-ink-800"><Icon name="X" className="w-5 h-5" /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto rounded-xl bg-ink-100 dark:bg-ink-800 p-1 w-fit max-w-full">
      {tabs.map((t) => {
        // Support both string tabs and { id, label } object tabs.
        const id = typeof t === "string" ? t : t.id;
        const label = typeof t === "string" ? t : t.label;
        return (
          <button key={id} role="tab" aria-selected={active === id} onClick={() => onChange(id)}
            className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${active === id ? "bg-white dark:bg-ink-900 shadow-sm text-ink-900 dark:text-white" : "text-ink-500 dark:text-ink-300 hover:text-ink-800 dark:hover:text-white"}`}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function Accordion({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="divide-y divide-ink-100 dark:divide-ink-800">
      {items.map((it, i) => (
        <div key={i}>
          <button className="flex w-full items-center justify-between gap-4 py-4 text-left font-medium" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            <span>{it.q}</span>
            <Icon name="ChevronDown" className={`w-5 h-5 shrink-0 text-ink-400 transition-transform ${open === i ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <p className="pb-4 text-sm text-ink-500 dark:text-ink-300 leading-relaxed">{it.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = "Inbox", title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 dark:border-ink-700 p-10 text-center">
      <div className="mb-3 rounded-2xl bg-ink-100 dark:bg-ink-800 p-4"><Icon name={icon} className="w-7 h-7 text-ink-400" /></div>
      <h4 className="font-semibold">{title}</h4>
      <p className="mt-1 max-w-sm text-sm text-ink-500 dark:text-ink-400">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, error, hint, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      {error && <p className="mt-1 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400"><Icon name="AlertCircle" className="w-3.5 h-3.5" />{error}</p>}
    </div>
  );
}

export function StatCard({ icon, label, value, sub, trend, trendUp, tone = "teal" }) {
  const tones = { teal: "bg-signal-500/10 text-signal-600 dark:text-signal-300", amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300", rose: "bg-rose-500/10 text-rose-500", violet: "bg-violet-500/10 text-violet-500", ink: "bg-ink-500/10 text-ink-500 dark:text-ink-300" };
  const isNum = typeof trend === "number";
  const up = isNum ? trend >= 0 : trendUp !== false;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div className={`rounded-xl p-2.5 ${tones[tone]}`}><Icon name={icon} className="w-5 h-5" /></div>
        {trend != null && (
          <span className={`flex items-center gap-0.5 text-right text-xs font-semibold ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
            <Icon name={up ? "TrendingUp" : "TrendingDown"} className="w-3.5 h-3.5 shrink-0" />{isNum ? `${Math.abs(trend)}%` : trend}
          </span>
        )}
      </div>
      <div className="mt-3 text-2xl font-bold font-display">{value}</div>
      <div className="text-sm text-ink-500 dark:text-ink-400">{label}</div>
      {sub && <div className="mt-1 text-xs text-ink-400">{sub}</div>}
    </Card>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  const icons = { success: "CheckCircle2", xp: "Sparkles", info: "Info", error: "AlertTriangle" };
  const tones = { success: "text-emerald-500", xp: "text-amberx-500", info: "text-sky-500", error: "text-rose-500" };
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 60 }} className="card flex items-start gap-3 p-4">
            <Icon name={icons[t.kind] || "Info"} className={`mt-0.5 w-5 h-5 shrink-0 ${tones[t.kind] || ""}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.body && <p className="text-xs text-ink-500 dark:text-ink-400">{t.body}</p>}
            </div>
            <button onClick={() => dismissToast(t.id)} aria-label="Dismiss notification" className="text-ink-300 hover:text-ink-500"><Icon name="X" className="w-4 h-4" /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function BadgeUnlockModal() {
  const { badgeModal, setBadgeModal } = useApp();
  const tiers = { bronze: "from-amber-700 to-amber-500", silver: "from-slate-400 to-slate-200", gold: "from-amber-400 to-yellow-300" };
  return (
    <Modal open={!!badgeModal} onClose={() => setBadgeModal(null)} title="Achievement unlocked!">
      {badgeModal && (
        <div className="flex flex-col items-center py-2 text-center">
          <div className={`animate-pop rounded-3xl bg-gradient-to-br ${tiers[badgeModal.tier]} p-6 shadow-lift`}>
            <Icon name={badgeModal.icon} className="w-12 h-12 text-white drop-shadow" />
          </div>
          <h4 className="mt-4 text-xl font-bold font-display">{badgeModal.name}</h4>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{badgeModal.desc}</p>
          <Button className="mt-5" onClick={() => setBadgeModal(null)}><Icon name="PartyPopper" className="w-4 h-4" /> Nice!</Button>
        </div>
      )}
    </Modal>
  );
}

export function Avatar({ name, size = "md" }) {
  const initials = (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-16 h-16 text-xl" };
  const numeric = typeof size === "number";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-signal-500 to-ink-600 font-bold text-white ${numeric ? "" : sizes[size]}`}
      style={numeric ? { width: size, height: size, fontSize: Math.max(10, size * 0.34) } : undefined}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

export function PasswordStrength({ value }) {
  const checks = [value.length >= 8, value.length >= 12, /[A-Z]/.test(value) && /[a-z]/.test(value), /\d/.test(value) || /[^A-Za-z0-9]/.test(value)];
  const score = checks.filter(Boolean).length;
  const labels = ["Too short", "Weak", "Okay", "Good", "Strong"];
  const colors = ["bg-ink-200", "bg-rose-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"];
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => <div key={i} className={`h-1.5 flex-1 rounded-full transition ${i < score ? colors[score] : "bg-ink-100 dark:bg-ink-800"}`} />)}
      </div>
      <p className="mt-1 text-xs text-ink-400">{value ? labels[score] : "Use 12+ characters or a 4-word passphrase"}</p>
    </div>
  );
}
