// Côté serveur uniquement : la clé TMDB ne sort jamais du serveur.
import type { MediaFull, MediaLite, MediaType, Person, Season } from "./types";

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";

export const tmdbConfigured = () => Boolean(process.env.TMDB_API_KEY || process.env.TMDB_READ_TOKEN);

export const img = (path: string | null | undefined, size = "w500") => (path ? `${IMG}/${size}${path}` : null);

export async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(BASE + path);
  url.searchParams.set("language", params.language ?? "fr-FR");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const headers: Record<string, string> = { accept: "application/json" };
  if (process.env.TMDB_READ_TOKEN) headers.Authorization = `Bearer ${process.env.TMDB_READ_TOKEN}`;
  else if (process.env.TMDB_API_KEY) url.searchParams.set("api_key", process.env.TMDB_API_KEY);
  else throw new Error("TMDB_NOT_CONFIGURED");
  const res = await fetch(url, { headers, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json() as Promise<T>;
}

/* ───────── Genres ───────── */
type Genre = { id: number; name: string };
const genreCache: Partial<Record<MediaType, Promise<Map<number, string>>>> = {};
export function genreMap(type: MediaType) {
  genreCache[type] ??= tmdb<{ genres: Genre[] }>(`/genre/${type}/list`)
    .then((d) => new Map(d.genres.map((g) => [g.id, g.name])))
    .catch((e) => {
      delete genreCache[type];
      throw e;
    });
  return genreCache[type]!;
}
export async function genres(type: MediaType) {
  const m = await genreMap(type);
  return [...m.entries()].map(([id, name]) => ({ id, name }));
}

/* ───────── Normalisation ───────── */
type Raw = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  genre_ids?: number[];
  genres?: Genre[];
  popularity?: number;
};

const yearOf = (d?: string) => (d ? Number(d.slice(0, 4)) || null : null);

function lite(m: Raw, type: MediaType, gm?: Map<number, string>): MediaLite {
  return {
    id: m.id,
    type,
    title: (m.title ?? m.name ?? "").trim(),
    originalTitle: m.original_title ?? m.original_name ?? "",
    year: yearOf(m.release_date ?? m.first_air_date),
    poster: img(m.poster_path, "w342"),
    backdrop: img(m.backdrop_path, "w1280"),
    overview: m.overview ?? "",
    vote: m.vote_average ?? 0,
    genres: m.genres?.map((g) => g.name) ?? (m.genre_ids ?? []).map((id) => gm?.get(id)).filter((g): g is string => !!g),
  };
}

async function maps() {
  const [movie, tv] = await Promise.all([genreMap("movie"), genreMap("tv")]);
  return { movie, tv };
}

type Page = { results: MediaLite[]; page: number; totalPages: number; totalResults: number };

export async function search(q: string, type: MediaType | "all", page = 1): Promise<Page> {
  const g = await maps();
  const path = type === "all" ? "/search/multi" : `/search/${type}`;
  const d = await tmdb<{ results: Raw[]; page: number; total_pages: number; total_results: number }>(path, {
    query: q,
    page: String(page),
    include_adult: "false",
  });
  const results = d.results
    .filter((r) => type !== "all" || r.media_type === "movie" || r.media_type === "tv")
    .map((r) => {
      const t = (type === "all" ? r.media_type : type) as MediaType;
      return lite(r, t, g[t]);
    });
  return { results, page: d.page, totalPages: Math.min(d.total_pages, 500), totalResults: d.total_results };
}

