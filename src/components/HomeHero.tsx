"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import type { DiaryEntry, MediaLite } from "@/lib/types";
import { mediaHref } from "@/lib/types";
import { gsap, useGSAP } from "./gsap";
import { openSearch } from "./useTrending";
import { useHref, useView } from "@/lib/view";

type Stats = { films: number; avg: number; likes: number; logs: number };
type Tile = { key: string; poster: string; title: string; href: string | null };

const COLS = 4;

export function HomeHero({
  entries,
  trending,
  stats,
  lists,
}: {
  entries: DiaryEntry[];
  trending: MediaLite[];
  stats: Stats;
  lists: number;
}) {
  const root = useRef<HTMLElement>(null);
  const { readOnly, owner } = useView();
  const toHref = useHref();

  // Affiches : ton journal d'abord, complété par les tendances TMDB
  const columns = useMemo(() => {
    const seen = new Set<string>();
    const tiles: Tile[] = [];
    for (const e of entries)
      if (e.poster && !seen.has(e.poster)) {
        seen.add(e.poster);
        tiles.push({ key: e.id, poster: e.poster, title: e.title, href: toHref(mediaHref(e.mediaType, e.tmdbId)) });
      }
    for (const m of trending)
      if (m.poster && !seen.has(m.poster)) {
        seen.add(m.poster);
        tiles.push({ key: `${m.type}-${m.id}`, poster: m.poster, title: m.title, href: toHref(mediaHref(m.type, m.id)) });
      }
    const cols: Tile[][] = Array.from({ length: COLS }, () => []);
    tiles.slice(0, 32).forEach((t, i) => cols[i % COLS].push(t));
    return cols.filter((c) => c.length);
  }, [entries, trending, toHref]);

  const ready = columns.length > 0 && columns[0].length >= 3;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Entrée unique : courte et mécanique
        gsap.from("[data-hero-in]", { autoAlpha: 0, y: 10, duration: 0.5, stagger: 0.06, ease: "power2.out" });
        gsap.from("[data-hero-frame]", { autoAlpha: 0, y: 16, duration: 0.6, delay: 0.1, ease: "power2.out" });

        // Colonnes d'affiches en boucle, sens alterné
        const tweens = gsap.utils.toArray<HTMLElement>("[data-marquee]").map((col, i) => {
          const up = i % 2 === 0;
          return gsap.fromTo(
            col,
            { yPercent: up ? 0 : -50 },
            { yPercent: up ? -50 : 0, duration: 38 + i * 7, ease: "none", repeat: -1 },
          );
        });
        const frame = root.current?.querySelector("[data-hero-frame]");
        const slow = () => tweens.forEach((t) => gsap.to(t, { timeScale: 0.2, duration: 0.4 }));
        const fast = () => tweens.forEach((t) => gsap.to(t, { timeScale: 1, duration: 0.4 }));
        frame?.addEventListener("mouseenter", slow);
        frame?.addEventListener("mouseleave", fast);
        return () => {
          frame?.removeEventListener("mouseenter", slow);
          frame?.removeEventListener("mouseleave", fast);
        };
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [ready, columns.map((c) => c.length).join()], revertOnUpdate: true },
  );

  return (
    <section ref={root} className="shell pt-10 sm:pt-16" data-motion="off">
      <div className="grid items-center gap-12 lg:grid-cols-[5fr_7fr] lg:gap-14">
        {/* Titre, texte, boutons */}
        <div className="flex flex-col">
          <span className="label flex items-center gap-2" data-hero-in>
            <span className="pulse" /> {readOnly ? `Profil public · ${owner?.name ?? "Adel"}` : "Live · Letterboxd @adelkl"}
          </span>
          <h1
            className="mt-6 text-[52px] leading-[0.95] tracking-[-0.04em] text-bone sm:text-display lg:text-[80px]"
            data-hero-in
          >
            {readOnly ? (
              <>
                Plus de popcorn
                <br />
                <span className="text-granite">que de sommeil,</span>
                <br />
                depuis 2022.
              </>
            ) : (
              <>
                Ton cinéma,
                <br />
                <span className="text-granite">tenu comme</span>
                <br />
                un registre.
              </>
            )}
          </h1>
          <p className="mt-6 max-w-[420px] text-body text-granite" data-hero-in>
            {readOnly
              ? `${stats.films} films et séries notés, critiques et listes par thème. Consultation libre, sans compte.`
              : "Films et séries, notes et critiques, listes par thème. Ton journal Letterboxd, enrichi par TMDB."}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3" data-hero-in>
            {readOnly ? (
              <>
                <Link href={toHref("/journal")} className="btn-light h-12 px-5 text-body">
                  Voir le journal
                </Link>
                <Link href={toHref("/films")} className="btn-dark h-12 px-5 text-body">
                  Films vus
                </Link>
                <Link href={toHref("/listes")} className="btn-ghost h-12 border-x-0 border-t-0 px-1 text-body">
                  Ses listes →
                </Link>
              </>
            ) : (
              <>
                <button onClick={openSearch} className="btn-light h-12 px-5 text-body">
                  Noter un film
                  <span aria-hidden className="mono rounded-sm bg-ink/10 px-1.5 py-1 text-ink/70">
                    ⌘K
                  </span>
                </button>
                <Link href="/recherche" className="btn-dark h-12 px-5 text-body">
                  Explorer
                </Link>
                <Link href="/listes" className="btn-ghost h-12 border-x-0 border-t-0 px-1 text-body">
                  Mes listes →
                </Link>
              </>
            )}
          </div>

          <dl className="mt-12 grid grid-cols-4 border-t border-lift" data-hero-in>
            {[
              ["Films", String(stats.films)],
              ["Moyenne", stats.avg ? stats.avg.toFixed(1) : "—"],
              ["♥", String(stats.likes)],
              ["Listes", String(lists)],
            ].map(([k, v], i) => (
              <div key={k} className={`pt-5 ${i ? "border-l border-lift pl-4" : ""}`}>
                <dt className="label">{k}</dt>
                <dd className="mt-3 text-heading text-bone tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Mur d'affiches qui défile */}
        <div data-hero-frame className="overflow-hidden rounded-2xl border border-lift bg-[#0d0d0d]">
          <div className="flex items-center gap-2 border-b border-lift px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-ash" />
            <span className="h-2.5 w-2.5 rounded-full bg-ash" />
            <span className="h-2.5 w-2.5 rounded-full bg-ash" />
            <span className="mono ml-3 text-stone">journal.log</span>
            <span className="mono ml-auto flex items-center gap-2 text-granite">
              <span className="pulse" /> {stats.logs} entrées
            </span>
          </div>
          <div
            className="relative h-[420px] overflow-hidden sm:h-[560px]"
            style={{ maskImage: "linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)" }}
          >
            {ready ? (
              <div className="grid h-full grid-cols-3 gap-3 px-3 sm:grid-cols-4">
                {columns.map((col, i) => (
                  <div key={i} className={i === 3 ? "hidden sm:block" : ""}>
                    <div data-marquee className="flex flex-col gap-3">
                      {[...col, ...col].map((t, j) => {
                        const inner = (
                          <img
                            src={t.poster}
                            alt={j < col.length ? t.title : ""}
                            loading={j < 4 ? "eager" : "lazy"}
                            className="aspect-[2/3] w-full rounded-lg border border-lift object-cover transition-[border-color] duration-150 hover:border-stone"
                          />
                        );
                        return t.href ? (
                          <Link key={`${t.key}-${j}`} href={t.href} tabIndex={j < col.length ? 0 : -1} aria-hidden={j >= col.length}>
                            {inner}
                          </Link>
                        ) : (
                          <div key={`${t.key}-${j}`}>{inner}</div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid h-full place-items-center">
                <span className="mono flex items-center gap-2 text-granite">
                  <span className="pulse" /> Chargement des affiches…
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
