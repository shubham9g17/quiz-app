import Link from "next/link";

interface SubjectCardProps {
  id: string;
  name: string;
  classes: number[];
  chapterCount: number;
  questionCount: number;
}

function formatClasses(classes: number[]): string {
  if (classes.length === 0) return "";
  if (classes.length === 1) return `Class ${classes[0]}`;
  const min = classes[0];
  const max = classes[classes.length - 1];
  if (max - min + 1 === classes.length) return `Class ${min}–${max}`;
  return `Class ${classes.join(", ")}`;
}

export default function SubjectCard({
  id,
  name,
  classes,
  chapterCount,
  questionCount,
}: SubjectCardProps) {
  return (
    <div className="card card-hover p-5 flex flex-col">
      {classes.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <span className="pill bg-blue/10 text-blue">
            {formatClasses(classes)}
          </span>
        </div>
      )}
      <h2 className="text-base font-bold text-navy mb-1.5">{name}</h2>
      <div className="flex gap-4 text-sm text-slate-muted">
        <span className="flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
          {chapterCount} chapters
        </span>
        <span className="flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
          {questionCount} questions
        </span>
      </div>
      <div className="flex gap-2 mt-4">
        <Link
          href={`/quiz/setup?subject=${id}`}
          className="flex-1 text-center py-2 text-sm btn-primary"
        >
          Start quiz
        </Link>
        <Link
          href={`/read/${id}`}
          className="flex-1 text-center py-2 text-sm btn-outline"
        >
          Read notes
        </Link>
      </div>
    </div>
  );
}
