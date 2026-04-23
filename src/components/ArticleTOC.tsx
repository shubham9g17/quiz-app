"use client";

import { useEffect, useState } from "react";

interface ArticleTOCProps {
  items: { id: string; heading: string }[];
}

export default function ArticleTOC({ items }: ArticleTOCProps) {
  const [activeId, setActiveId] = useState<string | null>(
    items[0]?.id ?? null
  );

  useEffect(() => {
    if (items.length === 0) return;
    const elements = items
      .map((it) => document.getElementById(it.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      {
        rootMargin: "-96px 0px -60% 0px",
        threshold: [0, 1],
      }
    );
    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  const list = (
    <ol className="space-y-1.5 text-sm">
      {items.map((it) => {
        const active = it.id === activeId;
        return (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={`block py-1 pl-3 border-l-2 transition-colors ${
                active
                  ? "border-blue text-blue font-semibold"
                  : "border-border text-slate-muted hover:text-navy"
              }`}
            >
              {it.heading}
            </a>
          </li>
        );
      })}
    </ol>
  );

  return (
    <>
      {/* Mobile: collapsible */}
      <details className="lg:hidden card p-4 mb-6">
        <summary className="cursor-pointer text-xs font-semibold text-slate-muted uppercase tracking-wider">
          In this chapter
        </summary>
        <div className="mt-3">{list}</div>
      </details>

      {/* Desktop: sticky sidebar */}
      <nav className="hidden lg:block sticky top-6 self-start">
        <p className="text-xs font-semibold text-slate-muted uppercase tracking-wider mb-3">
          In this chapter
        </p>
        {list}
      </nav>
    </>
  );
}
