"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLibrary } from "@/lib/library";
import type { DiaryEntry, MediaFull, MediaType } from "@/lib/types";
import { usePageMotion } from "./motion";
import { Poster } from "./Poster";
import { LogDialog } from "./LogDialog";
import { AddToList } from "./AddToList";
import { SectionHead } from "./Section";
import { useHref, useView } from "@/lib/view";
import { useWatchToggle } from "./WatchToggle";
import { PagedGrid } from "./PagedGrid";
import { ActivityCard } from "./ActivityCard";
import { deName } from "@/lib/site";
import { canonGenre, useEntryGenres } from "@/lib/genres";

const fmtDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const money = (n: number) => `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} M$`;
const duration = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`);

const downloadUrl = (src: string, name: string) =>
  `/api/tmdb/image?path=${encodeURIComponent(src.slice(src.lastIndexOf("/")))}&name=${encodeURIComponent(name)}`;

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
    </svg>
  );
}

const STATUS: Record<string, string> = {
  "Returning Series": "En cours",
  Ended: "Terminée",
  Canceled: "Annulée",
  "In Production": "En production",
  Released: "Sorti",
  "Post Production": "Post-production",
  Planned: "Annoncé",
};

export function MediaDetail({ type, id }: { type: MediaType; id: string }) {
  const tmdbId = Number(id);
  const { entries } = useLibrary();
  const { readOnly, owner } = useView();
  const toHref = useHref();
  const { has, toggle } = useWatchToggle();
  const [m, setM] = useState<MediaFull | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "nokey" | "error">("loading");
  const [log, setLog] = useState<DiaryEntry | "new" | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [castAll, setCastAll] = useState(false);
  const [play, setPlay] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/tmdb/${type}/${id}`)
      .then(async (r) => {
        if (!alive) return;
        if (r.status === 503) return setState("nokey");
        if (!r.ok) return setState("error");
        setM(await r.json());
        setState("ok");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [type, id]);

  usePageMotion(root, [state, entries.length]);

  const mine = entries.filter((e) => e.tmdbId === tmdbId && (e.mediaType ?? "movie") === type);

  // Profil public : les autres titres vus qui partagent des genres avec celui-ci
  const genreIndex = useEntryGenres(entries, readOnly);
  const sameTheme = (() => {
    if (!readOnly || !m?.genres.length) return [];
    const want = new Set(m.genres.map(canonGenre));
    const seen = new Set<string>([`${type}-${tmdbId}`]);
    const out: { e: (typeof entries)[number]; shared: string[] }[] = [];
    for (const e of entries) {
      const k = `${e.mediaType ?? "movie"}-${e.tmdbId}`;
      if (!e.tmdbId || seen.has(k)) continue;
      seen.add(k);
      const shared = (genreIndex[k] ?? []).map(canonGenre).filter((g) => want.has(g));
      if (shared.length) out.push({ e, shared: [...new Set(shared)] });
    }
    return out.sort((a, b) => b.shared.length - a.shared.length || (b.e.rating ?? 0) - (a.e.rating ?? 0));
  })();
  const genresLoading = readOnly && entries.some((e) => e.tmdbId && !genreIndex[`${e.mediaType ?? "movie"}-${e.tmdbId}`]);
  const local = mine[0];

  if (state === "loading")
    return (
      <div className="shell py-32">
        <span className="label flex items-center gap-2">
          <span className="pulse" /> Chargement de la fiche…
        </span>
      </div>
    );

  if (!m && !local)
    return (
      <div className="shell py-32">
        <h1 className="text-heading-lg">Fiche indisponible.</h1>
        <p className="mt-4 text-body text-granite">{state === "nokey" ? "Ajoute ta clé TMDB dans .env.local." : "Introuvable sur TMDB."}</p>
      </div>
    );

  const title = m?.title ?? local!.title;
  const year = m?.year ?? local?.year ?? null;
  const poster = m?.poster ?? local?.poster ?? null;
  const ref = { tmdbId, mediaType: type, title, year, poster };
  const lite = m ?? { id: tmdbId, type, title, originalTitle: title, year, poster, backdrop: null, overview: "", vote: 0, genres: [] };
  const inWatch = has({ id: tmdbId, type });

  const facts: [string, string][] = m
    ? ([
        ["Note TMDB", m.vote ? `${m.vote.toFixed(1)}/10` : "—"],
        type === "tv" && !m.runtime
          ? ["Statut", STATUS[m.status] ?? m.status ?? "—"]
          : [type === "tv" ? "Épisode" : "Durée", m.runtime ? duration(m.runtime) : "—"],
        type === "tv" ? ["Saisons", String(m.numberOfSeasons ?? "—")] : ["Sortie", m.releaseDate ? fmtDate(m.releaseDate) : "—"],
        type === "tv" ? ["Épisodes", String(m.numberOfEpisodes ?? "—")] : ["Budget", m.budget ? money(m.budget) : "—"],
      ] as [string, string][])
    : [];

  return (
    <div ref={root}>
      {/* ───────── Bandeau ───────── */}
      <section className="shell pt-6" data-motion="off">
        <div className="relative overflow-hidden rounded-2xl border border-lift bg-[#0d0d0d]">
          {m?.backdrop && <img src={m.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />}
          <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/75 to-canvas/10" />
          <div className="relative grid gap-8 p-6 pt-40 sm:p-10 sm:pt-56 md:grid-cols-[220px_1fr] md:items-end">
            <div className="w-36 sm:w-48 md:w-full" data-in>
              <Poster title={title} year={year} poster={poster} />
            </div>
            <div data-in>
              <span className="label flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="flex items-center gap-2">
                  <span className="pulse" /> {type === "tv" ? "Série" : "Film"}
                </span>
                {m?.genres.slice(0, 3).map((g) => (
                  <span key={g} className="text-granite">
                    / {g}
                  </span>
                ))}
              </span>
              <h1 className="mt-5 text-[44px] leading-none tracking-[-0.04em] text-bone sm:text-display">{title}</h1>
              <p className="mono mt-5 flex flex-wrap gap-x-4 gap-y-2 text-stone">
                {year && <span>{type === "tv" && m?.lastAirYear && m.lastAirYear !== year ? `${year}–${m.lastAirYear}` : year}</span>}
                {m?.directors.length ? <span>{m.directors.map((d) => d.name).join(", ")}</span> : null}
                {m?.runtime ? <span>{duration(m.runtime)}</span> : null}
                {m?.status && STATUS[m.status] && <span>{STATUS[m.status]}</span>}
                {m?.networks.length ? <span>{m.networks.slice(0, 2).join(", ")}</span> : null}
              </p>
              {m?.tagline && <p className="mt-4 text-body text-granite">{m.tagline}</p>}
              <div className="mt-8 flex flex-wrap gap-2">
                {readOnly ? (
                  <>
                    {mine.length > 0 && <span className="btn h-11 bg-bone px-5 text-ink">✓ Vu par {owner?.name}</span>}
                    {inWatch && <span className="btn h-11 bg-lift px-5 text-bone">Dans sa liste à voir</span>}
                  </>
                ) : (
                  <>
                    <button onClick={() => setLog("new")} className="btn-light h-11 px-5">
                      {mine.length ? "Noter à nouveau" : type === "tv" ? "J'ai vu cette série" : "J'ai vu ce film"} →
                    </button>
                    <button onClick={() => toggle(lite)} aria-pressed={inWatch} className="btn-dark h-11 px-5">
                      {inWatch ? "✓ À voir" : "+ À voir"}
                    </button>
                    <AddToList item={{ tmdbId, mediaType: type, title, year, poster }} />
                  </>
                )}
                {m?.trailerKey && (
                  <button
                    onClick={() => {
                      setPlay(true);
                      document.getElementById("bande-annonce")?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    className="btn-ghost h-11 border-x-0 border-t-0"
                  >
                    ▶ Bande-annonce
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Tableau de bord ───────── */}
      {facts.length > 0 && (
        <section className="shell mt-6">
          <div className="grid grid-cols-2 rounded-lg border border-lift sm:grid-cols-4">
            {facts.map(([k, v], i) => (
              <div key={k} className={`p-5 ${i % 2 ? "border-l border-lift" : ""} ${i > 1 ? "border-t border-lift sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""}`}>
                <span className="label">{k}</span>
                <p className="mt-3 text-[28px] tracking-[-0.03em] text-bone sm:text-heading">{v}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="shell mt-24 grid gap-16 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-24">
          {m?.overview && (
            <section>
              <span className="label">Synopsis</span>
              <p className="mt-6 max-w-[640px] font-[family-name:var(--font-newsreader)] text-[24px] font-light leading-[1.5] tracking-[-0.005em] text-stone [font-optical-sizing:auto] sm:text-[27px]">
                <span className="float-left mr-3 mt-1 font-[family-name:var(--font-newsreader)] text-[76px] leading-[0.8] text-bone">{m.overview.charAt(0)}</span>
                {m.overview.slice(1)}
              </p>
              {m.keywords.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {m.keywords.map((k) => (
                    <span key={k} className="mono rounded-sm border border-lift px-2 py-1.5 text-granite">
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {m?.trailerKey && (
            <section id="bande-annonce" className="scroll-mt-24">
              <SectionHead eyebrow="Bande-annonce" live title="En mouvement." />
              <div className="relative aspect-video overflow-hidden rounded-lg border border-lift bg-[#0d0d0d]">
                {play ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${m.trailerKey}?autoplay=1&rel=0&modestbranding=1`}
                    title={`Bande-annonce de ${m.title}`}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                ) : (
                  <button onClick={() => setPlay(true)} className="group absolute inset-0 cursor-pointer" aria-label={`Lire la bande-annonce de ${m.title}`}>
                    <img
                      src={m.backdrop ?? `https://i.ytimg.com/vi/${m.trailerKey}/hqdefault.jpg`}
                      alt=""
                      className="h-full w-full object-cover opacity-60 transition-opacity duration-150 group-hover:opacity-80"
                    />
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="btn-light h-14 px-6 text-body">▶ Lire la bande-annonce</span>
                    </span>
                    <span className="mono absolute bottom-4 left-4 flex items-center gap-2 text-bone">
                      <span className="pulse" /> youtube · {m.title}
                    </span>
                  </button>
                )}
              </div>
            </section>
          )}

          {m && m.cast.length > 0 && (
            <section>
              <SectionHead
                eyebrow="Distribution"
                title="Devant la caméra."
                action={
                  m.cast.length > 8 ? (
                    <button onClick={() => setCastAll((v) => !v)} className="btn-ghost self-start">
                      {castAll ? "Réduire" : `Tout voir (${m.cast.length})`}
                    </button>
                  ) : undefined
                }
              />
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-lift bg-lift sm:grid-cols-4">
                {m.cast.slice(0, castAll ? 18 : 8).map((p) => (
                  <div key={`${p.id}-${p.role}`} className="flex items-center gap-3 bg-canvas p-3">
                    <span className="h-14 w-11 shrink-0 overflow-hidden rounded-sm bg-lift">
                      {p.photo && <img src={p.photo} alt="" loading="lazy" className="h-full w-full object-cover grayscale" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-body-sm text-bone">{p.name}</span>
                      <span className="mono mt-1 block truncate text-granite">{p.role}</span>
                    </span>
                  </div>
                ))}
              </div>
              {m.crew.length > 0 && (
                <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                  {m.crew.map((c) => (
                    <div key={`${c.id}-${c.role}`}>
                      <dt className="label">{c.role}</dt>
                      <dd className="mt-2 text-body-sm text-bone">{c.name}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          )}

          {m && m.seasons.length > 0 && (
            <section>
              <SectionHead eyebrow="Saisons" title={`${m.seasons.length} saison${m.seasons.length > 1 ? "s" : ""}.`} />
              <ul className="divide-y divide-lift rounded-lg border border-lift">
                {m.seasons.map((s) => (
                  <li key={s.number} className="grid grid-cols-[48px_1fr_auto] items-center gap-4 p-4">
                    <span className="h-16 w-12 overflow-hidden rounded-sm bg-lift">
                      {s.poster && <img src={s.poster} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    </span>
                    <div className="min-w-0">
                      <span className="block text-body text-bone">{s.name}</span>
                      {s.overview && <span className="mt-1 line-clamp-1 block text-body-sm text-granite">{s.overview}</span>}
                    </div>
                    <span className="mono text-right text-stone">
                      {s.episodes} ép.
                      <span className="block pt-1 text-graphite">{s.year ?? ""}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {m && m.images.length > 1 && (
            <section>
              <SectionHead
                eyebrow="Images"
                title="Plans."
                action={<span className="mono self-start text-granite sm:self-end">{m.images.length} images · pleine résolution</span>}
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {m.images.map((src, i) => (
                  <div key={src} className={`group relative overflow-hidden rounded-lg border border-lift transition-[border-color] duration-150 hover:border-stone ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                    <button onClick={() => setLightbox(src)} className="block h-full w-full cursor-zoom-in" aria-label={`Agrandir l'image ${i + 1}`}>
                      <img src={src} alt="" loading="lazy" className="aspect-video h-full w-full object-cover" />
                    </button>
                    <a
                      href={downloadUrl(src, `${m.title} ${i + 1}`)}
                      download
                      className="mono absolute bottom-2 right-2 flex h-8 items-center gap-1.5 rounded-sm bg-canvas/85 px-2.5 text-bone opacity-0 transition-[opacity,background-color] duration-150 hover:bg-canvas focus:opacity-100 group-hover:opacity-100"
                      aria-label={`Télécharger l'image ${i + 1}`}
                    >
                      <DownloadIcon /> Télécharger
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

          {readOnly && m && (
            <section>
              <SectionHead
                eyebrow={`Dans le même thème · ${m.genres.slice(0, 3).join(" / ")}`}
                title={`Vu aussi par ${owner?.name}.`}
                lede={
                  sameTheme.length
                    ? `${sameTheme.length} titres de son journal partagent au moins un genre avec celui-ci.`
                    : genresLoading
                      ? "Recherche dans son journal…"
                      : "Aucun autre titre de ce genre dans son journal."
                }
              />
              {sameTheme.length > 0 && (
                <PagedGrid
                  items={sameTheme}
                  keyOf={({ e }) => e.id}
                  className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-6"
                  allHref={toHref("/films")}
                  allLabel="Tous ses films"
                  render={({ e, shared }) => (
                    <>
                      <Poster {...e} caption badge />
                      <span className="mono mt-1 block truncate text-graphite">{shared.slice(0, 2).join(" · ")}</span>
                    </>
                  )}
                />
              )}
            </section>
          )}

          {!readOnly && m && m.recommendations.length > 0 && (
            <section>
              <SectionHead eyebrow="Dans la même veine" title={type === "tv" ? "Séries proches." : "Films proches."} />
              <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-6">
                {m.recommendations.map((r) => (
                  <Poster key={r.id} tmdbId={r.id} mediaType={r.type} title={r.title} year={r.year} poster={r.poster} caption badge status />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ───────── Colonne ───────── */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <ActivityCard
            entries={mine}
            type={type}
            ownerName={owner?.name}
            readOnly={readOnly}
            onEdit={(e) => setLog(e)}
            onNew={() => setLog("new")}
          />

          {m && (m.countries.length > 0 || m.languages.length > 0 || m.revenue) && (
            <dl className="card flex flex-col gap-4 p-6">
              {m.originalTitle !== m.title && (
                <div>
                  <dt className="label">Titre original</dt>
                  <dd className="mt-2 text-body-sm text-bone">{m.originalTitle}</dd>
                </div>
              )}
              {m.countries.length > 0 && (
                <div>
                  <dt className="label">Pays</dt>
                  <dd className="mt-2 text-body-sm text-bone">{m.countries.slice(0, 3).join(", ")}</dd>
                </div>
              )}
              {m.languages.length > 0 && (
                <div>
                  <dt className="label">Langues</dt>
                  <dd className="mt-2 text-body-sm text-bone">{m.languages.slice(0, 3).join(", ")}</dd>
                </div>
              )}
              {m.revenue ? (
                <div>
                  <dt className="label">Recettes</dt>
                  <dd className="mt-2 flex items-center gap-2 text-body-sm text-bone">
                    {money(m.revenue)}
                    {m.budget ? <span className={`mono ${m.revenue > m.budget ? "text-metric" : "text-signal"}`}>×{(m.revenue / m.budget).toFixed(1)}</span> : null}
                  </dd>
                </div>
              ) : null}
            </dl>
          )}

          {m && m.providers.length > 0 && (
            <div className="card p-6">
              <span className="label">En streaming · FR</span>
              <div className="mt-4 flex flex-wrap gap-2">
                {m.providers.map((p) => (p.logo ? <img key={p.name} src={p.logo} alt={p.name} title={p.name} className="h-10 w-10 rounded-sm" /> : null))}
              </div>
            </div>
          )}

          <Link href={readOnly ? toHref("/films") : type === "tv" ? "/recherche?type=tv" : "/films"} className="btn-ghost">
            ← {readOnly ? `Les films ${deName(owner?.name)}` : type === "tv" ? "Explorer les séries" : "Mes films vus"}
          </Link>
        </aside>
      </div>

      {log && <LogDialog film={ref} entry={log === "new" ? undefined : log} onClose={() => setLog(null)} />}
      {lightbox && m && (
        <div className="fixed inset-0 z-50 flex flex-col bg-canvas/95" role="dialog" aria-modal="true" aria-label="Image en grand">
          <div className="flex items-center justify-between gap-4 p-4">
            <span className="mono text-granite">
              {m.title} · {m.images.indexOf(lightbox) + 1}/{m.images.length}
            </span>
            <div className="flex gap-2">
              <a href={downloadUrl(lightbox, `${m.title} ${m.images.indexOf(lightbox) + 1}`)} download className="btn-light">
                <DownloadIcon /> Télécharger
              </a>
              <button onClick={() => setLightbox(null)} className="btn-dark" aria-label="Fermer">
                Fermer
              </button>
            </div>
          </div>
          <button className="grid flex-1 cursor-zoom-out place-items-center p-4 pt-0" onClick={() => setLightbox(null)} aria-label="Fermer l'image">
            <img src={lightbox.replace("/w780/", "/original/")} alt="" className="max-h-[calc(100vh-96px)] max-w-full rounded-lg" />
          </button>
        </div>
      )}
    </div>
  );
}
