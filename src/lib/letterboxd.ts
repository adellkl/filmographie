// Côté serveur : lecture du flux RSS public d'un profil Letterboxd.
import { XMLParser } from "fast-xml-parser";
import type { DiaryEntry } from "./types";

type RssItem = {
  title: string;
  link: string;
  guid: string | { "#text": string };
  pubDate: string;
  "letterboxd:watchedDate"?: string;
  "letterboxd:rewatch"?: string;
  "letterboxd:filmTitle"?: string;
  "letterboxd:filmYear"?: number | string;
  "letterboxd:memberRating"?: number | string;
  "letterboxd:memberLike"?: string;
  "tmdb:movieId"?: number | string;
  description?: string;
};

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

function parseDescription(html = "") {
  const poster = html.match(/<img src="([^"]+)"/)?.[1] ?? null;
  const paragraphs = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)]
    .map((m) => m[1])
    .filter((p) => !p.includes("<img"))
    .map((p) => decode(p.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "")).trim())
    .filter((p) => p && !/^Watched on /.test(p));
  return { poster, review: paragraphs.join("\n\n") };
}

export async function fetchLetterboxdDiary(user: string): Promise<DiaryEntry[]> {
  const res = await fetch(`https://letterboxd.com/${encodeURIComponent(user)}/rss/`, {
    headers: { "User-Agent": "Mozilla/5.0 (cinetheque-local)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Letterboxd ${res.status}`);
  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: true });
  const doc = parser.parse(xml);
  const raw = doc?.rss?.channel?.item;
  const items: RssItem[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  return items
    .filter((it) => it["letterboxd:filmTitle"]) // ignore les listes
    .map((it) => {
      const guid = typeof it.guid === "string" ? it.guid : it.guid["#text"];
      const { poster, review } = parseDescription(it.description);
      const rating = it["letterboxd:memberRating"] != null ? Number(it["letterboxd:memberRating"]) : null;
      return {
        id: guid.replace(/[^a-z0-9-]/gi, "-"),
        tmdbId: it["tmdb:movieId"] ? Number(it["tmdb:movieId"]) : null,
        title: decode(String(it["letterboxd:filmTitle"])),
        year: it["letterboxd:filmYear"] ? Number(it["letterboxd:filmYear"]) : null,
        poster,
        rating: Number.isFinite(rating) ? rating : null,
        liked: it["letterboxd:memberLike"] === "Yes",
        rewatch: it["letterboxd:rewatch"] === "Yes",
        review,
        watchedDate: it["letterboxd:watchedDate"] ?? new Date(it.pubDate).toISOString().slice(0, 10),
        source: "letterboxd" as const,
        letterboxdUrl: it.link,
        createdAt: new Date(it.pubDate).getTime(),
      };
    });
}
