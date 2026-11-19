"use client";

import { useEffect, useState } from "react";
import type { DiaryEntry } from "@/lib/types";
import { PagedGrid } from "./PagedGrid";
import { ReviewCard, ReviewMarquee } from "./ReviewMarquee";
import { SectionHead } from "./Section";

const KEY = "cinetheque.reviews.auto2";

/** Section critiques : défilement automatique (option) ou affichage page par page. */
export function Reviews({ reviews, title }: { reviews: DiaryEntry[]; title: string }) {
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "0") queueMicrotask(() => setAuto(false));
    } catch {}
  }, []);

  const toggle = () =>
    setAuto((v) => {
      try {
        localStorage.setItem(KEY, v ? "0" : "1");
      } catch {}
      return !v;
    });

  return (
    <>
      <SectionHead
        eyebrow={`Critiques · ${reviews.length}`}
        title={title}
        lede={auto ? "Survole une rangée pour la mettre en pause." : undefined}
        action={
          <button
            role="switch"
            aria-checked={auto}
            onClick={toggle}
            className="mono flex h-9 cursor-pointer items-center gap-2 self-start rounded-sm border border-ash px-3 text-stone transition-colors duration-150 hover:border-stone hover:text-bone"
          >
            <span className={`relative h-3.5 w-6 rounded-full transition-colors duration-150 ${auto ? "bg-metric" : "bg-graphite"}`} aria-hidden>
              <span className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-canvas transition-[left] duration-150 ${auto ? "left-3" : "left-0.5"}`} />
            </span>
            Défilement auto
          </button>
        }
      />
      {auto ? (
        <ReviewMarquee reviews={reviews} />
      ) : (
        <PagedGrid
          items={reviews}
          pageSize={6}
          keyOf={(e) => e.id}
          className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
          render={(e) => <ReviewCard e={e} tone={reviews.indexOf(e) % 3 === 0 ? "bone" : "dark"} fluid />}
        />
      )}
    </>
  );
}
