"use client";

import { useEffect, useState } from "react";
import { getQuizHistory } from "@/lib/storage";
import type { QuizResult } from "@/types/quiz";

export default function HistorySummary() {
  const [history, setHistory] = useState<QuizResult[]>([]);

  useEffect(() => {
    setHistory(getQuizHistory());
  }, []);

  if (history.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p className="text-sm">No quizzes taken yet. Pick a subject to start!</p>
      </div>
    );
  }

  const lastQuiz = history[0];
  const totalQuizzes = history.length;
  const avgScore = Math.round(
    history.reduce((sum, r) => sum + (r.score / r.total) * 100, 0) /
      totalQuizzes
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Your Progress
      </h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-orange-600">{totalQuizzes}</p>
          <p className="text-xs text-gray-500">Quizzes Taken</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-orange-600">{avgScore}%</p>
          <p className="text-xs text-gray-500">Avg Score</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-orange-600">
            {lastQuiz.score}/{lastQuiz.total}
          </p>
          <p className="text-xs text-gray-500">Last Quiz</p>
        </div>
      </div>
    </div>
  );
}
