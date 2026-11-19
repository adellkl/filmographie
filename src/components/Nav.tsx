"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLibrary } from "@/lib/library";
import { SearchPalette } from "./SearchPalette";
import { SITE_NAME } from "@/lib/site";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/recherche", label: "Recherche" },
  { href: "/journal", label: "Journal" },
  { href: "/films", label: "Vus" },
  { href: "/watchlist", label: "À voir" },
  { href: "/listes", label: "Listes" },
  { href: "/nouveautes", label: "Nouveautés" },
];

export function Nav() {
  const path = usePathname();
  const { mode, user, signIn } = useLibrary();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-search", onOpen);
    };
  }, []);

  // Espace public /u/[handle] : navigation en lecture seule, liens préfixés
  const publicHandle = path.match(/^\/u\/([^/]+)/)?.[1] ?? null;
  const base = publicHandle ? `/u/${publicHandle}` : "";
  const nav = publicHandle
    ? [
        { href: base, label: "Profil" },
        { href: `${base}/journal`, label: "Journal" },
        { href: `${base}/films`, label: "Vus" },
        { href: `${base}/watchlist`, label: "À voir" },
        { href: `${base}/listes`, label: "Listes" },
      ]
    : links;
  const isActive = (href: string) => (href === "/" || href === base ? path === href : path.startsWith(href));

  // Visiteur non connecté : uniquement le profil, et une petite connexion en haut à droite
  if (mode === "signed-out" || mode === "loading") {
    return (
      <header className="sticky top-0 z-40 bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="shell flex h-16 items-center justify-between gap-6">
          <Link href={base || "/"} className="mono flex items-center gap-2 text-bone">
            {SITE_NAME}
            <span className="text-signal">*</span>
          </Link>
          {mode === "signed-out" && (
            <button
              onClick={signIn}
              className="mono flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-granite transition-colors duration-150 hover:text-bone"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
              </svg>
              Connexion
            </button>
          )}
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="shell flex h-16 items-center gap-6">
          <Link href={base || "/"} className="mono flex items-center gap-2 text-bone">
            {SITE_NAME}
            <span className="text-signal">*</span>
            {publicHandle && <span className="rounded-sm border border-ash px-1.5 py-0.5 text-granite">Public</span>}
          </Link>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Principale">
            {nav.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-body-sm uppercase transition-colors duration-150 ${
                  isActive(l.href) ? "text-bone" : "text-granite hover:text-bone"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setOpen(true)}
              className="flex h-10 cursor-pointer items-center gap-3 rounded-sm border border-ash px-3 text-body-sm text-granite transition-colors duration-150 hover:border-stone hover:text-bone sm:w-56"
              aria-label="Rechercher"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span className="hidden sm:inline">Rechercher</span>
              <kbd className="mono ml-auto hidden text-graphite sm:inline">⌘K</kbd>
            </button>

            {mode === "cloud" && user && (
              <Link
                href="/deconnexion"
                title={`${user.displayName ?? user.email} — compte et déconnexion`}
                className="hidden h-10 items-center gap-2 rounded-sm bg-lift pl-1 pr-3 text-body-sm text-bone transition-colors duration-150 hover:bg-ash sm:flex"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="h-8 w-8 rounded-sm" referrerPolicy="no-referrer" />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-sm bg-ash">{(user.displayName ?? "?")[0]}</span>
                )}
                <span className="pulse bg-metric" aria-hidden />
              </Link>
            )}

            <button
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-sm border border-ash lg:hidden"
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              aria-label="Menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                {menu ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 8h16M4 16h16" />}
              </svg>
            </button>
          </div>
        </div>

        {menu && (
          <nav className="shell flex flex-col pb-4 lg:hidden" aria-label="Mobile">
            {(publicHandle ? nav : [...links, { href: "/import", label: "Synchro" }]).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenu(false)}
                className={`border-b border-lift py-3 text-body-sm uppercase ${isActive(l.href) ? "text-bone" : "text-granite"}`}
              >
                {l.label}
              </Link>
            ))}
            {mode === "cloud" && (
              <Link href="/deconnexion" onClick={() => setMenu(false)} className="btn-dark mt-4">
                Compte & déconnexion
              </Link>
            )}
          </nav>
        )}
      </header>

      <SearchPalette open={open} onClose={() => setOpen(false)} base={base} />
    </>
  );
}
