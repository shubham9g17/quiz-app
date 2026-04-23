"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Subject, Question, QuestionLevel } from "@/types/quiz";
import InlineBold from "@/components/InlineBold";
import {
  getBookmarks,
  saveBookmarks,
  getStatuses,
  saveStatuses,
  type ReviseStatus,
} from "@/lib/revise-storage";

type StatusFilter = "all" | "unreviewed" | "review" | "known";

const LEVEL_LABEL: Record<QuestionLevel, string> = {
  moderate: "Moderate",
  advanced: "Advanced",
  "previous-years": "Previous Years",
};

const LEVEL_BADGE: Record<QuestionLevel, string> = {
  moderate: "bg-correct-bg text-correct",
  advanced: "bg-warn-bg text-warn",
  "previous-years": "bg-blue/10 text-blue",
};

function fisherYates<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface ReviseClientProps {
  subject: Subject;
  restrictIds: string[] | null;
  initialChapter: number | null;
}

export default function ReviseClient({
  subject,
  restrictIds,
  initialChapter,
}: ReviseClientProps) {
  const allQuestions = useMemo<Question[]>(() => {
    const qs = subject.chapters.flatMap((ch) => ch.questions);
    if (restrictIds && restrictIds.length > 0) {
      const ordered: Question[] = [];
      const byId = new Map(qs.map((q) => [q.id, q]));
      for (const id of restrictIds) {
        const q = byId.get(id);
        if (q) ordered.push(q);
      }
      return ordered;
    }
    return qs;
  }, [subject, restrictIds]);

  const chapterOptions = useMemo(
    () =>
      subject.chapters.map((ch) => ({
        number: ch.number,
        title: ch.title,
        count: ch.questions.length,
      })),
    [subject]
  );

  const [selectedChapters, setSelectedChapters] = useState<number[]>(() => {
    if (restrictIds && restrictIds.length > 0) {
      return [...new Set(allQuestions.map((q) => q.chapter))];
    }
    if (initialChapter !== null) return [initialChapter];
    return subject.chapters.map((ch) => ch.number);
  });

  const [selectedLevels, setSelectedLevels] = useState<QuestionLevel[]>([
    "moderate",
    "advanced",
    "previous-years",
  ]);

  const [onlyBookmarks, setOnlyBookmarks] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [flashcardMode, setFlashcardMode] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [shuffleToken, setShuffleToken] = useState(0);

  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [statuses, setStatusesState] = useState<Record<string, ReviseStatus>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setBookmarks(getBookmarks());
    setStatusesState(getStatuses());
    setHydrated(true);
  }, []);

  const pool = useMemo(() => {
    return allQuestions.filter((q) => {
      if (!selectedChapters.includes(q.chapter)) return false;
      if (!selectedLevels.includes(q.level)) return false;
      if (onlyBookmarks && !bookmarks.has(q.id)) return false;
      if (statusFilter !== "all") {
        const s = statuses[q.id];
        if (statusFilter === "unreviewed" && s) return false;
        if (statusFilter === "review" && s !== "review") return false;
        if (statusFilter === "known" && s !== "known") return false;
      }
      return true;
    });
  }, [
    allQuestions,
    selectedChapters,
    selectedLevels,
    onlyBookmarks,
    statusFilter,
    bookmarks,
    statuses,
  ]);

  const questions = useMemo(() => {
    if (shuffleToken === 0) return pool;
    return fisherYates(pool);
  }, [pool, shuffleToken]);

  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    setCurrentIndex(0);
    setRevealed(false);
  }, [questions]);

  const total = questions.length;
  const current = questions[currentIndex];

  const go = useCallback(
    (delta: number) => {
      if (total === 0) return;
      setCurrentIndex((i) => {
        const next = i + delta;
        if (next < 0) return 0;
        if (next >= total) return total - 1;
        return next;
      });
      setRevealed(false);
    },
    [total]
  );

  const toggleBookmark = useCallback(() => {
    if (!current) return;
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(current.id)) next.delete(current.id);
      else next.add(current.id);
      saveBookmarks(next);
      return next;
    });
  }, [current]);

  const setStatus = useCallback(
    (status: ReviseStatus | null) => {
      if (!current) return;
      setStatusesState((prev) => {
        const next = { ...prev };
        if (status === null) delete next[current.id];
        else next[current.id] = status;
        saveStatuses(next);
        return next;
      });
    },
    [current]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === " " && flashcardMode) {
        e.preventDefault();
        setRevealed((r) => !r);
      } else if (e.key.toLowerCase() === "b") {
        toggleBookmark();
      } else if (e.key === "1") {
        setStatus("known");
      } else if (e.key === "2") {
        setStatus("review");
      } else if (e.key === "0") {
        setStatus(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, flashcardMode, toggleBookmark, setStatus]);

  function toggleChapter(num: number) {
    setSelectedChapters((prev) =>
      prev.includes(num) ? prev.filter((c) => c !== num) : [...prev, num]
    );
  }

  function toggleLevel(level: QuestionLevel) {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  }

  const reviewedCount = questions.filter((q) => statuses[q.id]).length;
  const knownCount = questions.filter((q) => statuses[q.id] === "known").length;
  const progressPct = total > 0 ? Math.round((reviewedCount / total) * 100) : 0;
  const knownPct = total > 0 ? Math.round((knownCount / total) * 100) : 0;

  const showAnswer = !flashcardMode || revealed;
  const status = current ? statuses[current.id] : undefined;
  const isBookmarked = current ? bookmarks.has(current.id) : false;

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="card-elevated p-4 sm:p-5 space-y-4">
        {restrictIds && restrictIds.length > 0 && (
          <div className="text-xs bg-blue/10 text-blue rounded-lg px-3 py-2 font-semibold">
            Reviewing {allQuestions.length} question
            {allQuestions.length === 1 ? "" : "s"} from your last quiz
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-slate-muted uppercase tracking-wider mb-2">
            Chapters
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() =>
                setSelectedChapters(subject.chapters.map((c) => c.number))
              }
              className="pill bg-surface text-slate-muted border border-border hover:border-border-hover cursor-pointer"
            >
              All
            </button>
            <button
              onClick={() => setSelectedChapters([])}
              className="pill bg-surface text-slate-muted border border-border hover:border-border-hover cursor-pointer"
            >
              None
            </button>
            {chapterOptions.map((ch) => {
              const active = selectedChapters.includes(ch.number);
              return (
                <button
                  key={ch.number}
                  onClick={() => toggleChapter(ch.number)}
                  className={`pill cursor-pointer ${
                    active
                      ? "bg-blue text-white"
                      : "bg-surface text-slate-muted border border-border hover:border-border-hover"
                  }`}
                  title={ch.title}
                >
                  Ch {ch.number}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-muted uppercase tracking-wider mb-2">
              Levels
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(LEVEL_LABEL) as QuestionLevel[]).map((lv) => {
                const active = selectedLevels.includes(lv);
                return (
                  <button
                    key={lv}
                    onClick={() => toggleLevel(lv)}
                    className={`pill cursor-pointer ${
                      active
                        ? "bg-navy text-white"
                        : "bg-surface text-slate-muted border border-border hover:border-border-hover"
                    }`}
                  >
                    {LEVEL_LABEL[lv]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-muted uppercase tracking-wider mb-2">
              Show
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setStatusFilter("all")}
                className={`pill cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-navy text-white"
                    : "bg-surface text-slate-muted border border-border hover:border-border-hover"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("unreviewed")}
                className={`pill cursor-pointer ${
                  statusFilter === "unreviewed"
                    ? "bg-navy text-white"
                    : "bg-surface text-slate-muted border border-border hover:border-border-hover"
                }`}
              >
                Unreviewed
              </button>
              <button
                onClick={() => setStatusFilter("review")}
                className={`pill cursor-pointer ${
                  statusFilter === "review"
                    ? "bg-warn text-white"
                    : "bg-surface text-slate-muted border border-border hover:border-border-hover"
                }`}
              >
                Review again
              </button>
              <button
                onClick={() => setStatusFilter("known")}
                className={`pill cursor-pointer ${
                  statusFilter === "known"
                    ? "bg-correct text-white"
                    : "bg-surface text-slate-muted border border-border hover:border-border-hover"
                }`}
              >
                Got it
              </button>
              <button
                onClick={() => setOnlyBookmarks((v) => !v)}
                className={`pill cursor-pointer ${
                  onlyBookmarks
                    ? "bg-blue text-white"
                    : "bg-surface text-slate-muted border border-border hover:border-border-hover"
                }`}
              >
                ★ Bookmarked
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-navy cursor-pointer select-none">
            <input
              type="checkbox"
              checked={flashcardMode}
              onChange={(e) => {
                setFlashcardMode(e.target.checked);
                setRevealed(false);
              }}
              className="w-4 h-4 accent-blue cursor-pointer"
            />
            Flashcard mode (hide answer)
          </label>
          <button
            onClick={() => setShuffleToken((t) => t + 1)}
            className="pill bg-surface text-navy border border-border hover:border-border-hover cursor-pointer font-semibold"
          >
            ⤨ Shuffle
          </button>
        </div>
      </div>

      {/* Progress */}
      {hydrated && total > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-slate-muted mb-2">
            <span>
              {reviewedCount} / {total} reviewed ·{" "}
              <span className="text-correct font-semibold">
                {knownCount} got it
              </span>
            </span>
            <span className="font-semibold text-navy">{progressPct}%</span>
          </div>
          <div className="w-full bg-border rounded-full h-1.5 overflow-hidden flex">
            <div
              className="h-full bg-correct transition-all duration-300"
              style={{ width: `${knownPct}%` }}
            />
            <div
              className="h-full bg-warn transition-all duration-300"
              style={{ width: `${progressPct - knownPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Question card */}
      {current ? (
        <div className="card-elevated p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="text-sm font-semibold text-slate-muted">
              Q {currentIndex + 1} / {total}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-faint">
                Ch {current.chapter}
              </span>
              <span className={`pill ${LEVEL_BADGE[current.level]}`}>
                {LEVEL_LABEL[current.level]}
              </span>
              <button
                onClick={toggleBookmark}
                aria-label="Bookmark"
                className={`w-8 h-8 inline-flex items-center justify-center rounded-full border cursor-pointer transition-colors ${
                  isBookmarked
                    ? "bg-blue/10 border-blue text-blue"
                    : "bg-surface border-border text-slate-faint hover:border-border-hover"
                }`}
              >
                {isBookmarked ? "★" : "☆"}
              </button>
            </div>
          </div>

          <div className="text-base sm:text-lg font-semibold text-navy mb-5 leading-relaxed whitespace-pre-line">
            {current.text}
          </div>

          <div className="space-y-2.5">
            {current.options.map((option, i) => {
              const isCorrect = i === current.correctIndex;
              let cls =
                "w-full text-left p-3.5 flex items-center gap-3 rounded-xl border ";
              if (!showAnswer) {
                cls += "bg-surface-card border-border";
              } else if (isCorrect) {
                cls += "bg-correct-bg border-correct text-correct";
              } else {
                cls += "bg-surface-card border-border text-slate-muted";
              }
              return (
                <div key={i} className={cls}>
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
                      showAnswer && isCorrect
                        ? "bg-correct text-white"
                        : "bg-surface text-slate-muted border border-border"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="text-sm font-medium flex-1">
                    {option.text}
                  </span>
                  {showAnswer && isCorrect && (
                    <svg
                      className="w-4 h-4 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>

          {flashcardMode && !revealed && (
            <button
              onClick={() => setRevealed(true)}
              className="w-full mt-4 py-3 btn-blue cursor-pointer"
            >
              Reveal answer (Space)
            </button>
          )}

          {showAnswer && current.explanation && (
            <div className="mt-5 border-l-4 border-blue bg-blue/5 rounded-r-lg px-4 py-3">
              <p className="text-xs font-semibold text-blue uppercase tracking-wider mb-1">
                Explanation
              </p>
              <p className="text-sm text-navy leading-relaxed">
                <InlineBold text={current.explanation} />
              </p>
            </div>
          )}

          {showAnswer && (
            <div className="mt-5 pt-4 border-t border-border flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setStatus(status === "known" ? null : "known");
                  go(1);
                }}
                className={`flex-1 min-w-[120px] py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
                  status === "known"
                    ? "bg-correct text-white"
                    : "bg-correct-bg text-correct border border-correct/30 hover:bg-correct/20"
                }`}
              >
                ✓ Got it
              </button>
              <button
                onClick={() => {
                  setStatus(status === "review" ? null : "review");
                  go(1);
                }}
                className={`flex-1 min-w-[120px] py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
                  status === "review"
                    ? "bg-warn text-white"
                    : "bg-warn-bg text-warn border border-warn/30 hover:bg-warn/20"
                }`}
              >
                ↻ Review again
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card-elevated p-8 text-center">
          <p className="text-navy font-semibold mb-1">No questions match</p>
          <p className="text-sm text-slate-muted">
            Try widening your filters — add chapters, levels, or clear the
            bookmark/status filter.
          </p>
        </div>
      )}

      {/* Navigation */}
      {total > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => go(-1)}
            disabled={currentIndex === 0}
            className="flex-1 py-3 btn-outline cursor-pointer"
          >
            ← Previous
          </button>
          <button
            onClick={() => go(1)}
            disabled={currentIndex >= total - 1}
            className="flex-1 py-3 btn-primary cursor-pointer"
          >
            Next →
          </button>
        </div>
      )}

      {/* Keyboard hint */}
      <p className="text-xs text-slate-faint text-center">
        ← / → navigate · Space reveal · B bookmark · 1 got it · 2 review · 0 clear
      </p>
    </div>
  );
}