export async function discover(
  type: MediaType,
  opts: { genre?: string; year?: string; sort?: string; page?: number },
): Promise<Page> {
  const g = await maps();
  const params: Record<string, string> = {
    page: String(opts.page ?? 1),
    sort_by: opts.sort || "popularity.desc",
    include_adult: "false",
    "vote_count.gte": opts.sort?.startsWith("vote_average") ? "300" : "20",
  };
  if (opts.genre) params.with_genres = opts.genre;
  if (opts.year) params[type === "movie" ? "primary_release_year" : "first_air_date_year"] = opts.year;
  const d = await tmdb<{ results: Raw[]; page: number; total_pages: number; total_results: number }>(
    `/discover/${type}`,
    params,
  );
  return {
    results: d.results.map((r) => lite(r, type, g[type])),
    page: d.page,
    totalPages: Math.min(d.total_pages, 500),
    totalResults: d.total_results,
  };
}

export async function trending(type: MediaType | "all" = "all") {
  const g = await maps();
  const d = await tmdb<{ results: Raw[] }>(`/trending/${type}/week`);
  return d.results
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .map((r) => lite(r, r.media_type as MediaType, g[r.media_type as MediaType]));
}

/* ───────── Fiche détaillée ───────── */
type RawPerson = {
  id: number;
  name: string;
  character?: string;
  job?: string;
  profile_path: string | null;
  roles?: { character: string }[];
};
const person = (p: RawPerson, role: string): Person => ({ id: p.id, name: p.name, role, photo: img(p.profile_path, "w185") });

const jobsFr: Record<string, string> = {
  Director: "Réalisation",
  Screenplay: "Scénario",
  Writer: "Scénario",
  Novel: "Roman",
  "Director of Photography": "Image",
  "Original Music Composer": "Musique",
  Editor: "Montage",
  Producer: "Production",
  "Executive Producer": "Production exécutive",
};

export async function details(type: MediaType, id: string): Promise<MediaFull> {
  type RawFull = Raw & {
    tagline: string;
    runtime?: number | null;
    episode_run_time?: number[];
    status: string;
    budget?: number;
    revenue?: number;
    production_countries: { name: string }[];
    spoken_languages: { name: string; english_name: string }[];
    created_by?: RawPerson[];
    networks?: { name: string }[];
    number_of_seasons?: number;
    number_of_episodes?: number;
    last_air_date?: string;
    seasons?: { season_number: number; name: string; episode_count: number; air_date: string | null; poster_path: string | null; overview: string }[];
    credits?: { cast: RawPerson[]; crew: RawPerson[] };
    aggregate_credits?: { cast: RawPerson[]; crew: (RawPerson & { jobs?: { job: string }[] })[] };
    videos: { results: { key: string; site: string; type: string }[] };
    recommendations: { results: Raw[] };
    similar: { results: Raw[] };
    images: { backdrops: { file_path: string }[] };
    keywords: { keywords?: { name: string }[]; results?: { name: string }[] };
    "watch/providers": { results: Record<string, { flatrate?: { provider_name: string; logo_path: string }[] }> };
  };
  const g = await maps();
  const m = await tmdb<RawFull>(`/${type}/${id}`, {
    append_to_response: `${type === "tv" ? "aggregate_credits" : "credits"},videos,recommendations,similar,images,keywords,watch/providers`,
    include_video_language: "fr,en",
    include_image_language: "null,fr,en",
  });

  const base = lite(m, type, g[type]);
  const credits = type === "tv" ? m.aggregate_credits : m.credits;
  const castRaw = credits?.cast ?? [];
  const crewRaw = (credits?.crew ?? []) as (RawPerson & { jobs?: { job: string }[] })[];
  const jobOf = (c: RawPerson & { jobs?: { job: string }[] }) => c.job ?? c.jobs?.[0]?.job ?? "";

  const trailer =
    m.videos.results.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
    m.videos.results.find((v) => v.site === "YouTube");
  const recs = (m.recommendations.results.length ? m.recommendations.results : m.similar.results).slice(0, 12);
  const seasons: Season[] = (m.seasons ?? [])
    .filter((s) => s.season_number > 0)
    .map((s) => ({
      number: s.season_number,
      name: s.name,
      episodes: s.episode_count,
      year: yearOf(s.air_date ?? undefined),
      poster: img(s.poster_path, "w185"),
      overview: s.overview,
    }));

  const seenCrew = new Set<string>();
  return {
    ...base,
    tagline: m.tagline ?? "",
    runtime: m.runtime ?? m.episode_run_time?.[0] ?? null,
    releaseDate: m.release_date ?? m.first_air_date ?? null,
    status: m.status,
    directors:
      type === "tv"
        ? (m.created_by ?? []).map((p) => person(p, "Création"))
        : crewRaw.filter((c) => jobOf(c) === "Director").map((p) => person(p, "Réalisation")),
    cast: castRaw.slice(0, 18).map((p) => person(p, p.character ?? p.roles?.[0]?.character ?? "")),
    crew: crewRaw
      .filter((c) => jobsFr[jobOf(c)] && jobOf(c) !== "Director")
      .filter((c) => {
        const k = `${c.id}-${jobsFr[jobOf(c)]}`;
        return seenCrew.has(k) ? false : (seenCrew.add(k), true);
      })
      .slice(0, 8)
      .map((p) => person(p, jobsFr[jobOf(p)])),
    countries: m.production_countries.map((c) => c.name),
    languages: m.spoken_languages.map((l) => l.name || l.english_name),
    trailerKey: trailer?.key ?? null,
    recommendations: recs.map((r) => lite(r, type, g[type])),
    providers: (m["watch/providers"]?.results?.FR?.flatrate ?? []).map((p) => ({
      name: p.provider_name,
      logo: img(p.logo_path, "w92"),
    })),
    images: m.images.backdrops.slice(0, 9).map((b) => img(b.file_path, "w780")!),
    keywords: (m.keywords.keywords ?? m.keywords.results ?? []).slice(0, 10).map((k) => k.name),
    budget: m.budget || null,
    revenue: m.revenue || null,
    seasons,
    networks: (m.networks ?? []).map((n) => n.name),
    numberOfSeasons: m.number_of_seasons ?? null,
    numberOfEpisodes: m.number_of_episodes ?? null,
    lastAirYear: yearOf(m.last_air_date),
  };
}

