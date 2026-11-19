"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DiaryEntry } from "@/lib/types";
import { mediaHref } from "@/lib/types";
import { useHref } from "@/lib/view";
import { gsap, useGSAP } from "./gsap";
import { Stars } from "./Stars";
import { ReviewReader } from "./ReviewReader";

const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/** Répète la liste jusqu'à remplir largement une rangée (boucle sans trou). */
const fill = <T,>(list: T[], min: number) => {
  if (!list.length) return [];
  const out: T[] = [];
  while (out.length < min) out.push(...list);
  return out;
};

export function ReviewCard({ e, tone, fluid = false }: { e: DiaryEntry; tone: "bone" | "dark"; fluid?: boolean }) {
  const toHref = useHref();
  const href = toHref(mediaHref(e.mediaType, e.tmdbId));
  const bone = tone === "bone";
  const text = useRef<HTMLParagraphElement>(null);
  const [clipped, setClipped] = useState(false);
  const [reading, setReading] = useState(false);
  const close = useCallback(() => setReading(false), []);
  // La critique dépasse-t-elle des 3 lignes ?
  useEffect(() => {
    const el = text.current;
    if (!el) return;
    const check = () => setClipped(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [e.review]);
  const open = (ev: React.MouseEvent | React.KeyboardEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    setReading(true);
  };
  const body = (
    <article
      className={`flex h-[140px] gap-4 p-3 transition-[border-color] duration-150 ${fluid ? "w-full" : "w-[340px] shrink-0 sm:w-[420px]"} ${
        bone ? "card-bone" : "card bg-canvas hover:border-ash"
      }`}
    >
      <span className="relative z-10 aspect-[2/3] h-full shrink-0 overflow-hidden rounded-sm bg-lift">
        {e.poster && <img src={e.poster} alt="" loading="lazy" className="h-full w-full object-cover" />}
      </span>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col py-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-body-sm ${bone ? "text-ink" : "text-bone"}`}>{e.title}</span>
          <span className={`mono shrink-0 ${bone ? "text-graphite" : "text-granite"}`}>
            <Stars value={e.rating} /> {e.liked && "♥"}
          </span>
        </div>
        <p ref={text} className={`mt-2 line-clamp-3 flex-1 text-body-sm ${bone ? "text-ink/80" : "text-stone"}`}>
          <span className="text-signal" aria-hidden>
            “
          </span>
          {e.review}
        </p>
        <span className="mono flex items-center justify-between gap-2 text-graphite">
          <span className="truncate">
            {e.year} · vu le {fmt(e.watchedDate)}
          </span>
          {clipped && (
            <span
              role="button"
              tabIndex={0}
              onClick={open}
              onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && open(ev)}
              className={`shrink-0 cursor-pointer underline decoration-signal decoration-1 underline-offset-4 transition-colors duration-150 ${
                bone ? "text-ink hover:text-graphite" : "text-bone hover:text-chalk"
              }`}
            >
              Lire la suite
            </span>
          )}
        </span>
      </div>
    </article>
  );
  return (
    <>
      {href ? (
        <Link href={href} className="block h-full" tabIndex={fluid ? undefined : -1}>
          {body}
        </Link>
      ) : (
        body
      )}
      {reading && <ReviewReader e={e} onClose={close} />}
    </>
  );
}

/**
 * Deux rangées de critiques qui défilent en sens opposés.
 * Survol d'une rangée → elle ralentit jusqu'à l'arrêt ; on repart en quittant.
 */
export function ReviewMarquee({ reviews }: { reviews: DiaryEntry[] }) {
  const root = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => {
    const top = reviews.filter((_, i) => i % 2 === 0);
    const bottom = reviews.filter((_, i) => i % 2 === 1);
    const r = bottom.length ? [top, bottom] : [top];
    return r.map((list) => fill(list, 10));
  }, [reviews]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const cleanups: (() => void)[] = [];
        gsap.utils.toArray<HTMLElement>("[data-marquee-row]").forEach((row, i) => {
          const track = row.querySelector<HTMLElement>("[data-track]");
          if (!track) return;
          const left = i % 2 === 0;
          const tween = gsap.fromTo(
            track,
            { xPercent: left ? 0 : -50 },
            { xPercent: left ? -50 : 0, duration: 60 + i * 8, ease: "none", repeat: -1 },
          );
          const stop = () => gsap.to(tween, { timeScale: 0, duration: 0.5, ease: "power2.out", overwrite: true });
          const go = () => gsap.to(tween, { timeScale: 1, duration: 0.5, ease: "power2.in", overwrite: true });
          row.addEventListener("mouseenter", stop);
          row.addEventListener("mouseleave", go);
          row.addEventListener("focusin", stop);
          row.addEventListener("focusout", go);
          cleanups.push(() => {
            row.removeEventListener("mouseenter", stop);
            row.removeEventListener("mouseleave", go);
            row.removeEventListener("focusin", stop);
            row.removeEventListener("focusout", go);
          });
        });
        return () => cleanups.forEach((c) => c());
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [rows.map((r) => r.length).join()], revertOnUpdate: true },
  );

  if (!reviews.length) return null;

  return (
    <div
      ref={root}
      className="flex flex-col gap-3 overflow-hidden"
      style={{ maskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)" }}
    >
      {rows.map((list, r) => (
        <div key={r} data-marquee-row className="overflow-hidden py-1">
          {/* Contenu doublé : l'animation glisse de 50 % pour boucler sans saut */}
          <div data-track className="flex w-max gap-3">
            {[...list, ...list].map((e, i) => (
              <div key={`${e.id}-${i}`} aria-hidden={i >= list.length || undefined}>
                <ReviewCard e={e} tone={(i + r) % 3 === 0 ? "bone" : "dark"} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
