/** Nom du site, affiché dans l'onglet, la navigation et le pied de page. */
export const SITE_NAME = "Adel et ses films/séries";

/** « de Adel » → « d'Adel » (élision devant voyelle ou h muet). */
export const deName = (name?: string | null) => {
  const n = name || "Adel";
  return /^[aeiouyhàâéèêëîïôûù]/i.test(n) ? `d'${n}` : `de ${n}`;
};
