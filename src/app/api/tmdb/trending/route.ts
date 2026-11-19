import { connection } from "next/server";
import { tmdbConfigured, trending } from "@/lib/tmdb";

export async function GET(request: Request) {
  await connection();
  const t = new URL(request.url).searchParams.get("type");
  const type = t === "movie" || t === "tv" ? t : "all";
  if (!tmdbConfigured()) return Response.json({ error: "TMDB_NOT_CONFIGURED", results: [] }, { status: 503 });
  try {
    return Response.json({ results: await trending(type) });
  } catch (e) {
    return Response.json({ error: String(e), results: [] }, { status: 502 });
  }
}
