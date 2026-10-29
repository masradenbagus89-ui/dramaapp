// Penjaga TATA LETAK blok judul + tombol unduh di halaman /tonton/[id]
// (owner 2026-10-29: *"tampilan download dan komponennya terkesan kaku, ubah
// supaya lebih enak dilihat TAPI jangan ganti isi-isinya, hanya layout-nya"*).
//
// Dua hal yang dijaga di sini, dan keduanya mudah rusak tanpa suara:
//
//   1. ISINYA TIDAK BOLEH HILANG. Permintaannya khusus "hanya layout" —
//      merapikan tampilan sambil diam-diam membuang tombol atau keterangan
//      adalah persis yang owner larang.
//   2. GRID DAFTAR FILM TIDAK IKUT BERUBAH. Komponen yang sama dipakai
//      `PlaylyVideoGrid`, tempat bentuk KARTU justru yang benar. Mode baru
//      dipasang lewat prop opsional supaya pemakai lama tak tersenggol.
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tonton/x",
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  useSearchParams: () => new URLSearchParams(""),
}));

const { default: InfoVideoPlayly } = await import(
  "../app/components/player/InfoVideoPlayly"
);

const DATA = {
  title: "Judul Uji",
  contentRating: "Unrated",
  quality: "1080p",
  durationLabel: "1:30:18",
  genre: "Action, Thriller",
  linkUnduhan: [],
};
const render = (tataLetak?: "kartu" | "halaman") =>
  renderToStaticMarkup(
    h(InfoVideoPlayly, { ...DATA, ...(tataLetak ? { tataLetak } : {}) }),
  );

const INFO = readFileSync("app/components/player/InfoVideoPlayly.tsx", "utf-8");
const TONTON = readFileSync("app/tonton/[id]/page.tsx", "utf-8");
const GRID = readFileSync("app/components/PlaylyVideoGrid.tsx", "utf-8");

describe("blok judul /tonton — layout dirapikan, isi utuh", () => {
  it("halaman memakai mode tata letak 'halaman'", () => {
    expect(TONTON).toContain('tataLetak="halaman"');
  });

  it("judul film TIDAK digambar dua kali", () => {
    // Masalah paling mencolok di tampilan lama: <h1> halaman memuat judul,
    // lalu kotak di bawahnya mengulang judul yang sama persis.
    expect(
      INFO,
      "judul di dalam kotak tidak lagi digerbangi — ia akan mengulang <h1> " +
        "halaman tepat di atasnya",
    ).toContain("{!halaman && (");
  });

  it("kotak berbingkai sempit hanya untuk mode kartu", () => {
    // `max-w-sm` + border + shadow adalah bentuk KARTU. Di halaman detail ia
    // kotak sempit yang terjepit di tengah kolom lebar — itu yang terasa kaku.
    expect(INFO).toContain(
      '"max-w-sm rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm"',
    );
  });

  it("TIDAK ADA isi yang dibuang — ketiga tombol & keterangan tetap", () => {
    for (const bagian of [
      "DOWNLOAD",
      "<ShareButton",
      "Simpan",
      "Tersimpan",
      "keterangan.map",
      "genres.map",
      "<ModalProviderPlayly",
    ]) {
      expect(INFO, `"${bagian}" hilang dari kotak info`).toContain(bagian);
    }
    // Tautan drama terkait di bawah tombol juga harus tetap ada.
    expect(TONTON).toContain("video.dramaTitle");
  });

  it("GRID daftar film tetap memakai bentuk kartu", () => {
    // Pagar arah sebaliknya. Kalau mode "halaman" bocor ke sana, kartu-kartu
    // di daftar film kehilangan bingkainya dan grid berantakan.
    expect(
      GRID,
      "PlaylyVideoGrid ikut memakai mode halaman — kartunya kehilangan bingkai",
    ).not.toContain('tataLetak="halaman"');
    expect(GRID).toContain("<InfoVideoPlayly");
  });

  it("mode kartu adalah nilai BAWAAN", () => {
    // Supaya pemakai lama (dan pemakai baru yang lupa menyetelnya) mendapat
    // bentuk yang sudah teruji, bukan bentuk yang baru dipasang hari ini.
    expect(INFO).toContain('tataLetak = "kartu"');
  });
});

// ===========================================================================
// DIRENDER SUNGGUHAN — grep atas HTML halaman TIDAK cukup di sini.
//
// `PlaylyVideoGrid` menggambar kotak ini HANYA sesudah penonton mengklik
// sebuah video (`{aktif && …}`), jadi ia memang TIDAK ADA di HTML awal /film.
// Memeriksa bentuk kartu lewat HTML halaman karena itu selalu "tidak ketemu"
// dan terbaca seperti regresi — padahal tak ada yang rusak. Render langsung
// yang menjawabnya.
// ===========================================================================
describe("kedua mode dirender sungguhan", () => {
  it("mode KARTU tetap berbingkai & tetap memuat judul", () => {
    const html = render("kartu");
    expect(html).toContain("max-w-sm");
    expect(html).toContain("border-zinc-200");
    expect(html).toContain("shadow-sm");
    expect(html, "judul hilang dari kartu grid").toContain("Judul Uji");
  });

  it("TANPA prop = mode kartu (pemakai lama tak tersenggol)", () => {
    expect(render()).toBe(render("kartu"));
  });

  it("mode HALAMAN melepas bingkai & TIDAK mengulang judul", () => {
    const html = render("halaman");
    expect(html).not.toContain("max-w-sm");
    expect(html).not.toContain("shadow-sm");
    expect(
      html,
      "judul masih digambar — ia akan mengulang <h1> halaman di atasnya",
    ).not.toContain("Judul Uji</h3>");
  });

  it("kedua mode memuat ISI yang sama — tak ada yang dibuang", () => {
    for (const mode of ["kartu", "halaman"] as const) {
      const html = render(mode);
      for (const isi of ["DOWNLOAD", "Bagikan", "Simpan", "Unrated", "1080p", "1:30:18", "Action", "Thriller"]) {
        expect(html, `${mode}: "${isi}" hilang`).toContain(isi);
      }
    }
  });

  it("mode halaman menyamakan tinggi ketiga tombol", () => {
    const html = render("halaman");
    expect((html.match(/h-10/g) || []).length).toBeGreaterThanOrEqual(3);
  });
});
