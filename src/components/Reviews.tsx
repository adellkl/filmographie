"use client";

import type { DiaryEntry } from "@/lib/types";
import { ReviewMarquee } from "./ReviewMarquee";
import { SectionHead } from "./Section";

/** Section critiques : deux rangées qui défilent en sens opposés (pause au survol). */
export function Reviews({ reviews, title }: { reviews: DiaryEntry[]; title: string }) {
  return (
    <>
      <SectionHead eyebrow={`Critiques · ${reviews.length}`} title={title} lede="Survole une rangée pour la mettre en pause." />
      <ReviewMarquee reviews={reviews} />
    </>
  );
}
