"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Form, Question } from "@/lib/types";
import QuestionRenderer from "@/components/QuestionRenderer";

function check(q: Question, raw: string): string {
  const v = (raw || "").trim();
  if (!v) return q.required ? "Please answer this question." : "";
  if (q.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return "Please enter a valid email address.";
  if (q.type === "number" && isNaN(Number(v))) return "Please enter a valid number.";
  return "";
}

export default function Fill() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [fatal, setFatal] = useState("");
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [ans, setAns] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.publicForm(slug).then(setForm).catch((e) => setFatal(typeof e === "string" ? e : "Form not found")); }, [slug]);

  const qs = form?.questions ?? [];
  const q = qs[i];
  const last = i === qs.length - 1;

  const next = async () => {
    if (!q || busy) return;
    const e = check(q, ans[q.id]);
    if (e) return setMsg(e);
    setMsg("");
    if (!last) { setDir(1); return setI(i + 1); }
    setBusy(true);
    try {
      await api.submit(slug, qs.map((x) => ({ question_id: x.id, value: ans[x.id] ?? "" })));
      setDone(true);
    } catch (err: unknown) {
      if (err && typeof err === "object") {
        const [qid, m] = Object.entries(err as Record<string, string>)[0];
        const idx = qs.findIndex((x) => x.id === Number(qid));
        if (idx >= 0) { setI(idx); setMsg(m); }
      } else setMsg(String(err));
    }
    setBusy(false);
  };
  const prev = () => { if (i > 0) { setDir(-1); setMsg(""); setI(i - 1); } };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = (e.target as HTMLElement).tagName;
      const typing = t === "INPUT" || t === "TEXTAREA" || t === "SELECT";
      if (e.key === "Enter" && !(e.shiftKey && t === "TEXTAREA")) { e.preventDefault(); next(); }
      else if (!typing && (e.key === "ArrowDown" || e.key === "ArrowRight")) next();
      else if (!typing && (e.key === "ArrowUp" || e.key === "ArrowLeft")) prev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
    const page = "min-h-screen bg-white flex flex-col items-center justify-center text-center px-6";
  if (fatal) return <div className={page + " text-2xl"}>{fatal}</div>;
  if (!form) return <div className="min-h-screen bg-white" />;
  if (done) return (
    <div className={page + " anim-up"}>
      <div className="text-6xl mb-4" style={{ color: "var(--tf-accent)" }}>✓</div>
      <h1 className="text-4xl font-medium">Thank you!</h1>
      <p className="mt-3 text-lg opacity-70">Your response has been submitted.</p>
    </div>
  );
  if (!q) return <div className={page + " text-2xl"}>This form has no questions yet.</div>;

  const pct = Math.round((i / qs.length) * 100);
  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden">
      <main className="flex-1 flex items-center justify-center px-6">
        <div key={i} className={`max-w-2xl w-full ${dir > 0 ? "anim-up" : "anim-down"}`}>
          <div className="flex gap-3 items-baseline">
            <span className="text-lg whitespace-nowrap" style={{ color: "var(--tf-accent)" }}>{i + 1} →</span>
            <h1 className="text-2xl md:text-3xl font-medium">{q.text}{q.required && <span className="text-red-500"> *</span>}</h1>
          </div>
          <div className="pl-10 mt-2">
            {q.description && <p className="text-lg opacity-70 mb-4">{q.description}</p>}
            <div className="mt-6">
              <QuestionRenderer key={q.id} q={q} autoFocus value={ans[q.id] ?? ""}
                onChange={(v) => { setAns({ ...ans, [q.id]: v }); setMsg(""); }} onPick={() => setTimeout(next, 350)} />
            </div>
            {msg && <div className="mt-4 inline-block bg-red-100 text-red-700 px-3 py-1 rounded">{msg}</div>}
            <div className="mt-8 flex items-center gap-4">
              <button onClick={next} disabled={busy} className="tf-btn">{last ? "Submit" : "OK ✓"}</button>
              <span className="text-sm opacity-60">press <b>Enter ↵</b></span>
            </div>
          </div>
        </div>
      </main>
      <footer className="p-5 flex items-center justify-between">
        <div className="w-56">
          <div className="text-xs mb-1 opacity-70">{pct}% completed</div>
          <div className="h-1.5 rounded bg-black/10"><div className="h-full rounded transition-all duration-500" style={{ width: `${pct}%`, background: "var(--tf-accent)" }} /></div>
        </div>
        <div className="flex">
          <button onClick={prev} disabled={i === 0} className="tf-btn" style={{ borderRadius: "4px 0 0 4px" }}>↑</button>
          <button onClick={next} className="tf-btn" style={{ borderRadius: "0 4px 4px 0", borderLeft: "1px solid rgba(255,255,255,.3)" }}>↓</button>
        </div>
      </footer>
    </div>
  );
}