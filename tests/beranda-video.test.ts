// Penjaga BARIS BERANDA CAMPURAN (drama + video) — owner 2026-09-26.
//
// Kenapa ini yang dijaga ketat: aturan di lib/beranda-video.ts menentukan
// sebuah video KETEMU atau tidak oleh penonton. Kalau salah, kerusakannya
// SENYAP — tak ada error, tak ada layar merah, cuma video yang tidak pernah
// muncul di mana pun. Owner baru akan menyadarinya berhari-hari kemudian.
//
// Dua premis yang dikoreksi lebih dulu dan diabadikan di sini:
//   1. Video Playly TIDAK punya genre dari sananya (lib/playly.ts:398).
//      Satu-satunya sumbernya pilihan admin, dan per 2026-09-26 NOL dari 46
//      video di produksi punya kategori. Karena itu baris "Film Terbaru"
//      memuat SELURUH video, bukan hanya yang berkategori.
//   2. Halaman depan `/` dan `/shorts` TIDAK boleh ikut berubah — keduanya
//      memanggil `homeCatalogRows` langsung, dan fungsi itu tidak disentuh.
import { describe, it, expect } from "vitest";
import {
  JUDUL_BARIS_VIDEO,
  KUNCI_BARIS_VIDEO,
  barisBerandaGabungan,
} from "../lib/beranda-video";
import { ROW_MAX_ITEMS, homeCatalogRows } from "../lib/beranda-catalog";
import type { Drama } from "../lib/types";
import type { PlaylyVideoPublik } from "../lib/playly-publik";

