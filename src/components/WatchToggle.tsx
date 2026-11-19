"use client";

import { useLibrary } from "@/lib/library";
import type { MediaLite } from "@/lib/types";
import { useView } from "@/lib/view";

export function useWatchToggle() {
  const { watchlist, toggleWatchlist } = useLibrary();
  const has = (m: { id: number; type: string }) => watchlist.some((w) => w.tmdbId === m.id && (w.mediaType ?? "movie") === m.type);
  const toggle = (m: MediaLite) =>
    toggleWatchlist({
      id: `${m.type}-${m.id}`,
      tmdbId: m.id,
      mediaType: m.type,
      title: m.title,
      year: m.year,
      poster: m.poster,
      genres: m.genres,
      addedAt: Date.now(),
    });
  return { has, toggle };
}

/** Petit bouton « + À voir » posé sur une affiche. */
export function WatchToggle({ media }: { media: MediaLite }) {
  const { has, toggle } = useWatchToggle();
  const { readOnly } = useView();
  const on = has(media);
  if (readOnly) return null;
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        toggle(media);
      }}
      aria-pressed={on}
      aria-label={on ? `Retirer ${media.title} de À voir` : `Ajouter ${media.title} à À voir`}
      className={`mono absolute right-2 top-2 z-10 h-7 cursor-pointer rounded-sm px-2 transition-[opacity,background-color,color] duration-150 ${
        on ? "bg-bone text-ink opacity-100" : "bg-canvas/85 text-bone opacity-0 group-hover/card:opacity-100 focus:opacity-100"
      }`}
    >
      {on ? "✓ À voir" : "+ À voir"}
    </button>
  );
}
