"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, onSnapshot, query, where } from "firebase/firestore";
import { getFirebase } from "./firebase";
import { buildStatus, LibraryCtx, type Library } from "./library";
import { ViewProvider } from "./view";
import type { DiaryEntry, MediaList, WatchlistItem } from "./types";

export type PublicProfile = { uid: string; handle: string; displayName: string; photoURL: string | null };

/** Profil toujours public, configuré dans .env (NEXT_PUBLIC_PUBLIC_*). */
const FIXED = {
  uid: process.env.NEXT_PUBLIC_PUBLIC_UID ?? "",
  handle: (process.env.NEXT_PUBLIC_PUBLIC_HANDLE ?? "").toLowerCase(),
  name: process.env.NEXT_PUBLIC_PUBLIC_NAME ?? "",
};

const readOnly = async () => {
  throw new Error("Profil public en lecture seule");
};

/**
 * Charge en lecture seule les données d'un profil public (publicProfiles/{uid} + users/{uid}/…)
 * et les expose avec la même forme que la bibliothèque privée.
 */
export function PublicLibraryProvider({
  handle,
  children,
  fallback,
  prefixLinks = true,
}: {
  handle: string;
  children: React.ReactNode;
  /** Affiché si le profil n'est pas public (à la place du message par défaut) */
  fallback?: React.ReactNode;
  /** Préfixer les liens par /u/[handle] (false quand on sert le profil à la racine du site) */
  prefixLinks?: boolean;
}) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "unavailable">("loading");
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [lists, setLists] = useState<MediaList[]>([]);

  useEffect(() => {
    const fb = getFirebase();
    if (!fb) {
      queueMicrotask(() => setState("unavailable"));
      return;
    }
    let alive = true;
    const unsubs: (() => void)[] = [];
    const resolve = async (): Promise<PublicProfile | null> => {
      if (FIXED.uid && handle.toLowerCase() === FIXED.handle)
        return { uid: FIXED.uid, handle: FIXED.handle, displayName: FIXED.name || FIXED.handle, photoURL: null };
      const snap = await getDocs(query(collection(fb.db, "publicProfiles"), where("handle", "==", handle.toLowerCase()), limit(1)));
      const d = snap.docs[0];
      return d ? { uid: d.id, ...(d.data() as Omit<PublicProfile, "uid">) } : null;
    };
    resolve()
      .then((p) => {
        if (!alive) return;
        if (!p) return setState("missing");
        setProfile(p);
        const base = `users/${p.uid}`;
        const fail = () => setState("missing"); // profil repassé en privé
        unsubs.push(
          onSnapshot(
            collection(fb.db, base, "entries"),
            (s) => {
              setEntries(
                s.docs.map((x) => x.data() as DiaryEntry).sort((a, b) => b.watchedDate.localeCompare(a.watchedDate) || b.createdAt - a.createdAt),
              );
              setState("ok");
            },
            fail,
          ),
          onSnapshot(collection(fb.db, base, "watchlist"), (s) => setWatchlist(s.docs.map((x) => x.data() as WatchlistItem).sort((a, b) => b.addedAt - a.addedAt)), fail),
          onSnapshot(collection(fb.db, base, "lists"), (s) => setLists(s.docs.map((x) => x.data() as MediaList).sort((a, b) => b.updatedAt - a.updatedAt)), fail),
        );
      })
      .catch(() => alive && setState("missing"));
    return () => {
      alive = false;
      unsubs.forEach((u) => u());
    };
  }, [handle]);

  const value = useMemo<Library>(
    () => ({
      status: buildStatus(entries, watchlist, lists),
      mode: "public",
      loaded: state === "ok",
      user: null,
      entries,
      watchlist,
      lists,
      saveList: readOnly,
      deleteList: readOnly,
      toggleListItem: readOnly,
      signIn: readOnly,
      signOut: readOnly,
      saveEntry: readOnly,
      deleteEntry: readOnly,
      saveEntries: readOnly,
      toggleWatchlist: readOnly,
      saveWatchlist: readOnly,
    }),
    [state, entries, watchlist, lists],
  );

  const view = useMemo(
    () => ({
      base: prefixLinks ? `/u/${handle}` : "",
      readOnly: true,
      owner: profile ? { handle: profile.handle, name: profile.displayName || profile.handle, photo: profile.photoURL } : { handle, name: handle, photo: null },
    }),
    [handle, profile, prefixLinks],
  );

  if (state === "loading")
    return (
      <div className="shell py-32">
        <span className="label flex items-center gap-2">
          <span className="pulse" /> Chargement du profil @{handle}…
        </span>
      </div>
    );
  if (state !== "ok" && fallback) return <>{fallback}</>;
  if (state !== "ok")
    return (
      <section className="shell py-32">
        <span className="label">Profil</span>
        <h1 className="mt-6 text-[44px] leading-none tracking-[-0.04em] sm:text-display">@{handle} n&apos;est pas public.</h1>
        <p className="mt-6 max-w-[460px] text-body text-granite">
          {state === "unavailable" ? "Firebase n'est pas configuré sur ce serveur." : "Ce profil n'existe pas ou son propriétaire l'a rendu privé."}
        </p>
      </section>
    );

  return (
    <ViewProvider value={view}>
      <LibraryCtx.Provider value={value}>{children}</LibraryCtx.Provider>
    </ViewProvider>
  );
}
