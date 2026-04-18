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
      <div className="card p-6 text-center">
        <p className="text-sm text-slate-muted">
          No quizzes taken yet. Pick a subject to start!
        </p>
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
    <div className="card-elevated p-5">
      <h3 className="text-xs font-semibold text-slate-muted uppercase tracking-wider mb-4">
        Your Progress
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card">
          <p className="text-2xl font-bold text-navy">{totalQuizzes}</p>
          <p className="text-xs text-slate-muted mt-0.5">Quizzes Taken</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-navy">{avgScore}%</p>
          <p className="text-xs text-slate-muted mt-0.5">Avg Score</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-navy">
            {lastQuiz.score}/{lastQuiz.total}
          </p>
          <p className="text-xs text-slate-muted mt-0.5">Last Quiz</p>
        </div>
      </div>
    </div>
  );
}
