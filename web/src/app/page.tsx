"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Form } from "@/lib/types";

export default function Dashboard() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [toast, setToast] = useState("");
  const load = () => api.forms().then(setForms);
  useEffect(() => { load(); }, []);
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2000); };

  const create = async () => { const f = await api.createForm("Untitled form"); router.push(`/builder/${f.id}`); };
  const rename = async (f: Form) => { const t = prompt("Rename form", f.title); if (t?.trim()) { await api.rename(f.id, t.trim()); load(); say("Form renamed"); } };
  const dup = async (f: Form) => { await api.duplicate(f.id); load(); say("Form duplicated"); };
  const del = async (f: Form) => { if (confirm(`Delete "${f.title}"?`)) { await api.remove(f.id); load(); say("Form deleted"); } };
  const copy = (f: Form) => { navigator.clipboard.writeText(`${location.origin}/form/${f.slug}`); say("Link copied"); };

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center">
        <span className="font-bold text-xl">Typeform Builder</span>
        <button onClick={create} className="bg-[#262627] text-white rounded-full px-5 py-2 font-medium hover:bg-black">+ Create form</button>
      </header>
      <main className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-6">My forms</h1>
        <div className="grid gap-4">
          {forms.map((f) => (
            <div key={f.id} className="bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between">
                <div>
                  <Link href={`/builder/${f.id}`} className="text-lg font-medium hover:underline">{f.title}</Link>
                  <div className="text-sm text-gray-500 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs mr-2 ${f.status === "published" ? "bg-green-100 text-green-800" : "bg-gray-200"}`}>{f.status}</span>
                    {f.response_count} responses
                  </div>
                </div>
                <div className="flex gap-3 text-sm items-center text-gray-700">
                  <Link href={`/builder/${f.id}`} className="hover:underline">Edit</Link>
                  <Link href={`/results/${f.id}`} className="hover:underline">Results</Link>
                  {f.status === "published" && <button onClick={() => copy(f)} className="hover:underline">Copy link</button>}
                  <button onClick={() => rename(f)} className="hover:underline">Rename</button>
                  <button onClick={() => dup(f)} className="hover:underline">Duplicate</button>
                  <button onClick={() => del(f)} className="text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#262627] text-white px-5 py-2 rounded-lg anim-up">{toast}</div>}
    </div>
  );
}
