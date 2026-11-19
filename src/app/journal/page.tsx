"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useLibrary } from "@/lib/library";
import { mediaHref, type DiaryEntry } from "@/lib/types";
import { usePageMotion } from "@/components/motion";
import { Stars } from "@/components/Stars";
import { LogDialog } from "@/components/LogDialog";
import { Chip, Empty, PageHead } from "@/components/Section";
import { useHref, useView } from "@/lib/view";

export default function JournalPage() {
  const { entries } = useLibrary();
  const { readOnly } = useView();
  const toHref = useHref();
  const [year, setYear] = useState("all");
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const years = useMemo(() => [...new Set(entries.map((e) => e.watchedDate.slice(0, 4)))].sort().reverse(), [entries]);
  const filtered = year === "all" ? entries : entries.filter((e) => e.watchedDate.startsWith(year));
  const months = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const e of filtered) map.set(e.watchedDate.slice(0, 7), [...(map.get(e.watchedDate.slice(0, 7)) ?? []), e]);
    return [...map.entries()];
  }, [filtered]);

  usePageMotion(root, [year, entries.length]);

  return (
    <div ref={root} className="shell">
      <PageHead eyebrow="Journal" title="Chaque séance, datée.">
        <div className="flex flex-wrap gap-2">
          {["all", ...years].map((y) => (
            <Chip key={y} active={year === y} onClick={() => setYear(y)}>
              {y === "all" ? "Tout" : y}
            </Chip>
          ))}
        </div>
      </PageHead>

      {!entries.length && (
        <div className="mt-12">
          <Empty title="Aucune séance pour l'instant.">
            {!readOnly && (
              <Link href="/import" className="btn-dark">
                Importer depuis Letterboxd →
              </Link>
            )}
          </Empty>
        </div>
      )}

      <div className="mt-16 flex flex-col gap-16">
        {months.map(([month, list]) => (
          <section key={month}>
            <div className="sticky top-16 z-10 flex items-baseline justify-between bg-canvas py-4">
              <h2 className="text-heading capitalize text-bone">
                {new Date(month + "-15").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
              </h2>
              <span className="label">{list.length}</span>
            </div>
            <ul className="divide-y divide-lift border-y border-lift">
              {list.map((e) => {
                const href = toHref(mediaHref(e.mediaType, e.tmdbId));
                return (
                  <li key={e.id} className="grid grid-cols-[40px_40px_1fr_auto] items-center gap-4 py-3 sm:grid-cols-[64px_44px_1fr_120px_60px_auto]">
                    <span className="text-heading tabular-nums text-bone">{e.watchedDate.slice(8, 10)}</span>
                    <span className="h-14 w-10 overflow-hidden rounded-sm bg-lift sm:w-11">
                      {e.poster && <img src={e.poster} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    </span>
                    <div className="min-w-0">
                      {href ? (
                        <Link href={href} className="block truncate text-body text-bone transition-colors duration-150 hover:text-chalk">
                          {e.title}
                        </Link>
                      ) : (
                        <span className="block truncate text-body text-bone">{e.title}</span>
                      )}
                      <span className="mono mt-1 block text-granite">
                        {e.year}
                        {e.mediaType === "tv" && " · série"}
                        {e.review && " · critique"}
                      </span>
                      <Stars value={e.rating} className="mt-1 block text-body-sm text-stone sm:hidden" />
                    </div>
                    <Stars value={e.rating} className="hidden text-body text-stone sm:block" />
                    <span className="mono hidden gap-2 text-granite sm:flex">
                      {e.liked && <span title="Coup de cœur">♥</span>}
                      {e.rewatch && <span title="Revu">↻</span>}
                    </span>
                    {readOnly ? (
                      <span />
                    ) : (
                      <button onClick={() => setEditing(e)} className="mono cursor-pointer text-granite transition-colors duration-150 hover:text-bone" aria-label={`Modifier ${e.title}`}>
                        Modifier
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {editing && <LogDialog key={editing.id} film={editing} entry={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
