import type { Question, QuizConfig, QuizSession, Subject } from "@/types/quiz";

function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function shuffleOptions(question: Question): Question {
  const indices = question.options.map((_, i) => i);
  const shuffledIndices = fisherYatesShuffle(indices);

  const newCorrectIndex = shuffledIndices.indexOf(question.correctIndex);

  return {
    ...question,
    options: shuffledIndices.map((i) => question.options[i]),
    correctIndex: newCorrectIndex,
  };
}

export function buildQuizSession(
  subject: Subject,
  config: QuizConfig
): QuizSession {
  // Filter questions by selected chapters and levels
  let pool: Question[] = [];
  for (const chapter of subject.chapters) {
    if (!config.chapters.includes(chapter.number)) continue;
    for (const question of chapter.questions) {
      if (config.levels.includes(question.level)) {
        pool.push(question);
      }
    }
  }

  // Shuffle the pool
  pool = fisherYatesShuffle(pool);

  // Pick requested count (or all if fewer available)
  const count = Math.min(config.questionCount, pool.length);
  const selected = pool.slice(0, count);

  const questions = selected;

  return { config, questions };
}

export function buildRetrySession(
  config: QuizConfig,
  questions: Question[]
): QuizSession {
  return { config, questions: fisherYatesShuffle(questions) };
}

export function getAvailableQuestionCount(
  subject: Subject,
  chapters: number[],
  levels: string[]
): number {
  let count = 0;
  for (const chapter of subject.chapters) {
    if (!chapters.includes(chapter.number)) continue;
    for (const question of chapter.questions) {
      if (levels.includes(question.level)) count++;
    }
  }
  return count;
}
