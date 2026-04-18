#!/usr/bin/env npx tsx
/**
 * NCERT Quiz Pipeline (uses Claude CLI — no API key needed)
 *
 * Dump all textbook/question bank photos into uploads/<subject-id>/ and run:
 *   npx tsx scripts/pipeline.ts <subject-id>
 *
 * The pipeline will:
 *   1. Read all images from the uploads folder (raw dump, any order)
 *   2. Use `claude` CLI to extract chapter content AND existing Q&A from photos
 *   3. Save per-chapter knowledge to knowledge/<subject-id>/ (content + questions separately)
 *   4. Convert extracted Q&A into the quiz app's markdown format in content/<subject-id>/
 *
 * It does NOT generate new questions — it only extracts what's in the photos.
 *
 * Options:
 *   --step extract     Only extract from photos into knowledge/
 *   --step convert     Only convert knowledge/ into content/ (quiz format)
 *
 * Requires: `claude` CLI installed and authenticated
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// ── Config ──────────────────────────────────────
const ROOT = path.resolve(__dirname, "..");
const UPLOADS_DIR = path.join(ROOT, "uploads");
const KNOWLEDGE_DIR = path.join(ROOT, "knowledge");
const CONTENT_DIR = path.join(ROOT, "content");
const SUBJECTS_FILE = path.join(UPLOADS_DIR, "subjects.json");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const MAX_IMAGES_PER_BATCH = 10;

interface SubjectConfig {
  id: string;
  name: string;
  chapters?: { number: number; title: string; class: number }[];
}

interface ChapterExtract {
  number: number;
  title: string;
  class: number;
  content: string;
  questions: string;
}

// ── Helpers ─────────────────────────────────────
function loadSubjects(): SubjectConfig[] {
  return JSON.parse(fs.readFileSync(SUBJECTS_FILE, "utf-8"));
}

function getImageFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .sort()
    .map((f) => path.join(dir, f));
}

function log(msg: string) {
  console.log(`[pipeline] ${msg}`);
}

function callClaude(prompt: string, allowRead = false): string {
  const toolsFlag = allowRead ? '--allowedTools "Read"' : "--allowedTools ''";
  const cmd = `claude -p ${toolsFlag} --output-format text`;

  // Append strict instruction to suppress any commentary/insights
  const strictPrompt = prompt + "\n\nCRITICAL: Output ONLY what was requested above. No commentary, no insights, no explanations about formatting, no backtick blocks with ★, no preamble, no postamble. Raw output only.";

  try {
    const result = execSync(cmd, {
      input: strictPrompt,
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
      timeout: 600_000, // 10 min timeout for large batches
      cwd: ROOT,
    });
    return cleanOutput(result);
  } catch (err: any) {
    if (err.stdout) return cleanOutput(err.stdout);
    throw new Error(`Claude CLI failed: ${err.message}`);
  }
}

/** Strip any ★ Insight blocks, backtick commentary, and leading/trailing noise */
function cleanOutput(raw: string): string {
  let cleaned = raw;

  // Remove ★ Insight blocks (backtick-delimited)
  cleaned = cleaned.replace(/`★[^`]*`[\s\S]*?`─+`/g, "");

  // Remove any standalone commentary lines before/after actual content
  // Keep only content between first === or --- marker and last === or --- marker
  const lines = cleaned.split("\n");
  let start = 0;
  let end = lines.length - 1;

  // Find first meaningful line (starts with ---, ===, ##, or is frontmatter)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("---") || line.startsWith("===") || line.startsWith("##") || line.startsWith("### Q")) {
      start = i;
      break;
    }
  }

  // Find last meaningful line
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("===END===") || line.startsWith("> **") || line.length > 0 && !line.startsWith("`") && !line.startsWith("Wrote ") && !line.startsWith("Replaced ") && !line.startsWith("Worth ")) {
      end = i;
      break;
    }
  }

  cleaned = lines.slice(start, end + 1).join("\n").trim();
  return cleaned;
}

