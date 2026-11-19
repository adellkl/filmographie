"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLibrary } from "@/lib/library";
import { mediaHref, type MediaLite } from "@/lib/types";

type Suggestion = { id: number; type: "movie" | "tv"; title: string; year: number | null; poster: string | null; mine?: number | null };

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Met en évidence la partie du titre qui correspond à la saisie. */
function Highlight({ text, query }: { text: string; query: string }) {
  const i = fold(text).indexOf(fold(query.trim()));
  if (!query.trim() || i < 0) return <>{text}</>;
  const n = query.trim().length;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent text-chalk underline decoration-signal decoration-2 underline-offset-4">{text.slice(i, i + n)}</mark>
      {text.slice(i + n)}
    </>
  );
}

/**
 * Champ de recherche avec suggestions instantanées (dès la 1re lettre).
 * ↑ ↓ pour choisir, Entrée pour ouvrir la fiche ; Entrée sans sélection = tous les résultats.
 */
export function SearchSuggest({
  value,
  onChange,
  onSubmit,
  kind,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  kind: "all" | "movie" | "tv";
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const router = useRouter();
  const { entries } = useLibrary();
  const [remote, setRemote] = useState<MediaLite[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Requête TMDB très courte (120 ms) pour un effet « instantané »
  useEffect(() => {
    const q = value.trim();
    if (!q) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/tmdb/search?type=${kind}&q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setRemote((d.results ?? []).slice(0, 8)))
        .catch(() => {})
        .finally(() => !ctrl.signal.aborted && setLoading(false));
    }, 120);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value, kind]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = fold(value.trim());
    if (!q) return [];
    // 1. Tes propres titres qui commencent / contiennent la saisie
    const seen = new Set<string>();
    const mine: Suggestion[] = [];
    for (const e of entries) {
      if (!e.tmdbId || !fold(e.title).includes(q)) continue;
      const type = e.mediaType ?? "movie";
      if (kind !== "all" && kind !== type) continue;
      const k = `${type}-${e.tmdbId}`;
      if (seen.has(k)) continue;
      seen.add(k);
      mine.push({ id: e.tmdbId, type, title: e.title, year: e.year, poster: e.poster, mine: e.rating });
    }
    mine.sort((a, b) => Number(fold(b.title).startsWith(q)) - Number(fold(a.title).startsWith(q)));
    // 2. TMDB, en écartant les doublons
    const rest = remote
      .filter((m) => !seen.has(`${m.type}-${m.id}`))
      .map((m) => ({ id: m.id, type: m.type, title: m.title, year: m.year, poster: m.poster }));
    return [...mine.slice(0, 3), ...rest].slice(0, 8);
  }, [value, remote, entries, kind]);

  const go = (s: Suggestion) => {
    setOpen(false);
    router.push(mediaHref(s.type, s.id)!);
  };

  const show = open && value.trim().length > 0 && (suggestions.length > 0 || loading);

  return (
    <div ref={box} className="relative">
      <div className={`flex items-center gap-3 border-b pb-3 transition-[border-color] duration-150 ${show ? "border-stone" : "border-ash"} focus-within:border-stone`}>
        <span className="pulse" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, -1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (show && active >= 0 && suggestions[active]) go(suggestions[active]);
              else {
                setOpen(false);
                onSubmit(value);
              }
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Titre d'un film ou d'une série…"
          className="h-12 flex-1 bg-transparent text-[24px] tracking-[-0.025em] text-bone outline-none placeholder:text-graphite sm:text-heading"
          aria-label="Rechercher un film ou une série"
          role="combobox"
          aria-expanded={show}
          aria-controls="search-suggest"
          aria-autocomplete="list"
          autoComplete="off"
        />
        {loading && <span className="mono text-graphite">…</span>}
        {value && (
          <button
            onClick={() => {
              onChange("");
              inputRef?.current?.focus();
            }}
            className="mono cursor-pointer text-granite hover:text-bone"
          >
            Effacer
          </button>
        )}
      </div>

      {show && (
        <ul id="search-suggest" role="listbox" className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-lg border border-ash bg-canvas p-2">
          {suggestions.map((s, i) => (
            <li key={`${s.type}-${s.id}`} role="option" aria-selected={i === active}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => go(s)}
                className={`flex w-full cursor-pointer items-center gap-4 rounded-sm px-3 py-2 text-left transition-colors duration-150 ${i === active ? "bg-lift" : ""}`}
              >
                <span className="h-14 w-10 shrink-0 overflow-hidden rounded-sm bg-lift">
                  {s.poster && <img src={s.poster} alt="" className="h-full w-full object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body text-bone">
                    <Highlight text={s.title} query={value} />
                  </span>
                  <span className="mono mt-1 flex gap-3 text-granite">
                    <span>{s.type === "tv" ? "Série" : "Film"}</span>
                    {s.year && <span>{s.year}</span>}
                    {s.mine !== undefined && <span className="text-metric">Vu{s.mine ? ` · ${s.mine}★` : ""}</span>}
                  </span>
                </span>
                {i === active && <span className="mono text-granite">↵</span>}
              </button>
            </li>
          ))}
          {!suggestions.length && loading && <li className="mono px-3 py-3 text-granite">Recherche…</li>}
          <li className="mt-1 border-t border-lift">
            <button
              onClick={() => {
                setOpen(false);
                onSubmit(value);
              }}
              className="mono w-full cursor-pointer px-3 pb-1 pt-3 text-left text-stone hover:text-bone"
            >
              Tous les résultats pour « {value.trim()} » →
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
