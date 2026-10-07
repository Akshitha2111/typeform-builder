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

  if (fatal) return <div className="min-h-screen flex items-center justify-center text-2xl bg-[#f5f1e8]">{fatal}</div>;
  if (!form) return <div className="min-h-screen bg-[#f5f1e8]" />;
  if (done) return (
    <div className="min-h-screen bg-[#f5f1e8] flex flex-col items-center justify-center anim-up text-center px-6">
      <div className="text-6xl mb-4">✓</div>
      <h1 className="text-4xl font-medium">Thank you!</h1>
      <p className="mt-3 text-lg opacity-70">Your response has been submitted.</p>
    </div>
  );
  if (!q) return <div className="min-h-screen flex items-center justify-center text-2xl bg-[#f5f1e8]">This form has no questions yet.</div>;

  return (
    <div className="min-h-screen bg-[#f5f1e8] flex flex-col overflow-hidden">
      <div className="h-1 bg-black/10"><div className="h-full bg-[#262627] transition-all duration-500" style={{ width: `${(i / qs.length) * 100}%` }} /></div>
      <main className="flex-1 flex items-center justify-center px-6">
        <div key={i} className={`max-w-2xl w-full ${dir > 0 ? "anim-up" : "anim-down"}`}>
          <div className="text-sm opacity-60 mb-2">{i + 1} of {qs.length} →</div>
          <h1 className="text-3xl md:text-4xl font-medium">{q.text}{q.required && <span className="text-red-500"> *</span>}</h1>
          {q.description && <p className="mt-2 text-lg opacity-70">{q.description}</p>}
          <div className="mt-8"><QuestionRenderer key={q.id} q={q} autoFocus value={ans[q.id] ?? ""} onChange={(v) => { setAns({ ...ans, [q.id]: v }); setMsg(""); }} onPick={() => setTimeout(next, 350)} /></div>
          {msg && <div className="mt-4 inline-block bg-red-100 text-red-700 px-3 py-1 rounded">{msg}</div>}
          <div className="mt-8 flex items-center gap-4">
            <button onClick={next} disabled={busy} className="bg-[#262627] text-white rounded px-6 py-2 text-lg font-medium hover:bg-black">{last ? "Submit" : "OK ✓"}</button>
            <span className="text-sm opacity-60">press <b>Enter ↵</b></span>
          </div>
        </div>
      </main>
      <footer className="p-4 flex justify-end gap-2">
        <button onClick={prev} disabled={i === 0} className="w-10 h-10 rounded bg-[#262627] text-white disabled:opacity-30">↑</button>
        <button onClick={next} className="w-10 h-10 rounded bg-[#262627] text-white">↓</button>
      </footer>
    </div>
  );
}
