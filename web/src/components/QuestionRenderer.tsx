"use client";
import { useEffect } from "react";
import { Question } from "@/lib/types";

interface Props { q: Question; value: string; onChange: (v: string) => void; onPick?: () => void; autoFocus?: boolean }

export default function QuestionRenderer({ q, value, onChange, onPick, autoFocus }: Props) {
  const opts = q.options.filter(Boolean);
  const list = q.type === "yes_no" ? ["Yes", "No"] : opts;
  const isChoice = q.type === "multiple_choice" || q.type === "yes_no";

  // press A, B, C... to pick a choice (respondent only)
  useEffect(() => {
    if (!autoFocus || !isChoice) return;
    const h = (e: KeyboardEvent) => {
      const i = e.key.toUpperCase().charCodeAt(0) - 65;
      if (e.key.length === 1 && i >= 0 && i < list.length) { onChange(list[i]); onPick?.(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  switch (q.type) {
    case "long_text":
      return <textarea autoFocus={autoFocus} rows={3} className="tf-input" placeholder="Type your answer here..." value={value} onChange={(e) => onChange(e.target.value)} />;
    case "email": case "number": case "short_text":
      return <input autoFocus={autoFocus} type={q.type === "short_text" ? "text" : q.type} className="tf-input"
        placeholder={q.type === "email" ? "name@example.com" : q.type === "number" ? "0" : "Type your answer here..."}
        value={value} onChange={(e) => onChange(e.target.value)} />;
    case "dropdown":
      return (
        <select autoFocus={autoFocus} className="tf-input cursor-pointer" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select an option</option>
          {opts.map((o) => <option key={o}>{o}</option>)}
        </select>
      );
    case "multiple_choice": case "yes_no":
      return (
        <div className="flex flex-col gap-2 max-w-xs">
          {list.map((o, i) => (
            <button key={o} type="button" className={`tf-choice ${value === o ? "sel" : ""}`} onClick={() => { onChange(o); onPick?.(); }}>
              <span className="tf-key">{String.fromCharCode(65 + i)}</span>{o}
            </button>
          ))}
        </div>
      );
    case "rating":
      return (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => { onChange(String(n)); onPick?.(); }}
              className="text-5xl transition hover:scale-110" style={{ color: Number(value) >= n ? "#f5a623" : "rgba(4,69,175,.25)" }}>★</button>
          ))}
        </div>
      );
  }
}