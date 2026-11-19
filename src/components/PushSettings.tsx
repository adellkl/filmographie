"use client";

import { useEffect, useState } from "react";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import { useLibrary } from "@/lib/library";

type State = "loading" | "unsupported" | "install" | "denied" | "off" | "on";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlB64ToUint8Array(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const isIOS = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

async function subId(endpoint: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return [...new Uint8Array(hash)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Activer / désactiver les notifications push sur cet appareil. */
export function PushSettings() {
  const { user, mode } = useLibrary();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // Sur iPhone, les notifications n'existent que dans l'app installée (écran d'accueil)
        return setState(isIOS() && !isStandalone() ? "install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  const enable = async () => {
    const fb = getFirebase();
    if (!fb || !user) return setMsg("Connecte-toi pour activer les notifications.");
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID) });
      const json = sub.toJSON();
      await setDoc(doc(fb.db, "users", user.uid, "push", await subId(sub.endpoint)), {
        subscription: { endpoint: json.endpoint, keys: json.keys },
        device: navigator.userAgent.slice(0, 160),
        createdAt: Date.now(),
      });
      setState("on");
      // Notification de test immédiate
      const token = await user.getIdToken();
      const r = await fetch("/api/push/test", { method: "POST", headers: { authorization: `Bearer ${token}` } });
      setMsg(r.ok ? "C'est activé : une notification de test vient d'être envoyée." : "Activé sur l'appareil. L'envoi côté serveur n'est pas encore configuré.");
    } catch (e) {
      setMsg(`Impossible d'activer : ${String(e).slice(0, 120)}`);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      const fb = getFirebase();
      if (sub) {
        if (fb && user) await deleteDoc(doc(fb.db, "users", user.uid, "push", await subId(sub.endpoint))).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
      setMsg("Notifications désactivées sur cet appareil.");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    if (!user) return;
    setBusy(true);
    const r = await fetch("/api/push/test", { method: "POST", headers: { authorization: `Bearer ${await user.getIdToken()}` } }).catch(() => null);
    setMsg(r?.ok ? "Notification de test envoyée." : "L'envoi a échoué (serveur non configuré ?).");
    setBusy(false);
  };

  if (mode !== "cloud" && mode !== "local") return null;

  return (
    <div className="card-bone p-6">
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-[520px]">
          <span className="mono flex items-center gap-2 text-graphite">
            <span className={`h-1.5 w-1.5 rounded-full ${state === "on" ? "bg-metric" : "bg-signal"}`} /> Notifications
          </span>
          <p className="mt-4 text-heading text-ink">
            {state === "on" ? "Tu seras prévenu." : state === "install" ? "Installe l'app d'abord." : "Sois prévenu des sorties."}
          </p>
          <p className="mt-3 text-body-sm text-ink/75">
            {state === "install" ? (
              <>
                Sur iPhone, les notifications ne fonctionnent que depuis l&apos;app installée : dans Safari, touche{" "}
                <span className="whitespace-nowrap rounded-sm bg-ink/10 px-1.5 py-0.5">Partager ⬆︎</span> puis{" "}
                <span className="whitespace-nowrap rounded-sm bg-ink/10 px-1.5 py-0.5">Sur l&apos;écran d&apos;accueil</span>, ouvre l&apos;app depuis son
                icône et reviens ici.
              </>
            ) : state === "denied" ? (
              "Les notifications sont bloquées pour ce site. Autorise-les dans Réglages › Notifications › Adel."
            ) : state === "unsupported" ? (
              "Ce navigateur ne gère pas les notifications push."
            ) : (
              "Chaque matin : un film de ta liste à voir sort au cinéma ou arrive en streaming, un nouvel épisode d'une série que tu regardes."
            )}
          </p>
          {msg && <p className="mono mt-4 text-graphite">{msg}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {state === "off" && (
            <button onClick={enable} disabled={busy} className="btn-ink h-11 px-5">
              {busy ? "Activation…" : "Activer les notifications"}
            </button>
          )}
          {state === "on" && (
            <>
              <button onClick={test} disabled={busy} className="btn-ink h-11">
                Tester
              </button>
              <button onClick={disable} disabled={busy} className="btn h-11 border border-black/15 text-ink hover:border-ink">
                Désactiver
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
