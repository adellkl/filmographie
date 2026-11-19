import { computeNews, nowPlayingFR } from "@/lib/news-server";
import { tmdbConfigured } from "@/lib/tmdb";

type Body = { watch?: { type: "movie" | "tv"; id: number }[]; series?: number[] };

export async function POST(request: Request) {
  if (!tmdbConfigured()) return Response.json({ error: "TMDB_NOT_CONFIGURED" }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as Body;
  const watch = (body.watch ?? []).filter((w) => (w.type === "movie" || w.type === "tv") && Number.isInteger(w.id));
  const series = (body.series ?? []).filter((id) => Number.isInteger(id));
  const [items, cinema] = await Promise.all([computeNews(watch, series), nowPlayingFR().catch(() => [])]);
  return Response.json({ items, cinema, at: Date.now() });
}
