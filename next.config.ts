import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bibliothèques Node chargées telles quelles (pas de bundling) : notifications côté serveur
  serverExternalPackages: ["firebase-admin", "web-push"],
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
