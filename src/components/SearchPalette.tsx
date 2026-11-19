"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "./gsap";
import { useLibrary } from "@/lib/library";
import { mediaHref, type MediaLite, type MediaType } from "@/lib/types";

type Result = { id: number | null; type: MediaType; title: string; year: number | null; poster: string | null; sub: string };

export function SearchPalette({ open, onClose, base = "" }: { open: boolean; onClose: () => void; base?: string }) {
  const router = useRouter();
  const { entries } = useLibrary();
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState<MediaLite[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "nokey" | "error">("idle");
  const [active, setActive] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    gsap.fromTo(panel.current, { y: -6, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.2, ease: "power2.out" });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch(`/api/tmdb/search?type=all&q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = await res.json();
        setStatus(res.status === 503 ? "nokey" : res.ok ? "idle" : "error");
        setRemote((data.results ?? []).slice(0, 8));
        setActive(0);
      } catch {
        if (!ctrl.signal.aborted) setStatus("error");
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open]);

  const results: Result[] = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const mine = new Map<number, number>();
    for (const e of entries) if (e.tmdbId && e.rating && !mine.has(e.tmdbId)) mine.set(e.tmdbId, e.rating);
    if (remote.length)
      return remote.map((m) => ({
        id: m.id,
        type: m.type,
        title: m.title,
        year: m.year,
        poster: m.poster,
        sub: [m.type === "tv" ? "Série" : "Film", mine.has(m.id) && m.type === "movie" ? `vu · ${mine.get(m.id)}★` : m.genres[0]]
          .filter(Boolean)
          .join(" · "),
      }));
    const seen = new Set<string>();
    return entries
      .filter((e) => e.title.toLowerCase().includes(term))
      .filter((e) => (seen.has(e.title) ? false : (seen.add(e.title), true)))
      .slice(0, 8)
      .map((e) => ({ id: e.tmdbId, type: e.mediaType ?? "movie", title: e.title, year: e.year, poster: e.poster, sub: "Dans ton journal" }));
  }, [remote, entries, q]);

  const close = () => {
    onClose();
    setQ("");
  };
  const go = (r: Result | undefined) => {
    const href = r ? mediaHref(r.type, r.id) : null;
    if (!href && base) return; // pas de page de recherche complète en mode public
    close();
    router.push(href ? base + href : `/recherche?q=${encodeURIComponent(q.trim())}`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Recherche rapide">
      <div className="absolute inset-0 bg-canvas/80" onClick={close} />
      <div ref={panel} className="relative w-full max-w-[640px] overflow-hidden rounded-lg border border-ash bg-canvas">
        <div className="flex items-center gap-3 border-b border-lift px-4">
          <span className="pulse" aria-hidden />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              }
              if (e.key === "Enter") go(results[active]);
            }}
            placeholder="Film, série…"
            className="h-14 flex-1 bg-transparent text-body text-bone outline-none placeholder:text-graphite"
            aria-label="Rechercher"
          />
          <kbd className="mono text-graphite">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {q.trim().length < 2 && <p className="mono px-3 py-5 text-granite">↑ ↓ naviguer · ↵ ouvrir · ↵ sans sélection = recherche complète</p>}
          {status === "nokey" && <p className="px-3 py-3 text-body-sm text-granite">TMDB n&apos;est pas configuré — recherche limitée à ton journal.</p>}
          {status === "error" && <p className="px-3 py-3 text-body-sm text-granite">La recherche a échoué.</p>}
          <ul>
            {results.map((r, i) => (
              <li key={`${r.type}-${r.id}-${r.title}`}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={`flex w-full cursor-pointer items-center gap-4 rounded-sm px-3 py-2 text-left transition-colors duration-150 ${i === active ? "bg-lift" : ""}`}
                >
                  <span className="h-14 w-10 shrink-0 overflow-hidden rounded-sm bg-lift">
                    {r.poster && <img src={r.poster} alt="" className="h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body text-bone">
                      {r.title} <span className="text-granite">{r.year ?? ""}</span>
                    </span>
                    <span className="mono mt-1 block truncate text-granite">{r.sub}</span>
                  </span>
                  {i === active && <span className="mono text-granite">↵</span>}
                </button>
              </li>
            ))}
          </ul>
          {q.trim().length >= 2 && !base && (
            <button onClick={() => go(undefined)} className="mono mt-1 w-full cursor-pointer border-t border-lift px-3 pb-2 pt-4 text-left text-stone hover:text-bone">
              Tous les résultats pour « {q.trim()} » →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
