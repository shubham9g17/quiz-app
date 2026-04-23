import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSubject } from "@/lib/content-loader";
import ReviseClient from "./ReviseClient";

interface RevisePageProps {
  params: Promise<{ subject: string }>;
  searchParams: Promise<{ ids?: string; chapter?: string }>;
}

export default async function RevisePage({
  params,
  searchParams,
}: RevisePageProps) {
  const { subject: subjectId } = await params;
  const { ids, chapter } = await searchParams;

  const subject = loadSubject(subjectId);
  if (!subject) notFound();

  const restrictIds = ids
    ? ids.split(",").map((s) => s.trim()).filter(Boolean)
    : null;
  const initialChapter = chapter ? Number(chapter) : null;

  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-border bg-surface-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
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
          <div className="pill bg-blue/10 text-blue">Revise mode</div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-muted uppercase tracking-wider">
            Revise concepts
          </p>
          <h1 className="text-2xl font-bold text-navy mt-1">{subject.name}</h1>
          <p className="text-sm text-slate-muted mt-1">
            Browse questions with answers &amp; explanations visible — self-test
            with flashcard mode
          </p>
        </div>

        <ReviseClient
          subject={subject}
          restrictIds={restrictIds}
          initialChapter={initialChapter}
        />
      </div>
    </main>
  );
}
