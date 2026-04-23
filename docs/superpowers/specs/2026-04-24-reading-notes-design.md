# Reading Notes (knowledge → blog view)

## Goal

Expose `knowledge/<subject>/c<class>-ch<num>-content.md` as readable per-chapter articles, complementing the quiz flow. Users reach the reading surface from the home page, the quiz setup page, and the results page.

## Data

- Source: `knowledge/<subject>/c<class>-ch<num>-content.md`. Files have no frontmatter. Format: `## Section heading` + `- bullet` lines, optional inline `**bold**`, optional blocks that start with `[` = diagram/figure placeholders.
- Chapter title/class/number come from the **sibling** `content/<subject>/c<class>-ch<num>.md` frontmatter (already used by `content-loader.ts`). If the sibling is missing, the knowledge chapter is skipped.
- Types (new file `src/types/knowledge.ts`):
  ```ts
  type Block =
    | { kind: "bullet"; text: string }
    | { kind: "diagram"; text: string };
  interface Section { heading: string; blocks: Block[] }
  interface KnowledgeChapter {
    number: number;
    title: string;
    class: number;
    sections: Section[];
    readTimeMinutes: number;
  }
  interface KnowledgeSubject {
    id: string;
    name: string;
    chapters: KnowledgeChapter[];
  }
  ```
- Loader (new file `src/lib/knowledge-loader.ts`): server-only. Exports `loadKnowledgeSubject(subjectId)` and `loadAllKnowledgeSubjects()`. Reads file, parses line-by-line, joins with `loadSubject(subjectId)` to get chapter metadata. Read-time = `max(1, ceil(wordCount / 200))`.

## Parser rules

- Lines matching `^## (.+)$` start a new `Section`.
- Lines starting with `- ` → `bullet` block. Text is the remainder (raw; inline `**bold**` handled at render time).
- Lines starting with `[` → `diagram` block. Text is the whole line (brackets kept). A diagram block may span multiple lines until a line ending with `]`; join with single spaces.
- Blank lines and other lines ignored.
- Bullets before any `##` heading go into an implicit leading section with heading `""` (rendered without a heading).

## Routes

- `/read/[subject]/page.tsx` — chapter list for a subject. Server component. Shows each chapter as a card: number, title, read-time, first section heading as teaser.
- `/read/[subject]/[chapter]/page.tsx` — article page. Server component. `chapter` is the chapter number as a string. Both params are `Promise<>` per Next 16.

## Components

- `ArticleRenderer.tsx` (server) — renders `sections` and `blocks`; uses `InlineBold` for inline `**bold**` → `<strong>`.
- `ArticleTOC.tsx` (client) — sticky on desktop, `<details>` on mobile. Uses `IntersectionObserver` to highlight the active section. Takes `{ sections: { id, heading }[] }`. Heading IDs = `slugify(heading)` (lowercase, non-alphanumerics → `-`).
- `InlineBold.tsx` (tiny) — splits text on `**…**` and returns React fragments.
- Previous/next navigation on article page rendered inline in the server page (no separate component needed).

## Entry points (modifications)

- `src/components/SubjectCard.tsx` — wrap the card body in a div (not `<Link>` at root). Add a primary "Start quiz" CTA and a secondary "Read notes" link. Keep the existing visual language.
- `src/app/quiz/setup/SetupClient.tsx` — no change here; the per-chapter "Read" icon is added inside `ChapterSelector`.
- `src/components/ChapterSelector.tsx` — each chapter row gets a small "Read" icon-link to `/read/<subjectId>/<chapterNumber>`, `target="_blank"`. Requires passing `subjectId` as a prop.
- `src/app/quiz/results/page.tsx` — after `ResultsSummary`, if any wrong answers, render a "Review concepts" block listing unique chapters with wrong answers as links to `/read/<subjectId>/<chapterNumber>`.

## Out of scope

Search, bookmarks/"mark as read", per-section practice launches, pipeline changes to add frontmatter to knowledge files.

## Risks / edge cases

- Knowledge file exists but sibling content file doesn't → skip chapter (don't show orphan).
- Section heading duplicates within a chapter → slugify collision; append `-2`, `-3` suffixes.
- Very long diagram blocks → render inside a bordered card with `white-space: pre-wrap` so line breaks survive.
- Empty knowledge file → chapter list still shows the subject, but that chapter card is hidden.
