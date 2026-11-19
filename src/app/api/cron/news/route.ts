// Tâche planifiée (Vercel Cron) : notifie chaque jour les nouveautés du propriétaire.
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response("Unauthorized", { status: 401 });
  const { adminConfigured } = await import("@/lib/admin");
  const { pushConfigured, runDailyNews } = await import("@/lib/push-server");
  const { tmdbConfigured } = await import("@/lib/tmdb");
  if (!pushConfigured() || !adminConfigured() || !tmdbConfigured()) return Response.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  const uid = process.env.NEXT_PUBLIC_PUBLIC_UID;
  if (!uid) return Response.json({ error: "NO_OWNER" }, { status: 503 });
  return Response.json(await runDailyNews(uid));
}
