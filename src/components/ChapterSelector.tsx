"use client";

import Link from "next/link";
import type { Chapter } from "@/types/quiz";

interface ChapterSelectorProps {
  subjectId: string;
  chapters: Chapter[];
  selected: number[];
  onChange: (selected: number[]) => void;
}

export default function ChapterSelector({
  subjectId,
  chapters,
  selected,
  onChange,
}: ChapterSelectorProps) {
  const allSelected = selected.length === chapters.length;

  function toggleAll() {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(chapters.map((ch) => ch.number));
    }
  }

  function toggleChapter(num: number) {
    if (selected.includes(num)) {
      onChange(selected.filter((n) => n !== num));
    } else {
      onChange([...selected, num]);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-navy">Chapters</h3>
        <button
          onClick={toggleAll}
          className="text-xs text-blue font-semibold hover:text-blue-dark transition-colors cursor-pointer"
        >
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      </div>
      <div className="space-y-2">
        {chapters.map((ch) => {
          const isSelected = selected.includes(ch.number);
          return (
            <div
              key={ch.number}
              className={`flex items-stretch rounded-lg transition-all ${
                isSelected ? "option-selected" : "option"
              }`}
            >
              <label className="flex items-center gap-3 p-3.5 cursor-pointer flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleChapter(ch.number)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-navy truncate">
                      Ch {ch.number}. {ch.title}
                    </p>
                    {ch.class > 0 && (
                      <span className="pill bg-surface text-slate-faint border border-border text-[10px] shrink-0">
                        Class {ch.class}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-muted">
                    {ch.questions.length} questions
                  </p>
                </div>
              </label>
              <Link
                href={`/read/${subjectId}/${ch.number}`}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1.5 px-3 text-xs font-semibold text-slate-muted hover:text-blue transition-colors border-l border-border"
                aria-label={`Read notes for chapter ${ch.number}`}
                title="Open reading notes"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                <span className="hidden sm:inline">Read</span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
