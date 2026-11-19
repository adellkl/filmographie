"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { markNewsSeen, useNews, type NewsItem } from "@/lib/news";
import { mediaHref } from "@/lib/types";
import { usePageMotion } from "@/components/motion";
import { Chip, Empty, PageHead, SectionHead } from "@/components/Section";
import { PagedGrid } from "@/components/PagedGrid";
import { Poster } from "@/components/Poster";
import { PushSettings } from "@/components/PushSettings";

const KIND: Record<NewsItem["kind"], { label: string; dot: string }> = {
  release: { label: "Au cinéma", dot: "bg-signal" },
  episode: { label: "Nouvel épisode", dot: "bg-signal" },
  streaming: { label: "Streaming", dot: "bg-metric" },
  "next-episode": { label: "Prochain épisode", dot: "bg-stone" },
  upcoming: { label: "Bientôt", dot: "bg-stone" },
};

const FILTERS = [
  ["all", "Tout"],
  ["now", "Maintenant"],
  ["soon", "Bientôt"],
] as const;

const fmt = (d: string | null) => (d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "");

export default function NewsPage() {
  const { items, cinema, seen, loading, refresh, at } = useNews();
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const root = useRef<HTMLDivElement>(null);
  usePageMotion(root, [items.length, cinema.length]);

  const shown = useMemo(
    () =>
      items.filter((i) =>
        filter === "all" ? true : filter === "now" ? ["release", "episode", "streaming"].includes(i.kind) : ["upcoming", "next-episode"].includes(i.kind),
      ),
    [items, filter],
  );
  const unreadCount = items.filter((i) => !seen.includes(i.key)).length;

  return (
    <div ref={root} className="shell">
      <PageHead eyebrow="Nouveautés" title={unreadCount ? `${unreadCount} nouveauté${unreadCount > 1 ? "s" : ""}.` : "Tout est à jour."}>
        <div className="flex flex-wrap gap-2">
          {unreadCount > 0 && (
            <button onClick={() => markNewsSeen(items.map((i) => i.key))} className="btn-dark">
              Tout marquer comme lu
            </button>
          )}
          <button onClick={refresh} disabled={loading} className="btn-ghost">
            {loading ? "Mise à jour…" : "Actualiser"}
          </button>
        </div>
      </PageHead>

      {/* Pour toi */}
      <section className="mt-14">
        <SectionHead
          eyebrow={`Pour toi · ${items.length}`}
          live
          title="Tes titres bougent."
          lede="Sorties au cinéma, arrivées en streaming et nouveaux épisodes pour ta liste à voir et les séries que tu regardes."
          action={
            <div className="flex gap-2">
              {FILTERS.map(([k, l]) => (
                <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
                  {l}
                </Chip>
              ))}
            </div>
          }
        />
        {loading && !items.length ? (
          <p className="mono flex items-center gap-2 text-granite">
            <span className="pulse" /> Recherche des nouveautés…
          </p>
        ) : !shown.length ? (
          <Empty title="Rien de neuf pour l'instant.">
            <p className="text-body text-granite">Ajoute des films et séries à ta liste à voir pour suivre leurs sorties.</p>
          </Empty>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {shown.map((n) => {
              const unread = !seen.includes(n.key);
              return (
                <li key={n.key} className="min-w-0">
                  <Link
                    href={mediaHref(n.type, n.id)!}
                    onClick={() => markNewsSeen([n.key])}
                    className={`card flex h-full items-center gap-4 p-3 transition-[border-color,background-color] duration-150 hover:border-ash ${unread ? "bg-lift/40" : ""}`}
                  >
                    <span className="h-20 w-14 shrink-0 overflow-hidden rounded-sm bg-lift">
                      {n.poster && <img src={n.poster} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mono flex items-center gap-2 text-granite">
                        <span className={`h-1.5 w-1.5 rounded-full ${KIND[n.kind].dot}`} />
                        {KIND[n.kind].label}
                        {n.date && <span className="text-graphite">· {fmt(n.date)}</span>}
                      </span>
                      <span className="mt-1.5 block truncate text-body text-bone">{n.title}</span>
                      <span className="mt-0.5 block truncate text-body-sm text-stone">{n.detail}</span>
                    </span>
                    {unread && <span className="pulse mr-1" aria-label="Non lu" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {at && <p className="mono mt-4 text-graphite">Mis à jour {new Date(at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>}
      </section>

      {/* Notifications */}
      <section className="mt-24">
        <PushSettings />
      </section>

      {/* Au cinéma */}
      {cinema.length > 0 && (
        <section className="mt-24">
          <SectionHead eyebrow="France · cette semaine" title="Au cinéma." />
          <PagedGrid
            items={cinema}
            keyOf={(m) => String(m.id)}
            allHref="/recherche?type=movie"
            allLabel="Explorer les films"
            render={(m) => <Poster tmdbId={m.id} mediaType="movie" title={m.title} year={Number(m.date?.slice(0, 4)) || null} poster={m.poster} caption status />}
          />
        </section>
      )}
    </div>
  );
}
