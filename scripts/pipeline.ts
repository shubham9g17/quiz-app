#!/usr/bin/env npx tsx
/**
 * NCERT Quiz Pipeline (uses Claude CLI — no API key needed)
 *
 * Organise photos by chapter folder, then run:
 *   npx tsx scripts/pipeline.ts <subject-id>
 *
 * Folder structure:
 *   uploads/<subject-id>/
 *     ch01/   ← all pages for chapter 1 (5-7 images)
 *     ch02/   ← all pages for chapter 2
 *     ch03/   ← ...
 *
 * The pipeline will:
 *   1. Read each chapter folder as one batch (no arbitrary splitting)
 *   2. Use `claude` CLI to extract chapter content AND existing Q&A from photos
 *   3. Save per-chapter knowledge to knowledge/<subject-id>/ (content + questions separately)
 *   4. Convert extracted Q&A into the quiz app's markdown format in content/<subject-id>/
 *
 * It does NOT generate new questions — it only extracts what's in the photos.
 * After extraction, processed chapter folders are moved to uploads/<subject-id>/processed/
 * so re-running the pipeline only picks up new chapter folders.
 * All chapter batches run in parallel to minimize total processing time.
 *
 * Options:
 *   --step extract     Only extract from photos into knowledge/
 *   --step convert     Only convert knowledge/ into content/ (quiz format)
 *
 * Requires: `claude` CLI installed and authenticated
 */

import { exec, execSync } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const execAsync = promisify(exec);

// ── Config ──────────────────────────────────────
const ROOT = path.resolve(__dirname, "..");
const UPLOADS_DIR = path.join(ROOT, "uploads");
const KNOWLEDGE_DIR = path.join(ROOT, "knowledge");
const CONTENT_DIR = path.join(ROOT, "content");
const SUBJECTS_FILE = path.join(UPLOADS_DIR, "subjects.json");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const MAX_RETRIES = 3;

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

interface ChapterFolder {
  name: string;   // e.g. "ch01"
  images: string[];
}

function getChapterFolders(subjectDir: string): ChapterFolder[] {
  if (!fs.existsSync(subjectDir)) return [];
  return fs
    .readdirSync(subjectDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "processed")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => {
      const folderPath = path.join(subjectDir, e.name);
      const images = fs
        .readdirSync(folderPath)
        .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
        .sort()
        .map((f) => path.join(folderPath, f));
      return { name: e.name, images };
    })
    .filter((ch) => ch.images.length > 0);
}

function moveToProcessed(chapterName: string, subjectDir: string): void {
  const processedDir = path.join(subjectDir, "processed");
  fs.mkdirSync(processedDir, { recursive: true });
  fs.renameSync(
    path.join(subjectDir, chapterName),
    path.join(processedDir, chapterName)
  );
}

function log(msg: string) {
  const t = new Date().toTimeString().slice(0, 8);
  console.log(`[pipeline ${t}] ${msg}`);
}

async function callClaude(prompt: string, allowRead = false): Promise<string> {
  const toolsFlag = allowRead ? '--allowedTools "Read"' : "--allowedTools ''";
  const cmd = `claude -p ${toolsFlag} --output-format text`;

  // Append strict instruction to suppress any commentary/insights
  const strictPrompt = prompt + "\n\nCRITICAL: Output ONLY what was requested above. No commentary, no insights, no explanations about formatting, no backtick blocks with ★, no preamble, no postamble. Raw output only.";

  // exec() doesn't support `input` for stdin — write to a temp file and redirect
  const tmpFile = path.join(os.tmpdir(), `claude-prompt-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
  fs.writeFileSync(tmpFile, strictPrompt, "utf-8");

  try {
    const { stdout } = await execAsync(`${cmd} < ${tmpFile}`, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
      timeout: 600_000, // 10 min timeout per batch
      cwd: ROOT,
      shell: true,
    } as any) as unknown as { stdout: string; stderr: string };
    return cleanOutput(stdout);
  } catch (err: any) {
    if (err.stdout) return cleanOutput(err.stdout);
    throw new Error(`Claude CLI failed: ${err.message}`);
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

async function callClaudeWithRetry(prompt: string, allowRead: boolean, label: string): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callClaude(prompt, allowRead);
    } catch (err: any) {
      const isLast = attempt === MAX_RETRIES;
      log(`  ${label} — attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}${isLast ? " (giving up)" : " (retrying...)"}`);
      if (isLast) throw err;
      // Exponential backoff: 5s, 10s, 20s
      await new Promise(r => setTimeout(r, 5_000 * attempt));
    }
  }
  throw new Error("unreachable");
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
async function extractFromPhotos(
  subject: SubjectConfig,
  chapterFolders: ChapterFolder[],
  uploadsSubDir: string
): Promise<ChapterExtract[]> {
  const totalImages = chapterFolders.reduce((n, ch) => n + ch.images.length, 0);
  log(`Found ${chapterFolders.length} chapter folder(s) (${totalImages} images total), running in parallel...`);

  chapterFolders.forEach((ch) => {
    log(`  ${ch.name}/: ${ch.images.length} image(s)`);
    for (const img of ch.images) {
      const sizeKb = Math.round(fs.statSync(img).size / 1024);
      log(`    · ${path.basename(img)} (${sizeKb} KB)`);
    }
  });

  const overallStart = Date.now();

  function buildExtractionPrompt(imgs: string[]): string {
    const imageList = imgs.map((img) => `- ${img}`).join("\n");
    return `Read each of these image files using the Read tool, then extract ALL content.

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
  }

  // Run ALL chapter folders in parallel; each folder = one batch (chapter-aligned)
  const settled = await Promise.allSettled(
    chapterFolders.map(async (ch) => {
      const label = ch.name;
      const batchStart = Date.now();

      let result: string;
      try {
        result = await callClaudeWithRetry(buildExtractionPrompt(ch.images), true, label);
      } catch {
        // Retry failed — try single-image fallback for each page in the folder
        log(`  ${label} — all retries failed, attempting 1-image fallback for each page...`);
        const subResults: string[] = [];
        for (const img of ch.images) {
          const imgName = path.basename(img);
          try {
            const sub = await callClaudeWithRetry(buildExtractionPrompt([img]), true, `  ${label}/${imgName}`);
            subResults.push(sub);
          } catch (subErr: any) {
            log(`  ${label}/${imgName} — skipping after all retries: ${subErr.message}`);
          }
        }
        result = subResults.join("\n");
      }

      const elapsed = ((Date.now() - batchStart) / 1000).toFixed(1);
      const chaptersFound = (result.match(/===CHAPTER/g) || []).length;
      log(`  ${label}/ done in ${elapsed}s — ${chaptersFound} chapter block(s) found`);

      // Move this chapter folder to processed immediately after success
      moveToProcessed(ch.name, uploadsSubDir);
      log(`  ${label}/ moved to processed/`);

      return result;
    })
  );

  const totalElapsed = ((Date.now() - overallStart) / 1000).toFixed(1);
  const failed = settled.filter(r => r.status === "rejected").length;
  if (failed > 0) log(`  Warning: ${failed} chapter folder(s) failed completely and were skipped (not moved to processed)`);
  log(`All ${chapterFolders.length} chapter folder(s) completed in ${totalElapsed}s`);

  const allRawContent = settled
    .map(r => r.status === "fulfilled" ? r.value : "")
    .join("\n");

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
async function convertToQuizFormat(
  subject: SubjectConfig,
  chKey: string,
  chapter: { number: number; title: string; class: number },
  questionsRaw: string
): Promise<string> {
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

  const start = Date.now();
  const result = await callClaude(prompt, false);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  log(`  Converted in ${elapsed}s`);
  return result;
}

