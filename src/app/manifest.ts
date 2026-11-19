import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Adel",
    description: "Journal de films et séries : notes, critiques, listes, à voir et nouveautés.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#101010",
    theme_color: "#101010",
    lang: "fr",
    categories: ["entertainment", "lifestyle"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Rechercher", url: "/recherche" },
      { name: "Nouveautés", url: "/nouveautes" },
      { name: "À voir", url: "/watchlist" },
    ],
  };
}