// ── Stage 1: Extract content + Q&A from photos ──
function extractFromPhotos(
  subject: SubjectConfig,
  images: string[]
): ChapterExtract[] {
  log(`Sending ${images.length} image(s) to Claude CLI for extraction...`);

  const batches: string[][] = [];
  for (let i = 0; i < images.length; i += MAX_IMAGES_PER_BATCH) {
    batches.push(images.slice(i, i + MAX_IMAGES_PER_BATCH));
  }

  let allRawContent = "";

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    if (batches.length > 1) {
      log(`  Batch ${b + 1}/${batches.length} (${batch.length} images)...`);
    }

    const imageList = batch.map((img) => `- ${img}`).join("\n");

    const prompt = `Read each of these image files using the Read tool, then extract ALL content.

IMAGE FILES TO READ:
${imageList}

These are photos from an NCERT question bank book: ${subject.name}
Pages may contain: chapter summaries/notes, diagrams, questions (MCQs), and answers with explanations.
They may be from MULTIPLE classes and chapters, possibly out of order.

After reading ALL images, extract and output in this EXACT format for EACH chapter found:

===CHAPTER <number> | CLASS <class_number> | <chapter_title>===

---CONTENT---
[Extract all chapter notes/summary content here. Include all factual information, key words, definitions, bullet points, diagram descriptions. Preserve structure with ## headings.]
---END CONTENT---

---QUESTIONS---
[Extract ALL questions exactly as they appear, organized by level. Include:
- Level headers (Level 01 Moderate, Level 02 Advanced, Level 03 Previous Years)
- Each question with its number, text, and all options (a, b, c, d)
- Mark the correct answer based on the ANSWERS section
- Include the explanation from the ANSWERS WITH EXPLANATIONS section

Use this format for each question:
## Level 01 | Moderate
Q1. [question text]
(a) option text
(b) option text
(c) option text [CORRECT]
(d) option text
EXPLANATION: [explanation text from the answers section]

Q2. ...
]
---END QUESTIONS---

===END===

CRITICAL RULES:
- Extract questions EXACTLY as they appear in the photos — do NOT create new questions
- Match each question with its answer and explanation from the ANSWERS section
- Mark correct answers with [CORRECT] based on the answers section
- If a chapter has no questions, omit the ---QUESTIONS--- section entirely
- If a chapter has no content/notes, omit the ---CONTENT--- section
- Detect class from page headers (Roman: VI=6, VII=7, VIII=8, IX=9, X=10, XI=11, XII=12)
- Include ALL content — do not skip or summarize anything
- Describe diagrams/flowcharts in [brackets]
- Output ONLY the ===CHAPTER...===END=== blocks. Nothing else.`;

    const result = callClaude(prompt, true);
    allRawContent += "\n" + result;
  }

  // Parse chapter blocks
  const chapters: ChapterExtract[] = [];
  const chapterRegex = /===CHAPTER\s+(\d+)\s*\|\s*CLASS\s+(\d+)\s*\|\s*(.+?)===\n([\s\S]*?)===END===/g;
  let match;

  while ((match = chapterRegex.exec(allRawContent)) !== null) {
    const num = parseInt(match[1], 10);
    const cls = parseInt(match[2], 10);
    const title = match[3].trim();
    const body = match[4];

    if (num === 0) continue;

    // Extract content section
    let content = "";
    const contentMatch = body.match(/---CONTENT---\n([\s\S]*?)---END CONTENT---/);
    if (contentMatch) content = contentMatch[1].trim();

    // Extract questions section
    let questions = "";
    const questionsMatch = body.match(/---QUESTIONS---\n([\s\S]*?)---END QUESTIONS---/);
    if (questionsMatch) questions = questionsMatch[1].trim();

    // Merge if we already have this chapter from another batch
    const existing = chapters.find((ch) => ch.number === num && ch.class === cls);
    if (existing) {
      if (content) existing.content += "\n\n" + content;
      if (questions) existing.questions += "\n\n" + questions;
    } else {
      chapters.push({ number: num, title, class: cls, content, questions });
    }
  }

  chapters.sort((a, b) => a.class - b.class || a.number - b.number);
  return chapters;
}

