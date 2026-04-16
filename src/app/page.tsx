import { loadAllSubjects } from "@/lib/content-loader";
import SubjectCard from "@/components/SubjectCard";
import HistorySummary from "@/components/HistorySummary";

export default function Home() {
  const subjects = loadAllSubjects();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">NCERT Quiz</h1>
          <p className="text-gray-500 mt-1">
            Practice questions from your textbooks
          </p>
        </div>

        <HistorySummary />

        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-8 mb-4">
          Subjects
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              id={subject.id}
              name={subject.name}
              classNum={subject.class}
              chapterCount={subject.chapters.length}
              questionCount={subject.chapters.reduce(
                (sum, ch) => sum + ch.questions.length,
                0
              )}
            />
          ))}
        </div>

        {subjects.length === 0 && (
          <p className="text-center text-gray-400 mt-8">
            No subjects found. Add markdown files to the content/ directory.
          </p>
        )}
      </div>
    </main>
  );
}
