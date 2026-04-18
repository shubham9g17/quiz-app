"use client";

import type { QuestionLevel } from "@/types/quiz";

const LEVELS: { value: QuestionLevel; label: string }[] = [
  { value: "moderate", label: "Moderate" },
  { value: "advanced", label: "Advanced" },
  { value: "previous-years", label: "Previous Years" },
];

interface LevelSelectorProps {
  selected: QuestionLevel[];
  onChange: (selected: QuestionLevel[]) => void;
}

export default function LevelSelector({
  selected,
  onChange,
}: LevelSelectorProps) {
  function toggle(level: QuestionLevel) {
    if (selected.includes(level)) {
      onChange(selected.filter((l) => l !== level));
    } else {
      onChange([...selected, level]);
    }
  }

  const allSelected = selected.length === LEVELS.length;

  function toggleAll() {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(LEVELS.map((l) => l.value));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-navy">Difficulty</h3>
        <button
          onClick={toggleAll}
          className="text-xs text-blue font-semibold hover:text-blue-dark transition-colors cursor-pointer"
        >
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {LEVELS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => toggle(value)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              selected.includes(value)
                ? "btn-primary"
                : "btn-outline"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