function drama(partial: Partial<Drama> & Pick<Drama, "id" | "title">): Drama {
  return {
    category: "Action",
    episodes: 10,
    views: "0",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

function video(
  id: string,
  ubah: Partial<PlaylyVideoPublik> = {},
): PlaylyVideoPublik {
  return {
    id,
    title: `Video ${id}`,
    durationSeconds: 140,
    durationLabel: "2:20",
    creator: "coklat",
    embedUrl: `https://playly-dashboard.vercel.app/id/${id}/embed`,
    thumbnail: null,
    dramaTitle: null,
    dramaHref: null,
    episode: null,
    year: null,
    genre: null,
    kategori: null,
    rating: null,
    contentRating: null,
    quality: null,
    ...ubah,
  };
}

/** Katalog yang cukup berisi supaya baris genre benar-benar terbentuk. */
const banyakDrama = (kategori: Drama["category"], jumlah: number, awalan: string) =>
  Array.from({ length: jumlah }, (_, i) =>
    drama({ id: `${awalan}${i}`, title: `${awalan} ${i}`, category: kategori }),
  );

const kunci = (rows: { key: string }[]) => rows.map((r) => r.key);

describe("baris video", () => {
  const dramas = banyakDrama("Action", 6, "a");

  it("muncul PALING ATAS supaya video langsung terlihat", () => {
    const rows = barisBerandaGabungan(dramas, [video("v1")]);
    expect(rows[0].key).toBe(KUNCI_BARIS_VIDEO);
    expect(rows[0].title).toBe(JUDUL_BARIS_VIDEO);
  });

  it("memuat SELURUH video, termasuk yang belum dipilihkan kategori", () => {
    // Inti permintaan owner. Kalau baris ini hanya memuat yang berkategori,
    // seluruh 46 video produksi hari ini HILANG dari beranda.
    const rows = barisBerandaGabungan(dramas, [
      video("v1"),
      video("v2", { kategori: "Action" }),
    ]);
    const isi = rows[0].items.map((k) =>
      k.jenis === "video" ? k.video.id : k.drama.id,
    );
    expect(isi).toEqual(["v1", "v2"]);
  });

  it("judulnya TIDAK menyebut penyedia videonya", () => {
    // Owner 2026-09-26: "viewer tidak perlu tahu darimana asal video".
    expect(JUDUL_BARIS_VIDEO.toLowerCase()).not.toContain("playly");
  });

  it("TIDAK digambar kalau memang tak ada video", () => {
    const rows = barisBerandaGabungan(dramas, []);
    expect(kunci(rows)).not.toContain(KUNCI_BARIS_VIDEO);
  });

  it("tetap digambar walau isinya cuma satu video", () => {
    // SENGAJA beda dari baris drama, yang butuh minimal 4 judul. Untuk drama,
    // baris yang disembunyikan masih terjangkau lewat strip genre & /discover;
    // untuk video, menyembunyikannya berarti HILANG dari beranda sama sekali.
    const rows = barisBerandaGabungan(dramas, [video("v1")]);
    expect(rows[0].items).toHaveLength(1);
  });

  it("dipotong di batas yang sama dengan baris drama", () => {
    const banyakVideo = Array.from({ length: ROW_MAX_ITEMS + 10 }, (_, i) =>
      video(`v${i}`),
    );
    const rows = barisBerandaGabungan(dramas, banyakVideo);
    expect(rows[0].items).toHaveLength(ROW_MAX_ITEMS);
  });
});

describe("video berkategori ikut ke baris genrenya", () => {
  const dramas = [
    ...banyakDrama("Action", 5, "a"),
    ...banyakDrama("Romance", 5, "r"),
  ];

  it("masuk baris genre yang cocok, di DEPAN", () => {
    const rows = barisBerandaGabungan(dramas, [video("v1", { kategori: "Action" })]);
    const barisAction = rows.find((r) => r.key === "genre-Action");
    expect(barisAction, "baris genre Action hilang").toBeTruthy();
    expect(barisAction!.items[0]).toEqual({
      jenis: "video",
      video: expect.objectContaining({ id: "v1" }),
    });
  });

  it("TIDAK bocor ke baris genre lain", () => {
    // Pembanding wajib: tanpa ini, "masuk ke Action" tak bisa dibedakan dari
    // "masuk ke semua baris".
    const rows = barisBerandaGabungan(dramas, [video("v1", { kategori: "Action" })]);
    const barisRomance = rows.find((r) => r.key === "genre-Romance");
    expect(barisRomance!.items.every((k) => k.jenis === "drama")).toBe(true);
  });

  it("video tanpa kategori tidak menyusup ke baris genre mana pun", () => {
    const rows = barisBerandaGabungan(dramas, [video("v1")]);
    const barisGenre = rows.filter((r) => r.key.startsWith("genre-"));
    expect(barisGenre.length).toBeGreaterThan(0); // jaring pengaman tesnya sendiri
    for (const b of barisGenre) {
      expect(b.items.every((k) => k.jenis === "drama"), b.key).toBe(true);
    }
  });

  it("kategori yang tidak punya baris drama TIDAK menciptakan baris baru", () => {
    // Baris genre hanya lahir dari katalog drama (aturan ROW_MIN_ITEMS milik
    // homeCatalogRows). Video berkategori "Fantasy" yang dramanya nol tetap
    // ketemu lewat baris "Film Terbaru" — bukan lewat baris Fantasy kosong.
    const rows = barisBerandaGabungan(dramas, [video("v1", { kategori: "Fantasy" })]);
    expect(kunci(rows)).not.toContain("genre-Fantasy");
    expect(rows[0].items).toHaveLength(1);
  });

  it("baris genre tidak melar melewati batasnya sesudah disisipi", () => {
    const penuh = banyakDrama("Action", ROW_MAX_ITEMS + 5, "a");
    const rows = barisBerandaGabungan(penuh, [
      video("v1", { kategori: "Action" }),
      video("v2", { kategori: "Action" }),
    ]);
    const barisAction = rows.find((r) => r.key === "genre-Action");
    expect(barisAction!.items).toHaveLength(ROW_MAX_ITEMS);
  });
});

describe("baris drama tidak berubah perilakunya", () => {
  const dramas = banyakDrama("Action", 6, "a");

  it("urutan & judul baris drama persis seperti homeCatalogRows", () => {
    // Penjaga untuk halaman depan `/` dan `/shorts`, yang masih memanggil
    // homeCatalogRows langsung. Kalau pembungkus ini diam-diam mengubah urutan
    // atau judulnya, kedua halaman itu jadi terasa berbeda dari beranda.
    const asli = homeCatalogRows(dramas);
    const gabungan = barisBerandaGabungan(dramas, [video("v1")]);
    // Baris pertama = baris video; sisanya harus sama persis dengan aslinya.
    expect(gabungan.slice(1).map((r) => [r.key, r.title, r.href])).toEqual(
      asli.map((r) => [r.key, r.title, r.href]),
    );
  });

  it("tanpa video sama sekali, hasilnya identik dengan homeCatalogRows", () => {
    const asli = homeCatalogRows(dramas);
    const gabungan = barisBerandaGabungan(dramas, []);
    expect(gabungan.map((r) => r.key)).toEqual(asli.map((r) => r.key));
    expect(
      gabungan.every((r) => r.items.every((k) => k.jenis === "drama")),
    ).toBe(true);
  });

  it("katalog kosong + ada video: barisnya tetap terbentuk", () => {
    // Situasi nyata saat Supabase bermasalah tapi API video sehat. Halaman
    // tidak boleh jadi kosong melompong kalau masih ada yang bisa ditonton.
    const rows = barisBerandaGabungan([], [video("v1")]);
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe(KUNCI_BARIS_VIDEO);
  });

  it("dua-duanya kosong: nol baris, bukan baris hampa", () => {
    expect(barisBerandaGabungan([], [])).toEqual([]);
  });
});
