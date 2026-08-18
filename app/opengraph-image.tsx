import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

/**
 * Gambar preview saat link situs di-share ke WhatsApp/Facebook/X.
 * Dibuat otomatis 1200x630 (ukuran yang diharapkan pemindai link) karena
 * public/logo.png berbentuk potret 640x704 — kalau dipakai langsung, terpotong.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE_NAME} — nonton drama China sub Indo gratis`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b0b0f 0%, #1a1030 55%, #3b0d3f 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 104, fontWeight: 700, letterSpacing: -2 }}>
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 40, color: "#e5b8ff" }}>
          Drama China Sub Indo — Gratis
        </div>
        <div style={{ display: "flex", marginTop: 34, fontSize: 27, color: "#9ca3af" }}>
          Ratusan episode · nonton di HP & web
        </div>
      </div>
    ),
    size,
  );
}
