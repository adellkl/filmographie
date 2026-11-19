import { matchMovie, tmdbConfigured } from "@/lib/tmdb";

type Item = { key: string; title: string; year: number | null };

export async function POST(request: Request) {
  if (!tmdbConfigured()) return Response.json({ error: "TMDB_NOT_CONFIGURED" }, { status: 503 });
  const { items } = (await request.json()) as { items: Item[] };
  const results: Record<string, Awaited<ReturnType<typeof matchMovie>>> = {};
  await Promise.all(
    (items ?? []).slice(0, 40).map(async (it) => {
      try {
        results[it.key] = await matchMovie(it.title, it.year);
      } catch {
        results[it.key] = null;
      }
    }),
  );
  return Response.json({ results });
}
