import type { QuizResult } from "@/types/quiz";

const STORAGE_KEY = "quizHistory";

export function getQuizHistory(): QuizResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveQuizResult(result: QuizResult): void {
  const history = getQuizHistory();
  history.unshift(result);
  // Keep last 50 results
  const trimmed = history.slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function clearQuizHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
