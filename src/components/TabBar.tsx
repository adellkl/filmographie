"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLibrary } from "@/lib/library";
import { useNewsCount } from "@/lib/news";

const ICONS: Record<string, React.ReactNode> = {
  home: <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4-4" />
    </>
  ),
  journal: (
    <>
      <rect x="5" y="4" width="14" height="16" rx="1.5" />
      <path d="M9 9h6M9 13h6M9 17h3" />
    </>
  ),
  watch: <path d="M6 4h12v17l-6-4-6 4z" />,
  news: (
    <>
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
};

const TABS = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "/recherche", label: "Recherche", icon: "search" },
  { href: "/journal", label: "Journal", icon: "journal" },
  { href: "/watchlist", label: "À voir", icon: "watch" },
  { href: "/nouveautes", label: "Nouveautés", icon: "news" },
];

/** Barre d'onglets façon app iPhone (mobile uniquement, propriétaire connecté). */
export function TabBar() {
  const path = usePathname();
  const { mode } = useLibrary();
  const news = useNewsCount();
  if (mode !== "cloud" && mode !== "local") return null;
  if (path.startsWith("/u/")) return null;

  return (
    <nav
      aria-label="Onglets"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-lift bg-canvas/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-[560px] grid-cols-5">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-14 flex-col items-center justify-center gap-1 transition-colors duration-150 ${active ? "text-bone" : "text-graphite"}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
                  {ICONS[t.icon]}
                </svg>
                <span className="font-mono text-[10px] uppercase tracking-[-0.02em]">{t.label}</span>
                {t.icon === "news" && news > 0 && (
                  <span className="mono absolute right-[calc(50%-18px)] top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-signal px-1 text-[10px] text-ink">
                    {news > 9 ? "9+" : news}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
