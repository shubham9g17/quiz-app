import { loadAllSubjects } from "@/lib/content-loader";
import SubjectCard from "@/components/SubjectCard";
import HistorySummary from "@/components/HistorySummary";

export default function Home() {
  const subjects = loadAllSubjects();

  return (
    <main className="min-h-screen bg-surface">
      {/* Top bar */}
      <header className="border-b border-border bg-surface-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-navy tracking-tight">NCERT Quiz</h1>
            <p className="text-sm text-slate-muted">Practice questions from your textbooks</p>
          </div>
          <div className="pill bg-surface text-slate-muted border border-border">
            UPSC Prep
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <HistorySummary />

        <div className="mt-8">
          <h2 className="text-xs font-semibold text-slate-muted uppercase tracking-wider mb-4">
            Subjects
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                id={subject.id}
                name={subject.name}
                classes={subject.classes}
                chapterCount={subject.chapters.length}
                questionCount={subject.chapters.reduce(
                  (sum, ch) => sum + ch.questions.length,
                  0
                )}
              />
            ))}
          </div>

          {subjects.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-slate-muted">
                No subjects found. Add markdown files to the content/ directory.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
