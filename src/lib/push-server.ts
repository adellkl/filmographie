// Côté serveur : envoi des notifications push (Web Push / VAPID).
import webpush from "web-push";
import { admin } from "./admin";
import { computeNews, type NewsItem } from "./news-server";

export const pushConfigured = () => Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let ready = false;
function init() {
  if (ready) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "https://adel-films-series.vercel.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  ready = true;
}

export type Payload = { title: string; body: string; url?: string; image?: string | null; tag?: string };

/** Envoie à tous les appareils abonnés d'un utilisateur ; supprime les abonnements expirés. */
export async function sendToUser(uid: string, payload: Payload) {
  init();
  const { db } = admin();
  const subs = await db.collection(`users/${uid}/push`).get();
  let sent = 0;
  await Promise.all(
    subs.docs.map(async (d) => {
      try {
        await webpush.sendNotification(d.data().subscription, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await d.ref.delete(); // appareil désabonné
      }
    }),
  );
  return { devices: subs.size, sent };
}

const NOTIFY: Record<NewsItem["kind"], boolean> = { release: true, episode: true, streaming: true, "next-episode": false, upcoming: false };

/** Tâche quotidienne : calcule les nouveautés et notifie celles jamais envoyées. */
export async function runDailyNews(uid: string) {
  const { db } = admin();
  const [watchSnap, entriesSnap, metaRef] = await Promise.all([
    db.collection(`users/${uid}/watchlist`).get(),
    db.collection(`users/${uid}/entries`).get(),
    Promise.resolve(db.doc(`users/${uid}/meta/notified`)),
  ]);
  const watch = watchSnap.docs
    .map((d) => d.data())
    .filter((w) => w.tmdbId)
    .map((w) => ({ type: (w.mediaType ?? "movie") as "movie" | "tv", id: Number(w.tmdbId) }));
  const series = [
    ...new Set(
      entriesSnap.docs
        .map((d) => d.data())
        .filter((e) => e.mediaType === "tv" && e.tmdbId)
        .map((e) => Number(e.tmdbId)),
    ),
  ];
  const items = (await computeNews(watch, series)).filter((i) => NOTIFY[i.kind]);
  const already = new Set<string>(((await metaRef.get()).data()?.keys as string[]) ?? []);
  const fresh = items.filter((i) => !already.has(i.key));
  if (!fresh.length) return { items: items.length, fresh: 0, sent: 0 };

  // Une notification par titre (au plus 4), puis un récapitulatif s'il en reste
  let sent = 0;
  for (const n of fresh.slice(0, 4)) {
    const r = await sendToUser(uid, {
      title: n.title,
      body: n.detail,
      url: `/${n.type === "tv" ? "serie" : "film"}/${n.id}`,
      image: n.poster,
      tag: n.key,
    });
    sent += r.sent;
  }
  if (fresh.length > 4)
    sent += (await sendToUser(uid, { title: "Nouveautés", body: `+${fresh.length - 4} autres titres à découvrir`, url: "/nouveautes", tag: "digest" })).sent;

  await metaRef.set({ keys: [...already, ...fresh.map((i) => i.key)].slice(-1000), at: Date.now() }, { merge: true });
  return { items: items.length, fresh: fresh.length, sent };
}
