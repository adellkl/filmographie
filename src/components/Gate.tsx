"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { hasSessionCookie, useLibrary } from "@/lib/library";
import { PublicLibraryProvider } from "@/lib/public-library";
import { LETTERBOXD_USER } from "./AutoSync";

/** Pages réservées au propriétaire : jamais servies aux visiteurs. */
const PRIVATE = ["/import", "/deconnexion"];
export const PUBLIC_HANDLE = process.env.NEXT_PUBLIC_PUBLIC_HANDLE || LETTERBOXD_USER;

export function Gate({ children }: { children: React.ReactNode }) {
  const { mode, signIn } = useLibrary();
  const path = usePathname();
  const remembered = useSyncExternalStore(
    () => () => {},
    hasSessionCookie,
    () => false,
  );
  if (path === "/deconnexion" || path.startsWith("/u/")) return <>{children}</>;
  if (mode === "loading")
    return (
      <div className="shell py-32">
        <span className="label flex items-center gap-2">
          <span className="pulse" /> {remembered ? "Reconnexion…" : "Chargement…"}
        </span>
      </div>
    );
  const signInScreen = (
      <section className="shell grid min-h-[70vh] items-center gap-10 py-24 lg:grid-cols-[1fr_480px]">
        <div>
          <span className="label flex items-center gap-2">
            <span className="pulse" /> Registre privé
          </span>
          <h1 className="mt-6 text-[48px] leading-none tracking-[-0.04em] sm:text-display">
            Ton cinéma,
            <br /> tenu comme un registre.
          </h1>
          <p className="mt-6 max-w-[460px] text-body text-granite">
            Connecte-toi pour retrouver ton journal, tes listes et ce que tu veux voir — synchronisés sur tous tes appareils.
          </p>
        </div>
        <div className="card-bone p-6">
          <span className="mono flex items-center gap-2">
            <span className="pulse" /> Connexion
          </span>
          <p className="mt-6 text-heading text-ink">Un compte Google, aucun mot de passe à retenir.</p>
          <button onClick={signIn} className="btn-ink relative z-10 mt-8">
            Continuer avec Google →
          </button>
          <p className="mono mt-6 text-graphite">Session mémorisée 30 jours sur ce navigateur</p>
        </div>
      </section>
    );
  // Visiteur non connecté : le profil public est servi directement, en lecture seule
  if (mode === "signed-out") {
    if (PRIVATE.some((p) => path.startsWith(p))) return signInScreen;
    return (
      <PublicLibraryProvider handle={PUBLIC_HANDLE} prefixLinks={false} fallback={signInScreen}>
        {children}
      </PublicLibraryProvider>
    );
  }
  return <>{children}</>;
}
