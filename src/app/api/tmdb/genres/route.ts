import { genres, tmdbConfigured } from "@/lib/tmdb";

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type") === "tv" ? "tv" : "movie";
  if (!tmdbConfigured()) return Response.json({ error: "TMDB_NOT_CONFIGURED", genres: [] }, { status: 503 });
  try {
    return Response.json({ genres: await genres(type) });
  } catch (e) {
    return Response.json({ error: String(e), genres: [] }, { status: 502 });
  }
}
