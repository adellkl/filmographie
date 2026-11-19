export type MediaType = "movie" | "tv";

export type DiaryEntry = {
  id: string;
  tmdbId: number | null;
  mediaType?: MediaType; // défaut : film
  title: string;
  year: number | null;
  poster: string | null;
  rating: number | null; // 0.5 → 5
  liked: boolean;
  rewatch: boolean;
  review: string;
  watchedDate: string; // YYYY-MM-DD
  source: "letterboxd" | "csv" | "app";
  letterboxdUrl?: string;
  createdAt: number;
};

export type WatchlistItem = {
  id: string; // `${type}-${tmdbId}` ou slug
  tmdbId: number | null;
  mediaType?: MediaType;
  title: string;
  year: number | null;
  poster: string | null;
  genres?: string[];
  addedAt: number;
};

export type ListItem = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: number | null;
  poster: string | null;
  addedAt: number;
};

export type MediaList = {
  id: string;
  name: string;
  description: string;
  theme: string;
  items: ListItem[];
  createdAt: number;
  updatedAt: number;
};

export type MediaLite = {
  id: number;
  type: MediaType;
  title: string;
  originalTitle: string;
  year: number | null;
  poster: string | null;
  backdrop: string | null;
  overview: string;
  vote: number;
  genres: string[];
};

export type Person = { id: number; name: string; role: string; photo: string | null };

export type Season = { number: number; name: string; episodes: number; year: number | null; poster: string | null; overview: string };

export type MediaFull = MediaLite & {
  tagline: string;
  runtime: number | null;
  releaseDate: string | null;
  status: string;
  directors: Person[]; // réalisateurs ou créateurs
  cast: Person[];
  crew: Person[];
  countries: string[];
  languages: string[];
  trailerKey: string | null;
  recommendations: MediaLite[];
  providers: { name: string; logo: string | null }[];
  images: string[];
  keywords: string[];
  budget: number | null;
  revenue: number | null;
  // séries
  seasons: Season[];
  networks: string[];
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  lastAirYear: number | null;
};

export const mediaKey = (type: MediaType | undefined, id: number | null) => `${type ?? "movie"}-${id}`;
export const mediaHref = (type: MediaType | undefined, id: number | null) =>
  id ? `/${type === "tv" ? "serie" : "film"}/${id}` : null;
