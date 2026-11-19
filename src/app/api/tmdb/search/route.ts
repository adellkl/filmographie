import { search, tmdbConfigured } from "@/lib/tmdb";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const type = (sp.get("type") ?? "all") as "all" | "movie" | "tv";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  if (!tmdbConfigured()) return Response.json({ error: "TMDB_NOT_CONFIGURED", results: [] }, { status: 503 });
  if (!["all", "movie", "tv"].includes(type)) return Response.json({ error: "BAD_TYPE" }, { status: 400 });
  if (q.length < 1) return Response.json({ results: [], page: 1, totalPages: 0, totalResults: 0 });
  try {
    return Response.json(await search(q, type, page));
  } catch (e) {
    return Response.json({ error: String(e), results: [] }, { status: 502 });
  }
}
