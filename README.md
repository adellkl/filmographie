# adelkl\* — journal de films

Un Letterboxd perso : journal, notes, critiques, liste à voir. Next.js 16 + Tailwind 4, Firebase (Auth Google + Firestore), TMDB, animations GSAP / ScrollTrigger.

## Lancer

```bash
npm install
npm run dev
```

→ http://localhost:3000

Sans configuration, l'app tourne en **mode local** (données dans le navigateur) et se synchronise déjà avec le flux public `letterboxd.com/adelkl/rss`.

## Configuration (`.env.local`)

### TMDB (recherche, fiches, affiches)
1. Crée un compte sur themoviedb.org → Réglages → API.
2. Colle la clé v3 dans `TMDB_API_KEY` (ou le jeton v4 dans `TMDB_READ_TOKEN`).

### Firebase (synchro multi-appareils)
1. console.firebase.google.com → **Ajouter un projet**.
2. **Authentication** → Méthode de connexion → active **Google**.
3. **Firestore Database** → Créer une base (mode production).
4. Règles Firestore : colle le contenu de `firestore.rules` (chaque utilisateur ne voit que ses données).
5. Paramètres du projet → Vos applications → **Web** → copie la config dans les variables `NEXT_PUBLIC_FIREBASE_*`.
6. Relance `npm run dev`, clique **Connexion**.

Données stockées : `users/{uid}/entries/{id}` et `users/{uid}/watchlist/{id}`.

## Import Letterboxd
- **Automatique** : à chaque session, les ~50 dernières séances du flux RSS (notes, ♥, critiques, ID TMDB).
- **Historique complet** : page *Synchro* → dépose le ZIP d'export (Letterboxd → Settings → Data → Export your data). Les films sont reliés à TMDB pour récupérer les affiches.

## Structure
- `src/lib/library.tsx` — état global, Firestore temps réel ou localStorage
- `src/lib/tmdb.ts`, `src/lib/letterboxd.ts` — accès serveur TMDB / RSS
- `src/lib/csv-import.ts` — lecture de l'export ZIP/CSV
- `src/app/api/*` — routes TMDB (search, movie, trending, match) et Letterboxd
- `src/components/motion.ts` — animations communes (SplitText, reveals, compteurs, parallaxe, barres)
