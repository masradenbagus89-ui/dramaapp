// Penjaga TAMPILAN tombol Report Video + Live Chat (2026-11-25).
// Pemutar drama: dua ikon di rail kanan (keputusan owner/klien: bukan baris di
// bawah layar). Halaman Playly: baris tombol di bawah pemutar. Kalau salah satu
// hilang karena refactor, member tak punya jalan melapor — kerusakan senyap.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { default: ActionRail } = await import("../app/components/ActionRail");
const { default: BarisBantuanVideo } = await import("../app/components/bantuan/BarisBantuanVideo");
const { labelServer } = await import("../lib/laporan-video");

describe("tombol bantuan di pemutar", () => {
  it("rail drama punya ikon Lapor & Chat, sesudah ikon bawaan", () => {
    const html = renderToStaticMarkup(createElement(ActionRail, { dramaId: "d1", title: "Uji" }));
    const bagikan = html.indexOf('aria-label="Bagikan"');
    const lapor = html.indexOf('aria-label="Lapor"');
    const chat = html.indexOf('aria-label="Chat"');
    expect(bagikan).toBeGreaterThan(-1);
    expect(lapor).toBeGreaterThan(bagikan);
    expect(chat).toBeGreaterThan(lapor);
  });

  it("jendela laporan & chat tertutup saat awal (tak menutupi video)", () => {
    const html = renderToStaticMarkup(createElement(ActionRail, { dramaId: "d1", title: "Uji" }));
    expect(html).not.toContain('role="dialog"');
  });

  it("halaman Playly punya tombol Report Video & Live Chat", () => {
    const html = renderToStaticMarkup(createElement(BarisBantuanVideo, { videoId: "v1", judul: "Uji" }));
    expect(html).toContain("Report Video");
    expect(html).toContain("Live Chat");
  });
});

describe("labelServer", () => {
  it("mencatat host + resolusi saja, bukan alamat lengkap", () => {
    expect(labelServer("https://cdn.contoh.com/rahasia/jalur", "720p")).toBe("cdn.contoh.com · 720p");
    expect(labelServer("", "")).toBe("lokal · asli");
    expect(labelServer(null, "")).toBe("belum dimuat · asli");
    expect(labelServer("bukan url", "480p")).toBe("tidak dikenal · 480p");
  });
});