const normTitle = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Retrouve l'ID TMDB d'un titre Letterboxd (VO + année).
 * Cherche à la fois parmi les films et les séries (Letterboxd liste aussi des mini-séries),
 * puis choisit : titre exact > année > popularité.
 */
export async function matchMovie(title: string, year: number | null) {
  const search = (path: string, yearKey: string) =>
    tmdb<{ results: Raw[] }>(path, { query: title, language: "en-US", ...(year ? { [yearKey]: String(year) } : {}) })
      .then((d) => d.results.slice(0, 5))
      .catch(() => [] as Raw[]);
  let [movies, shows] = await Promise.all([search("/search/movie", "year"), search("/search/tv", "first_air_date_year")]);
  if (!movies.length && !shows.length && year) {
    [movies, shows] = await Promise.all([search("/search/movie", "_"), search("/search/tv", "_")]);
  }
  const want = normTitle(title);
  const score = (r: Raw) => {
    const names = [r.title, r.name, r.original_title, r.original_name].filter(Boolean).map((n) => normTitle(n!));
    const y = yearOf(r.release_date ?? r.first_air_date);
    return (
      (names.includes(want) ? 4 : 0) +
      (year && y ? (y === year ? 3 : Math.abs(y - year) === 1 ? 1 : 0) : 0) +
      Math.min(2, Math.log10(1 + (r.popularity ?? 0)))
    );
  };
  const candidates = [
    ...movies.map((r) => ({ r, type: "movie" as const })),
    ...shows.map((r) => ({ r, type: "tv" as const })),
  ].sort((a, b) => score(b.r) - score(a.r));
  const best = candidates[0];
  // Épisodes listés comme films (« Série : Épisode ») → la série elle-même
  if (!best && title.includes(":")) return matchMovie(title.split(":")[0], null);
  return best ? { tmdbId: best.r.id, poster: img(best.r.poster_path, "w342"), mediaType: best.type } : null;
}
