// Tâche planifiée (Vercel Cron) : notifie chaque jour les nouveautés du propriétaire.
import { adminConfigured } from "@/lib/admin";
import { pushConfigured, runDailyNews } from "@/lib/push-server";
import { tmdbConfigured } from "@/lib/tmdb";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 });
  if (!pushConfigured() || !adminConfigured() || !tmdbConfigured()) return Response.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  const uid = process.env.NEXT_PUBLIC_PUBLIC_UID;
  if (!uid) return Response.json({ error: "NO_OWNER" }, { status: 503 });
  return Response.json(await runDailyNews(uid));
}
