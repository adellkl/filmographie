"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLibrary } from "@/lib/library";
import type { MediaLite } from "@/lib/types";
import { usePageMotion } from "@/components/motion";
import { Poster } from "@/components/Poster";
import { Empty } from "@/components/Section";
import { THEMES, themeOf } from "@/components/themes";
import { useHref, useView } from "@/lib/view";

export default function ListPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lists, saveList, deleteList, toggleListItem, loaded, watchlist, entries } = useLibrary();
  const list = lists.find((l) => l.id === id);
  const { readOnly } = useView();
  const toHref = useHref();
  const [edit, setEdit] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<MediaLite[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const focusSearch = () => {
    searchInput.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    searchInput.current?.focus({ preventScroll: true });
  };
  usePageMotion(root, [!!list, list?.items.length]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/tmdb/search?type=all&q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setFound((d.results ?? []).slice(0, 8)))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  if (!list)
    return (
      <div className="shell py-32">
        {loaded ? (
          <Empty title="Liste introuvable.">
            <Link href={toHref("/listes")} className="btn-dark">
              ← Mes listes
            </Link>
          </Empty>
        ) : (
          <span className="label">Chargement…</span>
        )}
      </div>
    );

  const t = themeOf(list.theme);
  const inList = (m: MediaLite) => list.items.some((i) => i.tmdbId === m.id && i.mediaType === m.type);
  const films = list.items.filter((i) => i.mediaType === "movie").length;
  const seenSug = new Set<string>();
  const suggestions = [
    ...watchlist.map((w) => ({ tmdbId: w.tmdbId, mediaType: w.mediaType ?? "movie", title: w.title, year: w.year, poster: w.poster })),
    ...entries.map((e) => ({ tmdbId: e.tmdbId, mediaType: e.mediaType ?? "movie", title: e.title, year: e.year, poster: e.poster })),
  ]
    .filter((x): x is { tmdbId: number; mediaType: "movie" | "tv"; title: string; year: number | null; poster: string | null } => !!x.tmdbId && !!x.poster)
    .filter((x) => {
      const k = `${x.mediaType}-${x.tmdbId}`;
      return seenSug.has(k) ? false : (seenSug.add(k), true);
    })
    .slice(0, 16);

  return (
    <div ref={root} className="shell">
      <div className="pt-14 sm:pt-20" data-in>
        <Link href={toHref("/listes")} className="label hover:text-bone">
          ← Listes
        </Link>
        {edit ? (
          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await saveList({
                ...list,
                name: String(f.get("name") || list.name).trim(),
                description: String(f.get("description") ?? "").trim(),
                theme: String(f.get("theme") ?? list.theme),
              });
              setEdit(false);
            }}
          >
            <input name="name" defaultValue={list.name} className="h-16 border-b border-ash bg-transparent text-heading-lg text-bone outline-none focus:border-stone" />
            <textarea name="description" defaultValue={list.description} rows={2} placeholder="Description" className="input h-auto py-3" />
            <select name="theme" defaultValue={list.theme} className="input h-11 max-w-xs cursor-pointer bg-canvas">
              {THEMES.map((th) => (
                <option key={th.id} value={th.id}>
                  {th.glyph} {th.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="submit" className="btn-light">
                Enregistrer
              </button>
              <button type="button" onClick={() => setEdit(false)} className="btn-dark">
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="label flex items-center gap-2">
                <span className="text-bone">{t.glyph}</span> {t.label} · {films} film{films > 1 ? "s" : ""} · {list.items.length - films} série
                {list.items.length - films > 1 ? "s" : ""}
              </span>
              <h1 className="mt-4 text-[44px] leading-none tracking-[-0.04em] text-bone sm:text-display">{list.name}</h1>
              {list.description && <p className="mt-4 max-w-[560px] text-body text-granite">{list.description}</p>}
            </div>
            {!readOnly && <div className="flex gap-2">
              <button onClick={focusSearch} className="btn-light">
                + Ajouter
              </button>
              <button onClick={() => setEdit(true)} className="btn-dark">
                Modifier
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Supprimer la liste « ${list.name} » ?`)) return;
                  await deleteList(list.id);
                  router.push("/listes");
                }}
                className="btn-ghost"
              >
                Supprimer
              </button>
            </div>}
          </div>
        )}
      </div>

      {/* Ajout rapide */}
      {!readOnly && <div className="card mt-12 p-4" data-in>
        <div className="flex items-center gap-3">
          <span className="pulse" />
          <input ref={searchInput} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ajouter un film ou une série…" className="h-10 flex-1 bg-transparent text-body text-bone outline-none placeholder:text-graphite" />
        </div>
        {q.trim().length >= 2 && found.length > 0 && (
          <ul className="mt-3 grid gap-1 border-t border-lift pt-3 sm:grid-cols-2">
            {found.map((m) => (
              <li key={`${m.type}-${m.id}`}>
                <button
                  onClick={() => toggleListItem(list.id, { tmdbId: m.id, mediaType: m.type, title: m.title, year: m.year, poster: m.poster, addedAt: Date.now() })}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-sm p-2 text-left transition-colors duration-150 hover:bg-lift"
                >
                  <span className="h-12 w-8 shrink-0 overflow-hidden rounded-sm bg-lift">{m.poster && <img src={m.poster} alt="" className="h-full w-full object-cover" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm text-bone">{m.title}</span>
                    <span className="mono mt-1 block text-granite">
                      {m.type === "tv" ? "Série" : "Film"} · {m.year ?? "—"}
                    </span>
                  </span>
                  <span className={`mono ${inList(m) ? "text-metric" : "text-stone"}`}>{inList(m) ? "✓ Ajouté" : "+ Ajouter"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>}

      <div className="mt-10">
        {!list.items.length && readOnly ? (
          <Empty title="Liste vide." />
        ) : !list.items.length ? (
          <div className="card flex flex-col gap-8 p-6 sm:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="label flex items-center gap-2">
                  <span className="pulse" /> Liste vide
                </span>
                <p className="mt-4 text-heading text-bone">Commence par un premier titre.</p>
                <p className="mt-2 text-body text-granite">Cherche n&apos;importe quel film ou série, ou pioche dans tes suggestions.</p>
              </div>
              <button onClick={focusSearch} className="btn-light h-12 px-5 text-body">
                + Ajouter des films
              </button>
            </div>
            {suggestions.length > 0 && (
              <div>
                <span className="label">Suggestions · à voir et vus récemment</span>
                <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
                  {suggestions.map((sug) => (
                    <button
                      key={`${sug.mediaType}-${sug.tmdbId}`}
                      onClick={() => toggleListItem(list.id, { ...sug, addedAt: Date.now() })}
                      className="group relative cursor-pointer text-left"
                      aria-label={`Ajouter ${sug.title}`}
                    >
                      <span className="block aspect-[2/3] overflow-hidden rounded-lg border border-lift bg-lift transition-[border-color] duration-150 group-hover:border-stone">
                        {sug.poster && <img src={sug.poster} alt="" loading="lazy" className="h-full w-full object-cover" />}
                      </span>
                      <span className="mono absolute inset-x-1.5 bottom-1.5 grid h-7 place-items-center rounded-sm bg-bone text-ink opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                        + Ajouter
                      </span>
                      <span className="mt-2 block truncate text-body-sm text-stone">{sug.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <ol className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {list.items.map((it, i) => (
              <li key={`${it.mediaType}-${it.tmdbId}`} className="group/item relative">
                {list.theme === "classement" && <span className="mono absolute left-2 top-2 z-10 rounded-sm bg-bone px-1.5 py-1 text-ink">{i + 1}</span>}
                {!readOnly && <button
                  onClick={() => toggleListItem(list.id, it)}
                  className="mono absolute right-2 top-2 z-10 h-7 cursor-pointer rounded-sm bg-canvas/85 px-2 text-bone opacity-0 transition-opacity duration-150 group-hover/item:opacity-100 focus:opacity-100"
                  aria-label={`Retirer ${it.title}`}
                >
                  Retirer
                </button>}
                <Poster tmdbId={it.tmdbId} mediaType={it.mediaType} title={it.title} year={it.year} poster={it.poster} caption badge status />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
