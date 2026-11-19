import { ImageResponse } from "next/og";

/** Icône de l'app : fond obsidienne, « A » blanc, astérisque orange (signature du site). */
export function appIcon(size: number, maskable = false) {
  const pad = maskable ? size * 0.12 : 0; // zone de sécurité pour les icônes « maskable »
  const radius = maskable ? 0 : size * 0.22;
  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: "#101010",
          borderRadius: radius,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: pad,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", color: "#eeeeee" }}>
          <span style={{ fontSize: size * 0.62, lineHeight: 1, letterSpacing: -size * 0.03, fontWeight: 500 }}>A</span>
          <span style={{ fontSize: size * 0.34, lineHeight: 1, color: "#ee6018", marginLeft: size * 0.01, marginTop: size * 0.02 }}>*</span>
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
