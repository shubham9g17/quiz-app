export type ReviseStatus = "known" | "review";

const BOOKMARKS_KEY = "revise.bookmarks";
const STATUS_KEY = "revise.status";

export function getBookmarks(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function saveBookmarks(bookmarks: Set<string>): void {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...bookmarks]));
}

export function getStatuses(): Record<string, ReviseStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ReviseStatus>) : {};
  } catch {
    return {};
  }
}

export function saveStatuses(statuses: Record<string, ReviseStatus>): void {
  localStorage.setItem(STATUS_KEY, JSON.stringify(statuses));
}
