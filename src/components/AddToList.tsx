"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLibrary } from "@/lib/library";
import type { ListItem } from "@/lib/types";
import { THEMES } from "./themes";

/** Bouton « Ajouter à une liste » avec menu déroulant et création rapide. */
export function AddToList({ item, className = "" }: { item: Omit<ListItem, "addedAt">; className?: string }) {
  const { lists, toggleListItem, saveList } = useLibrary();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const inList = (id: string) =>
    lists.find((l) => l.id === id)?.items.some((i) => i.tmdbId === item.tmdbId && i.mediaType === item.mediaType);
  const count = lists.filter((l) => inList(l.id)).length;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const now = Date.now();
    await saveList({
      id: `l-${now}`,
      name: name.trim(),
      description: "",
      theme: THEMES[0].id,
      items: [{ ...item, addedAt: now }],
      createdAt: now,
      updatedAt: now,
    });
    setName("");
  };

  return (
    <div ref={box} className={`relative ${className}`}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="btn-ghost">
        {count ? `✓ ${count} liste${count > 1 ? "s" : ""}` : "+ Liste"}
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-30 w-72 rounded-lg border border-ash bg-canvas p-2">
          <span className="label block px-2 pb-2 pt-1">Ajouter à</span>
          <ul className="max-h-60 overflow-y-auto">
            {lists.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => toggleListItem(l.id, { ...item, addedAt: Date.now() })}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-sm px-2 py-2 text-left text-body-sm text-bone transition-colors duration-150 hover:bg-lift"
                >
                  <span className="truncate">{l.name}</span>
                  <span className={`mono ${inList(l.id) ? "text-metric" : "text-graphite"}`}>{inList(l.id) ? "✓" : l.items.length}</span>
                </button>
              </li>
            ))}
            {!lists.length && <li className="px-2 py-2 text-body-sm text-granite">Aucune liste pour l&apos;instant.</li>}
          </ul>
          <form onSubmit={create} className="mt-2 flex gap-2 border-t border-lift pt-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvelle liste…" className="input h-9 text-body-sm" />
            <button type="submit" className="btn-dark h-9">
              Créer
            </button>
          </form>
          <Link href="/listes" className="mono block px-2 pb-1 pt-3 text-granite hover:text-bone">
            Gérer mes listes →
          </Link>
        </div>
      )}
    </div>
  );
}
