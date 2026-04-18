"use client";

import type { QuizResult, Question } from "@/types/quiz";

interface ResultsSummaryProps {
  result: QuizResult;
  questions: Question[];
}

const LEVEL_LABELS: Record<string, string> = {
  moderate: "Moderate",
  advanced: "Advanced",
  "previous-years": "Previous Years",
};

export default function ResultsSummary({
  result,
  questions,
}: ResultsSummaryProps) {
  const percentage = Math.round((result.score / result.total) * 100);
  const avgTime = Math.round(
    result.timePerQuestion.reduce((a, b) => a + b, 0) /
      result.timePerQuestion.length
  );

  const levelStats: Record<string, { correct: number; total: number }> = {};
  const chapterStats: Record<number, { correct: number; total: number }> = {};

  result.answers.forEach((answer, i) => {
    const q = questions[i];
    if (!q) return;

    if (!levelStats[q.level])
      levelStats[q.level] = { correct: 0, total: 0 };
    levelStats[q.level].total++;
    if (answer.correct) levelStats[q.level].correct++;

    if (!chapterStats[q.chapter])
      chapterStats[q.chapter] = { correct: 0, total: 0 };
    chapterStats[q.chapter].total++;
    if (answer.correct) chapterStats[q.chapter].correct++;
  });

  const wrongAnswers = result.answers
    .map((answer, i) => ({ answer, question: questions[i] }))
    .filter(({ answer }) => !answer.correct);

  const scoreColor =
    percentage >= 70
      ? "text-correct"
      : percentage >= 40
        ? "text-warn"
        : "text-wrong";

  return (
    <div className="space-y-4">
      {/* Score Card */}
      <div className="card-elevated p-6 text-center">
        <div className={`text-5xl font-extrabold mb-1 ${scoreColor}`}>
          {percentage}%
        </div>
        <p className="text-sm text-slate-muted">
          {result.score} out of {result.total} correct
        </p>
        <p className="text-xs text-slate-faint mt-0.5">
          Avg {avgTime}s per question
        </p>
      </div>

      {/* Breakdowns side by side on wider screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Level Breakdown */}
        <div className="card-elevated p-5">
          <h3 className="text-xs font-semibold text-slate-muted uppercase tracking-wider mb-3">
            By Difficulty
          </h3>
          <div className="space-y-3">
            {Object.entries(levelStats).map(([level, stats]) => {
              const pct = Math.round((stats.correct / stats.total) * 100);
              return (
                <div key={level}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-navy">
                      {LEVEL_LABELS[level] || level}
                    </span>
                    <span className="text-sm font-semibold text-navy">
                      {stats.correct}/{stats.total}
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background:
                          pct >= 70 ? "#059669" : pct >= 40 ? "#D97706" : "#DC2626",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chapter Breakdown */}
        <div className="card-elevated p-5">
          <h3 className="text-xs font-semibold text-slate-muted uppercase tracking-wider mb-3">
            By Chapter
          </h3>
          <div className="space-y-3">
            {Object.entries(chapterStats).map(([chapter, stats]) => {
              const pct = Math.round((stats.correct / stats.total) * 100);
              return (
                <div key={chapter}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-navy">
                      Chapter {chapter}
                    </span>
                    <span className="text-sm font-semibold text-navy">
                      {stats.correct}/{stats.total}
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background:
                          pct >= 70 ? "#059669" : pct >= 40 ? "#D97706" : "#DC2626",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Wrong Answers Review */}
      {wrongAnswers.length > 0 && (
        <div className="card-elevated p-5">
          <h3 className="text-xs font-semibold text-slate-muted uppercase tracking-wider mb-4">
            Review Wrong Answers ({wrongAnswers.length})
          </h3>
          <div className="space-y-5">
            {wrongAnswers.map(({ answer, question }, i) => (
              <div
                key={i}
                className="border-t border-border pt-4 first:border-0 first:pt-0"
              >
                <p className="text-sm font-semibold text-navy mb-3 whitespace-pre-line">
                  {question.text}
                </p>
                <div className="space-y-1.5">
                  {question.options.map((option, oi) => {
                    const isCorrect = oi === question.correctIndex;
                    const isSelected = oi === answer.selectedIndex;

                    let className = "text-sm py-2 px-3 rounded-lg ";
                    if (isCorrect)
                      className += "bg-correct-bg text-correct font-medium";
                    else if (isSelected)
                      className += "bg-wrong-bg text-wrong line-through font-medium";
                    else className += "text-slate-faint";

                    return (
                      <div key={oi} className={className}>
                        <span className="font-semibold mr-1">{option.label}</span> {option.text}
                        {isCorrect && (
                          <svg className="inline w-3.5 h-3.5 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                        {isSelected && (
                          <svg className="inline w-3.5 h-3.5 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                  {answer.selectedIndex === null && (
                    <p className="text-xs text-slate-faint italic">
                      Time expired — not answered
                    </p>
                  )}
                </div>
                {question.explanation && (
                  <div className="text-xs text-slate-muted mt-2 bg-surface p-3 rounded-lg border border-border">
                    {question.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
