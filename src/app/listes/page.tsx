"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLibrary } from "@/lib/library";
import { usePageMotion } from "@/components/motion";
import { Chip, Empty, PageHead } from "@/components/Section";
import { THEMES, themeOf } from "@/components/themes";
import { useHref, useView } from "@/lib/view";

export default function ListsPage() {
  const { lists, saveList } = useLibrary();
  const { readOnly } = useView();
  const toHref = useHref();
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<string>(THEMES[0].id);
  const [description, setDescription] = useState("");
  const root = useRef<HTMLDivElement>(null);
  usePageMotion(root, [lists.length]);

  const shown = filter === "all" ? lists : lists.filter((l) => l.theme === filter);
  const usedThemes = THEMES.filter((t) => lists.some((l) => l.theme === t.id));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const now = Date.now();
    const id = `l-${now}`;
    await saveList({ id, name: name.trim(), description: description.trim(), theme, items: [], createdAt: now, updatedAt: now });
    router.push(toHref(`/listes/${id}`));
  };

  return (
    <div ref={root} className="shell">
      <PageHead eyebrow="Listes" title={lists.length ? `${lists.length} liste${lists.length > 1 ? "s" : ""}.` : readOnly ? "Aucune liste." : "Tes listes."} />

      <div className={`mt-14 grid gap-6 ${readOnly ? "" : "lg:grid-cols-[1fr_400px]"}`}>
        <div className="min-w-0">
          {usedThemes.length > 1 && (
            <div className="mb-6 flex flex-wrap gap-2">
              <Chip active={filter === "all"} onClick={() => setFilter("all")}>
                Tous thèmes
              </Chip>
              {usedThemes.map((t) => (
                <Chip key={t.id} active={filter === t.id} onClick={() => setFilter(t.id)}>
                  {t.glyph} {t.label}
                </Chip>
              ))}
            </div>
          )}

          {!lists.length && (
            <Empty title="Aucune liste pour l'instant.">
              {!readOnly && (
                <p className="text-body text-granite">Crée ta première liste à droite : « Films du dimanche », « Top 10 Nolan », « Séries à binger »…</p>
              )}
            </Empty>
          )}

          <div className={`grid gap-6 sm:grid-cols-2 ${readOnly ? "lg:grid-cols-3" : ""}`}>
            {shown.map((l) => {
              const t = themeOf(l.theme);
              const covers = l.items.slice(0, 4);
              return (
                <Link key={l.id} href={toHref(`/listes/${l.id}`)} className="card group flex flex-col gap-5 p-5 transition-[border-color] duration-150 hover:border-ash" data-in>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <span key={i} className="aspect-[2/3] overflow-hidden rounded-sm bg-lift">
                        {covers[i]?.poster && <img src={covers[i].poster!} alt="" loading="lazy" className="h-full w-full object-cover" />}
                      </span>
                    ))}
                  </div>
                  <div>
                    <span className="label flex items-center gap-2">
                      <span className="text-bone">{t.glyph}</span> {t.label} · {l.items.length} titre{l.items.length > 1 ? "s" : ""}
                    </span>
                    <h2 className="mt-3 text-[28px] leading-tight tracking-[-0.03em] text-bone">{l.name}</h2>
                    {l.description && <p className="mt-2 line-clamp-2 text-body-sm text-granite">{l.description}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {!readOnly && <form onSubmit={create} className="card-bone flex flex-col gap-5 self-start p-6 lg:sticky lg:top-24">
          <span className="mono relative z-10 flex items-center gap-2">
            <span className="pulse" /> Nouvelle liste
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de la liste"
            required
            className="relative z-10 h-12 border-b border-black/20 bg-transparent text-[24px] tracking-[-0.025em] text-ink outline-none placeholder:text-granite focus:border-ink"
          />
          <div className="relative z-10">
            <span className="mono text-graphite">Thème</span>
            <div className="mt-3 flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  aria-pressed={theme === t.id}
                  className={`mono h-8 cursor-pointer rounded-sm border px-2.5 transition-colors duration-150 ${
                    theme === t.id ? "border-ink bg-ink text-bone" : "border-black/15 text-ink hover:border-ink"
                  }`}
                >
                  {t.glyph} {t.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (facultatif)"
            rows={3}
            className="relative z-10 resize-none rounded-sm border border-black/15 bg-transparent p-3 text-body-sm text-ink outline-none placeholder:text-granite focus:border-ink"
          />
          <button type="submit" className="btn-ink relative z-10 self-start">
            Créer la liste →
          </button>
        </form>}
      </div>
    </div>
  );
}
