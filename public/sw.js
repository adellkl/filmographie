/* Service worker — Adel et ses films/séries
   - pages : réseau d'abord, cache en secours (hors-ligne)
   - fichiers statiques Next : cache d'abord
   - affiches TMDB / Letterboxd : cache, rafraîchi en arrière-plan
   - notifications push + clic sur notification */
const VERSION = "v1";
const PAGES = `pages-${VERSION}`;
const STATIC = `static-${VERSION}`;
const IMAGES = `images-${VERSION}`;
const MAX_IMAGES = 400;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.addAll(["/"])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [PAGES, STATIC, IMAGES];
      for (const k of await caches.keys()) if (!keep.includes(k)) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Pages : réseau d'abord
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(PAGES);
          cache.put(req, res.clone());
          return res;
        } catch {
          return (await caches.match(req)) || (await caches.match("/")) || Response.error();
        }
      })(),
    );
    return;
  }

  // Fichiers statiques versionnés de Next
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(STATIC).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Affiches et images
  if (url.hostname === "image.tmdb.org" || url.hostname.endsWith("ltrbxd.com")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGES);
        const hit = await cache.match(req);
        const fresh = fetch(req)
          .then((res) => {
            cache.put(req, res.clone());
            trim(IMAGES, MAX_IMAGES);
            return res;
          })
          .catch(() => hit);
        return hit || fresh;
      })(),
    );
  }
});

/* ───────── Notifications ───────── */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Adel et ses films/séries", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Nouveauté";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: data.icon || "/icons/192",
      badge: "/icons/192",
      image: data.image,
      tag: data.tag,
      data: { url: data.url || "/nouveautes" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        if ("focus" in w) {
          await w.focus();
          if ("navigate" in w) await w.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
