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
        <h3 className="text-sm font-semibold text-gray-700">Chapters</h3>
        <button
          onClick={toggleAll}
          className="text-xs text-orange-600 font-medium hover:underline"
        >
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      </div>
      <div className="space-y-2">
        {chapters.map((ch) => (
          <label
            key={ch.number}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              selected.includes(ch.number)
                ? "border-orange-300 bg-orange-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(ch.number)}
              onChange={() => toggleChapter(ch.number)}
              className="accent-orange-600 w-4 h-4"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                Ch {ch.number}. {ch.title}
              </p>
              <p className="text-xs text-gray-500">
                {ch.questions.length} questions
              </p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
