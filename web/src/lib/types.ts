export type QType = "short_text" | "long_text" | "multiple_choice" | "dropdown" | "email" | "number" | "yes_no" | "rating";
export interface Question { id: number; text: string; type: QType; position: number; required: boolean; description: string; options: string[] }
export interface Form { id: number; title: string; status: "draft" | "published"; slug: string; updated_at: string; response_count: number; questions?: Question[] }
export interface Resp { id: number; submitted_at: string; answers: Record<number, string> }
export interface SummaryItem { question_id: number; text: string; type: QType; answered: number; counts?: Record<string, number>; average?: number }

export const TYPES: { type: QType; label: string }[] = [
  { type: "short_text", label: "Short Text" }, { type: "long_text", label: "Long Text" },
  { type: "multiple_choice", label: "Multiple Choice" }, { type: "dropdown", label: "Dropdown" },
  { type: "email", label: "Email" }, { type: "number", label: "Number" },
  { type: "yes_no", label: "Yes / No" }, { type: "rating", label: "Rating" },
];
export const hasOptions = (t: QType) => t === "multiple_choice" || t === "dropdown";
