"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap } from "./gsap";

/**
 * Grille paginée : affiche `pageSize` éléments, avec ← → pour naviguer
 * et un lien « Tout voir » vers la page complète.
 */
export function PagedGrid<T>({
  items,
  render,
  keyOf,
  pageSize = 12,
  allHref,
  allLabel = "Tout voir",
  className = "grid grid-cols-3 gap-6 sm:grid-cols-4 lg:grid-cols-6",
}: {
  items: T[];
  render: (item: T) => React.ReactNode;
  keyOf: (item: T) => string;
  pageSize?: number;
  allHref?: string;
  allLabel?: string;
  className?: string;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages - 1);
  const grid = useRef<HTMLDivElement>(null);
  const prevPage = useRef<number | null>(null);
  const shown = items.slice(current * pageSize, current * pageSize + pageSize);

  // Courte transition entre deux pages (pas au premier rendu : l'entrée de section s'en charge)
  useEffect(() => {
    // Uniquement lors d'un vrai changement de page (pas au montage : l'entrée de section s'en charge)
    const prev = prevPage.current;
    prevPage.current = current;
    if (prev === null || prev === current) return;
    if (!grid.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(grid.current.children, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.02, ease: "power2.out" });
  }, [current]);

  const go = (p: number) => setPage(Math.max(0, Math.min(pages - 1, p)));
  const from = current * pageSize + 1;
  const to = Math.min(items.length, from + pageSize - 1);

  return (
    <div>
      <div ref={grid} className={className}>
        {shown.map((it) => (
          <div key={keyOf(it)}>
            {render(it)}
          </div>
        ))}
      </div>

      {(pages > 1 || allHref) && (
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-lift pt-5">
          {pages > 1 && (
            <>
              <div className="flex items-center gap-1" role="group" aria-label="Pagination">
                <button
                  onClick={() => go(current - 1)}
                  disabled={current === 0}
                  className="btn-dark h-9 w-9 px-0 disabled:opacity-30"
                  aria-label="Page précédente"
                >
                  ←
                </button>
                <button
                  onClick={() => go(current + 1)}
                  disabled={current === pages - 1}
                  className="btn-dark h-9 w-9 px-0 disabled:opacity-30"
                  aria-label="Page suivante"
                >
                  →
                </button>
              </div>
              <span className="mono tabular-nums text-granite" aria-live="polite">
                Page {current + 1} / {pages} · {from}–{to} sur {items.length}
              </span>
              {/* Points de page (jusqu'à 10) */}
              {pages <= 10 && (
                <div className="hidden items-center gap-1.5 sm:flex">
                  {Array.from({ length: pages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => go(i)}
                      aria-label={`Page ${i + 1}`}
                      aria-current={i === current}
                      className={`h-1.5 cursor-pointer rounded-full transition-[width,background-color] duration-150 ${
                        i === current ? "w-5 bg-bone" : "w-1.5 bg-ash hover:bg-stone"
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
          {allHref && (
            <Link href={allHref} className="btn-ghost ml-auto h-9 border-x-0 border-t-0 px-1">
              {allLabel} ({items.length}) →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
