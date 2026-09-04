import { useState } from "react";
import { useApp } from "../lib/store.jsx";
import { FAQS } from "../data/mock.js";
import { Breadcrumbs, PageHeader } from "../components/layout.jsx";
import { Icon, Button, Card, Accordion, Field } from "../components/ui.jsx";

export default function Help() {
  const { toast } = useApp();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!subject.trim()) errs.subject = "Add a short subject.";
    if (message.trim().length < 10) errs.message = "Tell us a bit more (10+ characters).";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSubject("");
      setMessage("");
      toast("Message sent", "Our support team will reply within 1 business day (demo).", "success");
    }, 700);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Help & FAQ" }]} />
      <PageHeader title="Help & support" subtitle="Answers to common questions, and a direct line if you're stuck." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-ink-900 dark:text-white">
              <Icon name="CircleHelp" size={18} className="text-signal-600 dark:text-signal-400" />
              Frequently asked questions
            </h2>
            <Accordion items={FAQS.map((f) => ({ title: f.q, body: f.a }))} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-semibold text-ink-900 dark:text-white">
              <Icon name="LifeBuoy" size={17} className="text-signal-600 dark:text-signal-400" /> Contact support
            </h2>
            <p className="mb-4 text-xs text-ink-500 dark:text-ink-300">We usually reply within one business day.</p>
            <form onSubmit={submit} className="space-y-3" noValidate>
              <Field label="Subject" error={errors.subject}>
                <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Badge didn't unlock" />
              </Field>
              <Field label="Message" error={errors.message}>
                <textarea
                  className="input min-h-[110px] resize-y"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe what happened…"
                />
              </Field>
              <Button type="submit" variant="primary" className="w-full" disabled={sending}>
                {sending ? <><Icon name="Loader2" size={16} className="animate-spin" /> Sending…</> : <><Icon name="Send" size={15} /> Send message</>}
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-display text-sm font-semibold text-ink-900 dark:text-white">Other channels</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2.5 text-ink-600 dark:text-ink-300">
                <Icon name="Mail" size={16} className="text-signal-500" /> support@phishwise.demo
              </li>
              <li className="flex items-center gap-2.5 text-ink-600 dark:text-ink-300">
                <Icon name="MessageCircle" size={16} className="text-signal-500" /> Live chat · 9am–5pm WAT
              </li>
              <li className="flex items-center gap-2.5 text-ink-600 dark:text-ink-300">
                <Icon name="BookOpen" size={16} className="text-signal-500" /> Knowledge base (demo)
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
