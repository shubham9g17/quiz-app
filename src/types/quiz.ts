export interface Subject {
  id: string;
  name: string;
  classes: number[];
  chapters: Chapter[];
}

export interface Chapter {
  number: number;
  title: string;
  class: number;
  questions: Question[];
}

export type QuestionLevel = "moderate" | "advanced" | "previous-years";

export interface Question {
  id: string;
  chapter: number;
  level: QuestionLevel;
  text: string;
  options: Option[];
  correctIndex: number;
  explanation?: string;
}

export interface Option {
  label: string;
  text: string;
}

export interface QuizConfig {
  subjectId: string;
  chapters: number[];
  levels: QuestionLevel[];
  questionCount: number;
  timerSeconds: number;
}

export interface QuizSession {
  config: QuizConfig;
  questions: Question[];
}

export interface UserAnswer {
  questionId: string;
  selectedIndex: number | null;
  correct: boolean;
  timeTaken: number;
}

export interface QuizResult {
  id: string;
  date: string;
  config: QuizConfig;
  score: number;
  total: number;
  answers: UserAnswer[];
  timePerQuestion: number[];
}