// ── Stage 2: Convert extracted Q&A to quiz app format ──
function convertToQuizFormat(
  subject: SubjectConfig,
  chKey: string,
  chapter: { number: number; title: string; class: number },
  questionsRaw: string
): string {
  log(`  Converting: Class ${chapter.class}, Ch ${chapter.number}: ${chapter.title}...`);

  const prompt = `Convert these extracted questions into the exact markdown format needed by the quiz app.

Subject: ${subject.name}
Class: ${chapter.class}
Chapter ${chapter.number}: ${chapter.title}

Here are the raw extracted questions with answers and explanations:
---
${questionsRaw}
---

Convert to EXACTLY this markdown format. Start directly with the --- frontmatter (no code fences):

---
subject: "${subject.name}"
class: ${chapter.class}
chapter: ${chapter.number}
title: "${chapter.title}"
---

## Level 01 | Moderate

### Q1. [question text exactly as extracted]
- (a) Option text
- (b) Option text
- **(c) Correct option text** ✓
- (d) Option text
> **Explanation:** [explanation text exactly as extracted]

### Q2. ...

## Level 02 | Advanced

### Q1. ...

## Level 03 | Previous Years

### Q1. ...

RULES:
1. Use ONLY the questions extracted from the photos — do NOT invent new ones
2. The correct answer option must be wrapped in **bold** with ✓ at the end
3. Wrong options are plain: - (a) text
4. Every question must have > **Explanation:** with the extracted explanation
5. If a question has multi-line text or statements, include them all under ### Q heading
6. Keep the exact level groupings (Moderate, Advanced, Previous Years) as extracted
7. If a level has no questions, omit that level section entirely
8. Number questions sequentially within each level (Q1, Q2, Q3...)
9. Output ONLY the markdown. No code fences. No preamble.`;

  return callClaude(prompt, false);
}

