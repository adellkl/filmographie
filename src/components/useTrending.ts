"use client";
import { useEffect, useState } from "react";
import type { MediaLite } from "@/lib/types";

export function useTrending(type: "all" | "movie" | "tv" = "all") {
  const [data, setData] = useState<{ results: MediaLite[]; configured: boolean } | null>(null);
  useEffect(() => {
    fetch(`/api/tmdb/trending?type=${type}`)
      .then(async (r) => ({ ...(await r.json()), configured: r.status !== 503 }))
      .then((d) => setData({ results: d.results ?? [], configured: d.configured }))
      .catch(() => setData({ results: [], configured: true }));
  }, [type]);
  return data;
}

export const openSearch = () => window.dispatchEvent(new Event("open-search"));
