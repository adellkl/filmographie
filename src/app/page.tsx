"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { computeStats, useLibrary } from "@/lib/library";
import { usePageMotion } from "@/components/motion";
import { Poster } from "@/components/Poster";
import { Chip, Empty, SectionHead } from "@/components/Section";
import { HomeHero } from "@/components/HomeHero";
import { openSearch, useTrending } from "@/components/useTrending";
import { useHref, useView } from "@/lib/view";
import { themeOf } from "@/components/themes";
import { PagedGrid } from "@/components/PagedGrid";
import { Reviews } from "@/components/Reviews";

const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

export default function Home() {
  const { entries, lists, watchlist } = useLibrary();
  const { readOnly, owner } = useView();
  const who = owner?.name ?? "Adel";
  const toHref = useHref();
  const stats = useMemo(() => computeStats(entries), [entries]);
  const trending = useTrending("all");
  const [trendType, setTrendType] = useState<"all" | "movie" | "tv">("all");
  const root = useRef<HTMLDivElement>(null);
  usePageMotion(root, [entries.length, lists.length, watchlist.length]);

  const recent = entries;
  const reviews = entries.filter((e) => e.review);
  const favorites = stats.unique.filter((e) => e.liked);
  const best = stats.unique
    .filter((e) => (e.rating ?? 0) >= 5)
    .sort((a, b) => b.watchedDate.localeCompare(a.watchedDate));
  const topLists = lists.filter((l) => l.items.length).slice(0, 3);
  const nextUp = watchlist.slice(0, 6);
  const maxDist = Math.max(1, ...stats.dist.map((d) => d.count));
  const years = stats.byYear.slice(-8);
  const maxYear = Math.max(1, ...years.map(([, n]) => n));
  const trend = (trending?.results ?? []).filter((m) => trendType === "all" || m.type === trendType).slice(0, 12);

  return (
    <div ref={root}>
      <HomeHero
        entries={entries}
        trending={trending?.results ?? []}
        stats={{ films: stats.films, avg: stats.avg, likes: stats.likes, logs: stats.logs }}
        lists={lists.length}
      />

      {/* ───────── Récemment vus ───────── */}
      <section className="shell mt-24">
        <SectionHead
          eyebrow="Journal"
          title={readOnly ? `Vus récemment par ${who}` : "Récemment vus"}
        />
        {recent.length ? (
          <PagedGrid
            items={recent}
            keyOf={(e) => e.id}
            allHref={toHref("/journal")}
            allLabel="Tout le journal"
            render={(e) => (
              <>
                <Poster {...e} caption />
                <span className="mono mt-2 block text-graphite">{fmtDate(e.watchedDate)}</span>
              </>
            )}
          />
        ) : (
          <Empty title={readOnly ? "Journal vide." : "Ton journal est vide."}>
            {!readOnly && (
              <Link href="/import" className="btn-dark">
                Importer depuis Letterboxd →
              </Link>
            )}
          </Empty>
        )}
      </section>

      {/* ───────── Coups de cœur ───────── */}
      {favorites.length > 0 && (
        <section className="shell mt-24">
          <SectionHead
            eyebrow={`Coups de cœur · ${stats.likes}`}
            title={readOnly ? "Ceux qu'il ne faut pas rater." : "Tes coups de cœur."}
          />
          <PagedGrid
            items={favorites}
            keyOf={(e) => e.id}
            allHref={toHref("/films?liked=1")}
            allLabel="Tous les coups de cœur"
            render={(e) => <Poster {...e} caption badge />}
          />
        </section>
      )}

      {/* ───────── Les mieux notés ───────── */}
      {best.length > 0 && (
        <section className="shell mt-24">
          <SectionHead
            eyebrow="5 étoiles"
            title={readOnly ? "Ses chefs-d'œuvre." : "Tes chefs-d'œuvre."}
            lede={`${best.length} titres notés 5/5${readOnly ? ` par ${who}` : ""}.`}
          />
          <PagedGrid
            items={best}
            keyOf={(e) => e.id}
            allHref={toHref("/films?min=5&sort=rating")}
            allLabel="Tous les 5 étoiles"
            render={(e) => <Poster {...e} caption badge />}
          />
        </section>
      )}

      {/* ───────── Statistiques ───────── */}
      {stats.films > 0 && (
        <section className="shell mt-24">
          <SectionHead eyebrow="Statistiques" title={readOnly ? "Ses notes." : "Comment tu notes."} />
          <div className="mb-6 grid grid-cols-2 rounded-lg border border-lift sm:grid-cols-4">
            {[
              ["Titres vus", stats.films, 0],
              ["Séances", stats.logs, 0],
              ["Note moyenne", Number(stats.avg.toFixed(2)), 2],
              ["Critiques", stats.reviews, 0],
            ].map(([k, v, d], i) => (
              <div key={String(k)} className={`p-5 ${i % 2 ? "border-l border-lift" : ""} ${i > 1 ? "border-t border-lift sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""}`}>
                <span className="label">{k}</span>
                <p className="mt-3 text-heading tabular-nums text-bone" data-count={v} data-decimals={d}>
                  {Number(v).toFixed(Number(d))}
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-6">
              <div className="flex items-baseline justify-between">
                <span className="label">Répartition des notes</span>
                <span className="mono text-granite">{stats.dist.reduce((s, d) => s + d.count, 0)} notés</span>
              </div>
              <div className="mt-8 flex h-44 items-end gap-2">
                {stats.dist.map((d) => (
                  <div key={d.rating} className="group flex h-full flex-1 flex-col justify-end" title={`${d.rating}★ : ${d.count}`}>
                    <span className="mono mb-2 text-center text-granite opacity-0 transition-opacity duration-150 group-hover:opacity-100">{d.count}</span>
                    <div
                      data-bar
                      className="w-full rounded-sm bg-graphite transition-colors duration-150 group-hover:bg-stone"
                      style={{ height: `${(d.count / maxDist) * 100}%`, minHeight: d.count ? 2 : 0 }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2 border-t border-lift pt-3">
                {stats.dist.map((d) => (
                  <span key={d.rating} className="mono flex-1 text-center text-granite">
                    {d.rating % 1 ? `${Math.floor(d.rating) || ""}½` : d.rating}
                  </span>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-baseline justify-between">
                <span className="label">Séances par année</span>
                <span className="mono flex items-center gap-2 text-granite">
                  <span className="pulse bg-metric" /> {stats.logs} au total
                </span>
              </div>
              <div className="mt-8 flex h-44 items-end gap-3">
                {years.map(([y, n], i) => (
                  <div key={y} className="flex h-full flex-1 flex-col justify-end" title={`${y} : ${n}`}>
                    <span className="mono mb-2 text-center text-stone">{n}</span>
                    <div
                      data-bar
                      className={`w-full rounded-sm ${i === years.length - 1 ? "bg-metric" : "bg-graphite"}`}
                      style={{ height: `${(n / maxYear) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-3 border-t border-lift pt-3">
                {years.map(([y]) => (
                  <span key={y} className="mono flex-1 text-center text-granite">
                    {y}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────── Critiques ───────── */}
      {reviews.length > 0 && (
        <section className="shell mt-24">
          <Reviews reviews={reviews} title={readOnly ? "Ses critiques." : "Ce que tu en as dit."} />
        </section>
      )}

      {/* ───────── Listes ───────── */}
      {topLists.length > 0 && (
        <section className="shell mt-24">
          <SectionHead
            eyebrow={`Listes · ${lists.length}`}
            title={readOnly ? "Ses listes." : "Tes listes."}
            action={
              <Link href={toHref("/listes")} className="btn-ghost self-start">
                Toutes les listes →
              </Link>
            }
          />
          <div className="grid gap-6 md:grid-cols-3">
            {topLists.map((l) => (
              <Link key={l.id} href={toHref(`/listes/${l.id}`)} className="card flex flex-col gap-5 p-5 transition-[border-color] duration-150 hover:border-ash">
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span key={i} className="aspect-[2/3] overflow-hidden rounded-sm bg-lift">
                      {l.items[i]?.poster && <img src={l.items[i].poster!} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    </span>
                  ))}
                </div>
                <div>
                  <span className="label">
                    {themeOf(l.theme).glyph} {themeOf(l.theme).label} · {l.items.length} titre{l.items.length > 1 ? "s" : ""}
                  </span>
                  <h3 className="mt-3 text-[24px] leading-tight tracking-[-0.025em] text-bone">{l.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ───────── À voir ───────── */}
      {nextUp.length > 0 && (
        <section className="shell mt-24">
          <SectionHead
            eyebrow={`À voir · ${watchlist.length}`}
            title={readOnly ? "Sa prochaine séance." : "Ta prochaine séance."}
            action={
              <Link href={toHref("/watchlist")} className="btn-ghost self-start">
                Toute la liste →
              </Link>
            }
          />
          <div className="grid grid-cols-3 gap-6 sm:grid-cols-6">
            {nextUp.map((w) => (
              <Poster key={w.id} tmdbId={w.tmdbId} mediaType={w.mediaType} title={w.title} year={w.year} poster={w.poster} caption badge />
            ))}
          </div>
        </section>
      )}

      {/* ───────── Tendances (privé uniquement) ───────── */}
      {!readOnly && <section className="shell mt-24">
        <SectionHead
          eyebrow="TMDB · cette semaine"
          live
          title="Tendances"
          action={
            <div className="flex gap-2">
              {(
                [
                  ["all", "Tout"],
                  ["movie", "Films"],
                  ["tv", "Séries"],
                ] as const
              ).map(([k, l]) => (
                <Chip key={k} active={trendType === k} onClick={() => setTrendType(k)}>
                  {l}
                </Chip>
              ))}
            </div>
          }
        />
        {trending && !trending.configured ? (
          <Empty title="TMDB n'est pas encore branché." />
        ) : (
          <div className="grid grid-cols-3 gap-6 sm:grid-cols-4 lg:grid-cols-6">
            {trend.map((m) => (
              <Poster key={`${m.type}-${m.id}`} tmdbId={m.id} mediaType={m.type} title={m.title} year={m.year} poster={m.poster} caption badge status />
            ))}
          </div>
        )}
      </section>}

      {/* ───────── CTA ───────── */}
      {!readOnly && <section className="shell mt-24">
        <div className="card-bone max-w-[480px] p-6">
          <span className="mono relative z-10 flex items-center gap-2">
            <span className="pulse" /> Prochaine séance
          </span>
          <p className="relative z-10 mt-6 text-heading text-ink">Tu as vu quelque chose ce soir ?</p>
          <button onClick={openSearch} className="btn-ink relative z-10 mt-8">
            Noter un film ou une série →
          </button>
        </div>
      </section>}
    </div>
  );
}
