"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QuizResult, Question } from "@/types/quiz";
import ResultsSummary from "@/components/ResultsSummary";

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const resultStr = sessionStorage.getItem("lastQuizResult");
    const questionsStr = sessionStorage.getItem("quizQuestions");
    if (!resultStr || !questionsStr) {
      router.push("/");
      return;
    }
    setResult(JSON.parse(resultStr));
    setQuestions(JSON.parse(questionsStr));
  }, [router]);

  if (!result) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-slate-muted">Loading results...</p>
      </main>
    );
  }

  function retryWrongQuestions() {
    const wrongCount = result!.answers.filter((a) => !a.correct).length;
    if (wrongCount === 0) return;

    const config = {
      ...result!.config,
      questionCount: wrongCount,
    };

    const wrongIds = result!.answers
      .filter((a) => !a.correct)
      .map((a) => a.questionId);

    sessionStorage.setItem("quizConfig", JSON.stringify(config));
    sessionStorage.setItem("retryQuestionIds", JSON.stringify(wrongIds));
    router.push("/quiz/play");
  }

  return (
    <main className="min-h-screen bg-surface">
      {/* Top bar */}
      <header className="border-b border-border bg-surface-card">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-lg font-bold text-navy">Quiz Results</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <ResultsSummary result={result} questions={questions} />

        {(() => {
          const wrongChapters = Array.from(
            new Set(
              result.answers
                .map((a, i) => ({ a, q: questions[i] }))
                .filter(({ a, q }) => q && !a.correct)
                .map(({ q }) => q.chapter)
            )
          ).sort((a, b) => a - b);

          if (wrongChapters.length === 0) return null;

          return (
            <div className="card-elevated p-5 mt-4">
              <h3 className="text-xs font-semibold text-slate-muted uppercase tracking-wider mb-3">
                Review Concepts
              </h3>
              <p className="text-sm text-slate-muted mb-3">
                Brush up on the chapters where you missed questions.
              </p>
              <div className="flex flex-wrap gap-2">
                {wrongChapters.map((ch) => (
                  <Link
                    key={ch}
                    href={`/read/${result.config.subjectId}/${ch}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-sm font-semibold text-navy hover:border-blue hover:text-blue transition-colors"
                  >
                    <svg
                      className="w-3.5 h-3.5"
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
                    Chapter {ch}
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          {result.answers.some((a) => !a.correct) && (
            <button
              onClick={retryWrongQuestions}
              className="flex-1 py-3 text-sm btn-primary cursor-pointer"
            >
              Retry Wrong Questions
            </button>
          )}
          <button
            onClick={() =>
              router.push(`/quiz/setup?subject=${result!.config.subjectId}`)
            }
            className="flex-1 py-3 text-sm btn-outline cursor-pointer"
          >
            New Quiz
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex-1 py-3 text-sm btn-ghost cursor-pointer"
          >
            Home
          </button>
        </div>
      </div>
    </main>
  );
}
