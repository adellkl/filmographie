import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bibliothèques Node chargées telles quelles (pas de bundling) : notifications côté serveur
  serverExternalPackages: ["firebase-admin", "web-push"],
  // Connexion Google servie depuis le domaine du site (Safari bloque les cookies tiers)
  async rewrites() {
    const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!project) return [];
    return [
      { source: "/__/auth/:path*", destination: `https://${project}.firebaseapp.com/__/auth/:path*` },
      { source: "/__/firebase/:path*", destination: `https://${project}.firebaseapp.com/__/firebase/:path*` },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
