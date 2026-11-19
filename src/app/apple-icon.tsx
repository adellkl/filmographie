import { appIcon } from "@/lib/app-icon";

// Icône d'écran d'accueil iPhone (iOS applique lui-même les coins arrondis)
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return appIcon(180, true);
}
