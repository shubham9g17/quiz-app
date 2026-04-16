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
  moderate: { label: "Moderate", className: "bg-green-100 text-green-700" },
  advanced: { label: "Advanced", className: "bg-yellow-100 text-yellow-700" },
  "previous-years": {
    label: "Previous Years",
    className: "bg-purple-100 text-purple-700",
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">
          Q {questionNumber} / {totalQuestions}
        </span>
        <div className="flex gap-2">
          <span className="text-xs text-gray-400">Ch {question.chapter}</span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-6 leading-relaxed">
        {question.text}
      </h2>

      <div className="space-y-3">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
              selectedIndex === index
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <span className="text-sm text-gray-500 mr-2">{option.label}</span>
            <span className="text-sm font-medium text-gray-900">
              {option.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
