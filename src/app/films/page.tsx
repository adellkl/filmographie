"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { computeStats, useLibrary } from "@/lib/library";
import { usePageMotion } from "@/components/motion";
import { Poster } from "@/components/Poster";
import { Chip, PageHead } from "@/components/Section";

const sorts = { recent: "Récents", rating: "Note", year: "Sortie", title: "Titre" } as const;
type Sort = keyof typeof sorts;

export default function FilmsPage() {
  const { entries } = useLibrary();
  const { unique } = useMemo(() => computeStats(entries), [entries]);
  const [sort, setSort] = useState<Sort>("recent");
  const [q, setQ] = useState("");
  const [onlyLiked, setOnlyLiked] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [kind, setKind] = useState<"all" | "movie" | "tv">("all");
  const root = useRef<HTMLDivElement>(null);

  // Filtres passés par l'URL : ?liked=1, ?min=5, ?sort=rating (liens « Tout voir » de l'accueil)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const min = Number(sp.get("min"));
    const s = sp.get("sort") as Sort | null;
    queueMicrotask(() => {
      if (sp.get("liked") === "1") setOnlyLiked(true);
      if ([4, 4.5, 5].includes(min)) setMinRating(min);
      if (s && s in sorts) setSort(s);
      const t = sp.get("type");
      if (t === "movie" || t === "tv") setKind(t);
    });
  }, []);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = unique.filter(
      (e) =>
        (!term || e.title.toLowerCase().includes(term)) &&
        (!onlyLiked || e.liked) &&
        (!minRating || (e.rating ?? 0) >= minRating) &&
        (kind === "all" || (e.mediaType ?? "movie") === kind),
    );
    const cmp: Record<Sort, (a: (typeof out)[0], b: (typeof out)[0]) => number> = {
      recent: (a, b) => b.watchedDate.localeCompare(a.watchedDate),
      rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
      year: (a, b) => (b.year ?? 0) - (a.year ?? 0),
      title: (a, b) => a.title.localeCompare(b.title, "fr"),
    };
    return out.sort(cmp[sort]);
  }, [unique, q, onlyLiked, minRating, sort, kind]);

  const counts = useMemo(
    () => ({
      movie: unique.filter((e) => (e.mediaType ?? "movie") === "movie").length,
      tv: unique.filter((e) => e.mediaType === "tv").length,
    }),
    [unique],
  );

  usePageMotion(root, [list.length]);

  return (
    <div ref={root} className="shell">
      <PageHead eyebrow="Vus" title={`${unique.length} titres.`} />

      <div className="mt-10 flex flex-col gap-4 border-y border-lift py-4 sm:flex-row sm:flex-wrap sm:items-center" data-in>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer par titre…" className="input sm:max-w-xs" aria-label="Filtrer par titre" />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Type">
          {(
            [
              ["all", "Tout", unique.length],
              ["movie", "Films", counts.movie],
              ["tv", "Séries", counts.tv],
            ] as const
          ).map(([k, l, n]) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
              {l} <span className="tabular-nums opacity-50">{n}</span>
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(sorts) as Sort[]).map((k) => (
            <Chip key={k} active={sort === k} onClick={() => setSort(k)}>
              {sorts[k]}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[0, 4, 4.5, 5].map((r) => (
            <Chip key={r} active={minRating === r} onClick={() => setMinRating(r)}>
              {r ? `${r}★+` : "Toutes notes"}
            </Chip>
          ))}
          <Chip active={onlyLiked} onClick={() => setOnlyLiked((v) => !v)}>
            ♥
          </Chip>
        </div>
        <span className="mono text-granite sm:ml-auto">{list.length} résultats</span>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {list.map((e) => (
          <Poster key={e.id} {...e} caption badge />
        ))}
      </div>
    </div>
  );
}
