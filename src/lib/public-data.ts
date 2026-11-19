// Côté serveur : lecture des données publiques du profil via l'API REST Firestore
// (lecture autorisée sans connexion par les règles de sécurité — aucune clé secrète requise).
import type { DiaryEntry, MediaList, MediaType } from "./types";

const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const UID = process.env.NEXT_PUBLIC_PUBLIC_UID;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

export const publicDataConfigured = () => Boolean(PROJECT && KEY && UID);

/* Conversion du format REST Firestore → objets JS */
type Value = Record<string, unknown>;
function decode(v: Value): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return ((v.arrayValue as { values?: Value[] }).values ?? []).map(decode);
  if ("mapValue" in v) return fields((v.mapValue as { fields?: Record<string, Value> }).fields);
  return undefined;
}
const fields = (f: Record<string, Value> = {}) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, decode(v)]));

async function listCollection<T>(name: string, mask?: string[]): Promise<T[]> {
  if (!publicDataConfigured()) return [];
  const out: T[] = [];
  let token = "";
  for (let i = 0; i < 20; i++) {
    const url = new URL(`${BASE}/users/${UID}/${name}`);
    url.searchParams.set("pageSize", "300");
    url.searchParams.set("key", KEY!);
    mask?.forEach((m) => url.searchParams.append("mask.fieldPaths", m));
    if (token) url.searchParams.set("pageToken", token);
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) break;
    const d = (await res.json()) as { documents?: { fields: Record<string, Value> }[]; nextPageToken?: string };
    out.push(...(d.documents ?? []).map((doc) => fields(doc.fields) as T));
    if (!d.nextPageToken) break;
    token = d.nextPageToken;
  }
  return out;
}

/** Séances du journal (champs utiles au référencement uniquement). */
export const publicEntries = () =>
  listCollection<Pick<DiaryEntry, "id" | "tmdbId" | "mediaType" | "title" | "year" | "rating" | "liked" | "review" | "watchedDate">>("entries", [
    "id",
    "tmdbId",
    "mediaType",
    "title",
    "year",
    "rating",
    "liked",
    "review",
    "watchedDate",
  ]);

export const publicLists = () => listCollection<MediaList>("lists");

/** Séances d'Adel pour un titre donné (la plus récente d'abord). */
export async function entriesFor(type: MediaType, id: number) {
  const all = await publicEntries();
  return all
    .filter((e) => e.tmdbId === id && (e.mediaType ?? "movie") === type)
    .sort((a, b) => (b.watchedDate ?? "").localeCompare(a.watchedDate ?? ""));
}
