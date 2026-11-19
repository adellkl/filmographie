"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  browserLocalPersistence,
  GoogleAuthProvider,
  setPersistence,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { firebaseEnabled, getFirebase } from "./firebase";
import type { DiaryEntry, HomeSettings, ListItem, MediaList, WatchlistItem } from "./types";

type Mode = "loading" | "local" | "signed-out" | "cloud" | "public";

export type MediaStatus = { seen: boolean; rating: number | null; watch: boolean; lists: number };

/** Index « déjà vu / à voir / dans des listes » par clé `${type}-${tmdbId}`. */
export function buildStatus(entries: DiaryEntry[], watchlist: WatchlistItem[], lists: MediaList[]) {
  const map = new Map<string, MediaStatus>();
  const get = (k: string) => map.get(k) ?? (map.set(k, { seen: false, rating: null, watch: false, lists: 0 }), map.get(k)!);
  for (const e of entries) {
    if (!e.tmdbId) continue;
    const st = get(`${e.mediaType ?? "movie"}-${e.tmdbId}`);
    st.seen = true;
    if (st.rating == null && e.rating) st.rating = e.rating; // la plus récente
  }
  for (const w of watchlist) if (w.tmdbId) get(`${w.mediaType ?? "movie"}-${w.tmdbId}`).watch = true;
  for (const l of lists) for (const i of l.items) get(`${i.mediaType}-${i.tmdbId}`).lists++;
  return map;
}

export type Library = {
  status: Map<string, MediaStatus>;
  mode: Mode;
  loaded: boolean;
  user: User | null;
  entries: DiaryEntry[];
  watchlist: WatchlistItem[];
  lists: MediaList[];
  settings: HomeSettings;
  saveSettings: (s: HomeSettings) => Promise<void>;
  saveList: (l: MediaList) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  toggleListItem: (listId: string, item: ListItem) => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  saveEntry: (e: DiaryEntry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  saveEntries: (list: DiaryEntry[]) => Promise<number>;
  toggleWatchlist: (item: WatchlistItem) => Promise<void>;
  saveWatchlist: (list: WatchlistItem[]) => Promise<number>;
};

export const LibraryCtx = createContext<Library | null>(null);
const Ctx = LibraryCtx;

const LS_ENTRIES = "cinetheque.entries";
const LS_WATCHLIST = "cinetheque.watchlist";
const LS_LISTS = "cinetheque.lists";
const LS_SETTINGS = "cinetheque.settings";

function readLS<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}
function writeLS<T>(key: string, value: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage plein ou bloqué */
  }
}

