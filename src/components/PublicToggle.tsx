"use client";

import Link from "next/link";
import { useState } from "react";
import { PUBLIC_HANDLE } from "./Gate";

/** Lien vers le profil public permanent (consultable sans connexion). */
export function PublicToggle() {
  const [copied, setCopied] = useState(false);
  const path = `/u/${PUBLIC_HANDLE}`;
  return (
    <div className="card p-6">
      <span className="label flex items-center gap-2">
        <span className="pulse bg-metric" /> Profil public · toujours actif
      </span>
      <p className="mt-3 max-w-[460px] text-body-sm text-granite">
        Toute personne qui arrive sur le site consulte ton journal, tes films vus, ta liste à voir et tes listes — en lecture seule, sans
        compte. Seul toi peux modifier.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <code className="mono flex h-10 flex-1 items-center rounded-sm border border-ash px-3 normal-case text-stone">{path}</code>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(window.location.origin + path);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="btn-dark"
        >
          {copied ? "✓ Copié" : "Copier le lien"}
        </button>
        <Link href={path} className="btn-ghost">
          Voir comme un visiteur →
        </Link>
      </div>
    </div>
  );
}
