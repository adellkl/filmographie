"use client";

import { useState } from "react";
import type { DiaryEntry, MediaType } from "@/lib/types";
import { ReviewReader } from "./ReviewReader";
import { deName } from "@/lib/site";

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

const STAR = "m12 2.6 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z";

/** Rangée d'étoiles dessinées (demi-étoiles comprises). */
function BigStars({ value, size = 26 }: { value: number; size?: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = value >= n ? 1 : value >= n - 0.5 ? 0.5 : 0;
        return (
          <span key={n} className="relative block" style={{ width: size, height: size }}>
            <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full text-black/10" aria-hidden>
              <path fill="currentColor" d={STAR} />
            </svg>
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <svg viewBox="0 0 24 24" className="text-ink" style={{ width: size, height: size }} aria-hidden>
                <path fill="currentColor" d={STAR} />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}

const day = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit" });
const monthYear = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { month: "short", year: "numeric" });

/** Carte « activité » d'un film : note, coups de cœur, frise des séances. */
export function ActivityCard({
  entries,
  type,
  ownerName,
  readOnly,
  onEdit,
  onNew,
}: {
  entries: DiaryEntry[];
  type: MediaType;
  ownerName?: string;
  readOnly: boolean;
  onEdit: (e: DiaryEntry) => void;
  onNew: () => void;
}) {
  const [reading, setReading] = useState<DiaryEntry | null>(null);
  const rated = entries.filter((e) => e.rating);
  const avg = rated.length ? rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length : 0;
  const shown = Math.round(avg * 2) / 2;
  const liked = entries.some((e) => e.liked);
  const label = readOnly ? `Activité ${deName(ownerName)}` : "Mon activité";

  if (!entries.length)
    return (
      <div className="card-bone p-6">
        <div className="relative z-10">
          <span className="mono flex items-center gap-2 text-graphite">
            <span className="h-1.5 w-1.5 rounded-full bg-black/20" /> {label}
          </span>
          <p className="mt-6 text-heading text-ink">
            {readOnly ? `Pas encore vu par ${ownerName ?? "Adel"}.` : type === "tv" ? "Pas encore vue." : "Pas encore vu."}
          </p>
          {!readOnly && (
            <button onClick={onNew} className="btn-ink mt-6">
              Noter maintenant →
            </button>
          )}
        </div>
      </div>
    );

  return (
    <div className="card-bone">
      {/* En-tête : note globale */}
      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="mono flex items-center gap-2 text-graphite">
            <span className="pulse" /> {label}
          </span>
          <span className="mono rounded-sm bg-ink px-2 py-1 text-bone">
            {entries.length} séance{entries.length > 1 ? "s" : ""}
          </span>
        </div>

        {avg ? (
          <div className="mt-6">
            <div className="flex items-end gap-3">
              <span className="text-[56px] leading-none tracking-[-0.04em] text-ink tabular-nums">{avg.toFixed(1)}</span>
              <span className="mono pb-2 text-graphite">/ 5</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <BigStars value={shown} />
              <span className="text-body-sm text-ink">{VERDICT[shown] ?? ""}</span>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-heading text-ink">Vu, sans note.</p>
        )}

        {(liked || entries.length > 1) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {liked && (
              <span className="mono inline-flex items-center gap-1.5 rounded-sm border border-black/15 px-2 py-1.5 text-ink">
                <span className="text-signal">♥</span> Coup de cœur
              </span>
            )}
            {entries.length > 1 && (
              <span className="mono inline-flex items-center gap-1.5 rounded-sm border border-black/15 px-2 py-1.5 text-ink">
                ↻ Vu {entries.length} fois
              </span>
            )}
          </div>
        )}
      </div>

      {/* Frise des séances */}
      <ol className="relative z-10 border-t border-black/10 px-6 py-5">
        {entries.map((e, i) => (
          <li key={e.id} className="relative grid grid-cols-[44px_1fr] gap-3 pb-5 last:pb-0">
            {/* trait vertical */}
            {i < entries.length - 1 && <span className="absolute bottom-0 left-[21px] top-12 w-px bg-black/10" aria-hidden />}
            <div className="flex h-11 w-11 flex-col items-center justify-center rounded-sm bg-ink text-bone">
              <span className="text-body leading-none tabular-nums">{day(e.watchedDate)}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="mono text-graphite">
                  {monthYear(e.watchedDate)}
                  {e.rewatch && " · revu"}
                </span>
                {!readOnly && (
                  <button onClick={() => onEdit(e)} className="mono cursor-pointer text-graphite transition-colors duration-150 hover:text-ink">
                    Modifier
                  </button>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                {e.rating ? <BigStars value={e.rating} size={15} /> : <span className="mono text-graphite">sans note</span>}
                {e.liked && <span className="text-signal">♥</span>}
              </div>
              {e.review && (
                <button onClick={() => setReading(e)} className="group mt-3 block w-full cursor-pointer text-left">
                  <span className="line-clamp-3 font-[family-name:var(--font-newsreader)] text-[17px] leading-[1.45] text-ink/85">
                    <span className="text-signal">“</span>
                    {e.review}
                  </span>
                  <span className="mono mt-2 inline-block text-graphite underline decoration-signal underline-offset-4 transition-colors duration-150 group-hover:text-ink">
                    Lire la critique
                  </span>
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>

      {!readOnly && (
        <div className="relative z-10 border-t border-black/10 p-4">
          <button onClick={onNew} className="btn-ink w-full">
            + Nouvelle séance
          </button>
        </div>
      )}

      {reading && <ReviewReader e={reading} onClose={() => setReading(null)} />}
    </div>
  );
}
