import { discover, tmdbConfigured } from "@/lib/tmdb";

const SORTS = ["popularity.desc", "vote_average.desc", "primary_release_date.desc", "first_air_date.desc", "revenue.desc"];

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const type = sp.get("type") === "tv" ? "tv" : "movie";
  const genre = sp.get("genre") ?? "";
  const year = sp.get("year") ?? "";
  const sort = sp.get("sort") ?? "popularity.desc";
  if (!tmdbConfigured()) return Response.json({ error: "TMDB_NOT_CONFIGURED", results: [] }, { status: 503 });
  if ((genre && !/^\d+$/.test(genre)) || (year && !/^\d{4}$/.test(year)) || !SORTS.includes(sort))
    return Response.json({ error: "BAD_PARAMS" }, { status: 400 });
  try {
    return Response.json(await discover(type, { genre, year, sort, page: Math.max(1, Number(sp.get("page")) || 1) }));
  } catch (e) {
    return Response.json({ error: String(e), results: [] }, { status: 502 });
  }
}
