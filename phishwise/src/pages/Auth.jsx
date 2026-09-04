import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../lib/store";
import { authApi } from "../lib/api";
import { Icon, Button, Card, Field, PasswordStrength, Chip } from "../components/ui";
import { Logo } from "../components/layout";

function AuthFrame({ title, sub, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(70%_50%_at_50%_0%,rgba(13,159,146,.12),transparent_60%)] px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <Card className="p-7">
          {title && <h1 className="text-xl font-bold">{title}</h1>}
          {sub && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{sub}</p>}
          <div className={title ? "mt-6" : ""}>{children}</div>
        </Card>
        {footer && <p className="mt-5 text-center text-sm text-ink-500 dark:text-ink-400">{footer}</p>}
      </motion.div>
    </div>
  );
}

const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export function Login() {
  const { login, toast } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setServerError("");
    const errs = {};
    if (!emailOk(form.email)) errs.email = "Enter a valid email address.";
    if (form.password.length < 1) errs.password = "Password is required.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      toast(`Welcome back, ${u.name.split(" ")[0]}!`, u.role === "admin" ? "Signed in with admin access." : "Let's keep that streak going.");
      navigate(u.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setServerError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const quick = (email) => { setForm({ email, password: "demo-pass" }); setErrors({}); setServerError(""); };

  return (
    <AuthFrame title="Welcome back" sub="Log in to continue your security training." footer={<>New to PhishWise? <Link className="font-semibold text-signal-600" to="/register">Create an account</Link></>}>
      <div className="mb-5 grid grid-cols-2 gap-2">
        <button onClick={() => quick("learner@phishwise.demo")} className="rounded-xl border border-ink-200 p-3 text-left text-xs hover:border-signal-400 dark:border-ink-700">
          <Chip tone="teal" className="mb-1.5">Demo</Chip>
          <p className="font-semibold">Learner account</p>
          <p className="text-ink-400">learner@phishwise.demo</p>
        </button>
        {/* <button onClick={() => quick("admin@phishwise.demo")} className="rounded-xl border border-ink-200 p-3 text-left text-xs hover:border-violet-400 dark:border-ink-700">
          <Chip tone="violet" className="mb-1.5">Demo</Chip>
          <p className="font-semibold">Admin account</p>
          <p className="text-ink-400">admin@phishwise.demo</p>
        </button> */}
      </div>
      {serverError && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">{serverError}</div>}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email address" error={errors.email}>
          <input className="input" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" error={errors.password}>
          <div className="relative">
            <input className="input pr-10" type={show ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"><Icon name={show ? "EyeOff" : "Eye"} className="w-4 h-4" /></button>
          </div>
        </Field>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-ink-500 dark:text-ink-400"><input type="checkbox" className="rounded accent-signal-600" /> Remember me</label>
          <Link to="/forgot-password" className="font-medium text-signal-600">Forgot password?</Link>
        </div>
        <Button className="w-full" disabled={loading}>
          {loading ? <><Icon name="Loader2" className="w-4 h-4 animate-spin" /> Signing in…</> : <>Log in <Icon name="ArrowRight" className="w-4 h-4" /></>}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-ink-400">Demo accounts are pre-verified — password <span className="font-medium">demo-pass</span>. New sign-ups require email verification.</p>
    </AuthFrame>
  );
}

export function Register() {
  const { register, toast } = useApp();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resent, setResent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setServerError("");
    const errs = {};
    if (form.name.trim().length < 2) errs.name = "Enter your full name.";
    if (!emailOk(form.email)) errs.email = "Enter a valid email address.";
    if (form.password.length < 8) errs.password = "Use at least 8 characters.";
    if (form.confirm !== form.password) errs.confirm = "Passwords don't match.";
    if (!form.terms) errs.terms = "Please accept the terms to continue.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await register(form.email.trim(), form.name.trim(), form.password);
      setDone(true);
    } catch (err) {
      setServerError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try { await authApi.resend(form.email.trim()); setResent(true); } catch { /* ignore */ }
  };

  if (done) {
    return (
      <AuthFrame title="" sub="" footer={<Link className="font-semibold text-signal-600" to="/login">← Back to login</Link>}>
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-emerald-500/10 p-4"><Icon name="MailCheck" className="w-8 h-8 text-emerald-500" /></div>
          <h3 className="text-lg font-bold">Verify your email</h3>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">We've sent a verification link to <span className="font-medium">{form.email}</span>. Click it to activate your account, then log in.</p>
          {/* <p className="mt-3 text-xs text-ink-400">Running the demo locally? The link is printed in the API server console.</p> */}
          <div className="mt-5 flex flex-col gap-2">
            <Button as={Link} to="/login" className="w-full">Go to login</Button>
            <Button variant="ghost" className="w-full" onClick={resend} disabled={resent}>{resent ? "Verification re-sent" : "Resend verification email"}</Button>
          </div>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Create your account" sub="Start building phishing-proof habits today." footer={<>Already have an account? <Link className="font-semibold text-signal-600" to="/login">Log in</Link></>}>
      {serverError && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">{serverError}</div>}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Full name" error={errors.name}>
          <input className="input" placeholder="Ada Lovelace" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email address" error={errors.email}>
          <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" error={errors.password}>
          <input className="input" type="password" autoComplete="new-password" placeholder="A long passphrase works best" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <PasswordStrength value={form.password} />
        </Field>
        <Field label="Confirm password" error={errors.confirm}>
          <input className="input" type="password" autoComplete="new-password" placeholder="Repeat your password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </Field>
        <div>
          <label className="flex items-start gap-2 text-sm text-ink-500 dark:text-ink-400">
            <input type="checkbox" className="mt-0.5 rounded accent-signal-600" checked={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.checked })} />
            <span>I agree to the <a href="#" onClick={(e) => e.preventDefault()} className="font-medium text-signal-600">Terms of use</a> and <a href="#" onClick={(e) => e.preventDefault()} className="font-medium text-signal-600">Privacy policy</a>.</span>
          </label>
          {errors.terms && <p className="mt-1 text-xs text-rose-600">{errors.terms}</p>}
        </div>
        <Button className="w-full" disabled={loading}>
          {loading ? <><Icon name="Loader2" className="w-4 h-4 animate-spin" /> Creating account…</> : <>Create account <Icon name="Sparkles" className="w-4 h-4" /></>}
        </Button>
      </form>
    </AuthFrame>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!emailOk(email)) return setError("Enter a valid email address.");
    setError("");
    setLoading(true);
    try { await authApi.forgot(email.trim()); } catch { /* uniform response */ }
    setLoading(false);
    setSent(true);
  };
  return (
    <AuthFrame title="Reset your password" sub="Enter your email and we'll send you a reset link." footer={<Link className="font-semibold text-signal-600" to="/login">← Back to login</Link>}>
      {sent ? (
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-emerald-500/10 p-4"><Icon name="MailCheck" className="w-8 h-8 text-emerald-500" /></div>
          <h3 className="font-bold">Check your inbox</h3>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way. Running locally? Check the API server console for the link.</p>
          <Button as={Link} to="/login" variant="secondary" className="mt-5">Return to login</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Email address" error={error}>
            <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button className="w-full" disabled={loading}>{loading ? <><Icon name="Loader2" className="w-4 h-4 animate-spin" /> Sending…</> : <>Send reset link <Icon name="Send" className="w-4 h-4" /></>}</Button>
        </form>
      )}
    </AuthFrame>
  );
}

export function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setState("error"); setMessage("No verification token was provided."); return; }
    (async () => {
      try {
        const res = await authApi.verifyEmail(token);
        setState("success");
        setMessage(res.message || "Your email has been verified.");
      } catch (err) {
        setState("error");
        setMessage(err.message || "This verification link is invalid or has expired.");
      }
    })();
  }, [params]);

  return (
    <AuthFrame title="" sub="">
      <div className="text-center">
        {state === "verifying" && (<>
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-signal-500/10 p-4"><Icon name="Loader2" className="w-8 h-8 animate-spin text-signal-600" /></div>
          <h3 className="text-lg font-bold">Verifying your email…</h3>
        </>)}
        {state === "success" && (<>
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-emerald-500/10 p-4"><Icon name="CheckCircle2" className="w-8 h-8 text-emerald-500" /></div>
          <h3 className="text-lg font-bold">Email verified</h3>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{message}</p>
          <Button className="mt-5 w-full" onClick={() => navigate("/login")}>Continue to login <Icon name="ArrowRight" className="w-4 h-4" /></Button>
        </>)}
        {state === "error" && (<>
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-rose-500/10 p-4"><Icon name="XCircle" className="w-8 h-8 text-rose-500" /></div>
          <h3 className="text-lg font-bold">Verification failed</h3>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{message}</p>
          <Button as={Link} to="/login" variant="secondary" className="mt-5 w-full">Back to login</Button>
        </>)}
      </div>
    </AuthFrame>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const token = params.get("token");

  const submit = async (e) => {
    e.preventDefault();
    setServerError("");
    const errs = {};
    if (form.password.length < 6) errs.password = "Use at least 6 characters.";
    if (form.confirm !== form.password) errs.confirm = "Passwords don't match.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!token) { setServerError("No reset token provided."); return; }
    setLoading(true);
    try {
      await authApi.reset(token, form.password);
      setDone(true);
    } catch (err) {
      setServerError(err.message || "This reset link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame title={done ? "" : "Choose a new password"} sub={done ? "" : "Pick a strong passphrase you haven't used before."} footer={<Link className="font-semibold text-signal-600" to="/login">← Back to login</Link>}>
      {done ? (
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-emerald-500/10 p-4"><Icon name="CheckCircle2" className="w-8 h-8 text-emerald-500" /></div>
          <h3 className="text-lg font-bold">Password updated</h3>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">You can now log in with your new password.</p>
          <Button className="mt-5 w-full" onClick={() => navigate("/login")}>Go to login <Icon name="ArrowRight" className="w-4 h-4" /></Button>
        </div>
      ) : (
        <>
          {serverError && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">{serverError}</div>}
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="New password" error={errors.password}>
              <input className="input" type="password" autoComplete="new-password" placeholder="A long passphrase works best" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <PasswordStrength value={form.password} />
            </Field>
            <Field label="Confirm new password" error={errors.confirm}>
              <input className="input" type="password" autoComplete="new-password" placeholder="Repeat your password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
            </Field>
            <Button className="w-full" disabled={loading}>{loading ? <><Icon name="Loader2" className="w-4 h-4 animate-spin" /> Updating…</> : <>Update password <Icon name="Check" className="w-4 h-4" /></>}</Button>
          </form>
        </>
      )}
    </AuthFrame>
  );
}

const GOALS = [
  { icon: "Fish", t: "Spot phishing emails" },
  { icon: "KeyRound", t: "Protect my accounts" },
  { icon: "Smartphone", t: "Stay safe on mobile" },
  { icon: "Briefcase", t: "Workplace security" },
];

export function Onboarding() {
  const { user, setOnboarded, toast } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState([]);
  const finish = () => { setOnboarded(); toast("You're all set!", "Your first lesson is waiting on the dashboard."); navigate("/dashboard"); };

  const steps = [
    <div key="0" className="text-center">
      <div className="mx-auto mb-4 inline-flex animate-pop rounded-3xl bg-gradient-to-br from-signal-500 to-ink-700 p-5 text-white"><Icon name="ShieldCheck" className="w-10 h-10" /></div>
      <h2 className="text-2xl font-bold">Welcome aboard, {user?.name?.split(" ")[0]}!</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-500 dark:text-ink-400">PhishWise builds your security instincts through short daily practice. Two quick questions and you're in.</p>
    </div>,
    <div key="1">
      <h2 className="text-xl font-bold">What do you want to get better at?</h2>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Pick as many as you like — we'll recommend lessons to match.</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {GOALS.map((g) => {
          const on = goals.includes(g.t);
          return (
            <button key={g.t} onClick={() => setGoals(on ? goals.filter((x) => x !== g.t) : [...goals, g.t])}
              className={`rounded-2xl border p-4 text-left transition ${on ? "border-signal-500 bg-signal-500/10" : "border-ink-200 hover:border-signal-300 dark:border-ink-700"}`} aria-pressed={on}>
              <Icon name={g.icon} className={`mb-2 w-6 h-6 ${on ? "text-signal-600" : "text-ink-400"}`} />
              <p className="text-sm font-semibold">{g.t}</p>
            </button>
          );
        })}
      </div>
    </div>,
    <div key="2">
      <h2 className="text-xl font-bold">How the game works</h2>
      <div className="mt-5 space-y-4">
        {[
          { icon: "Sparkles", t: "Earn XP", b: "Lessons give 50–80 XP, quizzes up to 100, daily challenges 30." },
          { icon: "Flame", t: "Keep your streak", b: "One activity a day keeps the streak counter climbing." },
          { icon: "Trophy", t: "Unlock badges", b: "Twelve achievements, from First Steps to Cyber Sage territory." },
        ].map((s) => (
          <div key={s.t} className="flex gap-3 rounded-xl bg-ink-50 p-4 dark:bg-ink-800/60">
            <div className="rounded-lg bg-amber-500/15 p-2 text-amber-600 dark:text-amber-400"><Icon name={s.icon} className="w-5 h-5" /></div>
            <div><p className="text-sm font-bold">{s.t}</p><p className="text-xs text-ink-500 dark:text-ink-400">{s.b}</p></div>
          </div>
        ))}
      </div>
    </div>,
  ];

  return (
    <AuthFrame title="" sub="">
      <div className="-mt-6">
        <div className="mb-6 flex gap-1.5">{steps.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-signal-500" : "bg-ink-100 dark:bg-ink-800"}`} />)}</div>
        {steps[step]}
        <div className="mt-7 flex justify-between">
          <Button variant="ghost" onClick={() => step ? setStep(step - 1) : navigate("/dashboard")}>{step ? "Back" : "Skip"}</Button>
          <Button onClick={() => step < steps.length - 1 ? setStep(step + 1) : finish()}>
            {step < steps.length - 1 ? <>Continue <Icon name="ArrowRight" className="w-4 h-4" /></> : <>Go to dashboard <Icon name="Rocket" className="w-4 h-4" /></>}
          </Button>
        </div>
      </div>
    </AuthFrame>
  );
}
