import { describe, it, expect } from "vitest";
import { buildNavMenus, catalogShortcuts } from "../lib/nav-katalog";
import { filterDariUrl } from "../lib/discover";
import type { Drama } from "../lib/types";

function stub(partial: Partial<Drama> & Pick<Drama, "id" | "title">): Drama {
  return {
    category: "Action",
    episodes: 10,
    views: "1.0K",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

/** Katalog kaya: semua field terisi, jadi SEMUA menu layak muncul. */
const KAYA: Drama[] = [
  stub({
    id: "a",
    title: "Alpha",
    category: "Romance",
    status: "Completed",
    subtitles: ["id"],
    imdbRating: "8.5",
    year: "2024",
    country: "United States, Canada",
  }),
  stub({
    id: "b",
    title: "Beta",
    category: "Action",
    status: "Ongoing",
    premium: true,
    year: "2023",
    country: "Canada",
  }),
  stub({ id: "c", title: "Gamma", category: "Comedy", kind: "movie" }),
  stub({ id: "d", title: "Delta", category: "Romance" }),
];

/** Katalog apa adanya milik DramaKu sekarang: tanpa tahun, rating, koin, film. */
const POLOS: Drama[] = [
  stub({ id: "x", title: "Xena", category: "Action" }),
  stub({ id: "y", title: "Yuna", category: "Romance" }),
];

function kunciMenu(dramas: Drama[]): string[] {
  return buildNavMenus(dramas).map((m) => m.key);
}

/**
 * Jalankan tautan menu lewat jalur yang SAMA dengan halaman /discover:
 * `filterDariUrl` adalah fungsi yang dipakai DramaBrowser juga. Kalau tes ini
 * memakai pemetaan salinan sendiri, salah nama parameter (menu mengirim
 * "?negara=" tapi halaman membaca nama lain) akan lolos tanpa ketahuan.
 */
function hasilDariTautan(dramas: Drama[], href: string): Drama[] {
  return filterDariUrl(dramas, new URLSearchParams(href.split("?")[1] ?? ""));
}

describe("buildNavMenus", () => {
  it("membuat enam menu saat datanya memang terisi", () => {
    // Urutannya sejajar dengan situs katalog pembanding.
    expect(kunciMenu(KAYA)).toEqual([
      "genre",
      "jenis",
      "populer",
      "negara",
      "tahun",
      "lainnya",
    ]);
  });

  it("membuang menu Negara & Tahun saat kolomnya kosong", () => {
    // Ini yang paling mudah salah: kolom `country`/`year` boleh kosong, dan
    // menu yang diklik lalu memulangkan halaman hampa terbaca seperti situs
    // rusak.
    const kunci = kunciMenu(POLOS);
    expect(kunci).not.toContain("negara");
    expect(kunci).not.toContain("tahun");
  });

  it("membuang menu Jenis saat katalog cuma punya satu jenis", () => {
    // Tidak ada film, jadi "Jenis" cuma akan berisi satu pilihan.
    expect(kunciMenu(POLOS)).not.toContain("jenis");
  });

  it("memecah negara gabungan dari OMDb jadi pilihan terpisah", () => {
    // `country` datang sebagai "United States, Canada" — kalau tidak dipecah,
    // menunya memajang satu baris panjang yang cuma cocok untuk satu judul.
    const negara = buildNavMenus(KAYA).find((m) => m.key === "negara");
    const label = negara?.items.map((i) => i.label) ?? [];
    expect(label).toContain("United States");
    expect(label).toContain("Canada");
    expect(label).not.toContain("United States, Canada");
  });

  it("menyembunyikan urutan Rating & Tahun saat katalog tak punya datanya", () => {
    const populer = buildNavMenus(POLOS).find((m) => m.key === "populer");
    const label = populer?.items.map((i) => i.label) ?? [];
    expect(label).toContain("Paling Banyak Ditonton");
    expect(label).not.toContain("Rating Tertinggi");
    expect(label).not.toContain("Tahun Terbaru");
  });

  it("mengarahkan semua tautan ke /discover", () => {
    // /discover satu-satunya halaman yang membaca penyaring dari alamat URL.
    // Kalau ada yang menunjuk /beranda, tautannya akan diabaikan diam-diam.
    for (const menu of buildNavMenus(KAYA)) {
      for (const item of menu.items) {
        expect(item.href.startsWith("/discover")).toBe(true);
      }
    }
  });

  it("tiap pilihan menu memulangkan minimal satu judul", () => {
    // Ini syarat owner: "semuanya berfungsi kalau diklik".
    for (const menu of buildNavMenus(KAYA)) {
      for (const item of menu.items) {
        expect(
          hasilDariTautan(KAYA, item.href).length,
          `${menu.label} > ${item.label} (${item.href}) memulangkan nol judul`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("tidak menggambar menu apa pun untuk katalog kosong", () => {
    expect(buildNavMenus([])).toEqual([]);
  });
});

describe("catalogShortcuts", () => {
  it("selalu menyediakan Terbaru & Terpopuler", () => {
    // Keduanya cuma butuh urutan katalog & `views` yang selalu ada.
    const label = catalogShortcuts(POLOS).map((s) => s.label);
    expect(label).toContain("Terbaru");
    expect(label).toContain("Terpopuler");
  });

  it("menyembunyikan Tamat & Gratis saat datanya belum ada", () => {
    const label = catalogShortcuts(POLOS).map((s) => s.label);
    expect(label).not.toContain("Tamat");
    expect(label).not.toContain("Gratis");
  });

  it("memunculkan Tamat & Gratis saat katalog memuat keduanya", () => {
    const label = catalogShortcuts(KAYA).map((s) => s.label);
    expect(label).toContain("Tamat");
    expect(label).toContain("Gratis");
  });

  it("tiap pintasan memulangkan minimal satu judul", () => {
    for (const s of catalogShortcuts(KAYA)) {
      expect(
        hasilDariTautan(KAYA, s.href).length,
        `pintasan ${s.label} (${s.href}) memulangkan nol judul`,
      ).toBeGreaterThan(0);
    }
  });
});
