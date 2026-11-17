// Penjaga: menu admin tidak menunggu data sebelum judulnya tergambar.
//
// Owner 2026-11-17: pola IMDb (judul dulu, isi menyusul) diseragamkan ke
// seluruh bagian admin. Kalau page.tsx kembali `await` database sebelum
// `return`, layarnya kosong lagi dan tes ini merah.
import { describe, it, expect } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import KerangkaBagianAdmin from "../app/components/admin/KerangkaBagianAdmin";

function sumber(path: string) {
  return readFileSync(path, "utf8");
}

describe("bagian admin menggambar judul sebelum datanya siap", () => {
  it("kerangka menyebut judul dan kalimat sedang diambil", () => {
    const html = renderToStaticMarkup(
      h(KerangkaBagianAdmin, {
        judul: "Contoh",
        status: "Sedang diambil.",
      }),
    );
    expect(html).toContain("Contoh");
    expect(html).toContain("Sedang diambil.");
    expect(html).toContain("animate-pulse");
  });

  it("halaman kunci tidak menunggu status sebelum judul", () => {
    const halaman = sumber("app/admin/settings/playly/page.tsx");
    expect(halaman).toContain("<Suspense");
    expect(halaman).toContain("Status kunci sedang diambil.");
    expect(halaman).toContain("Kunci API Playly");
    expect(halaman).not.toContain("getPlaylyKeyStatus");
  });

  it("halaman webhook tidak menunggu daftar sebelum judul", () => {
    const halaman = sumber("app/admin/webhooks/playly/page.tsx");
    expect(halaman).toContain("<Suspense");
    expect(halaman).toContain("Status jalur sedang diambil.");
    expect(halaman).toContain("Webhook Playly");
    expect(halaman).not.toContain("getPlaylyWebhookVideos");
  });

  it("dashboard dan daftar drama tidak menampilkan angka nol selagi diambil", () => {
    const halaman = sumber("app/admin/page.tsx");
    expect(halaman).toContain("Daftar drama sedang diambil.");
    expect(halaman).toContain("<AdminSidebar />");
    // Layar penuh "Memeriksa akses" tanpa menu adalah yang dikeluhkan.
    expect(halaman).not.toContain("min-h-[60vh]");
  });

  it("kelola admin tidak menulis 0 admin selagi daftar belum ada", () => {
    const isi = sumber("app/components/admin/AdminManager.tsx");
    expect(isi).toContain("Daftar admin sedang diambil.");
  });
});
