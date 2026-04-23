import fs from "fs";
import path from "path";
import { loadSubject, loadAllSubjects } from "@/lib/content-loader";
import type {
  KnowledgeChapter,
  KnowledgeSection,
  KnowledgeSubject,
} from "@/types/knowledge";
import type { Chapter, Subject } from "@/types/quiz";

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");

const KNOWLEDGE_FILENAME_RE = /^c(\d+)-ch(\d+)-content\.md$/;
const WORDS_PER_MINUTE = 200;

function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function parseKnowledgeFile(raw: string): {
  sections: KnowledgeSection[];
  wordCount: number;
} {
  const lines = raw.split("\n");
  const sections: KnowledgeSection[] = [];
  const seenIds = new Map<string, number>();
  let current: KnowledgeSection = { id: "intro", heading: "", blocks: [] };
  let wordCount = 0;

  const pushCurrent = () => {
    if (current.blocks.length > 0 || current.heading) sections.push(current);
  };

  const nextUniqueId = (base: string): string => {
    const count = seenIds.get(base) ?? 0;
    seenIds.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const headingMatch = line.match(/^##\s+(.+?)\s*$/);
    if (headingMatch) {
      pushCurrent();
      const heading = headingMatch[1].trim();
      const baseId = slugify(heading);
      current = { id: nextUniqueId(baseId), heading, blocks: [] };
      wordCount += countWords(heading);
      i++;
      continue;
    }

    const bulletMatch = line.match(/^-\s+(.+)$/);
    if (bulletMatch) {
      const text = bulletMatch[1].trim();
      current.blocks.push({ kind: "bullet", text });
      wordCount += countWords(text);
      i++;
      continue;
    }

    const trimmed = line.trim();
    if (trimmed.startsWith("[")) {
      const chunks: string[] = [trimmed];
      let closed = trimmed.endsWith("]");
      i++;
      while (!closed && i < lines.length) {
        const cl = lines[i].trim();
        if (cl === "") {
          i++;
          continue;
        }
        chunks.push(cl);
        if (cl.endsWith("]")) closed = true;
        i++;
      }
      const text = chunks.join(" ");
      current.blocks.push({ kind: "diagram", text });
      wordCount += countWords(text);
      continue;
    }

    i++;
  }

  pushCurrent();
  return { sections, wordCount };
}

function buildChapter(
  filePath: string,
  meta: Chapter
): KnowledgeChapter | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const { sections, wordCount } = parseKnowledgeFile(raw);
  if (sections.length === 0) return null;

  return {
    number: meta.number,
    title: meta.title,
    class: meta.class,
    sections,
    wordCount,
    readTimeMinutes: Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE)),
  };
}

function toKnowledgeSubject(subject: Subject): KnowledgeSubject | null {
  const subjectDir = path.join(KNOWLEDGE_DIR, subject.id);
  if (!fs.existsSync(subjectDir)) return null;

  const files = fs.readdirSync(subjectDir).filter((f) => KNOWLEDGE_FILENAME_RE.test(f));
  const byKey = new Map<string, string>();
  for (const f of files) {
    const m = f.match(KNOWLEDGE_FILENAME_RE)!;
    const cls = Number(m[1]);
    const num = Number(m[2]);
    byKey.set(`${cls}:${num}`, path.join(subjectDir, f));
  }

  const chapters: KnowledgeChapter[] = [];
  for (const meta of subject.chapters) {
    const filePath = byKey.get(`${meta.class}:${meta.number}`);
    if (!filePath) continue;
    const ch = buildChapter(filePath, meta);
    if (ch) chapters.push(ch);
  }

  if (chapters.length === 0) return null;

  return { id: subject.id, name: subject.name, chapters };
}

export function loadKnowledgeSubject(subjectId: string): KnowledgeSubject | null {
  const subject = loadSubject(subjectId);
  if (!subject) return null;
  return toKnowledgeSubject(subject);
}

export function loadAllKnowledgeSubjects(): KnowledgeSubject[] {
  const subjects = loadAllSubjects();
  const result: KnowledgeSubject[] = [];
  for (const s of subjects) {
    const ks = toKnowledgeSubject(s);
    if (ks) result.push(ks);
  }
  return result;
}
