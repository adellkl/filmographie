"use client";

import Link from "next/link";
import { useState } from "react";
import { useLibrary } from "@/lib/library";
import { PublicToggle } from "@/components/PublicToggle";

export default function LogoutPage() {
  const { mode, user, entries, lists, watchlist, signOut, signIn } = useLibrary();
  const [busy, setBusy] = useState(false);

  return (
    <section className="shell grid min-h-[70vh] items-center gap-10 py-24 lg:grid-cols-[1fr_480px]">
      <div>
        <span className="label flex items-center gap-2">
          <span className={`pulse ${mode === "cloud" ? "bg-metric" : ""}`} /> {mode === "cloud" ? "Session active" : "Session fermée"}
        </span>
        <h1 className="mt-6 text-[48px] leading-none tracking-[-0.04em] sm:text-display">
          {mode === "cloud" ? "Quitter le registre ?" : "À bientôt."}
        </h1>
        <p className="mt-6 max-w-[460px] text-body text-granite">
          {mode === "cloud"
            ? "Tes données restent dans Firebase. Tu les retrouveras à la prochaine connexion."
            : "Tu es déconnecté de ce navigateur. Le cookie de session a été supprimé."}
        </p>
        {mode === "cloud" && (
          <div className="mt-10 max-w-[560px]">
            <PublicToggle />
          </div>
        )}
      </div>

      <div className="card-bone p-6">
        {mode === "cloud" && user ? (
          <>
            <div className="relative z-10 flex items-center gap-4">
              {user.photoURL && <img src={user.photoURL} alt="" className="h-12 w-12 rounded-sm" referrerPolicy="no-referrer" />}
              <div className="min-w-0">
                <p className="truncate text-body text-ink">{user.displayName}</p>
                <p className="mono mt-1 truncate text-graphite">{user.email}</p>
              </div>
            </div>
            <dl className="relative z-10 mt-6 grid grid-cols-3 border-t border-black/10 pt-6">
              {[
                ["Séances", entries.length],
                ["Listes", lists.length],
                ["À voir", watchlist.length],
              ].map(([k, v]) => (
                <div key={k}>
                  <dd className="text-heading text-ink">{v}</dd>
                  <dt className="mono mt-2 text-graphite">{k}</dt>
                </div>
              ))}
            </dl>
            <div className="relative z-10 mt-8 flex flex-wrap gap-2">
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await signOut();
                  setBusy(false);
                }}
                className="btn-ink"
              >
                {busy ? "Déconnexion…" : "Se déconnecter"}
              </button>
              <Link href="/" className="btn border border-black/15 text-ink hover:border-ink">
                Rester connecté
              </Link>
            </div>
          </>
        ) : mode === "local" ? (
          <p className="relative z-10 text-body text-ink">Firebase n&apos;est pas configuré : l&apos;app fonctionne en mode local, sans compte.</p>
        ) : (
          <>
            <p className="relative z-10 text-heading text-ink">Revenir quand tu veux.</p>
            <button onClick={signIn} className="btn-ink relative z-10 mt-8">
              Se reconnecter avec Google →
            </button>
          </>
        )}
      </div>
    </section>
  );
}