// ── Main ────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help") {
    console.log(`
NCERT Quiz Pipeline (uses Claude CLI — no API key needed)

Usage:
  npx tsx scripts/pipeline.ts <subject-id> [--step extract|convert|all]

Flow:
  uploads/<subject-id>/*.jpg
      ↓ extract (Stage 1)
  knowledge/<subject-id>/
      ├── c6-ch01-content.md    (chapter notes/summaries)
      ├── c6-ch01-questions.md  (raw extracted Q&A)
      └── ...
      ↓ convert (Stage 2)
  content/<subject-id>/
      ├── c6-ch01.md            (quiz-ready markdown)
      └── ...

Does NOT generate new questions — extracts only what's in the photos.

Setup:
  1. Add subject to uploads/subjects.json
  2. Drop ALL photos into uploads/<subject-id>/
  3. npx tsx scripts/pipeline.ts <subject-id>
`);
    process.exit(0);
  }

  try {
    execSync("which claude", { encoding: "utf-8" });
  } catch {
    console.error("Error: `claude` CLI not found. Install it first.");
    process.exit(1);
  }

  const subjectId = args[0];
  let step = "all";

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--step" && args[i + 1]) {
      step = args[i + 1];
      i++;
    }
  }

  const subjects = loadSubjects();
  const subject = subjects.find((s) => s.id === subjectId);
  if (!subject) {
    console.error(`Error: Subject "${subjectId}" not found in uploads/subjects.json`);
    console.error(`Available: ${subjects.map((s) => s.id).join(", ")}`);
    process.exit(1);
  }

  const uploadsSubDir = path.join(UPLOADS_DIR, subject.id);
  const knowledgeSubDir = path.join(KNOWLEDGE_DIR, subject.id);
  const contentSubDir = path.join(CONTENT_DIR, subject.id);

  fs.mkdirSync(knowledgeSubDir, { recursive: true });
  fs.mkdirSync(contentSubDir, { recursive: true });

  console.log("─".repeat(50));
  log(`Subject: ${subject.name}`);
  log(`Step: ${step}`);
  console.log("─".repeat(50));

  // ── Stage 1: Extract ──────────────────────────
  if (step === "all" || step === "extract") {
    const images = getImageFiles(uploadsSubDir);

    if (images.length === 0) {
      console.error(`\nNo images found in uploads/${subject.id}/`);
      console.error("Drop your textbook/question bank photos there and re-run.");
      process.exit(1);
    }

    log(`Found ${images.length} image(s) in uploads/${subject.id}/`);

    const chapters = extractFromPhotos(subject, images);

    if (chapters.length === 0) {
      console.error("No chapters could be identified from the images.");
      process.exit(1);
    }

    log(`\nIdentified ${chapters.length} chapter(s):`);
    for (const ch of chapters) {
      const chKey = `c${ch.class}-ch${String(ch.number).padStart(2, "0")}`;

      // Save content (chapter notes/summaries)
      if (ch.content) {
        const contentPath = path.join(knowledgeSubDir, `${chKey}-content.md`);
        fs.writeFileSync(contentPath, ch.content, "utf-8");
        log(`  Class ${ch.class}, Ch ${ch.number}: ${ch.title}`);
        log(`    → knowledge/${subject.id}/${chKey}-content.md (notes)`);
      }

      // Save questions (raw extracted Q&A)
      if (ch.questions) {
        const questionsPath = path.join(knowledgeSubDir, `${chKey}-questions.md`);
        fs.writeFileSync(questionsPath, ch.questions, "utf-8");
        log(`    → knowledge/${subject.id}/${chKey}-questions.md (Q&A)`);
      }

      if (!ch.content && !ch.questions) {
        log(`  Class ${ch.class}, Ch ${ch.number}: ${ch.title} — no content or questions found`);
      }
    }

    // Update subjects.json with discovered chapters
    const updatedSubjects = subjects.map((s) => {
      if (s.id === subjectId) {
        return {
          ...s,
          chapters: chapters.map((ch) => ({
            number: ch.number,
            title: ch.title,
            class: ch.class,
          })),
        };
      }
      return s;
    });
    fs.writeFileSync(SUBJECTS_FILE, JSON.stringify(updatedSubjects, null, 2) + "\n", "utf-8");
    log(`\nUpdated subjects.json with ${chapters.length} chapter(s)`);
  }

  // ── Stage 2: Convert to quiz format ───────────
  if (step === "all" || step === "convert") {
    const questionFiles = fs
      .readdirSync(knowledgeSubDir)
      .filter((f) => f.endsWith("-questions.md"))
      .sort();

    if (questionFiles.length === 0) {
      log("\nNo question files found in knowledge/. Chapters with no questions are skipped.");
      if (step === "convert") {
        console.error("Run with --step extract first, or check that your photos contain questions.");
        process.exit(1);
      }
    } else {
      // Reload subjects.json for chapter metadata
      const freshSubjects = loadSubjects();
      const freshSubject = freshSubjects.find((s) => s.id === subjectId);
      const chapterMeta: Record<string, { number: number; title: string; class: number }> = {};
      if (freshSubject?.chapters) {
        for (const ch of freshSubject.chapters) {
          chapterMeta[`c${ch.class}-ch${String(ch.number).padStart(2, "0")}`] = ch;
        }
      }

      log(`\nConverting ${questionFiles.length} question file(s) to quiz format...`);

      for (const file of questionFiles) {
        const chKey = file.replace("-questions.md", "");
        const questionsRaw = fs.readFileSync(path.join(knowledgeSubDir, file), "utf-8");

        if (!questionsRaw.trim()) {
          log(`  Skipping ${file} (empty)`);
          continue;
        }

        const fileMatch = chKey.match(/c(\d+)-ch(\d+)/);
        let chNum = 0, chClass = 0;
        if (fileMatch) {
          chClass = parseInt(fileMatch[1], 10);
          chNum = parseInt(fileMatch[2], 10);
        }

        const meta = chapterMeta[chKey] || { number: chNum, title: `Chapter ${chNum}`, class: chClass };
        const quiz = convertToQuizFormat(subject, chKey, meta, questionsRaw);

        if (quiz) {
          const cleaned = quiz.replace(/^```\w*\n?/, "").replace(/\n?```$/, "").trim();
          const contentPath = path.join(contentSubDir, `${chKey}.md`);
          fs.writeFileSync(contentPath, cleaned + "\n", "utf-8");
          log(`  Saved → content/${subject.id}/${chKey}.md`);
        }
      }
    }
  }

  console.log("\n" + "─".repeat(50));
  log("Done! Run `npm run dev` to see the updated quizzes.");
}

main();
