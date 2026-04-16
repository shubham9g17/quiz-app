"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Subject, QuestionLevel } from "@/types/quiz";
import { getAvailableQuestionCount } from "@/lib/quiz-engine";
import ChapterSelector from "@/components/ChapterSelector";
import LevelSelector from "@/components/LevelSelector";

const TIMER_OPTIONS = [
  { value: 0, label: "No Timer" },
  { value: 30, label: "30s" },
  { value: 60, label: "60s" },
  { value: 90, label: "90s" },
];

interface SetupClientProps {
  subject: Subject;
}

export default function SetupClient({ subject }: SetupClientProps) {
  const router = useRouter();
  const [selectedChapters, setSelectedChapters] = useState<number[]>(
    subject.chapters.map((ch) => ch.number)
  );
  const [selectedLevels, setSelectedLevels] = useState<QuestionLevel[]>([
    "moderate",
    "advanced",
    "previous-years",
  ]);
  const [questionCount, setQuestionCount] = useState(10);
  const [timerSeconds, setTimerSeconds] = useState(60);

  const available = getAvailableQuestionCount(
    subject,
    selectedChapters,
    selectedLevels
  );
  const effectiveCount = Math.min(questionCount, available);
  const canStart =
    selectedChapters.length > 0 && selectedLevels.length > 0 && available > 0;

  function startQuiz() {
    const config = {
      subjectId: subject.id,
      chapters: selectedChapters,
      levels: selectedLevels,
      questionCount: effectiveCount,
      timerSeconds,
    };
    sessionStorage.setItem("quizConfig", JSON.stringify(config));
    sessionStorage.setItem("quizSubject", JSON.stringify(subject));
    router.push("/quiz/play");
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <a href="/" className="text-sm text-orange-600 hover:underline">
          ← Back
        </a>

        <h1 className="text-2xl font-bold text-gray-900 mt-4">
          {subject.name}
        </h1>
        <p className="text-sm text-gray-500 mb-6">Class {subject.class}</p>

        <div className="space-y-6">
          <ChapterSelector
            chapters={subject.chapters}
            selected={selectedChapters}
            onChange={setSelectedChapters}
          />

          <LevelSelector
            selected={selectedLevels}
            onChange={setSelectedLevels}
          />

          {/* Question Count */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Questions: {effectiveCount}
              {available < questionCount && (
                <span className="text-xs text-orange-600 ml-2">
                  (only {available} available)
                </span>
              )}
            </h3>
            <input
              type="range"
              min={1}
              max={50}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full accent-orange-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1</span>
              <span>25</span>
              <span>50</span>
            </div>
          </div>

          {/* Timer */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Timer per Question
            </h3>
            <div className="flex gap-2">
              {TIMER_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTimerSeconds(value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    timerSeconds === value
                      ? "bg-orange-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={startQuiz}
          disabled={!canStart}
          className="w-full mt-8 py-4 bg-orange-600 text-white font-bold rounded-2xl text-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
        >
          Start Quiz
        </button>
      </div>
    </main>
  );
}
