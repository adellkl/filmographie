// Côté client : lecture de l'export Letterboxd (ZIP ou CSV) → entrées du journal + watchlist.
import JSZip from "jszip";
import Papa from "papaparse";
import type { DiaryEntry, WatchlistItem } from "./types";

type Row = Record<string, string>;

const parse = (text: string): Row[] =>
  Papa.parse<Row>(text, { header: true, skipEmptyLines: true }).data;

const keyOf = (name: string, year: string | number | null) =>
  `${name.trim().toLowerCase()}|${year ?? ""}`;

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export type ParsedExport = { entries: DiaryEntry[]; watchlist: WatchlistItem[] };

export async function readLetterboxdExport(files: File[]): Promise<ParsedExport> {
  return parseExport(await collectCsv(files));
}

async function collectCsv(files: File[]) {
  const csv: Record<string, string> = {};
  for (const file of files) {
    if (file.name.toLowerCase().endsWith(".zip")) {
      const zip = await JSZip.loadAsync(file);
      await Promise.all(
        Object.values(zip.files)
          .filter((f) => !f.dir && f.name.endsWith(".csv") && !/(^|\/)(deleted|orphaned)\//.test(f.name))
          .map(async (f) => {
            csv[f.name.replace(/^.*?(likes\/)?([^/]+)$/, (_, l, n) => (l ? "likes-" : "") + n)] = await f.async("string");
          }),
      );
    } else if (file.name.toLowerCase().endsWith(".csv")) {
      csv[file.name] = await file.text();
    }
  }
  return csv;
}

/** Fichiers attendus : diary.csv, reviews.csv, ratings.csv, watched.csv, watchlist.csv, likes-films.csv */
export function parseExport(csv: Record<string, string>): ParsedExport {

  const diary = parse(csv["diary.csv"] ?? "");
  const reviews = parse(csv["reviews.csv"] ?? "");
  const ratings = parse(csv["ratings.csv"] ?? "");
  const watched = parse(csv["watched.csv"] ?? "");
  const likes = parse(csv["likes-films.csv"] ?? "");
  const watchlistRows = parse(csv["watchlist.csv"] ?? "");

  const liked = new Set(likes.map((r) => keyOf(r.Name, r.Year)));
  const ratingByFilm = new Map(ratings.map((r) => [keyOf(r.Name, r.Year), Number(r.Rating) || null]));
  const reviewByUri = new Map(reviews.map((r) => [r["Letterboxd URI"], r.Review ?? ""]));
  const reviewByKey = new Map(
    reviews.map((r) => [keyOf(r.Name, r.Year) + "|" + (r["Watched Date"] || r.Date), r.Review ?? ""]),
  );

  const entries: DiaryEntry[] = [];
  const seenFilms = new Set<string>();

  const rowsWithDiary = diary.length ? diary : reviews;
  for (const r of rowsWithDiary) {
    const k = keyOf(r.Name, r.Year);
    const watchedDate = r["Watched Date"] || r.Date;
    seenFilms.add(k);
    entries.push({
      id: `csv-${slug(r.Name)}-${r.Year}-${watchedDate}`,
      tmdbId: null,
      title: r.Name,
      year: Number(r.Year) || null,
      poster: null,
      rating: Number(r.Rating) || null,
      liked: liked.has(k),
      rewatch: r.Rewatch === "Yes",
      review: reviewByUri.get(r["Letterboxd URI"]) ?? reviewByKey.get(k + "|" + watchedDate) ?? "",
      watchedDate,
      source: "csv",
      letterboxdUrl: r["Letterboxd URI"],
      createdAt: new Date(r.Date).getTime() || Date.now(),
    });
  }

  // Films marqués « vus » sans entrée de journal
  for (const r of watched) {
    const k = keyOf(r.Name, r.Year);
    if (seenFilms.has(k)) continue;
    seenFilms.add(k);
    entries.push({
      id: `csv-${slug(r.Name)}-${r.Year}-watched`,
      tmdbId: null,
      title: r.Name,
      year: Number(r.Year) || null,
      poster: null,
      rating: ratingByFilm.get(k) ?? null,
      liked: liked.has(k),
      rewatch: false,
      review: "",
      watchedDate: r.Date,
      source: "csv",
      letterboxdUrl: r["Letterboxd URI"],
      createdAt: new Date(r.Date).getTime() || Date.now(),
    });
  }

  const watchlist: WatchlistItem[] = watchlistRows.map((r) => ({
    id: `csv-${slug(r.Name)}-${r.Year}`,
    tmdbId: null,
    title: r.Name,
    year: Number(r.Year) || null,
    poster: null,
    addedAt: new Date(r.Date).getTime() || Date.now(),
  }));

  return { entries, watchlist };
}

/** Complète tmdbId + affiche via l'API TMDB, par paquets. */
type Match = { tmdbId: number; poster: string | null; mediaType: "movie" | "tv" };

export async function enrichWithTmdb<
  T extends { tmdbId: number | null; poster: string | null; title: string; year: number | null; mediaType?: "movie" | "tv" },
>(
  items: T[],
  onProgress?: (done: number, total: number) => void,
): Promise<T[]> {
  const todo = items.filter((i) => !i.tmdbId);
  const uniq = new Map<string, { title: string; year: number | null }>();
  for (const i of todo) uniq.set(keyOf(i.title, i.year), { title: i.title, year: i.year });
  const keys = [...uniq.keys()];
  const found = new Map<string, Match | null>();
  const CHUNK = 25;
  for (let i = 0; i < keys.length; i += CHUNK) {
    const batch = keys.slice(i, i + CHUNK).map((k) => ({ key: k, ...uniq.get(k)! }));
    const res = await fetch("/api/tmdb/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: batch }),
    });
    if (!res.ok) break; // TMDB non configuré : on garde les entrées sans affiche
    const data: { results: Record<string, Match | null> } = await res.json();
    for (const [k, v] of Object.entries(data.results)) found.set(k, v);
    onProgress?.(Math.min(i + CHUNK, keys.length), keys.length);
  }
  return items.map((i) => {
    if (i.tmdbId) return i;
    const hit = found.get(keyOf(i.title, i.year));
    return hit ? { ...i, tmdbId: hit.tmdbId, mediaType: hit.mediaType, poster: i.poster ?? hit.poster } : i;
  });
}
