import Link from "next/link";
import { notFound } from "next/navigation";
import { loadKnowledgeSubject } from "@/lib/knowledge-loader";
import ArticleRenderer from "@/components/ArticleRenderer";
import ArticleTOC from "@/components/ArticleTOC";

interface ReadChapterPageProps {
  params: Promise<{ subject: string; chapter: string }>;
}

export default async function ReadChapterPage({
  params,
}: ReadChapterPageProps) {
  const { subject: subjectId, chapter: chapterParam } = await params;
  const chapterNumber = Number(chapterParam);
  if (!Number.isFinite(chapterNumber)) notFound();

  const subject = loadKnowledgeSubject(subjectId);
  if (!subject) notFound();

  const index = subject.chapters.findIndex((c) => c.number === chapterNumber);
  if (index === -1) notFound();
  const chapter = subject.chapters[index];
  const prev = index > 0 ? subject.chapters[index - 1] : null;
  const next =
    index < subject.chapters.length - 1 ? subject.chapters[index + 1] : null;

  const tocItems = chapter.sections
    .filter((s) => s.heading)
    .map((s) => ({ id: s.id, heading: s.heading }));

  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-border bg-surface-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <Link
            href={`/read/${subject.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue hover:text-blue-dark transition-colors"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            {subject.name}
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
          <aside className="lg:pt-24">
            <ArticleTOC items={tocItems} />
          </aside>

          <div className="min-w-0">
            <div className="mb-8">
              <p className="text-xs font-semibold text-slate-muted uppercase tracking-wider">
                Chapter {chapter.number}
                {chapter.class > 0 ? ` · Class ${chapter.class}` : ""} · ~
                {chapter.readTimeMinutes} min read
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-navy mt-2 leading-tight tracking-tight">
                {chapter.title}
              </h1>
            </div>

            <ArticleRenderer sections={chapter.sections} />

            <div className="mt-12 pt-6 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
              {prev ? (
                <Link
                  href={`/read/${subject.id}/${prev.number}`}
                  className="card card-hover p-4"
                >
                  <p className="text-xs text-slate-faint mb-1">
                    ← Previous · Ch {prev.number}
                  </p>
                  <p className="text-sm font-semibold text-navy">
                    {prev.title}
                  </p>
                </Link>
              ) : (
                <div />
              )}
              {next ? (
                <Link
                  href={`/read/${subject.id}/${next.number}`}
                  className="card card-hover p-4 sm:text-right"
                >
                  <p className="text-xs text-slate-faint mb-1">
                    Next · Ch {next.number} →
                  </p>
                  <p className="text-sm font-semibold text-navy">
                    {next.title}
                  </p>
                </Link>
              ) : (
                <div />
              )}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href={`/quiz/setup?subject=${subject.id}&chapter=${chapter.number}`}
                className="flex-1 text-center py-3 text-sm btn-primary"
              >
                Practice this chapter
              </Link>
              <Link
                href={`/quiz/setup?subject=${subject.id}`}
                className="flex-1 text-center py-3 text-sm btn-outline"
              >
                Practice full subject
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
