"use client";
import { useState } from "react";

export function Stars({ value, className = "" }: { value: number | null; className?: string }) {
  if (!value) return null;
  return (
    <span className={`whitespace-nowrap ${className}`} aria-label={`${value} sur 5`}>
      {"★".repeat(Math.floor(value))}
      {value % 1 ? "½" : ""}
    </span>
  );
}

export function RatingInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex" onMouseLeave={() => setHover(null)} role="radiogroup" aria-label="Note">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className="relative inline-block h-9 w-9 text-[30px] leading-9">
            <span className="text-graphite">★</span>
            <span
              className="absolute inset-0 overflow-hidden text-current"
              style={{ width: shown >= n ? "100%" : shown >= n - 0.5 ? "50%" : "0%" }}
            >
              ★
            </span>
            {[n - 0.5, n].map((v, i) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={value === v}
                aria-label={`${v} étoile${v > 1 ? "s" : ""}`}
                className={`absolute top-0 h-full w-1/2 cursor-pointer ${i === 0 ? "left-0" : "right-0"}`}
                onMouseEnter={() => setHover(v)}
                onClick={() => onChange(value === v ? null : v)}
              />
            ))}
          </span>
        ))}
      </div>
      <span className="mono w-8 tabular-nums opacity-60">{shown ? shown.toFixed(1) : "—"}</span>
    </div>
  );
}
