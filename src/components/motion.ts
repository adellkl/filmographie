"use client";

import type { RefObject } from "react";
import { gsap, ScrollTrigger, useGSAP } from "./gsap";

/* ─────────────────────────────────────────────────────────────
   Animations d'apparition — règles :
   1. Aucun élément n'est masqué à l'avance : il n'est caché qu'au
      démarrage de SON animation (fromTo), qui finit toujours visible
      et nettoie ses styles (clearProps).
   2. Une chorégraphie unique : libellé → titre → texte → contrôles → cartes.
   3. La cascade des cartes est plafonnée (≤ 0,6 s au total).
   4. Filet de sécurité : tout élément resté invisible sans animation
      en cours est rendu visible.
   ───────────────────────────────────────────────────────────── */

const EASE = "power3.out";
const CLEAR = "opacity,visibility,transform,translate,clipPath";
const MAX_ITEMS = 36;

const isShown = (el: Element) => (el as HTMLElement).dataset.shown === "1";
const markShown = (els: Element[]) => els.forEach((el) => ((el as HTMLElement).dataset.shown = "1"));
const stagger = (n: number, base = 0.045) => Math.min(base, 0.6 / Math.max(1, n));

/** Retire doublons, éléments déjà animés et éléments imbriqués dans un autre ciblé. */
function unique(els: (Element | null | undefined)[]) {
  const out: Element[] = [];
  for (const el of els) {
    if (!el || isShown(el) || out.includes(el)) continue;
    if (out.some((o) => o.contains(el) || el.contains(o))) continue;
    out.push(el);
  }
  return out;
}

const CARD_CONTAINERS = ".grid, ul, ol, dl, [data-track]";

/** Découpe une section en couches, dans l'ordre d'apparition. */
function layersOf(section: Element) {
  const label = section.querySelector(".label");
  const title = section.querySelector("h1, h2");
  const paras = Array.from(section.querySelectorAll("p")).filter((p) => !p.closest(`${CARD_CONTAINERS}, a, button, article`)).slice(0, 3);

  // Conteneurs de cartes de premier niveau (pas ceux imbriqués dans un autre)
  const containers = Array.from(section.querySelectorAll(CARD_CONTAINERS)).filter((c) => {
    const parent = c.parentElement?.closest(CARD_CONTAINERS);
    return !parent || !section.contains(parent);
  });
  // Les rangées défilantes s'animent en bloc, pas carte par carte
  const tracks = containers.filter((c) => c.matches("[data-track]")).map((c) => c.closest("[data-marquee-row]") ?? c);
  const items = containers.filter((c) => !c.matches("[data-track]")).flatMap((c) => Array.from(c.children)).slice(0, MAX_ITEMS);

  // Contrôles et blocs restants (boutons, filtres, encadrés…)
  const taken = [label, title, ...paras, ...containers, ...tracks].filter(Boolean) as Element[];
  const rest = Array.from(section.querySelectorAll(":scope > *, :scope > div > *, :scope > div > div > *")).filter(
    (el) => !taken.some((t) => t === el || t.contains(el) || el.contains(t)) && el.getBoundingClientRect().height > 0,
  );

  return {
    label: unique([label]),
    title: unique([title]),
    text: unique(paras),
    controls: unique(rest),
    items: unique([...items, ...tracks]),
  };
}

type Layers = ReturnType<typeof layersOf>;

/** Joue la chorégraphie d'une section ; renvoie la timeline (ou null s'il n'y avait rien). */
function play(l: Layers, delay = 0) {
  const all = [...l.label, ...l.title, ...l.text, ...l.controls, ...l.items];
  if (!all.length) return null;
  markShown(all);
  all.forEach((e) => delete (e as HTMLElement).dataset.pending);
  const tl = gsap.timeline({ defaults: { ease: EASE }, delay });
  let started = false;
  const at = (overlap: string) => (started ? overlap : ((started = true), 0));
  const fade = (els: Element[], y: number, duration: number, step = 0) =>
    gsap.fromTo(els, { autoAlpha: 0, y }, { autoAlpha: 1, y: 0, duration, stagger: step, ease: EASE, clearProps: CLEAR });

  if (l.label.length) tl.add(fade(l.label, 8, 0.35), at("0"));
  if (l.title.length)
    tl.add(
      gsap.fromTo(
        l.title,
        { clipPath: "inset(0 0 100% 0)", y: 24 },
        { clipPath: "inset(0 0 0% 0)", y: 0, duration: 0.7, ease: EASE, clearProps: CLEAR },
      ),
      at("-=0.2"),
    );
  if (l.text.length) tl.add(fade(l.text, 12, 0.45, 0.07), at("-=0.45"));
  if (l.controls.length) tl.add(fade(l.controls, 12, 0.45, 0.05), at("-=0.35"));
  if (l.items.length) tl.add(fade(l.items, 18, 0.5, stagger(l.items.length)), at("-=0.3"));
  return { tl, els: all };
}

/** Filet de sécurité : rend visible ce qui serait resté masqué hors animation. */
function rescue(root: Element) {
  root.querySelectorAll<HTMLElement>("[data-pending]").forEach((el) => {
    const section = el.closest("section") as HTMLElement | null;
    if (section?.dataset.played === "1" && !gsap.getTweensOf(el).some((t) => t.progress() < 1)) {
      delete el.dataset.pending;
      gsap.set(el, { clearProps: CLEAR });
    }
  });
  root.querySelectorAll<HTMLElement>("[data-shown]").forEach((el) => {
    // une animation existe encore (en cours ou programmée) : on la laisse finir
    if (gsap.getTweensOf(el).some((t) => t.progress() < 1)) return;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || Number(s.opacity) < 0.05) gsap.set(el, { clearProps: CLEAR });
  });
}

