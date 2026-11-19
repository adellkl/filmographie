import { details, tmdbConfigured } from "@/lib/tmdb";

export async function GET(_req: Request, ctx: RouteContext<"/api/tmdb/[type]/[id]">) {
  const { type, id } = await ctx.params;
  if ((type !== "movie" && type !== "tv") || !/^\d+$/.test(id)) return Response.json({ error: "BAD_PARAMS" }, { status: 400 });
  if (!tmdbConfigured()) return Response.json({ error: "TMDB_NOT_CONFIGURED" }, { status: 503 });
  try {
    return Response.json(await details(type, id));
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
