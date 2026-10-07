"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Form, Question, QType, TYPES, hasOptions } from "@/lib/types";
import QuestionRenderer from "@/components/QuestionRenderer";

export default function Builder() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [qs, setQs] = useState<Question[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [pv, setPv] = useState("");
  const drag = useRef<number | null>(null);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2000); };

  useEffect(() => { api.form(id).then((f) => { setForm(f); setQs(f.questions!); setSel(f.questions![0]?.id ?? null); }); }, [id]);
  if (!form) return <div className="p-10">Loading...</div>;
  const cur = qs.find((q) => q.id === sel);

  const patch = (q: Question, ch: Partial<Question>) => {
    const n = { ...q, ...ch };
    setQs(qs.map((x) => (x.id === q.id ? n : x)));
    clearTimeout(timers.current[q.id]);
    timers.current[q.id] = setTimeout(() => api.updateQuestion(q.id, n).catch(() => say("Save failed")), 400);
  };
  const add = async (type: QType) => {
    const q = await api.addQuestion(form.id, { type, text: "Your question here", options: hasOptions(type) ? ["Option 1", "Option 2"] : [] });
    setQs([...qs, q]); setSel(q.id); setMenu(false); setPv("");
  };
  const del = async (q: Question) => {
    await api.deleteQuestion(q.id);
    const rest = qs.filter((x) => x.id !== q.id); setQs(rest); setSel(rest[0]?.id ?? null); say("Question deleted");
  };
  const drop = (to: number) => {
    const from = drag.current; if (from === null || from === to) return;
    const next = [...qs]; const [m] = next.splice(from, 1); next.splice(to, 0, m);
    setQs(next); api.reorder(form.id, next.map((x) => x.id));
  };
  const togglePublish = async () => {
    const f = form.status === "published" ? await api.unpublish(form.id) : await api.publish(form.id);
    setForm({ ...form, status: f.status });
    if (f.status === "published") { navigator.clipboard.writeText(`${location.origin}/form/${f.slug}`); say("Published! Link copied"); } else say("Form unpublished");
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b px-5 py-3 flex items-center gap-4">
        <Link href="/" className="text-gray-600 hover:text-black">← Forms</Link>
        <input defaultValue={form.title} className="font-semibold text-lg outline-none focus:bg-gray-100 rounded px-2 flex-1"
          onBlur={(e) => e.target.value.trim() && api.rename(form.id, e.target.value.trim()).then(() => say("Saved"))} />
        <Link href={`/results/${form.id}`} className="text-sm hover:underline">Results</Link>
        {form.status === "published" && <a href={`/form/${form.slug}`} target="_blank" className="text-sm hover:underline">Open ↗</a>}
        <button onClick={togglePublish} className="tf-btn !rounded-full !py-1.5 !text-sm">
          {form.status === "published" ? "Unpublish" : "Publish"}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r p-3 overflow-y-auto relative">
          <div className="text-xs font-semibold text-gray-500 mb-2">QUESTIONS</div>
          {qs.map((q, i) => (
            <div key={q.id} draggable onDragStart={() => (drag.current = i)} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(i)}
              onClick={() => { setSel(q.id); setPv(""); }}
              className={`flex gap-2 items-center px-2 py-2 rounded cursor-grab text-sm mb-1 ${sel === q.id ? "bg-blue-50 ring-1 ring-blue-300" : "hover:bg-gray-100"}`}>
              <span className="text-gray-400">⋮⋮</span><span className="font-medium">{i + 1}</span>
              <span className="truncate">{q.text}</span>
            </div>
          ))}
          <button onClick={() => setMenu(!menu)} className="mt-2 w-full border-2 border-dashed rounded py-2 text-sm hover:bg-gray-50">+ Add question</button>
          {menu && (
            <div className="absolute left-3 right-3 bg-white shadow-xl rounded-lg border z-10 mt-1">
              {TYPES.map((t) => <button key={t.type} onClick={() => add(t.type)} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">{t.label}</button>)}
            </div>
          )}
          <div className="mt-6 text-xs text-gray-400">Settings: Theme, Thank-you screen, Logic — Coming soon</div>
        </aside>

        <section className="w-80 border-r p-5 overflow-y-auto">
          {cur ? (
            <div className="flex flex-col gap-4 text-sm">
              <label>Question<input className="mt-1 w-full border rounded px-3 py-2" value={cur.text} onChange={(e) => patch(cur, { text: e.target.value })} /></label>
              <label>Description<input className="mt-1 w-full border rounded px-3 py-2" placeholder="Help text (optional)" value={cur.description} onChange={(e) => patch(cur, { description: e.target.value })} /></label>
              <label>Type
                <select className="mt-1 w-full border rounded px-3 py-2" value={cur.type}
                  onChange={(e) => { const t = e.target.value as QType; patch(cur, { type: t, options: hasOptions(t) && !cur.options.length ? ["Option 1", "Option 2"] : cur.options }); setPv(""); }}>
                  {TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                </select>
              </label>
              {hasOptions(cur.type) && (
                <label>Options (one per line)
                  <textarea rows={5} className="mt-1 w-full border rounded px-3 py-2" value={cur.options.join("\n")} onChange={(e) => patch(cur, { options: e.target.value.split("\n") })} />
                </label>
              )}
              <label className="flex items-center gap-2"><input type="checkbox" checked={cur.required} onChange={(e) => patch(cur, { required: e.target.checked })} /> Required</label>
              <button onClick={() => del(cur)} className="text-red-600 text-left hover:underline">Delete question</button>
            </div>
          ) : <div className="text-gray-500">Select or add a question.</div>}
        </section>

        <section className="flex-1 bg-white flex items-center justify-center p-10 overflow-y-auto">
          {cur ? (
            <div key={cur.id} className="max-w-xl w-full anim-up">
              <div className="text-sm opacity-60 mb-2">{qs.findIndex((q) => q.id === cur.id) + 1} →</div>
              <h2 className="text-3xl font-medium mb-1">{cur.text}{cur.required && <span className="text-red-500"> *</span>}</h2>
              {cur.description && <p className="opacity-70 mb-6 text-lg">{cur.description}</p>}
              <div className="mt-6"><QuestionRenderer q={cur} value={pv} onChange={setPv} /></div>
              <button className="mt-8 tf-btn">OK ✓</button>
            </div>
          ) : <div className="opacity-50">Live preview</div>}
        </section>
      </div>
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#262627] text-white px-5 py-2 rounded-lg anim-up">{toast}</div>}
    </div>
  );
}
