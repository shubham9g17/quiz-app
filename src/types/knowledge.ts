export type KnowledgeBlock =
  | { kind: "bullet"; text: string }
  | { kind: "diagram"; text: string };

export interface KnowledgeSection {
  id: string;
  heading: string;
  blocks: KnowledgeBlock[];
}

export interface KnowledgeChapter {
  number: number;
  title: string;
  class: number;
  sections: KnowledgeSection[];
  readTimeMinutes: number;
  wordCount: number;
}

export interface KnowledgeSubject {
  id: string;
  name: string;
  chapters: KnowledgeChapter[];
}