// ── Main ────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help") {
    console.log(`
NCERT Quiz Pipeline (uses Claude CLI — no API key needed)

Usage:
  npx tsx scripts/pipeline.ts <subject-id> [--step extract|convert|all]

Upload structure (one subfolder per chapter):
  uploads/<subject-id>/
    ch01/   page1.jpg, page2.jpg ... page6.jpg
    ch02/   page1.jpg ... page7.jpg
    ch03/   ...

Flow:
  uploads/<subject-id>/ch01/, ch02/, ...
      ↓ extract (Stage 1, all chapters run in parallel)
  knowledge/<subject-id>/
      ├── c6-ch01-content.md    (chapter notes/summaries)
      ├── c6-ch01-questions.md  (raw extracted Q&A)
      └── ...
      ↓ convert (Stage 2)
  content/<subject-id>/
      ├── c6-ch01.md            (quiz-ready markdown)
      └── ...

Does NOT generate new questions — extracts only what's in the photos.
Processed chapter folders move to uploads/<subject-id>/processed/ automatically.
Failed folders stay in place so they can be retried on the next run.

Setup:
  1. Add subject to uploads/subjects.json
  2. Organise photos by chapter: uploads/<subject-id>/ch01/, ch02/, ...
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
    const chapterFolders = getChapterFolders(uploadsSubDir);

    if (chapterFolders.length === 0) {
      console.error(`\nNo chapter folders found in uploads/${subject.id}/`);
      console.error("Expected structure:");
      console.error(`  uploads/${subject.id}/ch01/  ← page images for chapter 1`);
      console.error(`  uploads/${subject.id}/ch02/  ← page images for chapter 2`);
      process.exit(1);
    }

    log(`\n── Stage 1: Extract (${chapterFolders.length} chapter folders) ──`);

    const chapters = await extractFromPhotos(subject, chapterFolders, uploadsSubDir);

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
    // (chapter folders already moved to processed/ during extraction)
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

      log(`\n── Stage 2: Convert (${questionFiles.length} chapter(s)) ──`);

      for (const file of questionFiles) {
        const chKey = file.replace("-questions.md", "");
        const questionsRaw = fs.readFileSync(path.join(knowledgeSubDir, file), "utf-8");

        if (!questionsRaw.trim()) {
          log(`  Skipping ${file} (empty)`);
          continue;
        }

        const contentPath = path.join(contentSubDir, `${chKey}.md`);
        if (fs.existsSync(contentPath) && fs.readFileSync(contentPath, "utf-8").trim().startsWith("---")) {
          log(`  Skipping ${chKey} — content already exists`);
          continue;
        }

        const fileMatch = chKey.match(/c(\d+)-ch(\d+)/);
        let chNum = 0, chClass = 0;
        if (fileMatch) {
          chClass = parseInt(fileMatch[1], 10);
          chNum = parseInt(fileMatch[2], 10);
        }

        const meta = chapterMeta[chKey] || { number: chNum, title: `Chapter ${chNum}`, class: chClass };
        const quiz = await convertToQuizFormat(subject, chKey, meta, questionsRaw);

        if (quiz) {
          const cleaned = quiz.replace(/^```\w*\n?/, "").replace(/\n?```$/, "").trim();
          fs.writeFileSync(contentPath, cleaned + "\n", "utf-8");
          log(`  Saved → content/${subject.id}/${chKey}.md`);
        }
      }
    }
  }

  console.log("\n" + "─".repeat(50));
  log("Done! Run `npm run dev` to see the updated quizzes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
