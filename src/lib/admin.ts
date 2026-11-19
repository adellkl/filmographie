// Côté serveur : accès administrateur à Firestore (tâches planifiées, notifications).
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App | null = null;

export const adminConfigured = () => Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);

export function admin() {
  if (!adminConfigured()) throw new Error("FIREBASE_SERVICE_ACCOUNT manquant");
  if (!app) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
    app = getApps()[0] ?? initializeApp({ credential: cert(sa) });
  }
  return { db: getFirestore(app), auth: getAuth(app) };
}
