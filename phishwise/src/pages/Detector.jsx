import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../lib/store.jsx";
import { detectionApi } from "../lib/api";
import { Breadcrumbs, PageHeader } from "../components/layout.jsx";
import {
  Icon, Button, Card, Chip, Tabs, Modal, EmptyState,
} from "../components/ui.jsx";

/* ── Verdict presentation ───────────────────────────────────────────── */
const VERDICT_META = {
  Safe: { tone: "green", stroke: "#10b981", icon: "ShieldCheck", blurb: "No meaningful phishing signals were found." },
  Suspicious: { tone: "amber", stroke: "#f59e0b", icon: "AlertTriangle", blurb: "Some warning signs are present. Treat with caution." },
  "Likely Phishing": { tone: "rose", stroke: "#f97316", icon: "AlertOctagon", blurb: "Multiple strong indicators of phishing. Do not interact." },
  Dangerous: { tone: "rose", stroke: "#e11d48", icon: "ShieldAlert", blurb: "High-confidence phishing. Do not click, reply, or share any details." },
};

const CATEGORY_ICON = {
  "brand-impersonation": "Copy",
  "url-structure": "Link2",
  obfuscation: "EyeOff",
  "transport-security": "Lock",
  "credential-harvesting": "KeyRound",
  urgency: "Timer",
  "reward-bait": "Gift",
  "social-engineering": "Drama",
  vishing: "PhoneCall",
  smishing: "MessageSquareWarning",
  formatting: "Type",
};

/* ── Score gauge (verdict-coloured ring) ────────────────────────────── */
function ScoreGauge({ score, verdict, size = 120 }) {
  const meta = VERDICT_META[verdict] || VERDICT_META.Safe;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-ink-100 dark:stroke-ink-800" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} stroke={meta.stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (Math.min(100, score) / 100) * c} style={{ transition: "stroke-dashoffset .8s ease" }} />
      </svg>
      <div className="absolute text-center leading-none">
        <div className="font-display text-3xl font-bold" style={{ color: meta.stroke }}>{score}</div>
        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-400">risk / 100</div>
      </div>
    </div>
  );
}

