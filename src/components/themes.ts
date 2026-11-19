/** Thèmes de listes : un libellé, un glyphe. Pas de couleur — le système reste monochrome. */
export const THEMES = [
  { id: "libre", label: "Libre", glyph: "*" },
  { id: "soiree", label: "Soirée", glyph: "◐" },
  { id: "classiques", label: "Classiques", glyph: "◆" },
  { id: "decouverte", label: "Découverte", glyph: "◇" },
  { id: "genre", label: "Genre", glyph: "▲" },
  { id: "auteur", label: "Auteur", glyph: "◎" },
  { id: "series", label: "Séries", glyph: "▤" },
  { id: "classement", label: "Classement", glyph: "№" },
] as const;

export const themeOf = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];
