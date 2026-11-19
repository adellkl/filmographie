"use client";

import Link from "next/link";
import { Stars } from "./Stars";
import { useLibrary } from "@/lib/library";
import { useHref } from "@/lib/view";
import { mediaHref, type MediaType } from "@/lib/types";

type Props = {
  title: string;
  year?: number | null;
  poster: string | null;
  tmdbId?: number | null;
  mediaType?: MediaType;
  rating?: number | null;
  liked?: boolean;
  caption?: boolean;
  /** Affiche « Série » sur les séries */
  badge?: boolean;
  /** Affiche le statut : déjà vu, à voir, dans des listes */
  status?: boolean;
  /** Ne pas afficher « À voir » (quand un bouton dédié est déjà présent) */
  hideWatch?: boolean;
  className?: string;
};

export function Poster({
  title,
  year,
  poster,
  tmdbId,
  mediaType,
  rating,
  liked,
  caption = false,
  badge = false,
  status = false,
  hideWatch = false,
  className = "",
}: Props) {
  const lib = useLibrary();
  const href = useHref();
  const st = status && tmdbId ? lib.status.get(`${mediaType ?? "movie"}-${tmdbId}`) : undefined;

  const tags: { key: string; text: string; strong?: boolean }[] = [];
  if (st?.seen) tags.push({ key: "seen", text: st.rating ? `✓ Vu · ${st.rating}★` : "✓ Vu", strong: true });
  if (st?.watch && !hideWatch && !st.seen) tags.push({ key: "watch", text: "À voir" });
  if (st?.lists) tags.push({ key: "lists", text: `${st.lists} liste${st.lists > 1 ? "s" : ""}` });
  if (badge && mediaType === "tv") tags.push({ key: "tv", text: "Série" });

  const body = (
    <>
      <div
        className={`relative aspect-[2/3] overflow-hidden rounded-lg border bg-lift transition-[border-color] duration-150 group-hover:border-stone ${
          st?.seen ? "border-ash" : "border-lift"
        }`}
      >
        {poster ? (
          <img src={poster} alt={`Affiche de ${title}`} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col justify-between p-3">
            <span className="mono text-granite">{year ?? "—"}</span>
            <span className="text-body-sm text-bone">{title}</span>
          </div>
        )}
        {tags.length > 0 && (
          <span className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-col items-start gap-1">
            {tags.map((t) => (
              <span
                key={t.key}
                className={`mono whitespace-nowrap rounded-sm px-1.5 py-1 ${t.strong ? "bg-bone text-ink" : "bg-canvas/85 text-bone"}`}
              >
                {t.text}
              </span>
            ))}
          </span>
        )}
      </div>
      {caption && (
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="truncate text-body-sm text-bone">{title}</span>
          <span className="flex shrink-0 items-center gap-1 text-caption text-granite">
            <Stars value={rating ?? null} />
            {liked && <span aria-label="Coup de cœur">♥</span>}
            {!rating && year ? <span className="mono">{year}</span> : null}
          </span>
        </div>
      )}
    </>
  );
  const link = href(mediaHref(mediaType, tmdbId ?? null));
  const cls = `group block ${className}`;
  return link ? (
    <Link href={link} className={cls} title={`${title}${year ? ` (${year})` : ""}`}>
      {body}
    </Link>
  ) : (
    <div className={cls} title={title}>
      {body}
    </div>
  );
}
