"use client";

import { useEffect, useState } from "react";
import type { DiaryEntry } from "./types";

const CACHE = "cinetheque.genres.entries";

/** Les genres TMDB des séries arrivent en anglais : on les ramène aux genres films. */
const ALIAS: Record<string, string> = {
  "Action & Adventure": "Action",
  "Sci-Fi & Fantasy": "Science-Fiction",
  "War & Politics": "Guerre",
  Kids: "Familial",
  Soap: "Drame",
};
export const canonGenre = (g: string) => ALIAS[g] ?? g;

/**
 * Index « clé → genres » pour les titres du journal.
 * Chargé par paquets via /api/tmdb/genres-batch, puis mis en cache dans le navigateur.
 */
export function useEntryGenres(entries: DiaryEntry[], enabled = true) {
  const [index, setIndex] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!enabled) return;
    let cache: Record<string, string[]> = {};
    try {
      cache = JSON.parse(localStorage.getItem(CACHE) ?? "{}");
    } catch {}
    queueMicrotask(() => setIndex(cache));

    const keys = [...new Set(entries.filter((e) => e.tmdbId).map((e) => `${e.mediaType ?? "movie"}-${e.tmdbId}`))];
    const missing = keys.filter((k) => !cache[k]);
    if (!missing.length) return;

    let alive = true;
    (async () => {
      for (let i = 0; i < missing.length && alive; i += 40) {
        const items = missing.slice(i, i + 40).map((k) => {
          const [type, id] = k.split("-");
          return { type, id: Number(id) };
        });
        const res = await fetch("/api/tmdb/genres-batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items }),
        }).catch(() => null);
        if (!res?.ok || !alive) break;
        const { results } = (await res.json()) as { results: Record<string, string[]> };
        cache = { ...cache, ...results };
        setIndex(cache);
        try {
          localStorage.setItem(CACHE, JSON.stringify(cache));
        } catch {}
      }
    })();
    return () => {
      alive = false;
    };
  }, [entries, enabled]);

  return index;
}
