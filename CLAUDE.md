# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start Next.js dev server (localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run pipeline <subject-id>` — run the content pipeline (requires `claude` CLI); supports `--step extract|convert`

## Architecture

NCERT Quiz App — a Next.js 16 app (React 19, Tailwind CSS 4) for practicing NCERT question-bank MCQs. Targeted at UPSC prep.

### Data flow

Photos of question-bank pages → `scripts/pipeline.ts` (uses Claude CLI to OCR/extract) → `knowledge/<subject>/` (raw extracts) → `content/<subject>/` (quiz-ready markdown) → loaded at build time by `src/lib/content-loader.ts` → served as static pages.

### Content format

Quiz questions live in `content/<subject-id>/c<class>-ch<num>.md` as markdown with YAML frontmatter (`subject`, `class`, `chapter`, `title`). Questions are grouped under `## Level 01 | Moderate`, `## Level 02 | Advanced`, `## Level 03 | Previous Years`. Correct answers are bolded with ✓: `- **(c) Answer** ✓`. Explanations use blockquotes: `> **Explanation:** ...`.

Subject registry lives in `uploads/subjects.json`.

### Quiz flow (pages)

1. `/` — home: lists subjects (server component, loads content at build time)
2. `/quiz/setup?subject=<id>` — chapter/level/count picker (server loads subject, client component `SetupClient` handles UI)
3. `/quiz/play` — client-only: reads config from `sessionStorage`, builds session via `quiz-engine.ts`, shuffles questions
4. `/quiz/results` — displays score and per-question review from `sessionStorage`

Quiz state passes between pages via `sessionStorage` (quizConfig, quizSubject, lastQuizResult, quizQuestions). History persists in `localStorage` (last 50 results).

### Key modules

- `src/lib/content-loader.ts` — parses markdown files from `content/` into `Subject`/`Chapter`/`Question` types (server-side only, uses `fs`)
- `src/lib/quiz-engine.ts` — builds quiz sessions: filters by chapter/level, Fisher-Yates shuffle
- `src/lib/storage.ts` — localStorage wrapper for quiz history (client-side)
- `src/types/quiz.ts` — shared type definitions
- `scripts/pipeline.ts` — two-stage content pipeline (extract from photos → convert to quiz markdown); uses `claude` CLI with retry logic; processes chapter folders in parallel

### Pipeline

The pipeline (`scripts/pipeline.ts`) uses the `claude` CLI (not the API) to extract content from photographed question-bank pages. Uploads go in `uploads/<subject-id>/ch01/`, `ch02/`, etc. After extraction, processed folders move to `uploads/<subject-id>/processed/`. The pipeline writes intermediate knowledge files to `knowledge/<subject>/` and final quiz markdown to `content/<subject>/`.
