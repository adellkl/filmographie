// Sert l'export Letterboxd déposé dans data/letterboxd-export (usage local uniquement).
import { readFile } from "node:fs/promises";
import path from "node:path";

const FILES: Record<string, string> = {
  "diary.csv": "diary.csv",
  "reviews.csv": "reviews.csv",
  "ratings.csv": "ratings.csv",
  "watched.csv": "watched.csv",
  "watchlist.csv": "watchlist.csv",
  "likes-films.csv": "likes/films.csv",
};

export async function GET() {
  if (process.env.NODE_ENV === "production") return Response.json({ files: {} }, { status: 404 });
  const dir = path.join(process.cwd(), "data", "letterboxd-export");
  const files: Record<string, string> = {};
  await Promise.all(
    Object.entries(FILES).map(async ([key, rel]) => {
      try {
        files[key] = await readFile(path.join(dir, rel), "utf8");
      } catch {
        /* fichier absent */
      }
    }),
  );
  return Response.json({ files });
}