/* ── Itemised signal row — subtle tilt like sticky notes ────────────── */
function SignalRow({ s, i = 0 }) {
  return (
    <div className="flex gap-3 rounded-xl border border-ink-100 p-3 dark:border-ink-800" style={{ transform: `rotate(${i % 2 === 0 ? -0.15 : 0.15}deg)` }}>
      <div className="mt-0.5 shrink-0 rounded-lg bg-rose-500/10 p-2 text-rose-500">
        <Icon name={CATEGORY_ICON[s.category] || "AlertCircle"} className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-ink-900 dark:text-white">{s.label}</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300" style={{ transform: "rotate(-0.5deg)" }}>+{s.weight} pts</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-500 dark:text-ink-300">{s.explanation}</p>
        {s.detail && (
          <p className="mt-1 text-xs font-medium text-ink-400">
            <Icon name="CornerDownRight" className="mr-1 inline h-3 w-3" />{s.detail}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Extracted-URL sub-card (message scans) ─────────────────────────── */
function ExtractedUrlCard({ u }) {
  const meta = VERDICT_META[u.verdict] || VERDICT_META.Safe;
  return (
    <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 truncate font-mono text-xs text-ink-700 dark:text-ink-200">{u.input}</p>
        <Chip tone={meta.tone}><Icon name={meta.icon} className="h-3 w-3" /> {u.verdict} · {u.score}</Chip>
      </div>
      {u.signals?.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {u.signals.map((s) => (
            <li key={s.id}><Chip tone="ink">{s.label}</Chip></li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Full result view (shared by detector, history, public widget) ──── */
export function ScanResultView({ data, compact = false }) {
  if (!data) return null;
  const meta = VERDICT_META[data.verdict] || VERDICT_META.Safe;
  const signals = data.signals || [];
  const urls = data.extractedUrls || [];
  const lessons = data.relatedLessons || [];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Verdict header */}
      <Card className={`flex flex-wrap items-center gap-5 p-5 ${compact ? "" : "sm:p-6"}`}>
        <ScoreGauge score={data.score} verdict={data.verdict} size={compact ? 96 : 120} />
        <div className="min-w-0 flex-1">
          <Chip tone={meta.tone} className="text-sm"><Icon name={meta.icon} className="h-3.5 w-3.5" /> {data.verdict}</Chip>
          <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{meta.blurb}</p>
          <p className="mt-1 text-xs text-ink-400">
            {signals.length} signal{signals.length === 1 ? "" : "s"} triggered · {data.inputType === "url" ? "URL" : "message"} analysis
          </p>
        </div>
      </Card>

      {/* Signals */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-ink-900 dark:text-white">
          <Icon name="ListChecks" className="h-4 w-4 text-signal-500" /> What we found
        </h3>
        {signals.length ? (
          <div className="space-y-2">{signals.map((s, idx) => <SignalRow key={s.id} s={s} i={idx} />)}</div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-900/20 dark:text-emerald-300">
            <Icon name="CheckCircle2" className="mr-1.5 inline h-4 w-4" /> No risk signals detected. This still isn't a guarantee — stay alert.
          </div>
        )}
      </div>

      {/* Extracted URLs */}
      {urls.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-ink-900 dark:text-white">
            <Icon name="Link2" className="h-4 w-4 text-signal-500" /> Links found in this message ({urls.length})
          </h3>
          <div className="space-y-2">{urls.map((u, i) => <ExtractedUrlCard key={i} u={u} />)}</div>
        </div>
      )}

      {/* Related lessons */}
      {lessons.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-ink-900 dark:text-white">
            <Icon name="GraduationCap" className="h-4 w-4 text-signal-500" /> Learn the tricks behind this
          </h3>
          <div className="flex flex-wrap gap-2">
            {lessons.map((l) => (
              <Link key={l.id} to={l.href} className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:border-signal-400 hover:text-signal-600 dark:border-ink-700 dark:text-ink-200">
                <Icon name="BookOpen" className="h-3.5 w-3.5" /> {l.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-400">
        <Icon name="Info" className="mt-0.5 h-3 w-3 shrink-0" />
        This is a transparent, rule-based heuristic score — every point comes from a signal above. Heuristics can produce false positives and negatives; use it as a guide, not a guarantee.
      </p>
    </motion.div>
  );
}

/* ── Input panel (URL / message toggle + submit) ────────────────────── */
const EXAMPLES = {
  url: "http://gtbank-secure.tk/account/update",
  message:
    "Dear Customer, your BVN has been blocked. Re-validate now at http://nimc-verify.tk/update to avoid deactivation.",
};

function DetectorInput({ onResult, scanFn, autofocus = true }) {
  const [inputType, setInputType] = useState("url");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await scanFn(trimmed, inputType);
      onResult(result);
    } catch (e) {
      setError(e.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="relative p-5">
      <div className="scribble pointer-events-none absolute -right-2 -top-3 hidden rotate-2 rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 sm:block">paste & press Enter →</div>
      <Tabs
        tabs={[{ id: "url", label: "URL / link" }, { id: "message", label: "Message / email" }]}
        active={inputType}
        onChange={(id) => { setInputType(id); setError(null); }}
      />
      <div className="mt-4">
        {inputType === "url" ? (
          <input
            className="input font-mono"
            placeholder="Paste a link, e.g. http://paypa1.com/login"
            value={value}
            autoFocus={autofocus}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            aria-label="URL to analyse"
          />
        ) : (
          <textarea
            className="input min-h-[120px] resize-y"
            placeholder="Paste the full SMS, WhatsApp message or email body here…"
            value={value}
            autoFocus={autofocus}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Message to analyse"
          />
        )}
      </div>
      {error && (
        <p className="mt-2 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
          <Icon name="AlertCircle" className="h-3.5 w-3.5" />{error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={submit} disabled={loading || !value.trim()}>
          {loading ? <><Icon name="Loader2" className="h-4 w-4 animate-spin" /> Analyzing…</> : <><Icon name="ScanSearch" className="h-4 w-4" /> Analyze</>}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => { setValue(EXAMPLES[inputType]); setError(null); }}>
          <Icon name="Wand2" className="h-4 w-4" /> Try an example
        </Button>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => { setValue(""); setError(null); }}>Clear</Button>
        )}
      </div>
    </Card>
  );
}

/* ── Authenticated Detector page ────────────────────────────────────── */
export default function Detector() {
  const { runScan } = useApp();
  const [detail, setDetail] = useState(null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Detector" }]} />
      <PageHeader
        title="Phishing Detector"
        subtitle="Paste a suspicious link or message and get an instant, explainable risk analysis."
        action={<Button as={Link} to="/scan-history" variant="secondary"><Icon name="History" className="h-4 w-4" /> Scan history</Button>}
      />
      <DetectorInput
        scanFn={runScan}
        onResult={(scanDetail) => {
          // scanDetail is { id, input, result, isDuplicate, ... } from runScan
          // For public scans, scanDetail is { result } — handle both
          const isDup = scanDetail?.isDuplicate;
          const res = scanDetail?.result || scanDetail;
          setDetail({ result: res, isDuplicate: !!isDup });
        }}
      />
      {detail?.isDuplicate && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-200">
          <Icon name="Info" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Already scanned — no extra XP</p>
            <p className="mt-1 text-xs leading-relaxed">You’ve scanned this exact link/message before. We’ve shown your previous result below. Duplicate scans don’t earn XP (prevents farming).</p>
          </div>
        </div>
      )}
      {detail?.result && <ScanResultView data={detail.result} />}
    </div>
  );
}

/* ── Scan History page ──────────────────────────────────────────────── */
export function ScanHistory() {
  const { toast } = useApp();
  const [rows, setRows] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = async () => {
    try {
      setRows(await detectionApi.history());
    } catch {
      setRows([]);
    }
  };
  useEffect(() => { load(); }, []);

  const open = async (id) => {
    setLoadingDetail(true);
    try {
      setDetail(await detectionApi.getScan(id));
    } finally {
      setLoadingDetail(false);
    }
  };

  const remove = async (id, e) => {
    e.stopPropagation();
    try {
      await detectionApi.deleteScan(id);
      setRows((r) => r.filter((x) => x.id !== id));
      toast("Scan deleted", "Removed from your history.", "info");
    } catch (err) {
      toast("Couldn't delete", err.message, "info");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Detector", to: "/detector" }, { label: "Scan history" }]} />
      <PageHeader
        title="Scan history"
        subtitle="Every scan you run while signed in is saved here."
        action={<Button as={Link} to="/detector"><Icon name="ScanSearch" className="h-4 w-4" /> New scan</Button>}
      />

      {rows === null ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="ScanSearch"
          title="No scans yet"
          body="Run your first scan from the detector — it'll be saved here so you can track the threats you've caught."
          action={<Button as={Link} to="/detector">Open the detector</Button>}
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const meta = VERDICT_META[r.verdict] || VERDICT_META.Safe;
            return (
              <button key={r.id} onClick={() => open(r.id)} className="card flex w-full items-center gap-3 p-4 text-left transition hover:shadow-lift">
                <div className="shrink-0 rounded-xl p-2.5" style={{ background: meta.stroke + "1a", color: meta.stroke }}>
                  <Icon name={r.inputType === "url" ? "Link2" : "MessageSquare"} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-800 dark:text-ink-100">{r.preview}</p>
                  <p className="text-xs text-ink-400">{new Date(r.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
                <Chip tone={meta.tone}>{r.verdict} · {r.score}</Chip>
                <button onClick={(e) => remove(r.id, e)} aria-label="Delete scan" className="rounded-lg p-1.5 text-ink-300 hover:bg-ink-100 hover:text-rose-500 dark:hover:bg-ink-800">
                  <Icon name="Trash2" className="h-4 w-4" />
                </button>
              </button>
            );
          })}
        </div>
      )}

      <Modal open={!!detail || loadingDetail} onClose={() => setDetail(null)} title="Scan result" wide>
        {loadingDetail && !detail ? (
          <div className="flex justify-center py-10"><Icon name="Loader2" className="h-6 w-6 animate-spin text-signal-500" /></div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-ink-50 p-3 dark:bg-ink-800">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{detail.inputType === "url" ? "Scanned URL" : "Scanned message"}</p>
              <p className="mt-1 break-words font-mono text-xs text-ink-700 dark:text-ink-200">{detail.input}</p>
            </div>
            <ScanResultView data={detail.result} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

/* ── Public "Try it" widget (landing page; NOT saved) ───────────────── */
export function TryItWidget() {
  const [result, setResult] = useState(null);

  return (
    <div className="w-full max-w-md">
      <Card className="relative p-5 shadow-lift" style={{ transform: "rotate(-0.3deg)" }}>
        <div className="pointer-events-none absolute -right-1 -top-2 h-6 w-12 rotate-12 bg-amber-200/60 dark:bg-amber-300/30" style={{ clipPath: "polygon(4% 0, 100% 0, 96% 100%, 0 100%)" }} />
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-signal-600 text-white"><Icon name="ScanSearch" className="h-5 w-5" /></span>
          <div>
            <p className="font-display text-sm font-bold">Try the detector <span className="scribble ml-1 text-xs font-normal text-amber-600">live</span></p>
            <p className="text-xs text-ink-400">No sign-up needed. Public scans aren't saved.</p>
          </div>
        </div>
        <DetectorInput scanFn={detectionApi.scanPublic} onResult={(res) => setResult(res.result)} autofocus={false} />
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 overflow-hidden">
              <ScanResultView data={result} compact />
              <div className="mt-4 rounded-xl border border-signal-200 bg-signal-50 p-3 text-sm dark:border-signal-700/50 dark:bg-signal-900/20">
                <p className="font-medium text-signal-800 dark:text-signal-200">
                  <Icon name="Sparkles" className="mr-1 inline h-4 w-4" /> Sign up to save your scan history and track the threats you've caught.
                </p>
                <Button as={Link} to="/register" size="sm" className="mt-2">Create free account <Icon name="ArrowRight" className="h-4 w-4" /></Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
