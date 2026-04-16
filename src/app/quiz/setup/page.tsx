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
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Subject not found</h1>
          <a href="/" className="text-orange-600 text-sm mt-2 hover:underline">
            Go home
          </a>
        </div>
      </main>
    );
  }

  return <SetupClient subject={subject} />;
}
