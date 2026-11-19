"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DiaryEntry } from "@/lib/types";
import { gsap } from "./gsap";
import { Stars } from "./Stars";

export const keyOfEntry = (e: DiaryEntry) => `${e.mediaType ?? "movie"}-${e.tmdbId}`;

/**
 * Choix des titres mis en avant dans une section.
 * Clic = ajouter / retirer ; le numéro indique l'ordre d'affichage.
 */
export function FeaturedPicker({
  title,
  candidates,
  initial,
  onSave,
  onClose,
}: {
  title: string;
  candidates: DiaryEntry[];
  initial: string[];
  onSave: (keys: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string[]>(initial);
  const [q, setQ] = useState("");
  const [onlyPicked, setOnlyPicked] = useState(false);
  const [busy, setBusy] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(panel.current, { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.25, ease: "power2.out" });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let out = candidates.filter((e) => e.tmdbId && (!term || e.title.toLowerCase().includes(term)));
    if (onlyPicked) out = picked.map((k) => out.find((e) => keyOfEntry(e) === k)).filter((e): e is DiaryEntry => !!e);
    return out;
  }, [candidates, q, onlyPicked, picked]);

  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const save = async () => {
    setBusy(true);
    try {
      await onSave(picked);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="picker-title">
      <div className="absolute inset-0 bg-canvas/85" onClick={onClose} />
      <div ref={panel} className="relative flex max-h-[92vh] w-full max-w-[1000px] flex-col overflow-hidden rounded-t-lg border border-ash bg-canvas sm:rounded-lg">
        <header className="flex flex-col gap-4 border-b border-lift p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="label flex items-center gap-2">
              <span className="pulse" /> Mettre en avant
            </span>
            <h2 id="picker-title" className="mt-3 text-heading text-bone">
              {title}
            </h2>
            <p className="mt-2 text-body-sm text-granite">
              Clique pour choisir et ordonner les titres affichés. Aucune sélection = tous les titres, du plus récent au plus ancien.
            </p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center self-start rounded-sm text-granite transition-colors duration-150 hover:bg-lift hover:text-bone">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-lift px-5 py-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer par titre…" className="input h-10 max-w-xs" aria-label="Filtrer" />
          <button
            onClick={() => setOnlyPicked((v) => !v)}
            aria-pressed={onlyPicked}
            className={`mono h-9 cursor-pointer rounded-sm border px-3 transition-colors duration-150 ${onlyPicked ? "border-bone bg-bone text-ink" : "border-ash text-stone hover:border-stone"}`}
          >
            Sélection seulement
          </button>
          <span className="mono ml-auto tabular-nums text-granite">
            {picked.length} sélectionné{picked.length > 1 ? "s" : ""} · {candidates.length} titres
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {!list.length && <p className="py-10 text-center text-body text-granite">Aucun titre.</p>}
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
            {list.map((e) => {
              const k = keyOfEntry(e);
              const rank = picked.indexOf(k);
              const on = rank >= 0;
              return (
                <li key={e.id}>
                  <button
                    onClick={() => toggle(k)}
                    aria-pressed={on}
                    className="group block w-full cursor-pointer text-left"
                    title={e.title}
                  >
                    <span
                      className={`relative block aspect-[2/3] overflow-hidden rounded-lg border-2 transition-[border-color,opacity] duration-150 ${
                        on ? "border-bone" : "border-transparent opacity-60 group-hover:opacity-100"
                      }`}
                    >
                      {e.poster ? <img src={e.poster} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="block h-full bg-lift" />}
                      <span
                        className={`mono absolute right-1.5 top-1.5 grid h-6 min-w-6 place-items-center rounded-sm px-1 transition-colors duration-150 ${
                          on ? "bg-bone text-ink" : "bg-canvas/80 text-stone"
                        }`}
                      >
                        {on ? rank + 1 : "+"}
                      </span>
                    </span>
                    <span className="mt-1.5 block truncate text-body-sm text-bone">{e.title}</span>
                    <Stars value={e.rating} className="block text-caption text-granite" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-lift p-4">
          <button onClick={save} disabled={busy} className="btn-light h-11 px-5">
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button onClick={onClose} className="btn-dark h-11">
            Annuler
          </button>
          {picked.length > 0 && (
            <button onClick={() => setPicked([])} className="mono ml-auto cursor-pointer text-granite transition-colors duration-150 hover:text-bone">
              Tout désélectionner
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
