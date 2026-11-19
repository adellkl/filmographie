"use client";

import { createContext, useCallback, useContext } from "react";

/**
 * Contexte de vue : privé (ton compte) ou public (/u/[handle], lecture seule).
 * `href()` préfixe les liens internes pour rester dans l'espace public.
 */
export type View = {
  base: string; // "" en privé, "/u/adelkl" en public
  readOnly: boolean;
  owner: { handle: string; name: string; photo: string | null } | null;
};

const ViewCtx = createContext<View>({ base: "", readOnly: false, owner: null });

export const ViewProvider = ({ value, children }: { value: View; children: React.ReactNode }) => (
  <ViewCtx.Provider value={value}>{children}</ViewCtx.Provider>
);

export const useView = () => useContext(ViewCtx);

export function useHref() {
  const { base } = useView();
  return useCallback((path: string | null) => (path == null ? null : base ? (path === "/" ? base : base + path) : path), [base]) as {
    (path: string): string;
    (path: string | null): string | null;
  };
}
