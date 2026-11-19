"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "./gsap";
import { useLibrary } from "@/lib/library";
import type { DiaryEntry, MediaType } from "@/lib/types";

type FilmRef = { tmdbId: number | null; mediaType?: MediaType; title: string; year: number | null; poster: string | null };

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const today = () => iso(new Date());
const yesterday = () => iso(new Date(Date.now() - 86400000));
const fmtDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const VERDICT: Record<number, string> = {
  0.5: "Catastrophe",
  1: "Nul",
  1.5: "Très décevant",
  2: "Décevant",
  2.5: "Moyen",
  3: "Correct",
  3.5: "Bien",
  4: "Très bien",
  4.5: "Excellent",
  5: "Chef-d'œuvre",
};

/* ───────── Étoiles ───────── */
function StarPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <div>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(null)} role="radiogroup" aria-label="Note sur 5">
        {[1, 2, 3, 4, 5].map((n) => {
          const fill = shown >= n ? 1 : shown >= n - 0.5 ? 0.5 : 0;
          return (
            <span key={n} className="relative block h-11 w-11">
              <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full text-black/12" aria-hidden>
                <path fill="currentColor" d="m12 2.6 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z" />
              </svg>
              <span className="absolute inset-0 overflow-hidden transition-[width] duration-150" style={{ width: `${fill * 100}%` }}>
                <svg viewBox="0 0 24 24" className={`h-11 w-11 ${hover != null ? "text-graphite" : "text-ink"}`} aria-hidden>
                  <path fill="currentColor" d="m12 2.6 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z" />
                </svg>
              </span>
              {[n - 0.5, n].map((v, i) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={value === v}
                  aria-label={`${v} étoile${v > 1 ? "s" : ""} — ${VERDICT[v]}`}
                  onMouseEnter={() => setHover(v)}
                  onFocus={() => setHover(v)}
                  onBlur={() => setHover(null)}
                  onClick={() => onChange(value === v ? null : v)}
                  className={`absolute top-0 h-full w-1/2 cursor-pointer focus-visible:outline-none ${i === 0 ? "left-0" : "right-0"}`}
                />
              ))}
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex h-5 items-baseline gap-3">
        <span className="text-body text-ink">{shown ? VERDICT[shown] : "Pas de note"}</span>
        {shown ? <span className="mono tabular-nums text-graphite">{shown.toFixed(1)} / 5</span> : null}
        {value != null && hover == null && (
          <button type="button" onClick={() => onChange(null)} className="mono ml-auto cursor-pointer text-graphite hover:text-ink">
            Effacer
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────── Interrupteur ───────── */
function Toggle({
  on,
  onChange,
  icon,
  label,
  hint,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  icon: string;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`flex flex-1 cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-[background-color,border-color,color] duration-150 ${
        on ? "border-ink bg-ink text-bone" : "border-black/12 text-ink hover:border-black/40"
      }`}
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-sm text-[18px] ${on ? "bg-bone/10" : "bg-black/5"}`} aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm">{label}</span>
        <span className={`mono mt-1 block truncate ${on ? "text-stone" : "text-graphite"}`}>{hint}</span>
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 ${on ? "bg-bone" : "bg-black/15"}`} aria-hidden>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-[left,background-color] duration-150 ${on ? "left-[18px] bg-ink" : "left-0.5 bg-white"}`} />
      </span>
    </button>
  );
}

/* ───────── Dialogue ───────── */
export function LogDialog({ film, entry, onClose }: { film: FilmRef; entry?: DiaryEntry; onClose: () => void }) {
  const { saveEntry, deleteEntry, entries } = useLibrary();
  const previous = entries.filter((e) => e.tmdbId && e.tmdbId === film.tmdbId && e.id !== entry?.id);
  const [date, setDate] = useState(entry?.watchedDate ?? today());
  const [custom, setCustom] = useState(!!entry && entry.watchedDate !== today() && entry.watchedDate !== yesterday());
  const [rating, setRating] = useState<number | null>(entry?.rating ?? null);
  const [liked, setLiked] = useState(entry?.liked ?? false);
  const [rewatch, setRewatch] = useState(entry?.rewatch ?? previous.length > 0);
  const [review, setReview] = useState(entry?.review ?? "");
  const [busy, setBusy] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const isTv = film.mediaType === "tv";

  useEffect(() => {
    gsap.fromTo(panel.current, { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.2, ease: "power2.out" });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement;
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) form.current?.requestSubmit();
      if (!typing && /^[1-5]$/.test(e.key)) setRating(Number(e.key));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveEntry({
        id: entry?.id ?? `app-${film.mediaType ?? "movie"}-${film.tmdbId ?? "x"}-${Date.now()}`,
        tmdbId: film.tmdbId,
        mediaType: film.mediaType ?? "movie",
        title: film.title,
        year: film.year,
        poster: film.poster,
        rating,
        liked,
        rewatch,
        review: review.trim(),
        watchedDate: date,
        source: entry?.source ?? "app",
        letterboxdUrl: entry?.letterboxdUrl,
        createdAt: entry?.createdAt ?? Date.now(),
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const dateChip = (active: boolean) =>
    `mono h-9 cursor-pointer rounded-sm border px-3 transition-[background-color,border-color,color] duration-150 ${
      active ? "border-ink bg-ink text-bone" : "border-black/12 text-ink hover:border-black/40"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="log-title">
      <div className="absolute inset-0 bg-canvas/85" onClick={onClose} />
      <div ref={panel} className="card-bone relative flex max-h-[92vh] w-full max-w-[820px] flex-col rounded-b-none sm:rounded-lg">
        <form ref={form} onSubmit={submit} className="relative z-10 grid min-h-0 flex-1 md:grid-cols-[240px_1fr]">
          {/* Colonne affiche */}
          <aside className="hidden flex-col gap-5 border-r border-black/10 p-6 md:flex">
            <div className="aspect-[2/3] overflow-hidden rounded-lg bg-black/10">
              {film.poster && <img src={film.poster} alt={`Affiche de ${film.title}`} className="h-full w-full object-cover" />}
            </div>
            <div>
              <span className="mono text-graphite">Historique</span>
              {previous.length ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {previous.slice(0, 4).map((p) => (
                    <li key={p.id} className="flex items-baseline justify-between gap-2 text-body-sm text-ink">
                      <span>{new Date(p.watchedDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      <span className="mono text-graphite">{p.rating ? `${p.rating}★` : "—"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-body-sm text-graphite">Première fois.</p>
              )}
            </div>
          </aside>

          {/* Formulaire */}
          <div className="flex min-h-0 flex-col">
            <header className="flex items-start gap-4 border-b border-black/10 p-6">
              <span className="h-16 w-11 shrink-0 overflow-hidden rounded-sm bg-black/10 md:hidden">
                {film.poster && <img src={film.poster} alt="" className="h-full w-full object-cover" />}
              </span>
              <div className="min-w-0 flex-1">
                <span className="mono flex items-center gap-2 text-graphite">
                  <span className="pulse" /> {entry ? "Modifier la séance" : isTv ? "Nouvelle séance · série" : "Nouvelle séance · film"}
                </span>
                <h2 id="log-title" className="mt-3 truncate text-heading text-ink">
                  {film.title} <span className="text-granite">{film.year}</span>
                </h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-sm text-graphite transition-colors duration-150 hover:bg-black/5 hover:text-ink">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-6">
              {/* 01 Date */}
              <fieldset>
                <legend className="mono text-graphite">01 · Quand</legend>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => (setCustom(false), setDate(today()))} className={dateChip(!custom && date === today())}>
                    Aujourd&apos;hui
                  </button>
                  <button type="button" onClick={() => (setCustom(false), setDate(yesterday()))} className={dateChip(!custom && date === yesterday())}>
                    Hier
                  </button>
                  <button type="button" onClick={() => setCustom(true)} className={dateChip(custom)}>
                    Autre date
                  </button>
                  {custom && (
                    <input
                      type="date"
                      required
                      value={date}
                      max={today()}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-9 rounded-sm border border-black/12 bg-transparent px-2 text-body-sm text-ink outline-none focus:border-ink [color-scheme:light]"
                      aria-label="Date de visionnage"
                    />
                  )}
                </div>
                <p className="mt-2 text-body-sm capitalize text-graphite">{fmtDate(date)}</p>
              </fieldset>

              {/* 02 Note */}
              <fieldset>
                <legend className="mono flex w-full justify-between text-graphite">
                  <span>02 · Ta note</span>
                  <span className="hidden sm:inline">touches 1–5</span>
                </legend>
                <div className="mt-3">
                  <StarPicker value={rating} onChange={setRating} />
                </div>
              </fieldset>

              {/* 03 Ressenti */}
              <fieldset>
                <legend className="mono text-graphite">03 · Ressenti</legend>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Toggle on={liked} onChange={setLiked} icon="♥" label="Coup de cœur" hint="Ajouté à tes favoris" />
                  <Toggle
                    on={rewatch}
                    onChange={setRewatch}
                    icon="↻"
                    label="Revu"
                    hint={previous.length ? `Déjà vu ${previous.length}×` : "Tu l'avais déjà vu"}
                  />
                </div>
              </fieldset>

              {/* 04 Critique */}
              <fieldset>
                <legend className="mono flex w-full justify-between text-graphite">
                  <span>04 · Critique</span>
                  <span className="tabular-nums">{review.length ? `${review.length} car.` : "facultatif"}</span>
                </legend>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  rows={4}
                  placeholder={isTv ? "Ce que tu as pensé de la série…" : "Ce que tu as pensé du film…"}
                  className="mt-3 w-full resize-none rounded-lg border border-black/12 bg-white/40 p-4 text-body text-ink outline-none transition-[border-color,background-color] duration-150 placeholder:text-granite focus:border-ink focus:bg-white/70"
                />
              </fieldset>
            </div>

            <footer className="flex flex-wrap items-center gap-2 border-t border-black/10 p-6">
              <button type="submit" disabled={busy} className="btn-ink h-11 px-5">
                {busy ? "Enregistrement…" : entry ? "Mettre à jour" : "Enregistrer la séance"}
                <kbd className="mono rounded-sm bg-bone/10 px-1.5 py-1 text-stone">⌘↵</kbd>
              </button>
              <button type="button" onClick={onClose} className="btn h-11 border border-black/12 text-ink hover:border-black/40">
                Annuler
              </button>
              {entry && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Supprimer cette séance du journal ?")) return;
                    await deleteEntry(entry.id);
                    onClose();
                  }}
                  className="mono ml-auto cursor-pointer text-graphite transition-colors duration-150 hover:text-signal"
                >
                  Supprimer
                </button>
              )}
            </footer>
          </div>
        </form>
      </div>
    </div>
  );
}
