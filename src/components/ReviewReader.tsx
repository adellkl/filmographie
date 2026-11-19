"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { DiaryEntry } from "@/lib/types";
import { mediaHref } from "@/lib/types";
import { useHref, useView } from "@/lib/view";
import { gsap } from "./gsap";
import { Stars } from "./Stars";
import { deName } from "@/lib/site";

const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** Lecture d'une critique en entier (fenêtre par-dessus la page). */
export function ReviewReader({ e, onClose }: { e: DiaryEntry; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const toHref = useHref();
  const { readOnly, owner } = useView();
  const href = toHref(mediaHref(e.mediaType, e.tmdbId));

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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <div className="absolute inset-0 bg-canvas/85" onClick={onClose} />
      <div ref={panel} className="card-bone relative flex max-h-[88vh] w-full max-w-[720px] flex-col rounded-b-none sm:rounded-lg">
        <header className="relative z-10 flex items-start gap-4 border-b border-black/10 p-6">
          <span className="h-24 w-16 shrink-0 overflow-hidden rounded-sm bg-black/10">
            {e.poster && <img src={e.poster} alt="" className="h-full w-full object-cover" />}
          </span>
          <div className="min-w-0 flex-1">
            <span className="mono flex items-center gap-2 text-graphite">
              <span className="pulse" /> Critique{readOnly && owner ? ` ${deName(owner.name)}` : ""}
            </span>
            <h2 id="review-title" className="mt-3 text-heading text-ink">
              {e.title} <span className="text-granite">{e.year}</span>
            </h2>
            <p className="mono mt-2 flex flex-wrap gap-3 text-graphite">
              <Stars value={e.rating} className="text-ink" />
              {e.liked && <span className="text-ink">♥</span>}
              {e.rewatch && <span>↻ revu</span>}
              <span>vu le {fmt(e.watchedDate)}</span>
            </p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-sm text-graphite transition-colors duration-150 hover:bg-black/5 hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className="relative z-10 overflow-y-auto p-6 sm:p-8">
          <p className="whitespace-pre-line font-[family-name:var(--font-newsreader)] text-[22px] leading-[1.55] text-ink sm:text-[24px]">
            <span className="text-signal">“</span>
            {e.review}
            <span className="text-signal">”</span>
          </p>
        </div>
        {href && (
          <footer className="relative z-10 flex justify-end border-t border-black/10 p-4">
            <Link href={href} onClick={onClose} className="btn-ink">
              Voir la fiche {e.mediaType === "tv" ? "de la série" : "du film"} →
            </Link>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
