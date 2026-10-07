"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, BASE } from "@/lib/api";
import { Form, Resp, SummaryItem } from "@/lib/types";

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [rs, setRs] = useState<Resp[]>([]);
  const [sum, setSum] = useState<{ total: number; questions: SummaryItem[] } | null>(null);
  const [tab, setTab] = useState<"summary" | "responses">("summary");
  const [open, setOpen] = useState<Resp | null>(null);

  useEffect(() => { api.form(id).then(setForm); api.responses(id).then(setRs); api.summary(id).then(setSum); }, [id]);
  if (!form || !sum) return <div className="p-10">Loading...</div>;
  const qs = form.questions!;

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <header className="bg-white border-b px-8 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-600">← Forms</Link>
        <h1 className="font-semibold text-lg flex-1">{form.title}</h1>
        <a href={`${BASE}/forms/${id}/export.csv`} className="text-sm border rounded-full px-4 py-1.5 hover:bg-gray-50">Export CSV</a>
      </header>
      <main className="max-w-5xl mx-auto p-8">
        <div className="text-3xl font-semibold mb-4">{sum.total} <span className="text-base font-normal text-gray-500">responses</span></div>
        <div className="flex gap-6 border-b mb-6">
          {(["summary", "responses"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`pb-2 capitalize ${tab === t ? "border-b-2 border-black font-medium" : "text-gray-500"}`}>{t}</button>
          ))}
        </div>

        {tab === "summary" && (
          <div className="grid gap-4">
            {sum.questions.map((s) => {
              const max = Math.max(1, ...Object.values(s.counts ?? {}));
              return (
                <div key={s.question_id} className="bg-white rounded-lg p-5 shadow-sm">
                  <div className="font-medium">{s.text}</div>
                  <div className="text-xs text-gray-500 mb-3">{s.answered} answered{s.average ? ` · average ${s.average}` : ""}</div>
                  {s.counts ? Object.entries(s.counts).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-3 text-sm mb-1">
                      <span className="w-28 truncate">{k}</span>
                      <div className="flex-1 bg-gray-100 rounded h-5"><div className="bg-[#262627] h-5 rounded" style={{ width: `${(v / max) * 100}%` }} /></div>
                      <span className="w-6 text-right">{v}</span>
                    </div>
                  )) : <div className="text-sm text-gray-400">Open-ended — see Responses tab</div>}
                </div>
              );
            })}
          </div>
        )}

        {tab === "responses" && (
          <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b">
                <th className="p-3">#</th><th className="p-3">Submitted</th>
                {qs.map((q) => <th key={q.id} className="p-3 max-w-40 truncate">{q.text}</th>)}
              </tr></thead>
              <tbody>
                {rs.map((r) => (
                  <tr key={r.id} onClick={() => setOpen(r)} className="border-b hover:bg-gray-50 cursor-pointer">
                    <td className="p-3">{r.id}</td><td className="p-3 whitespace-nowrap">{new Date(r.submitted_at + "Z").toLocaleString()}</td>
                    {qs.map((q) => <td key={q.id} className="p-3 max-w-40 truncate">{r.answers[q.id] ?? "—"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6" onClick={() => setOpen(null)}>
          <div className="bg-white rounded-xl p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto anim-up" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Response #{open.id}</h2>
            {qs.map((q) => (
              <div key={q.id} className="mb-4">
                <div className="text-sm text-gray-500">{q.text}</div>
                <div className="text-lg">{q.type === "rating" && open.answers[q.id] ? "★".repeat(+open.answers[q.id]) : open.answers[q.id] || "—"}</div>
              </div>
            ))}
            <button onClick={() => setOpen(null)} className="mt-2 border rounded px-4 py-1.5">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
