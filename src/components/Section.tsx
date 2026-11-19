"use client";

import { useView } from "@/lib/view";

export function SectionHead({
  eyebrow,
  title,
  lede,
  action,
  live,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  action?: React.ReactNode;
  live?: boolean;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <span className="label flex items-center gap-2">
            {live && <span className="pulse" />}
            {eyebrow}
          </span>
        )}
        <h2 className="mt-4 text-heading text-bone">{title}</h2>
        {lede && <p className="mt-3 max-w-[560px] text-body text-granite">{lede}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  const { readOnly, owner } = useView();
  if (readOnly && owner) eyebrow = `${eyebrow} · ${owner.name}`;
  return (
    <div className="flex flex-col gap-6 pt-14 sm:flex-row sm:items-end sm:justify-between sm:pt-20" data-in>
      <div>
        <span className="label">{eyebrow}</span>
        <h1 className="mt-4 text-[44px] leading-none tracking-[-0.04em] text-bone sm:text-display">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-start gap-4 p-6 sm:p-10">
      <span className="text-heading text-bone">{title}</span>
      {children}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`mono inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-sm border px-3 transition-[color,background-color,border-color] duration-150 ${
        active ? "border-bone bg-bone text-ink" : "border-ash text-stone hover:border-stone hover:text-bone"
      }`}
    >
      {children}
    </button>
  );
}
