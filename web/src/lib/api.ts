import { Form, Question, Resp, SummaryItem } from "./types";

export const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function req<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch(BASE + path, {
    method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) throw data?.detail ?? "Request failed";
  return data;
}

export const api = {
  forms: () => req<Form[]>("/forms"),
  form: (id: number | string) => req<Form>(`/forms/${id}`),
  createForm: (title: string) => req<Form>("/forms", "POST", { title }),
  rename: (id: number, title: string) => req<Form>(`/forms/${id}`, "PUT", { title }),
  remove: (id: number) => req(`/forms/${id}`, "DELETE"),
  duplicate: (id: number) => req<Form>(`/forms/${id}/duplicate`, "POST"),
  publish: (id: number) => req<Form>(`/forms/${id}/publish`, "POST"),
  unpublish: (id: number) => req<Form>(`/forms/${id}/unpublish`, "POST"),
  addQuestion: (fid: number, q: Partial<Question>) => req<Question>(`/forms/${fid}/questions`, "POST", q),
  updateQuestion: (id: number, q: Partial<Question>) => req<Question>(`/questions/${id}`, "PUT", q),
  deleteQuestion: (id: number) => req(`/questions/${id}`, "DELETE"),
  reorder: (fid: number, ids: number[]) => req(`/forms/${fid}/questions/reorder`, "PUT", { ids }),
  publicForm: (slug: string) => req<Form>(`/public/forms/${slug}`),
  submit: (slug: string, answers: { question_id: number; value: string }[]) =>
    req(`/public/forms/${slug}/responses`, "POST", { answers }),
  responses: (id: number | string) => req<Resp[]>(`/forms/${id}/responses`),
  summary: (id: number | string) => req<{ total: number; questions: SummaryItem[] }>(`/forms/${id}/summary`),
};
