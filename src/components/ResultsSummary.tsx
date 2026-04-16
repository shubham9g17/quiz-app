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

  // Group by level
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

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
        <div
          className={`text-5xl font-bold mb-2 ${
            percentage >= 70
              ? "text-green-600"
              : percentage >= 40
                ? "text-orange-600"
                : "text-red-500"
          }`}
        >
          {percentage}%
        </div>
        <p className="text-gray-500 text-sm">
          {result.score} out of {result.total} correct
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Avg {avgTime}s per question
        </p>
      </div>

      {/* Level Breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          By Difficulty
        </h3>
        <div className="space-y-3">
          {Object.entries(levelStats).map(([level, stats]) => (
            <div key={level} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                {LEVEL_LABELS[level] || level}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {stats.correct}/{stats.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chapter Breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          By Chapter
        </h3>
        <div className="space-y-3">
          {Object.entries(chapterStats).map(([chapter, stats]) => (
            <div key={chapter} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Chapter {chapter}</span>
              <span className="text-sm font-medium text-gray-900">
                {stats.correct}/{stats.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Wrong Answers Review */}
      {wrongAnswers.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Review Wrong Answers ({wrongAnswers.length})
          </h3>
          <div className="space-y-6">
            {wrongAnswers.map(({ answer, question }, i) => (
              <div
                key={i}
                className="border-t border-gray-100 pt-4 first:border-0 first:pt-0"
              >
                <p className="text-sm font-medium text-gray-900 mb-3">
                  {question.text}
                </p>
                <div className="space-y-2">
                  {question.options.map((option, oi) => {
                    const isCorrect = oi === question.correctIndex;
                    const isSelected = oi === answer.selectedIndex;

                    let className = "text-sm p-2 rounded-lg ";
                    if (isCorrect)
                      className += "bg-green-50 text-green-700 font-medium";
                    else if (isSelected)
                      className += "bg-red-50 text-red-600 line-through";
                    else className += "text-gray-500";

                    return (
                      <div key={oi} className={className}>
                        {option.label} {option.text}
                        {isCorrect && " ✓"}
                        {isSelected && " ✗"}
                      </div>
                    );
                  })}
                  {answer.selectedIndex === null && (
                    <p className="text-xs text-gray-400 italic">
                      Time expired — not answered
                    </p>
                  )}
                </div>
                {question.explanation && (
                  <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-3 rounded-lg">
                    {question.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
