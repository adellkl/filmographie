// Genres de plusieurs titres d'un coup (pour regrouper le journal par thème).
import { tmdb, tmdbConfigured } from "@/lib/tmdb";

type Item = { type: "movie" | "tv"; id: number };

export async function POST(request: Request) {
  if (!tmdbConfigured()) return Response.json({ error: "TMDB_NOT_CONFIGURED" }, { status: 503 });
  const { items } = (await request.json()) as { items: Item[] };
  const list = (items ?? []).filter((i) => (i.type === "movie" || i.type === "tv") && Number.isInteger(i.id)).slice(0, 40);
  const results: Record<string, string[]> = {};
  await Promise.all(
    list.map(async (i) => {
      try {
        const d = await tmdb<{ genres: { name: string }[] }>(`/${i.type}/${i.id}`);
        results[`${i.type}-${i.id}`] = d.genres.map((g) => g.name);
      } catch {
        results[`${i.type}-${i.id}`] = [];
      }
    }),
  );
  return Response.json({ results });
}
