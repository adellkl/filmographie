"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLibrary } from "@/lib/library";
import type { WatchlistItem } from "@/lib/types";
import { usePageMotion } from "@/components/motion";
import { Poster } from "@/components/Poster";
import { Chip, Empty, PageHead } from "@/components/Section";
import { openSearch } from "@/components/useTrending";
import { useView } from "@/lib/view";

const GENRE_CACHE = "cinetheque.genres";

/** Les genres TMDB des séries arrivent en anglais : on les ramène aux genres films. */
const GENRE_ALIAS: Record<string, string> = {
  "Action & Adventure": "Action",
  "Sci-Fi & Fantasy": "Science-Fiction",
  "War & Politics": "Guerre",
  Kids: "Familial",
  Soap: "Drame",
  Reality: "Documentaire",
  News: "Documentaire",
  Talk: "Documentaire",
};
const canon = (g: string) => GENRE_ALIAS[g] ?? g;

/** Complète les genres manquants (imports Letterboxd) via TMDB, mis en cache dans le navigateur. */
function useGenres(items: WatchlistItem[]) {
  const [cache, setCache] = useState<Record<string, string[]>>({});
  useEffect(() => {
    let stored: Record<string, string[]> = {};
    try {
      stored = JSON.parse(localStorage.getItem(GENRE_CACHE) ?? "{}");
    } catch {}
    queueMicrotask(() => setCache(stored));
    const missing = items.filter((w) => w.tmdbId && !w.genres?.length && !stored[w.id]).slice(0, 60);
    let alive = true;
    (async () => {
      for (let i = 0; i < missing.length && alive; i += 6) {
        const batch = await Promise.all(
          missing.slice(i, i + 6).map((w) =>
            fetch(`/api/tmdb/${w.mediaType ?? "movie"}/${w.tmdbId}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((d) => [w.id, (d?.genres as string[]) ?? []] as const)
              .catch(() => [w.id, []] as const),
          ),
        );
        if (!alive) return;
        stored = { ...stored, ...Object.fromEntries(batch) };
        setCache(stored);
        try {
          localStorage.setItem(GENRE_CACHE, JSON.stringify(stored));
        } catch {}
      }
    })();
    return () => {
      alive = false;
    };
  }, [items]);
  return (w: WatchlistItem) => (w.genres?.length ? w.genres : cache[w.id]) ?? [];
}

export default function WatchlistPage() {
  const { watchlist, toggleWatchlist } = useLibrary();
  const { readOnly } = useView();
  const [type, setType] = useState<"all" | "movie" | "tv">("all");
  const [view, setView] = useState<"themes" | "grid">("themes");
  const [focus, setFocus] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const genresOf = useGenres(watchlist);
  usePageMotion(root, [view, watchlist.length]);

  const items = watchlist.filter((w) => type === "all" || (w.mediaType ?? "movie") === type);

  const groups = useMemo(() => {
    const map = new Map<string, WatchlistItem[]>();
    for (const w of items) {
      const g = genresOf(w).map(canon)[0] ?? "Sans genre";
      map.set(g, [...(map.get(g) ?? []), w]);
    }
    return [...map.entries()].sort((a, b) => (a[0] === "Sans genre" ? 1 : b[0] === "Sans genre" ? -1 : b[1].length - a[1].length));
  }, [items, genresOf]);

  const card = (w: WatchlistItem) => (
    <div key={w.id} className="group/item relative">
      {!readOnly && <button
        onClick={() => toggleWatchlist(w)}
        className="mono absolute right-2 top-2 z-10 h-7 cursor-pointer rounded-sm bg-canvas/85 px-2 text-bone opacity-0 transition-opacity duration-150 group-hover/item:opacity-100 focus:opacity-100"
        aria-label={`Retirer ${w.title}`}
      >
        Retirer
      </button>}
      <Poster tmdbId={w.tmdbId} mediaType={w.mediaType} title={w.title} year={w.year} poster={w.poster} caption badge />
    </div>
  );

  return (
    <div ref={root} className="shell">
      <PageHead eyebrow="À voir" title={watchlist.length ? `${watchlist.length} en attente.` : "Rien en attente."}>
        <div className="flex flex-wrap gap-2">
          <Chip active={view === "themes"} onClick={() => setView("themes")}>
            Par thème
          </Chip>
          <Chip active={view === "grid"} onClick={() => setView("grid")}>
            Tout
          </Chip>
        </div>
      </PageHead>

      <div className="mt-10 flex flex-wrap gap-2" data-in>
        {(
          [
            ["all", "Films & séries"],
            ["movie", "Films"],
            ["tv", "Séries"],
          ] as const
        ).map(([k, l]) => (
          <Chip key={k} active={type === k} onClick={() => setType(k)}>
            {l}
          </Chip>
        ))}
      </div>

      {!items.length && (
        <div className="mt-10">
          <Empty title={readOnly ? "Rien à voir pour l'instant." : "Ta liste à voir est vide."}>
            {!readOnly && (
              <button onClick={openSearch} className="btn-dark">
                Chercher un film →
              </button>
            )}
          </Empty>
        </div>
      )}

      {view === "themes" ? (
        <>
          {groups.length > 1 && (
            <nav className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" aria-label="Thèmes">
              {groups.map(([g, list]) => (
                <Chip key={g} active={focus === g} onClick={() => setFocus(focus === g ? null : g)}>
                  {g}
                  <span className="tabular-nums opacity-50">{list.length}</span>
                </Chip>
              ))}
            </nav>
          )}
          <div className="mt-14 flex flex-col gap-24">
            {groups
              .filter(([g]) => !focus || focus === g)
              .map(([g, list]) => (
                <section key={g}>
                  <div className="mb-6 flex items-baseline justify-between border-b border-lift pb-4">
                    <h2 className="text-heading text-bone">{g}</h2>
                    <span className="label">{list.length}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">{list.map(card)}</div>
                </section>
              ))}
          </div>
        </>
      ) : (
        <div className="mt-10 grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">{items.map(card)}</div>
      )}
    </div>
  );
}
