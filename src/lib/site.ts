/** Nom du site, affiché dans l'onglet, la navigation et le pied de page. */
export const SITE_NAME = "Adel et ses films/séries";

/** URL publique du site (production). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://adel-films-series.vercel.app").replace(/\/$/, "");

export const SITE_DESCRIPTION =
  "Le journal de films et séries d'Adel : plus de 390 titres notés et critiqués, coups de cœur, chefs-d'œuvre, listes par thème et prochaines séances. Synchronisé avec Letterboxd.";

/** Nom affiché du propriétaire. */
export const OWNER_NAME = process.env.NEXT_PUBLIC_PUBLIC_NAME || "Adel";

/** « de Adel » → « d'Adel » (élision devant voyelle ou h muet). */
export const deName = (name?: string | null) => {
  const n = name || "Adel";
  return /^[aeiouyhàâéèêëîïôûù]/i.test(n) ? `d'${n}` : `de ${n}`;
};
