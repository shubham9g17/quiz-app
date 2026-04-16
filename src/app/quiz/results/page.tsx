"use client";

import { useEffect, useState } from "react";
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
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading results...</p>
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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">
          Quiz Results
        </h1>

        <ResultsSummary result={result} questions={questions} />

        <div className="space-y-3 mt-8">
          {result.answers.some((a) => !a.correct) && (
            <button
              onClick={retryWrongQuestions}
              className="w-full py-4 bg-orange-600 text-white font-bold rounded-2xl text-lg hover:bg-orange-700 transition-all"
            >
              Retry Wrong Questions
            </button>
          )}
          <button
            onClick={() =>
              router.push(`/quiz/setup?subject=${result!.config.subjectId}`)
            }
            className="w-full py-4 bg-white text-orange-600 font-bold rounded-2xl text-lg border-2 border-orange-600 hover:bg-orange-50 transition-all"
          >
            New Quiz
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 text-gray-500 font-medium text-sm hover:text-gray-700 transition-all"
          >
            Home
          </button>
        </div>
      </div>
    </main>
  );
}
