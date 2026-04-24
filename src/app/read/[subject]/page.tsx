import Link from "next/link";
import { notFound } from "next/navigation";
import { loadKnowledgeSubject } from "@/lib/knowledge-loader";

interface ReadSubjectPageProps {
  params: Promise<{ subject: string }>;
}

export default async function ReadSubjectPage({
  params,
}: ReadSubjectPageProps) {
  const { subject: subjectId } = await params;
  const subject = loadKnowledgeSubject(subjectId);
  if (!subject) notFound();

  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-border bg-surface-card">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <Link
            href="/"
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
            Back to subjects
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-muted uppercase tracking-wider">
            Reading notes
          </p>
          <h1 className="text-2xl font-bold text-navy mt-1">{subject.name}</h1>
          <p className="text-sm text-slate-muted mt-1">
            {subject.chapters.length} chapters
          </p>
        </div>

        <div className="space-y-3">
          {subject.chapters.map((ch) => {
            const teaser =
              ch.sections.find((s) => s.heading)?.heading ??
              ch.sections[0]?.heading ??
              "";
            return (
              <div key={ch.number} className="card card-hover p-5">
                <div className="flex items-start justify-between gap-4">
                  <Link
                    href={`/read/${subject.id}/${ch.number}`}
                    className="min-w-0 flex-1 block"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="pill bg-surface text-slate-faint border border-border">
                        Ch {ch.number}
                      </span>
                      {ch.class > 0 && (
                        <span className="pill bg-blue/10 text-blue">
                          Class {ch.class}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-navy mb-1">
                      {ch.title}
                    </h2>
                    {teaser && (
                      <p className="text-sm text-slate-muted truncate">
                        {teaser}
                      </p>
                    )}
                  </Link>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xs text-slate-faint">
                      ~{ch.readTimeMinutes} min
                    </span>
                    <Link
                      href={`/quiz/setup?subject=${subject.id}&chapter=${ch.number}`}
                      className="pill bg-blue/10 text-blue hover:bg-blue/20 font-semibold"
                      aria-label={`Quiz chapter ${ch.number}`}
                    >
                      Quiz ▶
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
