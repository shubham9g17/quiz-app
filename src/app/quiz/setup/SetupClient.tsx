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
  initialChapterNumbers?: number[];
}

export default function SetupClient({
  subject,
  initialChapterNumbers,
}: SetupClientProps) {
  const router = useRouter();
  const [selectedChapters, setSelectedChapters] = useState<number[]>(() => {
    const allNumbers = subject.chapters.map((ch) => ch.number);
    if (!initialChapterNumbers || initialChapterNumbers.length === 0) {
      return allNumbers;
    }
    const valid = initialChapterNumbers.filter((n) => allNumbers.includes(n));
    return valid.length > 0 ? valid : allNumbers;
  });
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
    sessionStorage.removeItem("retryQuestionIds");
    router.push("/quiz/play");
  }

  return (
    <main className="min-h-screen bg-surface">
      {/* Top bar */}
      <header className="border-b border-border bg-surface-card">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue hover:text-blue-dark transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            Back to subjects
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">{subject.name}</h1>
          {subject.classes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {subject.classes.map((c) => (
                <span key={c} className="pill bg-blue/10 text-blue">
                  Class {c}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="card-elevated p-5 sm:p-6 space-y-6">
          <ChapterSelector
            subjectId={subject.id}
            chapters={subject.chapters}
            selected={selectedChapters}
            onChange={setSelectedChapters}
          />

          <div className="border-t border-border" />

          <LevelSelector
            selected={selectedLevels}
            onChange={setSelectedLevels}
          />

          <div className="border-t border-border" />

          {/* Question Count */}
          <div>
            <h3 className="text-sm font-semibold text-navy mb-3">
              Questions: {effectiveCount}
              {available < questionCount && (
                <span className="text-xs text-warn ml-2 font-medium">
                  (only {available} available)
                </span>
              )}
            </h3>
            <input
              type="range"
              min={1}
              max={100}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-faint mt-1">
              <span>1</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Timer */}
          <div>
            <h3 className="text-sm font-semibold text-navy mb-3">
              Timer per Question
            </h3>
            <div className="flex gap-2">
              {TIMER_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTimerSeconds(value)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    timerSeconds === value
                      ? "btn-primary"
                      : "btn-outline"
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
          className="w-full mt-6 py-3.5 text-base btn-blue cursor-pointer"
        >
          Start Quiz
        </button>
      </div>
    </main>
  );
}
