"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useLibrary } from "./library";
import type { NewsItem } from "./news-server";

export type { NewsItem };
export type Cinema = { id: number; type: "movie"; title: string; poster: string | null; date: string };

const SEEN = "cinetheque.news.seen";
const CACHE = "cinetheque.news.cache";
const TTL = 3 * 3600 * 1000; // 3 h

/* ───── « lu / non lu » (localStorage, partagé entre composants) ───── */
const listeners = new Set<() => void>();
let seenCache: string[] | null = null;
const readSeen = () => {
  if (seenCache) return seenCache;
  try {
    seenCache = JSON.parse(localStorage.getItem(SEEN) ?? "[]");
  } catch {
    seenCache = [];
  }
  return seenCache!;
};
const EMPTY: string[] = [];
export function markNewsSeen(keys: string[]) {
  seenCache = [...new Set([...readSeen(), ...keys])].slice(-500);
  try {
    localStorage.setItem(SEEN, JSON.stringify(seenCache));
  } catch {}
  listeners.forEach((l) => l());
}
const useSeen = () =>
  useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    readSeen,
    () => EMPTY,
  );

/* ───── Données ───── */
type Payload = { items: NewsItem[]; cinema: Cinema[]; at: number };
let memory: Payload | null = null;
let inflight: Promise<Payload | null> | null = null;
const subs = new Set<(p: Payload) => void>();

async function load(body: string, force: boolean): Promise<Payload | null> {
  if (!force && memory && Date.now() - memory.at < TTL) return memory;
  if (!force) {
    try {
      const c = JSON.parse(sessionStorage.getItem(CACHE) ?? "null") as (Payload & { body: string }) | null;
      if (c && c.body === body && Date.now() - c.at < TTL) return (memory = c);
    } catch {}
  }
  inflight ??= fetch("/api/news", { method: "POST", headers: { "content-type": "application/json" }, body })
    .then((r) => (r.ok ? r.json() : null))
    .then((p: Payload | null) => {
      if (p) {
        memory = p;
        subs.forEach((s) => s(p));
        try {
          sessionStorage.setItem(CACHE, JSON.stringify({ ...p, body }));
        } catch {}
      }
      return p;
    })
    .catch(() => null)
    .finally(() => (inflight = null));
  return inflight;
}

/** Nouveautés pour les titres « à voir » et les séries suivies. */
export function useNews() {
  const { watchlist, entries, mode, loaded } = useLibrary();
  const [data, setData] = useState<Payload | null>(memory);
  const [loading, setLoading] = useState(false);
  const seen = useSeen();

  const body = useMemo(() => {
    const watch = watchlist.filter((w) => w.tmdbId).map((w) => ({ type: w.mediaType ?? "movie", id: w.tmdbId! }));
    const series = [...new Set(entries.filter((e) => e.mediaType === "tv" && e.tmdbId).map((e) => e.tmdbId!))];
    return JSON.stringify({ watch, series });
  }, [watchlist, entries]);

  const enabled = loaded && (mode === "cloud" || mode === "local");

  useEffect(() => {
    if (!enabled) return;
    const sub = (p: Payload) => setData(p);
    subs.add(sub);
    let alive = true;
    queueMicrotask(() => alive && setLoading(true));
    load(body, false).then((p) => {
      if (!alive) return;
      if (p) setData(p);
      setLoading(false);
    });
    return () => {
      alive = false;
      subs.delete(sub);
    };
  }, [body, enabled]);

  const refresh = async () => {
    setLoading(true);
    const p = await load(body, true);
    if (p) setData(p);
    setLoading(false);
  };

  const items = data?.items ?? [];
  const unread = items.filter((i) => !seen.includes(i.key));
  return { items, cinema: data?.cinema ?? [], unread, seen, loading, refresh, at: data?.at ?? null };
}

/** Nombre de nouveautés non lues (pastille de l'onglet). */
export function useNewsCount() {
  const { unread } = useNews();
  return unread.length;
}
