"use client";

import { useEffect, useState } from "react";

const MESSAGES: Record<string, string> = {
  "auth/unauthorized-domain": "Ce domaine n'est pas autorisé pour la connexion Google.",
  "auth/network-request-failed": "Connexion réseau impossible. Réessaie.",
  "auth/too-many-requests": "Trop de tentatives. Patiente un instant.",
  "auth/internal-error": "Erreur pendant la connexion Google. Réessaie.",
};

/** Bandeau d'erreur de connexion (popup bloquée, domaine non autorisé…). */
export function AuthError() {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => setCode(String((e as CustomEvent).detail));
    window.addEventListener("auth-error", on);
    return () => window.removeEventListener("auth-error", on);
  }, []);
  if (!code) return null;
  return (
    <div role="alert" className="fixed inset-x-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-50 mx-auto max-w-[520px] rounded-lg border border-ash bg-canvas p-4">
      <div className="flex items-start gap-3">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
        <div className="min-w-0 flex-1">
          <p className="text-body-sm text-bone">{MESSAGES[code] ?? "La connexion a échoué."}</p>
          <p className="mono mt-1 truncate text-graphite">{code}</p>
        </div>
        <button onClick={() => setCode(null)} className="mono cursor-pointer text-granite hover:text-bone">
          Fermer
        </button>
      </div>
    </div>
  );
}
