"use client";
import { Question } from "@/lib/types";

interface Props { q: Question; value: string; onChange: (v: string) => void; onPick?: () => void; autoFocus?: boolean }

export default function QuestionRenderer({ q, value, onChange, onPick, autoFocus }: Props) {
  const line = "w-full bg-transparent border-b-2 border-current/30 focus:border-current outline-none text-2xl md:text-3xl py-2 placeholder:opacity-40 transition-colors";
  const opts = q.options.filter(Boolean);
  switch (q.type) {
    case "long_text":
      return <textarea autoFocus={autoFocus} rows={3} className={line} placeholder="Type your answer here..." value={value} onChange={(e) => onChange(e.target.value)} />;
    case "email": case "number": case "short_text":
      return <input autoFocus={autoFocus} type={q.type === "short_text" ? "text" : q.type} className={line}
        placeholder={q.type === "email" ? "name@example.com" : q.type === "number" ? "0" : "Type your answer here..."}
        value={value} onChange={(e) => onChange(e.target.value)} />;
    case "dropdown":
      return (
        <select autoFocus={autoFocus} className={line + " cursor-pointer"} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Type or select an option</option>
          {opts.map((o) => <option key={o}>{o}</option>)}
        </select>
      );
    case "multiple_choice": case "yes_no": {
      const list = q.type === "yes_no" ? ["Yes", "No"] : opts;
      return (
        <div className="flex flex-col gap-2 max-w-md">
          {list.map((o, i) => (
            <button key={o} type="button" onClick={() => { onChange(o); onPick?.(); }}
              className={`flex items-center gap-3 text-left px-3 py-2 rounded border-2 text-xl transition ${value === o ? "border-current bg-current/10" : "border-current/30 hover:bg-current/5"}`}>
              <span className="w-6 h-6 text-xs border border-current/50 rounded flex items-center justify-center">{String.fromCharCode(65 + i)}</span>{o}
            </button>
          ))}
        </div>
      );
    }
    case "rating":
      return (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => { onChange(String(n)); onPick?.(); }}
              className={`text-5xl transition hover:scale-110 ${Number(value) >= n ? "text-amber-500" : "opacity-30"}`}>★</button>
          ))}
        </div>
      );
  }
}
