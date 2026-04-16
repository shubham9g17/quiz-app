import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type {
  Subject,
  Chapter,
  Question,
  QuestionLevel,
  Option,
} from "@/types/quiz";

const CONTENT_DIR = path.join(process.cwd(), "content");

const LEVEL_MAP: Record<string, QuestionLevel> = {
  "01": "moderate",
  "02": "advanced",
  "03": "previous-years",
};

function parseOptions(lines: string[]): {
  options: Option[];
  correctIndex: number;
} {
  const options: Option[] = [];
  let correctIndex = -1;

  for (const line of lines) {
    const correctMatch = line.match(/^- \*\*\(([a-d])\)\s+(.+?)\*\*\s*✓\s*$/);
    if (correctMatch) {
      correctIndex = options.length;
      options.push({
        label: `(${correctMatch[1]})`,
        text: correctMatch[2].trim(),
      });
      continue;
    }

    const optionMatch = line.match(/^- \(([a-d])\)\s+(.+)$/);
    if (optionMatch) {
      options.push({
        label: `(${optionMatch[1]})`,
        text: optionMatch[2].trim(),
      });
    }
  }

  return { options, correctIndex };
}

function parseChapterMd(
  filePath: string,
  subjectId: string
): Chapter | null {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  const chapterNumber = data.chapter as number;
  const title = data.title as string;

  if (!chapterNumber || !title) return null;

  const questions: Question[] = [];
  let currentLevel: QuestionLevel = "moderate";
  let currentLevelCode = "01";

  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Match level header: ## Level 01 | Moderate
    const levelMatch = line.match(/^## Level (\d+) \|/);
    if (levelMatch) {
      currentLevelCode = levelMatch[1];
      currentLevel = LEVEL_MAP[currentLevelCode] || "moderate";
      i++;
      continue;
    }

    // Match question header: ### Q1. Question text
    const questionMatch = line.match(/^### Q(\d+)\.\s+(.+)$/);
    if (questionMatch) {
      const qNum = questionMatch[1];
      let questionText = questionMatch[2];

      // Collect continuation lines (for multi-line questions)
      i++;
      while (
        i < lines.length &&
        !lines[i].startsWith("- ") &&
        !lines[i].startsWith("##") &&
        !lines[i].startsWith("> ") &&
        lines[i].trim() !== ""
      ) {
        questionText += " " + lines[i].trim();
        i++;
      }

      // Collect option lines
      const optionLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        optionLines.push(lines[i]);
        i++;
      }

      // Collect explanation
      let explanation: string | undefined;
      while (i < lines.length && lines[i].trim() === "") i++;
      if (i < lines.length && lines[i].startsWith("> ")) {
        const explanationLines: string[] = [];
        while (i < lines.length && lines[i].startsWith("> ")) {
          explanationLines.push(
            lines[i]
              .replace(/^> /, "")
              .replace(/^\*\*Explanation:\*\*\s*/, "")
          );
          i++;
        }
        explanation = explanationLines.join(" ").trim();
      }

      const { options, correctIndex } = parseOptions(optionLines);

      if (options.length > 0 && correctIndex >= 0) {
        questions.push({
          id: `${subjectId}-ch${String(chapterNumber).padStart(2, "0")}-L${currentLevelCode}-q${String(qNum).padStart(2, "0")}`,
          chapter: chapterNumber,
          level: currentLevel,
          text: questionText,
          options,
          correctIndex,
          explanation,
        });
      }

      continue;
    }

    i++;
  }

  return { number: chapterNumber, title, questions };
}

export function loadSubject(subjectDir: string): Subject | null {
  const fullPath = path.join(CONTENT_DIR, subjectDir);
  if (!fs.existsSync(fullPath)) return null;

  const files = fs
    .readdirSync(fullPath)
    .filter((f) => f.endsWith(".md"))
    .sort();
  const chapters: Chapter[] = [];

  for (const file of files) {
    const chapter = parseChapterMd(path.join(fullPath, file), subjectDir);
    if (chapter) chapters.push(chapter);
  }

  if (chapters.length === 0) return null;

  // Derive subject metadata from first chapter's frontmatter
  const raw = fs.readFileSync(path.join(fullPath, files[0]), "utf-8");
  const { data } = matter(raw);

  return {
    id: subjectDir,
    name: (data.subject as string) || subjectDir,
    class: (data.class as number) || 0,
    chapters,
  };
}

export function loadAllSubjects(): Subject[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const dirs = fs.readdirSync(CONTENT_DIR).filter((d) => {
    return fs.statSync(path.join(CONTENT_DIR, d)).isDirectory();
  });

  const subjects: Subject[] = [];
  for (const dir of dirs) {
    const subject = loadSubject(dir);
    if (subject) subjects.push(subject);
  }

  return subjects;
}
