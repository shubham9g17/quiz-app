"use client";

import type { Question } from "@/types/quiz";

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

const LEVEL_BADGES: Record<string, { label: string; className: string }> = {
  moderate: { label: "Moderate", className: "bg-correct-bg text-correct" },
  advanced: { label: "Advanced", className: "bg-warn-bg text-warn" },
  "previous-years": {
    label: "Previous Years",
    className: "bg-blue/10 text-blue",
  },
};

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedIndex,
  onSelect,
}: QuestionCardProps) {
  const badge = LEVEL_BADGES[question.level] || LEVEL_BADGES.moderate;

  return (
    <div className="card-elevated p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-slate-muted">
          Q {questionNumber} / {totalQuestions}
        </span>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-slate-faint">Ch {question.chapter}</span>
          <span className={`pill ${badge.className}`}>
            {badge.label}
          </span>
        </div>
      </div>

      <div className="text-base sm:text-lg font-semibold text-navy mb-5 leading-relaxed whitespace-pre-line">
        {question.text}
      </div>

      <div className="space-y-2.5">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            className={`w-full text-left p-3.5 flex items-center gap-3 ${
              selectedIndex === index
                ? "option-selected"
                : "option"
            }`}
          >
            <span
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
                selectedIndex === index
                  ? "bg-blue text-white"
                  : "bg-surface text-slate-muted border border-border"
              }`}
            >
              {option.label}
            </span>
            <span className="text-sm font-medium text-navy">
              {option.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
