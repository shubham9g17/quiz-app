"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Subject, QuizConfig, QuizSession, UserAnswer } from "@/types/quiz";
import { buildQuizSession } from "@/lib/quiz-engine";
import { saveQuizResult, generateId } from "@/lib/storage";
import QuestionCard from "@/components/QuestionCard";
import Timer from "@/components/Timer";
import ProgressBar from "@/components/ProgressBar";

export default function PlayPage() {
  const router = useRouter();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [timerResetKey, setTimerResetKey] = useState(0);
  const questionStartTime = useRef(Date.now());

  useEffect(() => {
    const configStr = sessionStorage.getItem("quizConfig");
    const subjectStr = sessionStorage.getItem("quizSubject");
    if (!configStr || !subjectStr) {
      router.push("/");
      return;
    }

    const config: QuizConfig = JSON.parse(configStr);
    const subject: Subject = JSON.parse(subjectStr);
    const quizSession = buildQuizSession(subject, config);

    if (quizSession.questions.length === 0) {
      router.push("/");
      return;
    }

    setSession(quizSession);
  }, [router]);

  const advance = useCallback(
    (selIndex: number | null) => {
      if (!session) return;

      const question = session.questions[currentIndex];
      const timeTaken = Math.round(
        (Date.now() - questionStartTime.current) / 1000
      );

      const answer: UserAnswer = {
        questionId: question.id,
        selectedIndex: selIndex,
        correct: selIndex === question.correctIndex,
        timeTaken,
      };

      const newAnswers = [...answers, answer];
      setAnswers(newAnswers);

      if (currentIndex + 1 >= session.questions.length) {
        // Quiz complete — save and go to results
        const result = {
          id: generateId(),
          date: new Date().toISOString(),
          config: session.config,
          score: newAnswers.filter((a) => a.correct).length,
          total: newAnswers.length,
          answers: newAnswers,
          timePerQuestion: newAnswers.map((a) => a.timeTaken),
        };
        saveQuizResult(result);
        sessionStorage.setItem("lastQuizResult", JSON.stringify(result));
        sessionStorage.setItem(
          "quizQuestions",
          JSON.stringify(session.questions)
        );
        router.push("/quiz/results");
      } else {
        setCurrentIndex((i) => i + 1);
        setSelectedIndex(null);
        setTimerResetKey((k) => k + 1);
        questionStartTime.current = Date.now();
      }
    },
    [session, currentIndex, answers, router]
  );

  const handleTimerExpire = useCallback(() => {
    advance(null);
  }, [advance]);

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading quiz...</p>
      </main>
    );
  }

  const question = session.questions[currentIndex];
  const isLast = currentIndex + 1 >= session.questions.length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <ProgressBar
              current={currentIndex + 1}
              total={session.questions.length}
            />
          </div>
          {session.config.timerSeconds > 0 && (
            <Timer
              seconds={session.config.timerSeconds}
              onExpire={handleTimerExpire}
              resetKey={timerResetKey}
            />
          )}
        </div>

        {/* Question */}
        <QuestionCard
          question={question}
          questionNumber={currentIndex + 1}
          totalQuestions={session.questions.length}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />

        {/* Next / Finish Button */}
        <button
          onClick={() => advance(selectedIndex)}
          disabled={selectedIndex === null}
          className="w-full mt-6 py-4 bg-orange-600 text-white font-bold rounded-2xl text-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
        >
          {isLast ? "Finish Quiz" : "Next"}
        </button>
      </div>
    </main>
  );
}