/**
 * Animations d'apparition d'une page.
 * - [data-in] : en-tête de page, joué au chargement
 * - <section> : joué à l'entrée dans l'écran
 * - [data-motion="off"] : zone exclue (le hero a sa propre entrée)
 * - [data-count] compteurs, [data-bar] barres de graphiques
 * `deps` : à passer les longueurs des données, pour animer le contenu qui arrive après coup.
 */
export function usePageMotion(scope: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const triggers: ScrollTrigger[] = [];
        const observers: IntersectionObserver[] = [];
        // Animations lancées par ce passage : si on est annulé avant la fin, on « dé-marque »
        const runs: { tl: gsap.core.Timeline; els: Element[]; section?: HTMLElement }[] = [];

        /* 1 · En-tête de page */
        Array.from(root.querySelectorAll("[data-in]")).forEach((el, i) => {
          const r = play(layersOf(el), i * 0.06);
          if (r) runs.push(r);
        });

        /* 2 · Sections, dans l'ordre du document */
        Array.from(root.querySelectorAll("section"))
          .filter((s) => !s.closest("[data-motion='off']") && !s.closest("[data-in]"))
          .forEach((section) => {
            const el = section as HTMLElement;
            if (el.dataset.played === "1") {
              // Section déjà jouée : seules les nouvelles cartes apparaissent
              const fresh = layersOf(section).items;
              if (fresh.length) {
                markShown(fresh);
                gsap.fromTo(fresh, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: stagger(fresh.length, 0.03), ease: EASE, clearProps: CLEAR });
              }
              return;
            }
            // Masquage préalable (sections pas encore à l'écran) : évite l'effet « déjà affiché puis animé ».
            // Les éléments sont marqués « en attente » ; ils ne restent jamais cachés (voir onEnter + filet).
            const below = section.getBoundingClientRect().top > window.innerHeight * 0.88;
            if (below) {
              const l = layersOf(section);
              const pre = [...l.label, ...l.text, ...l.controls, ...l.items];
              pre.forEach((e) => ((e as HTMLElement).dataset.pending = "1"));
              l.title.forEach((e) => ((e as HTMLElement).dataset.pending = "1"));
              gsap.set(pre, { autoAlpha: 0 });
              gsap.set(l.title, { clipPath: "inset(0 0 100% 0)" });
            }
            // Déclenchement fiable à l'entrée dans l'écran (IntersectionObserver)
            const reveal = () => {
              if (el.dataset.played === "1") return;
              const r = play(layersOf(section));
              el.dataset.played = "1";
              if (r) runs.push({ ...r, section: el });
              // Tout élément pré-masqué non repris par l'animation est rendu visible
              section.querySelectorAll<HTMLElement>("[data-pending]").forEach((p) => {
                delete p.dataset.pending;
                gsap.set(p, { clearProps: CLEAR });
              });
            };
            const io = new IntersectionObserver(
              (obs) => {
                if (obs.some((o) => o.isIntersecting)) {
                  io.disconnect();
                  reveal();
                }
              },
              { rootMargin: "0px 0px -12% 0px" },
            );
            io.observe(section);
            observers.push(io);
          });

        /* 3 · Compteurs */
        root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
          if (el.dataset.counted) return;
          const target = Number(el.dataset.count);
          const decimals = Number(el.dataset.decimals ?? 0);
          if (!Number.isFinite(target)) return;
          const obj = { v: 0 };
          gsap.to(obj, {
            v: target,
            duration: 1.1,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 95%", once: true },
            onStart: () => (el.dataset.counted = "1"),
            onUpdate: () => (el.textContent = obj.v.toFixed(decimals)),
            onComplete: () => (el.textContent = target.toFixed(decimals)),
          });
        });

        /* 4 · Barres de graphiques */
        root.querySelectorAll<HTMLElement>("[data-bar]").forEach((el, i) => {
          if (el.dataset.barShown) return;
          gsap.fromTo(
            el,
            { scaleY: 0 },
            {
              scaleY: 1,
              transformOrigin: "bottom",
              duration: 0.6,
              delay: (i % 12) * 0.03,
              ease: "power2.out",
              clearProps: "transform,scale",
              scrollTrigger: { trigger: el.parentElement ?? el, start: "top 92%", once: true },
              onStart: () => (el.dataset.barShown = "1"),
            },
          );
        });

        ScrollTrigger.refresh();

        /* 5 · Filet de sécurité */
        const watchdog = window.setInterval(() => rescue(root), 2000);
        return () => {
          window.clearInterval(watchdog);
          triggers.forEach((t) => t.kill());
          observers.forEach((o) => o.disconnect());
          for (const r of runs) {
            if (r.tl.progress() >= 1) continue;
            r.els.forEach((e) => delete (e as HTMLElement).dataset.shown);
            if (r.section) delete r.section.dataset.played;
          }
          root.querySelectorAll<HTMLElement>("[data-pending]").forEach((p) => delete p.dataset.pending);
          rescue(root);
        };
      });

      return () => mm.revert();
    },
    { scope, dependencies: deps },
  );
}
