"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaLite } from "@/lib/types";
import { Poster } from "@/components/Poster";
import { Chip, Empty, PageHead } from "@/components/Section";
import { WatchToggle } from "@/components/WatchToggle";
import { usePageMotion } from "@/components/motion";
import { SearchSuggest } from "@/components/SearchSuggest";

type Kind = "all" | "movie" | "tv";
type Genre = { id: number; name: string };

const SORTS: Record<"movie" | "tv", [string, string][]> = {
  movie: [
    ["popularity.desc", "Popularité"],
    ["vote_average.desc", "Mieux notés"],
    ["primary_release_date.desc", "Plus récents"],
    ["revenue.desc", "Box-office"],
  ],
  tv: [
    ["popularity.desc", "Popularité"],
    ["vote_average.desc", "Mieux notées"],
    ["first_air_date.desc", "Plus récentes"],
  ],
};

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 70 }, (_, i) => String(thisYear - i));

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [sort, setSort] = useState("popularity.desc");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [results, setResults] = useState<MediaLite[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState({ pages: 0, results: 0 });
  const [status, setStatus] = useState<"idle" | "loading" | "nokey" | "error">("loading");
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const [infinite, setInfinite] = useState(true);
  usePageMotion(root, [results.length]);

  // Lecture de ?q= au chargement
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const initial = sp.get("q") ?? "";
    const t = sp.get("type");
    queueMicrotask(() => {
      setQ(initial);
      setTerm(initial);
      if (t === "movie" || t === "tv") setKind(t);
    });
    if (!initial) input.current?.focus();
  }, []);

  // Préférence « défilement infini » mémorisée sur ce navigateur
  useEffect(() => {
    try {
      const v = localStorage.getItem("cinetheque.infinite");
      if (v === "0") queueMicrotask(() => setInfinite(false));
    } catch {}
  }, []);
  const toggleInfinite = () =>
    setInfinite((v) => {
      try {
        localStorage.setItem("cinetheque.infinite", v ? "0" : "1");
      } catch {}
      return !v;
    });

  // Défilement infini : charge la page suivante quand le bas de la grille approche
  const canMore = page < total.pages && results.length > 0;
  useEffect(() => {
    const el = sentinel.current;
    if (!infinite || !el || !canMore || status === "loading") return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setPage((p) => p + 1), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [infinite, canMore, status, results.length]);

  // Anti-rebond de la saisie
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Synchronise l'URL
  useEffect(() => {
    const sp = new URLSearchParams();
    if (term) sp.set("q", term);
    if (kind !== "all") sp.set("type", kind);
    window.history.replaceState(null, "", `/recherche${sp.size ? `?${sp}` : ""}`);
  }, [term, kind]);

  const discoverType: "movie" | "tv" = kind === "tv" ? "tv" : "movie";
  const mode = term.length >= 2 ? "search" : "discover";

  // Genres du type courant
  useEffect(() => {
    fetch(`/api/tmdb/genres?type=${discoverType}`)
      .then((r) => r.json())
      .then((d) => setGenres(d.genres ?? []))
      .catch(() => setGenres([]));
  }, [discoverType]);

  // Requête principale
  useEffect(() => {
    const ctrl = new AbortController();
    const url =
      mode === "search"
        ? `/api/tmdb/search?type=${kind}&q=${encodeURIComponent(term)}&page=${page}`
        : `/api/tmdb/discover?type=${discoverType}&sort=${sort}&page=${page}${genre ? `&genre=${genre}` : ""}${year ? `&year=${year}` : ""}`;
    queueMicrotask(() => setStatus("loading"));
    fetch(url, { signal: ctrl.signal })
      .then(async (r) => {
        const d = await r.json();
        if (r.status === 503) return setStatus("nokey");
        if (!r.ok) return setStatus("error");
        let list: MediaLite[] = d.results ?? [];
        // Filtres appliqués aussi aux résultats de recherche
        if (mode === "search") {
          const gName = genres.find((g) => String(g.id) === genre)?.name;
          if (gName) list = list.filter((m) => m.genres.includes(gName));
          if (year) list = list.filter((m) => String(m.year) === year);
        }
        setResults((prev) => (page === 1 ? list : [...prev, ...list.filter((m) => !prev.some((p) => p.id === m.id && p.type === m.type))]));
        setTotal({ pages: d.totalPages ?? 0, results: d.totalResults ?? 0 });
        setStatus("idle");
      })
      .catch(() => !ctrl.signal.aborted && setStatus("error"));
    return () => ctrl.abort();
  }, [mode, term, kind, discoverType, genre, year, sort, page, genres]);

  // Revenir à la page 1 quand un critère change
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    setPage(1);
    set(v);
  };

  return (
    <div ref={root} className="shell">
      <PageHead eyebrow="Recherche" title={mode === "search" ? `« ${term} »` : "Explorer."} />

      <div className="mt-10" data-in>
        <SearchSuggest
          value={q}
          kind={kind}
          inputRef={input}
          onChange={(v) => {
            setPage(1);
            setQ(v);
          }}
          onSubmit={(v) => {
            setPage(1);
            setTerm(v.trim());
          }}
        />
      </div>

      {/* Filtres */}
      <div className="mt-6 flex flex-col gap-4" data-in>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "Tout"],
              ["movie", "Films"],
              ["tv", "Séries"],
            ] as const
          ).map(([k, l]) => (
            <Chip
              key={k}
              active={kind === k}
              onClick={() => {
                setPage(1);
                setGenre("");
                setSort("popularity.desc");
                setKind(k);
              }}
            >
              {l}
            </Chip>
          ))}
          <span className="mx-2 hidden h-5 w-px bg-ash sm:block" />
          <select value={year} onChange={(e) => reset(setYear)(e.target.value)} className="mono h-8 cursor-pointer rounded-sm border border-ash bg-canvas px-2 text-stone" aria-label="Année">
            <option value="">Toutes années</option>
            {YEARS.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
          {mode === "discover" && (
            <select value={sort} onChange={(e) => reset(setSort)(e.target.value)} className="mono h-8 cursor-pointer rounded-sm border border-ash bg-canvas px-2 text-stone" aria-label="Tri">
              {SORTS[discoverType].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          )}
          <span className="mono ml-auto text-granite">
            {status === "loading" && page === 1 ? "…" : `${total.results.toLocaleString("fr-FR")} résultats`}
          </span>
          <button
            role="switch"
            aria-checked={infinite}
            onClick={toggleInfinite}
            className="mono flex h-8 cursor-pointer items-center gap-2 rounded-sm border border-ash px-2.5 text-stone transition-colors duration-150 hover:border-stone hover:text-bone"
          >
            <span className={`relative h-3.5 w-6 rounded-full transition-colors duration-150 ${infinite ? "bg-metric" : "bg-graphite"}`} aria-hidden>
              <span className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-canvas transition-[left] duration-150 ${infinite ? "left-3" : "left-0.5"}`} />
            </span>
            Défilement infini
          </button>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={!genre} onClick={() => reset(setGenre)("")}>
            Tous genres
          </Chip>
          {genres.map((g) => (
            <Chip key={g.id} active={genre === String(g.id)} onClick={() => reset(setGenre)(genre === String(g.id) ? "" : String(g.id))}>
              {g.name}
            </Chip>
          ))}
        </div>
      </div>

      {/* Résultats */}
      <div className="mt-10">
        {status === "nokey" && <Empty title="TMDB n'est pas configuré." />}
        {status === "error" && <Empty title="La recherche a échoué. Réessaie." />}
        {status === "idle" && !results.length && <Empty title="Aucun résultat." />}
        <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {results.map((m) => (
            <div key={`${m.type}-${m.id}`} className="group/card relative">
              <WatchToggle media={m} />
              <Poster tmdbId={m.id} mediaType={m.type} title={m.title} year={m.year} poster={m.poster} caption badge status hideWatch />
              {m.genres[0] && <span className="mono mt-1 block truncate text-graphite">{m.genres.slice(0, 2).join(" · ")}</span>}
            </div>
          ))}
        </div>
        {canMore &&
          (infinite ? (
            <div ref={sentinel} className="mt-12 flex h-12 items-center justify-center" aria-live="polite">
              <span className="mono flex items-center gap-2 text-granite">
                <span className="pulse" /> {status === "loading" ? "Chargement…" : `Page ${page} / ${total.pages}`}
              </span>
            </div>
          ) : (
            <div className="mt-12 flex justify-center">
              <button onClick={() => setPage((p) => p + 1)} disabled={status === "loading"} className="btn-dark h-12 px-6">
                {status === "loading" ? "Chargement…" : "Charger plus"}
              </button>
            </div>
          ))}
        {!canMore && results.length > 0 && status === "idle" && (
          <p className="mono mt-12 text-center text-graphite">Fin des résultats · {results.length} titres</p>
        )}
      </div>
    </div>
  );
}
