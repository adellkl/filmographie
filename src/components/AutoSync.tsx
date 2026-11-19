"use client";

import { useEffect, useRef } from "react";
import { useLibrary } from "@/lib/library";
import type { DiaryEntry } from "@/lib/types";

/** Champs venant de Letterboxd : on n'écrit que si l'un d'eux a changé. */
const sig = (e: DiaryEntry) => [e.rating, e.liked, e.rewatch, e.review, e.watchedDate, e.title].join("|");

export const LETTERBOXD_USER = process.env.NEXT_PUBLIC_LETTERBOXD_USER || "adelkl";

const EVERY = 15 * 60 * 1000; // toutes les 15 min tant que le site est ouvert
const MIN_GAP = 2 * 60 * 1000; // au retour sur l'onglet, pas plus d'une fois toutes les 2 min
const LAST = "cinetheque.lastSync";

/**
 * Synchronisation automatique avec le flux public Letterboxd (RSS) :
 * au chargement, toutes les 15 minutes, et à chaque retour sur l'onglet.
 * Seul le propriétaire connecté écrit dans Firestore ; les visiteurs voient le résultat.
 */
export function AutoSync() {
  const { loaded, mode, saveEntries, entries } = useLibrary();
  const running = useRef(false);
  const saveRef = useRef(saveEntries);
  const entriesRef = useRef(entries);
  useEffect(() => {
    saveRef.current = saveEntries;
    entriesRef.current = entries;
  }, [saveEntries, entries]);

  useEffect(() => {
    if (!loaded || (mode !== "local" && mode !== "cloud")) return;

    const sync = async (force = false) => {
      if (running.current) return;
      let last = 0;
      try {
        last = Number(localStorage.getItem(LAST) ?? 0);
      } catch {}
      if (!force && Date.now() - last < MIN_GAP) return;
      running.current = true;
      try {
        const r = await fetch(`/api/letterboxd?user=${LETTERBOXD_USER}`, { cache: "no-store" });
        const d = r.ok ? await r.json() : null;
        const known = new Map(entriesRef.current.map((e) => [e.id, sig(e)]));
        const changed = ((d?.entries ?? []) as DiaryEntry[]).filter((e) => known.get(e.id) !== sig(e));
        if (changed.length) await saveRef.current(changed);
        try {
          localStorage.setItem(LAST, String(Date.now()));
        } catch {}
        window.dispatchEvent(new CustomEvent("letterboxd-synced", { detail: { at: Date.now(), count: changed.length } }));
      } catch {
        /* réseau indisponible : on réessaiera au prochain passage */
      } finally {
        running.current = false;
      }
    };

    sync(true);
    const timer = setInterval(() => sync(true), EVERY);
    const onVisible = () => document.visibilityState === "visible" && sync();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [loaded, mode]);

  return null;
}