/** Cookie de session (30 jours) : mémorise que l'utilisateur est connecté sur ce navigateur. */
export const SESSION_COOKIE = "adelkl_session";
function setSessionCookie(on: boolean) {
  document.cookie = on
    ? `${SESSION_COOKIE}=1; Max-Age=${60 * 60 * 24 * 30}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`
    : `${SESSION_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}
export const hasSessionCookie = () =>
  typeof document !== "undefined" && document.cookie.split("; ").some((c) => c === `${SESSION_COOKIE}=1`);

const byDateDesc = (a: DiaryEntry, b: DiaryEntry) =>
  b.watchedDate.localeCompare(a.watchedDate) || b.createdAt - a.createdAt;

/** Firestore refuse les `undefined` : on les retire. */
const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/** Fusionne sans écraser une note, critique ou affiche déjà présente. */
function merge(prev: DiaryEntry | undefined, next: DiaryEntry): DiaryEntry {
  if (!prev) return next;
  return {
    ...prev,
    ...next,
    tmdbId: next.tmdbId ?? prev.tmdbId,
    poster: next.poster ?? prev.poster,
    rating: next.rating ?? prev.rating,
    review: next.review || prev.review,
  };
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [lists, setLists] = useState<MediaList[]>([]);
  const [settings, setSettings] = useState<HomeSettings>({});
  const entriesRef = useRef(entries);
  const watchlistRef = useRef(watchlist);
  useEffect(() => {
    entriesRef.current = entries;
    watchlistRef.current = watchlist;
  }, [entries, watchlist]);

  // Authentification
  useEffect(() => {
    const fb = getFirebase();
    if (!fb) {
      // Mode local : lecture du localStorage (système externe), hors du rendu initial
      queueMicrotask(() => {
        setEntries(readLS<DiaryEntry>(LS_ENTRIES).sort(byDateDesc));
        setWatchlist(readLS<WatchlistItem>(LS_WATCHLIST));
        setLists(readLS<MediaList>(LS_LISTS));
        try {
          setSettings(JSON.parse(localStorage.getItem(LS_SETTINGS) ?? "{}"));
        } catch {}
        setMode("local");
        setLoaded(true);
      });
      return;
    }
    setPersistence(fb.auth, browserLocalPersistence).catch(() => {});
    return onAuthStateChanged(fb.auth, (u) => {
      setSessionCookie(!!u);
      setUser(u);
      setLoaded(false);
      setMode(u ? "cloud" : "signed-out");
      if (!u) {
        setEntries([]);
        setWatchlist([]);
        setLists([]);
      }
    });
  }, []);

  // Synchronisation temps réel Firestore
  useEffect(() => {
    const fb = getFirebase();
    if (!fb || !user) return;
    const base = `users/${user.uid}`;
    const unsubA = onSnapshot(collection(fb.db, base, "entries"), (snap) => {
      setEntries(snap.docs.map((d) => d.data() as DiaryEntry).sort(byDateDesc));
      setLoaded(true);
    });
    const unsubB = onSnapshot(collection(fb.db, base, "watchlist"), (snap) => {
      setWatchlist(snap.docs.map((d) => d.data() as WatchlistItem).sort((a, b) => b.addedAt - a.addedAt));
    });
    const unsubD = onSnapshot(doc(fb.db, base, "settings", "home"), (snap) => setSettings((snap.data() as HomeSettings) ?? {}));
    const unsubC = onSnapshot(collection(fb.db, base, "lists"), (snap) => {
      setLists(snap.docs.map((d) => d.data() as MediaList).sort((a, b) => b.updatedAt - a.updatedAt));
    });
    return () => {
      unsubA();
      unsubB();
      unsubC();
      unsubD();
    };
  }, [user]);

  const signIn = useCallback(async () => {
    const fb = getFirebase();
    if (!fb) return;
    await signInWithPopup(fb.auth, new GoogleAuthProvider());
  }, []);

  const signOut = useCallback(async () => {
    const fb = getFirebase();
    if (fb) await fbSignOut(fb.auth);
    setSessionCookie(false);
  }, []);

  const local = useCallback(
    (fn: (list: DiaryEntry[]) => DiaryEntry[]) =>
      setEntries((prev) => {
        const next = fn(prev).sort(byDateDesc);
        writeLS(LS_ENTRIES, next);
        return next;
      }),
    [],
  );

  const saveEntries = useCallback(
    async (list: DiaryEntry[]) => {
      const current = new Map(entriesRef.current.map((e) => [e.id, e]));
      const merged = list.map((e) => merge(current.get(e.id), e));
      // Un titre vu quitte « À voir » (comme sur Letterboxd)
      const seen = new Set(merged.filter((e) => e.tmdbId).map((e) => `${e.mediaType ?? "movie"}-${e.tmdbId}`));
      const leaving = watchlistRef.current.filter((w) => w.tmdbId && seen.has(`${w.mediaType ?? "movie"}-${w.tmdbId}`));
      const fb = getFirebase();
      if (fb && user) {
        const ops = [
          ...merged.map((e) => (b: ReturnType<typeof writeBatch>) => b.set(doc(fb.db, "users", user.uid, "entries", e.id), clean(e))),
          ...leaving.map((w) => (b: ReturnType<typeof writeBatch>) => b.delete(doc(fb.db, "users", user.uid, "watchlist", w.id))),
        ];
        for (let i = 0; i < ops.length; i += 450) {
          const batch = writeBatch(fb.db);
          ops.slice(i, i + 450).forEach((op) => op(batch));
          await batch.commit();
        }
      } else {
        local((prev) => {
          const map = new Map(prev.map((e) => [e.id, e]));
          for (const e of merged) map.set(e.id, e);
          return [...map.values()];
        });
        if (leaving.length)
          setWatchlist((prev) => {
            const out = prev.filter((w) => !leaving.some((l) => l.id === w.id));
            writeLS(LS_WATCHLIST, out);
            return out;
          });
      }
      return merged.filter((e) => !current.has(e.id)).length;
    },
    [user, local],
  );

  const saveEntry = useCallback(async (e: DiaryEntry) => void (await saveEntries([e])), [saveEntries]);

  // Nettoyage : un titre déjà vu n'a plus sa place dans « À voir » (une fois les données chargées)
  const cleaned = useRef(false);
  useEffect(() => {
    if (!loaded || cleaned.current || (mode !== "cloud" && mode !== "local") || !watchlist.length) return;
    cleaned.current = true;
    const seen = new Set(entries.filter((e) => e.tmdbId).map((e) => `${e.mediaType ?? "movie"}-${e.tmdbId}`));
    const stale = watchlist.filter((w) => w.tmdbId && seen.has(`${w.mediaType ?? "movie"}-${w.tmdbId}`));
    if (!stale.length) return;
    const fb = getFirebase();
    if (fb && user) {
      const batch = writeBatch(fb.db);
      stale.slice(0, 450).forEach((w) => batch.delete(doc(fb.db, "users", user.uid, "watchlist", w.id)));
      batch.commit().catch(() => (cleaned.current = false));
    } else {
      queueMicrotask(() =>
        setWatchlist((prev) => {
          const out = prev.filter((w) => !stale.some((x) => x.id === w.id));
          writeLS(LS_WATCHLIST, out);
          return out;
        }),
      );
    }
  }, [loaded, mode, entries, watchlist, user]);

  const deleteEntry = useCallback(
    async (id: string) => {
      const fb = getFirebase();
      if (fb && user) await deleteDoc(doc(fb.db, "users", user.uid, "entries", id));
      else local((prev) => prev.filter((e) => e.id !== id));
    },
    [user, local],
  );

  const toggleWatchlist = useCallback(
    async (item: WatchlistItem) => {
      const exists = watchlist.some((w) => w.id === item.id);
      const fb = getFirebase();
      if (fb && user) {
        const ref = doc(fb.db, "users", user.uid, "watchlist", item.id);
        if (exists) await deleteDoc(ref);
        else await setDoc(ref, clean(item));
      } else {
        setWatchlist((prev) => {
          const next = exists ? prev.filter((w) => w.id !== item.id) : [item, ...prev];
          writeLS(LS_WATCHLIST, next);
          return next;
        });
      }
    },
    [watchlist, user],
  );

  const saveWatchlist = useCallback(
    async (list: WatchlistItem[]) => {
      const known = new Set(watchlist.map((w) => w.id));
      const fresh = list.filter((w) => !known.has(w.id));
      const fb = getFirebase();
      if (fb && user) {
        for (let i = 0; i < fresh.length; i += 450) {
          const batch = writeBatch(fb.db);
          for (const w of fresh.slice(i, i + 450)) batch.set(doc(fb.db, "users", user.uid, "watchlist", w.id), clean(w));
          await batch.commit();
        }
      } else {
        setWatchlist((prev) => {
          const next = [...fresh, ...prev];
          writeLS(LS_WATCHLIST, next);
          return next;
        });
      }
      return fresh.length;
    },
    [watchlist, user],
  );

  const saveSettings = useCallback(
    async (next: HomeSettings) => {
      const value = { ...next, updatedAt: Date.now() };
      const fb = getFirebase();
      if (fb && user) await setDoc(doc(fb.db, "users", user.uid, "settings", "home"), clean(value));
      else {
        setSettings(value);
        try {
          localStorage.setItem(LS_SETTINGS, JSON.stringify(value));
        } catch {}
      }
    },
    [user],
  );

  const saveList = useCallback(
    async (l: MediaList) => {
      const next = { ...l, updatedAt: Date.now() };
      const fb = getFirebase();
      if (fb && user) await setDoc(doc(fb.db, "users", user.uid, "lists", l.id), clean(next));
      else
        setLists((prev) => {
          const out = [next, ...prev.filter((x) => x.id !== l.id)];
          writeLS(LS_LISTS, out);
          return out;
        });
    },
    [user],
  );

  const deleteList = useCallback(
    async (id: string) => {
      const fb = getFirebase();
      if (fb && user) await deleteDoc(doc(fb.db, "users", user.uid, "lists", id));
      else
        setLists((prev) => {
          const out = prev.filter((x) => x.id !== id);
          writeLS(LS_LISTS, out);
          return out;
        });
    },
    [user],
  );

  const toggleListItem = useCallback(
    async (listId: string, item: ListItem) => {
      const list = lists.find((l) => l.id === listId);
      if (!list) return;
      const has = list.items.some((i) => i.tmdbId === item.tmdbId && i.mediaType === item.mediaType);
      await saveList({
        ...list,
        items: has
          ? list.items.filter((i) => !(i.tmdbId === item.tmdbId && i.mediaType === item.mediaType))
          : [...list.items, item],
      });
    },
    [lists, saveList],
  );

  const status = useMemo(() => buildStatus(entries, watchlist, lists), [entries, watchlist, lists]);

  const value = useMemo<Library>(
    () => ({
      status,
      mode,
      loaded,
      user,
      entries,
      watchlist,
      lists,
      settings,
      saveSettings,
      saveList,
      deleteList,
      toggleListItem,
      signIn,
      signOut,
      saveEntry,
      deleteEntry,
      saveEntries,
      toggleWatchlist,
      saveWatchlist,
    }),
    [status, mode, loaded, user, entries, watchlist, lists, settings, saveSettings, saveList, deleteList, toggleListItem, signIn, signOut, saveEntry, deleteEntry, saveEntries, toggleWatchlist, saveWatchlist],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLibrary() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLibrary doit être utilisé dans <LibraryProvider>");
  return ctx;
}

export { firebaseEnabled };

/** Statistiques dérivées du journal. */
export function computeStats(entries: DiaryEntry[]) {
  const films = new Map<string, DiaryEntry>();
  for (const e of entries) {
    const k = e.tmdbId ? `t${e.tmdbId}` : `${e.title}|${e.year}`;
    if (!films.has(k)) films.set(k, e); // la plus récente (liste triée)
  }
  const unique = [...films.values()];
  const rated = unique.filter((e) => e.rating);
  const year = String(new Date().getFullYear());
  const dist = Array.from({ length: 10 }, (_, i) => ({
    rating: (i + 1) / 2,
    count: rated.filter((e) => e.rating === (i + 1) / 2).length,
  }));
  const byYear = new Map<string, number>();
  for (const e of entries) {
    const y = e.watchedDate.slice(0, 4);
    byYear.set(y, (byYear.get(y) ?? 0) + 1);
  }
  const decades = new Map<number, number>();
  for (const e of unique) if (e.year) decades.set(Math.floor(e.year / 10) * 10, (decades.get(Math.floor(e.year / 10) * 10) ?? 0) + 1);
  return {
    films: unique.length,
    logs: entries.length,
    thisYear: entries.filter((e) => e.watchedDate.startsWith(year)).length,
    avg: rated.length ? rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length : 0,
    likes: unique.filter((e) => e.liked).length,
    reviews: entries.filter((e) => e.review).length,
    dist,
    byYear: [...byYear.entries()].sort(([a], [b]) => a.localeCompare(b)),
    decades: [...decades.entries()].sort(([a], [b]) => a - b),
    unique,
  };
}
