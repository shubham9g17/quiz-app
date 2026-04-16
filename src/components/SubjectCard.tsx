import Link from "next/link";

interface SubjectCardProps {
  id: string;
  name: string;
  classNum: number;
  chapterCount: number;
  questionCount: number;
}

export default function SubjectCard({
  id,
  name,
  classNum,
  chapterCount,
  questionCount,
}: SubjectCardProps) {
  return (
    <Link href={`/quiz/setup?subject=${id}`}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-orange-300 transition-all cursor-pointer">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded-full">
            Class {classNum}
          </span>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">{name}</h2>
        <div className="flex gap-4 text-sm text-gray-500">
          <span>{chapterCount} chapters</span>
          <span>{questionCount} questions</span>
        </div>
      </div>
    </Link>
  );
}
