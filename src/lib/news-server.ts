// Côté serveur : calcule les « nouveautés » pour une liste de titres suivis.
import { img, tmdb } from "./tmdb";

export type NewsKind = "release" | "upcoming" | "streaming" | "episode" | "next-episode";
export type NewsItem = {
  key: string; // identifiant stable (sert à marquer « lu » et à ne notifier qu'une fois)
  kind: NewsKind;
  type: "movie" | "tv";
  id: number;
  title: string;
  poster: string | null;
  date: string | null; // YYYY-MM-DD
  detail: string;
};

const DAY = 86400000;
const today = () => new Date(new Date().toISOString().slice(0, 10)).getTime();
const days = (d: string) => Math.round((new Date(d).getTime() - today()) / DAY);

type MovieRaw = {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
  release_dates?: { results: { iso_3166_1: string; release_dates: { release_date: string; type: number }[] }[] };
  "watch/providers"?: { results: Record<string, { flatrate?: { provider_name: string }[] }> };
};

type TvRaw = {
  id: number;
  name: string;
  poster_path: string | null;
  last_episode_to_air?: { air_date: string; season_number: number; episode_number: number; name: string } | null;
  next_episode_to_air?: { air_date: string; season_number: number; episode_number: number; name: string } | null;
  "watch/providers"?: { results: Record<string, { flatrate?: { provider_name: string }[] }> };
};

const ep = (e: { season_number: number; episode_number: number }) => `S${String(e.season_number).padStart(2, "0")}E${String(e.episode_number).padStart(2, "0")}`;

export async function newsForMovie(id: number): Promise<NewsItem[]> {
  const m = await tmdb<MovieRaw>(`/movie/${id}`, { append_to_response: "release_dates,watch/providers" });
  const out: NewsItem[] = [];
  const base = { type: "movie" as const, id, title: m.title, poster: img(m.poster_path, "w342") };
  // Sortie salle en France (type 3), sinon date générale
  const fr = m.release_dates?.results.find((r) => r.iso_3166_1 === "FR")?.release_dates.find((d) => d.type === 3 || d.type === 2);
  const release = (fr?.release_date ?? m.release_date ?? "").slice(0, 10);
  if (release) {
    const d = days(release);
    if (d >= -7 && d <= 0) out.push({ ...base, key: `release-${id}`, kind: "release", date: release, detail: d === 0 ? "Sort aujourd'hui au cinéma" : "Sorti cette semaine au cinéma" });
    else if (d > 0 && d <= 60) out.push({ ...base, key: `upcoming-${id}-${release}`, kind: "upcoming", date: release, detail: `Sortie dans ${d} jour${d > 1 ? "s" : ""}` });
  }
  const providers = m["watch/providers"]?.results?.FR?.flatrate ?? [];
  if (providers.length) {
    const names = providers.slice(0, 2).map((p) => p.provider_name).join(", ");
    out.push({ ...base, key: `streaming-${id}-${providers.map((p) => p.provider_name).sort().join("+")}`, kind: "streaming", date: null, detail: `Disponible sur ${names}` });
  }
  return out;
}

export async function newsForSeries(id: number, followed: boolean): Promise<NewsItem[]> {
  const t = await tmdb<TvRaw>(`/tv/${id}`, { append_to_response: "watch/providers" });
  const out: NewsItem[] = [];
  const base = { type: "tv" as const, id, title: t.name, poster: img(t.poster_path, "w342") };
  const last = t.last_episode_to_air;
  if (last?.air_date && days(last.air_date) >= -7 && days(last.air_date) <= 0)
    out.push({ ...base, key: `episode-${id}-${ep(last)}`, kind: "episode", date: last.air_date, detail: `Nouvel épisode ${ep(last)}${last.name ? ` · ${last.name}` : ""}` });
  const next = t.next_episode_to_air;
  if (next?.air_date && days(next.air_date) > 0 && days(next.air_date) <= 30)
    out.push({ ...base, key: `next-${id}-${ep(next)}`, kind: "next-episode", date: next.air_date, detail: `${ep(next)} dans ${days(next.air_date)} jour${days(next.air_date) > 1 ? "s" : ""}` });
  if (!followed) {
    const providers = t["watch/providers"]?.results?.FR?.flatrate ?? [];
    if (providers.length)
      out.push({ ...base, key: `streaming-tv-${id}`, kind: "streaming", date: null, detail: `Disponible sur ${providers.slice(0, 2).map((p) => p.provider_name).join(", ")}` });
  }
  return out;
}

/** Sorties de la semaine au cinéma en France. */
export async function nowPlayingFR() {
  const d = await tmdb<{ results: { id: number; title: string; poster_path: string | null; release_date: string }[] }>("/movie/now_playing", { region: "FR" });
  return d.results.slice(0, 18).map((m) => ({ id: m.id, type: "movie" as const, title: m.title, poster: img(m.poster_path, "w342"), date: m.release_date }));
}

/** Calcule toutes les nouveautés (titres à voir + séries suivies). */
export async function computeNews(watch: { type: "movie" | "tv"; id: number }[], series: number[]) {
  const tasks: Promise<NewsItem[]>[] = [];
  const seenTv = new Set<number>();
  for (const w of watch.slice(0, 80)) {
    if (w.type === "movie") tasks.push(newsForMovie(w.id).catch(() => []));
    else {
      seenTv.add(w.id);
      tasks.push(newsForSeries(w.id, false).catch(() => []));
    }
  }
  for (const id of series.slice(0, 40)) if (!seenTv.has(id)) tasks.push(newsForSeries(id, true).catch(() => []));
  const items = (await Promise.all(tasks)).flat();
  const order: Record<NewsKind, number> = { release: 0, episode: 1, streaming: 2, "next-episode": 3, upcoming: 4 };
  return items.sort((a, b) => order[a.kind] - order[b.kind] || (a.date ?? "").localeCompare(b.date ?? ""));
}
