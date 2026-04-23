import type { KnowledgeSection } from "@/types/knowledge";
import InlineBold from "./InlineBold";

interface ArticleRendererProps {
  sections: KnowledgeSection[];
}

export default function ArticleRenderer({ sections }: ArticleRendererProps) {
  return (
    <article className="space-y-8">
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-24">
          {section.heading && (
            <h2 className="text-xl sm:text-2xl font-bold text-navy mb-4 leading-snug">
              {section.heading}
            </h2>
          )}
          <div className="space-y-3">
            {section.blocks.map((block, i) => {
              if (block.kind === "bullet") {
                return (
                  <div
                    key={i}
                    className="flex gap-3 text-[15px] leading-relaxed text-slate"
                  >
                    <span
                      aria-hidden
                      className="flex-shrink-0 mt-2.5 w-1.5 h-1.5 rounded-full bg-blue"
                    />
                    <p className="flex-1">
                      <InlineBold text={block.text} />
                    </p>
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-surface p-4 my-2"
                >
                  <div className="pill bg-blue/10 text-blue mb-2 text-[10px] uppercase tracking-wider">
                    Diagram
                  </div>
                  <p className="text-sm text-slate-muted leading-relaxed whitespace-pre-wrap">
                    <InlineBold text={block.text} />
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </article>
  );
}
