import { describe, it, expect } from "vitest";
import { STRIP_KATALOG, buildNavMenus } from "../lib/nav-katalog";
import { FILTER_KOSONG, bacaFilter, filterDariUrl } from "../lib/discover";
import type { CatalogFilter } from "../lib/discover";
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
    // Genre OMDb sengaja BERBEDA dari `category` — itulah bentuk aslinya di
    // katalog: "Romance" (kategori DramaKu) vs "Horror, Sci-Fi" (genre sinema).
    genre: "Horror, Sci-Fi",
  }),
  stub({
    id: "b",
    title: "Beta",
    category: "Action",
    status: "Ongoing",
    premium: true,
    year: "2023",
    country: "Canada",
    // "Action" sengaja diulang di sini: ia sudah jadi kategori DramaKu, jadi
    // menu TIDAK boleh menggambarnya dua kali.
    genre: "Action, Sci-Fi",
  }),
  stub({ id: "c", title: "Gamma", category: "Comedy", kind: "movie" }),
  stub({ id: "d", title: "Delta", category: "Romance", year: "2022" }),
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

  it("memakai label tombol PERSIS seperti yang ditentukan owner", () => {
    // Owner menentukan keenam tulisan ini dari situs katalog pembanding
    // (2026-09-21, ditegaskan dua kali). Dikunci di sini karena sudah dua kali
    // jadi soal — label bukan detail teknis yang boleh diganti sambil lalu.
    expect(buildNavMenus(KAYA).map((m) => m.label)).toEqual([
      "Genre",
      "Series",
      "Populer",
      "Negara",
      "Tahun",
      "+ More",
    ]);
  });

  it("kunci internal menu TIDAK ikut berubah saat labelnya diganti", () => {
    // `key` dipakai React & tes; memisahkannya dari label itu yang membuat
    // tulisan bisa diganti kapan saja tanpa menyentuh apa pun yang lain.
    expect(kunciMenu(KAYA)).toContain("jenis");
    expect(kunciMenu(KAYA)).toContain("lainnya");
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
    expect(label).toContain("Amerika");
    expect(label).toContain("Kanada");
    expect(label).not.toContain("United States, Canada");
  });

  it("menerjemahkan LABEL negara tapi TIDAK alamatnya", () => {
    // Inilah kegagalan senyap yang paling mungkin: label "Cina" ikut terkirim
    // ke alamat, padahal penyaring mencocokkan nilai asli OMDb "China" —
    // chip-nya tergambar rapi lalu memulangkan halaman hampa.
    const negara = buildNavMenus(KAYA).find((m) => m.key === "negara");
    const amerika = negara?.items.find((i) => i.label === "Amerika");
    expect(amerika?.href).toBe("/discover?negara=United+States");
    expect(hasilDariTautan(KAYA, amerika!.href).map((d) => d.id)).toEqual(["a"]);
  });

  it("menggabungkan genre sinema OMDb ke menu Genre tanpa menggandakan", () => {
    const genre = buildNavMenus(KAYA).find((m) => m.key === "genre");
    const label = genre?.items.map((i) => i.label) ?? [];
    // Genre sinema yang belum jadi kategori DramaKu → ikut digambar.
    expect(label).toContain("Horror");
    expect(label).toContain("Sci-Fi");
    // "Action" sudah jadi kategori, jadi hanya boleh muncul SEKALI.
    expect(label.filter((l) => l === "Action")).toHaveLength(1);
  });

  it("memisahkan alamat kategori (?cat=) dari genre sinema (?genre=)", () => {
    const genre = buildNavMenus(KAYA).find((m) => m.key === "genre");
    const cari = (l: string) => genre?.items.find((i) => i.label === l)?.href;
    expect(cari("Action")).toBe("/discover?cat=Action");
    expect(cari("Horror")).toBe("/discover?genre=Horror");
  });

  it("menawarkan penyaring rating IMDb di menu + More", () => {
    // Dropdown rating di bar cari dilepas 2026-09-21; pilihannya pindah ke sini
    // supaya penyaringnya tidak ikut hilang. KAYA punya satu judul 8.5.
    const lainnya = buildNavMenus(KAYA).find((m) => m.key === "lainnya");
    const label = lainnya?.items.map((i) => i.label) ?? [];
    expect(label).toContain("IMDb 7+");
    expect(label).toContain("IMDb 8+");
    // Tak satu pun judul mencapai 9, jadi ambang itu tidak digambar.
    expect(label).not.toContain("IMDb 9+");
  });

  it("tidak menawarkan rating sama sekali saat katalog tak punya nilainya", () => {
    const lainnya = buildNavMenus(POLOS).find((m) => m.key === "lainnya");
    const label = lainnya?.items.map((i) => i.label) ?? [];
    expect(label.filter((l) => l.startsWith("IMDb"))).toHaveLength(0);
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

describe("STRIP_KATALOG (daftar tetap milik owner)", () => {
  // ⚠️ Aturan penjaganya SENGAJA berbeda dari menu dropdown di atas.
  // Menu dropdown dihitung dari katalog, jadi tiap pilihannya WAJIB berisi.
  // Strip ini daftar TETAP yang ditentukan owner 2026-09-21, dan sebagian
  // isinya memang belum ada judulnya (Anime, India, Jepang, Korea, Thailand).
  // Yang dijaga di sini bukan "harus berisi", melainkan "tidak boleh mati
  // karena salah tulis" — salah nama parameter diabaikan DIAM-DIAM oleh
  // `bacaFilter` dan chip-nya akan memulangkan SELURUH katalog seolah
  // penyaringnya bekerja. Itu jauh lebih menyesatkan daripada halaman kosong.

  it("isinya persis daftar & urutan yang ditulis owner", () => {
    expect(STRIP_KATALOG.map((c) => c.label)).toEqual([
      "Action",
      "Anime",
      "Horror",
      "Komedi",
      "Sci-Fi",
      "Romance",
      "Cina",
      "India",
      "Jepang",
      "Korea",
      "Thailand",
      "2025",
      "2026",
      "Terpopuler",
    ]);
  });

  it("tiap chip memasang penyaring yang BENAR-BENAR dibaca halaman", () => {
    for (const chip of STRIP_KATALOG) {
      const f = bacaFilter(new URLSearchParams(chip.href.split("?")[1] ?? ""));
      const berubah = (Object.keys(FILTER_KOSONG) as (keyof CatalogFilter)[])
        .filter((k) => f[k] !== FILTER_KOSONG[k]);
      expect(
        berubah,
        `chip ${chip.label} (${chip.href}) tidak mengubah penyaring apa pun — ` +
          `nama parameternya kemungkinan salah tulis, dan halaman akan ` +
          `menampilkan SELURUH katalog seolah penyaringnya bekerja`,
      ).toHaveLength(1);
    }
  });

  it("semua chip menuju /discover", () => {
    for (const chip of STRIP_KATALOG) {
      expect(chip.href.startsWith("/discover?")).toBe(true);
    }
  });

  it("chip negara berlabel Indonesia tapi alamatnya ejaan OMDb", () => {
    // Kegagalan senyap yang paling mungkin: label ikut masuk ke alamat.
    const cari = (l: string) => STRIP_KATALOG.find((c) => c.label === l)?.href;
    expect(cari("Cina")).toBe("/discover?negara=China");
    expect(cari("Jepang")).toBe("/discover?negara=Japan");
    expect(cari("Korea")).toBe("/discover?negara=South+Korea");
  });

  it("chip yang katalognya memang berisi memulangkan judul", () => {
    // KAYA punya Romance, Action, genre Horror/Sci-Fi, negara Kanada/Amerika.
    // Chip yang datanya ADA tidak boleh memulangkan nol — itu barulah bug.
    expect(hasilDariTautan(KAYA, "/discover?cat=Action").length).toBeGreaterThan(0);
    expect(hasilDariTautan(KAYA, "/discover?cat=Romance").length).toBeGreaterThan(0);
    expect(hasilDariTautan(KAYA, "/discover?genre=Horror").length).toBeGreaterThan(0);
    expect(hasilDariTautan(KAYA, "/discover?sort=populer").length).toBeGreaterThan(0);
  });

  it("chip yang datanya belum ada memulangkan NOL, bukan seluruh katalog", () => {
    // Inilah bedanya "belum ada isinya" (jujur) dengan "penyaring diabaikan"
    // (menyesatkan). KAYA tak punya judul Jepang sama sekali.
    expect(hasilDariTautan(KAYA, "/discover?negara=Japan")).toHaveLength(0);
    expect(hasilDariTautan(KAYA, "/discover?genre=Animation")).toHaveLength(0);
  });
});
