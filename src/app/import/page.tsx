"use client";

import { useEffect, useRef, useState } from "react";
import { firebaseEnabled, useLibrary } from "@/lib/library";
import { enrichWithTmdb, parseExport, readLetterboxdExport, type ParsedExport } from "@/lib/csv-import";
import { usePageMotion } from "@/components/motion";
import { LETTERBOXD_USER } from "@/components/AutoSync";
import { PageHead } from "@/components/Section";

type Log = { tone: "ok" | "err" | "info"; text: string };

export default function ImportPage() {
  const { mode, user, entries, watchlist, saveEntries, saveWatchlist, signIn, signOut } = useLibrary();
  const [username, setUsername] = useState(LETTERBOXD_USER);
  const [rssBusy, setRssBusy] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [tmdbOk, setTmdbOk] = useState<boolean | null>(null);
  const [drag, setDrag] = useState(false);
  const [localExport, setLocalExport] = useState<Record<string, string> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  usePageMotion(root);

  const log = (l: Log) => setLogs((prev) => [l, ...prev].slice(0, 8));

  useEffect(() => {
    fetch("/api/tmdb/search?q=").then((r) => setTmdbOk(r.status !== 503));
    fetch("/api/letterboxd/export")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && Object.keys(d.files ?? {}).length && setLocalExport(d.files))
      .catch(() => {});
  }, []);

  const syncRss = async () => {
    setRssBusy(true);
    try {
      const res = await fetch(`/api/letterboxd?user=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      const added = await saveEntries(data.entries);
      log({ tone: "ok", text: `Flux @${data.user} : ${data.entries.length} entrées lues, ${added} nouvelles.` });
    } catch (e) {
      log({ tone: "err", text: `Échec de la synchro Letterboxd : ${String(e)}` });
    } finally {
      setRssBusy(false);
    }
  };

  const norm = (t: string) => t.trim().toLowerCase();

  const runImport = async (read: () => Promise<ParsedExport>) => {
    setCsvBusy(true);
    try {
      const parsed = await read();
      if (!parsed.entries.length && !parsed.watchlist.length) throw new Error("aucun diary.csv, watched.csv ou watchlist.csv trouvé");
      // Évite les doublons avec les séances déjà synchronisées par le flux (même titre, même date)
      const known = new Set(entries.map((e) => `${norm(e.title)}|${e.watchedDate}`));
      const knownFilms = new Set(entries.map((e) => `${norm(e.title)}|${e.year}`));
      const fresh = parsed.entries.filter((e) =>
        e.id.endsWith("-watched") ? !knownFilms.has(`${norm(e.title)}|${e.year}`) : !known.has(`${norm(e.title)}|${e.watchedDate}`),
      );
      log({ tone: "info", text: `${parsed.entries.length} séances lues (${fresh.length} nouvelles), ${parsed.watchlist.length} à voir. Recherche TMDB…` });
      setProgress([0, 1]);
      const e = await enrichWithTmdb(fresh, (d, t) => setProgress([d, t]));
      const w = await enrichWithTmdb(parsed.watchlist, (d, t) => setProgress([d, t]));
      const withId = (list: { tmdbId: number | null }[]) => list.filter((x) => x.tmdbId).length;
      const addedE = await saveEntries(e);
      const addedW = await saveWatchlist(w.map((x) => (x.tmdbId ? { ...x, id: `${x.mediaType ?? "movie"}-${x.tmdbId}` } : x)));
      const series = e.filter((x) => x.mediaType === "tv").length;
      log({
        tone: "ok",
        text: `Import terminé : ${addedE} séances et ${addedW} à voir ajoutés · ${withId(e)}/${e.length} reliés à TMDB${series ? ` dont ${series} séries` : ""}.`,
      });
    } catch (err) {
      log({ tone: "err", text: `Import impossible : ${String(err)}` });
    } finally {
      setCsvBusy(false);
      setProgress(null);
    }
  };

  const importFiles = (files: File[]) => files.length && runImport(() => readLetterboxdExport(files));
  const importLocal = () => localExport && runImport(async () => parseExport(localExport));

  const status = [
    {
      name: "Firebase",
      ok: mode === "cloud",
      text: !firebaseEnabled
        ? "Non configuré — mode local (navigateur)"
        : mode === "cloud"
          ? `Connecté · ${user?.email ?? user?.displayName}`
          : "Configuré — connexion requise",
    },
    { name: "TMDB", ok: !!tmdbOk, text: tmdbOk == null ? "Vérification…" : tmdbOk ? "Clé valide" : "Clé absente de .env.local" },
    { name: "Letterboxd", ok: true, text: `Flux public @${LETTERBOXD_USER} · synchro auto toutes les 15 min` },
  ];

  return (
    <div ref={root} className="shell">
      <PageHead eyebrow="Synchro" title="Ramène ton Letterboxd ici." />
      <p className="mt-6 max-w-[640px] text-body text-granite">
        Le flux public donne tes ~50 dernières séances. Pour tout l&apos;historique, importe l&apos;export ZIP de Letterboxd
        (Réglages → Données → Exporter).
      </p>

      {/* Statut */}
      <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-lift bg-lift md:grid-cols-3">
        {status.map((s) => (
          <div key={s.name} className="js-reveal flex items-start gap-3 bg-transparent p-6">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.ok ? "bg-metric" : "bg-signal"}`} aria-hidden />
            <div>
              <span className="label">{s.name}</span>
              <p className="mt-1 text-body-sm text-bone">{s.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {/* RSS */}
        <section className="card flex flex-col gap-6 p-6 sm:p-8">
          <div>
            <span className="label">01 · Flux Letterboxd</span>
            <h2 className="mt-2 text-heading">Dernières séances</h2>
            <p className="mt-2 text-body-sm text-granite">Notes, coups de cœur, critiques et ID TMDB, directement depuis ton profil.</p>
          </div>
          <label className="flex flex-col gap-2">
            <span className="label">Nom d&apos;utilisateur</span>
            <div className="flex items-center rounded-sm border border-ash focus-within:border-stone">
              <span className="pl-4 text-body-sm text-graphite">letterboxd.com/</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 flex-1 bg-transparent pr-4 text-body-sm text-bone outline-none"
              />
            </div>
          </label>
          <button onClick={syncRss} disabled={rssBusy || !username} className="btn-light self-start">
            {rssBusy ? "Synchronisation…" : "Synchroniser"} <span aria-hidden>→</span>
          </button>
        </section>

        {/* CSV / ZIP */}
        <section className="card flex flex-col gap-6 p-6 sm:p-8">
          <div>
            <span className="label">02 · Export complet</span>
            <h2 className="mt-2 text-heading">Tout l&apos;historique</h2>
            <p className="mt-2 text-body-sm text-granite">
              Dépose le ZIP (ou diary.csv, watched.csv, ratings.csv, reviews.csv, watchlist.csv).
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => (e.preventDefault(), setDrag(true))}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              importFiles([...e.dataTransfer.files]);
            }}
            disabled={csvBusy}
            className={`flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors ${
              drag ? "border-stone bg-lift" : "border-ash hover:border-stone"
            }`}
          >
            <span className="text-body-sm text-bone">{csvBusy ? "Import en cours…" : "Glisse ton export ici"}</span>
            <span className="text-caption text-granite">ou clique pour choisir un fichier</span>
            {progress && (
              <span className="mt-2 block h-1 w-48 overflow-hidden rounded-lg bg-lift">
                <span className="block h-full bg-bone transition-[width]" style={{ width: `${(progress[0] / progress[1]) * 100}%` }} />
              </span>
            )}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".zip,.csv"
            multiple
            hidden
            onChange={(e) => {
              importFiles([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
        </section>
      </div>

      {localExport && (
        <section className="card-bone mt-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative z-10">
            <span className="mono flex items-center gap-2">
              <span className="pulse" /> Export détecté · data/letterboxd-export
            </span>
            <p className="mt-3 text-body text-ink">
              {Object.keys(localExport).length} fichiers prêts : journal, films vus, notes, critiques, coups de cœur et à voir.
            </p>
          </div>
          <button onClick={importLocal} disabled={csvBusy || mode === "signed-out"} className="btn-ink relative z-10 h-12 px-5">
            {csvBusy ? "Import en cours…" : "Importer tout →"}
          </button>
        </section>
      )}

      {logs.length > 0 && (
        <ul className="card mt-4 divide-y divide-lift" aria-live="polite">
          {logs.map((l, i) => (
            <li key={i} className="flex gap-3 px-6 py-3 text-body-sm">
              <span className={l.tone === "err" ? "text-bone" : "text-granite"}>{l.tone === "err" ? "✕" : l.tone === "ok" ? "✓" : "·"}</span>
              <span className={l.tone === "err" ? "text-bone" : "text-granite"}>{l.text}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4 text-caption text-granite">
        <span>
          {entries.length} séances · {watchlist.length} à voir enregistrées
        </span>
        {mode === "signed-out" && (
          <button onClick={signIn} className="btn-light">
            Connexion
          </button>
        )}
        {mode === "cloud" && (
          <button onClick={signOut} className="btn-ghost">
            Se déconnecter
          </button>
        )}
      </div>
    </div>
  );
}
