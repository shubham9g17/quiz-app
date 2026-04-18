"use client";

import type { Chapter } from "@/types/quiz";

interface ChapterSelectorProps {
  chapters: Chapter[];
  selected: number[];
  onChange: (selected: number[]) => void;
}

export default function ChapterSelector({
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
        {chapters.map((ch) => (
          <label
            key={ch.number}
            className={`flex items-center gap-3 p-3.5 rounded-lg cursor-pointer transition-all ${
              selected.includes(ch.number)
                ? "option-selected"
                : "option"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(ch.number)}
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
        ))}
      </div>
    </div>
  );
}
