import { loadAllSubjects } from "@/lib/content-loader";
import SetupClient from "./SetupClient";

interface SetupPageProps {
  searchParams: Promise<{ subject?: string }>;
}

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const params = await searchParams;
  const subjectId = params.subject || "";
  const subjects = loadAllSubjects();
  const subject = subjects.find((s) => s.id === subjectId);

  if (!subject) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="text-center card-elevated p-8 max-w-md">
          <h1 className="text-xl font-bold text-navy">Subject not found</h1>
          <a
            href="/"
            className="text-blue text-sm mt-3 inline-block font-semibold hover:text-blue-dark transition-colors"
          >
            Go home
          </a>
        </div>
      </main>
    );
  }

  return <SetupClient subject={subject} />;
}
