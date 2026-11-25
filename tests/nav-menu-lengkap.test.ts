// Penjaga EMPAT PERBAIKAN MENU NAVBAR — owner 2026-11-14.
//
// 🪤 KENAPA TES INI ADA. Keempatnya punya mode-gagal yang SAMA dan SENYAP:
// menunya tetap tergambar rapi, tetap bisa diklik, cuma isinya berkurang atau
// urutannya salah. Tidak ada error, tidak ada halaman putih — satu-satunya
// cara tahu adalah membandingkan dengan isi katalog, dan itu mustahil
// dilakukan dengan mata saat katalognya 400+ judul.
//
// Yang dijaga:
//   1. Menu Genre ikut menghitung katalog VIDEO, bukan drama saja.
//   2. Menu Series memuat lebih dari sekadar "Serial" + "Film".
//   3. Menu Populer memakai label baru DAN tidak kehilangan pilihan lama.
//   4. Tahun terbaru berdiri paling depan — di dropdown MAUPUN strip kuning.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { BATAS_MENU_NEGARA, saringFilm } from "../lib/film-jelajah";
import { labelNegara } from "../lib/negara";
import {
  buildNavMenus,
  GENRE_FILM,
  KOLOM_GENRE,
  KOLOM_NEGARA,
  KOLOM_TAHUN,
  STRIP_KATALOG,
} from "../lib/nav-katalog";
import { isiTabLengkap } from "../lib/tab-katalog";
import type { Drama } from "../lib/types";
import type { PlaylyVideoPublik } from "../lib/playly-publik";

/** Satu drama secukupnya — field yang tidak dipakai menu sengaja minimal. */
function drama(lebih: Partial<Drama> = {}): Drama {
  return {
    id: "d1",
    title: "Drama Satu",
    category: "Action",
    episodes: 10,
    views: "1000",
    year: "2024",
    status: "Ongoing",
    synopsis: "",
    poster: "",
    ...lebih,
  } as Drama;
}

/** Satu video Playly secukupnya. */
function video(lebih: Partial<PlaylyVideoPublik> = {}): PlaylyVideoPublik {
  return {
    id: "v1",
    title: "Film Satu",
    kategori: null,
    genre: null,
    year: null,
    country: null,
    rating: null,
    ...lebih,
  } as unknown as PlaylyVideoPublik;
}

/** Buang komentar `//` dan `/* *\/` supaya pemeriksaan isi berkas tidak
 *  lulus/gagal dari kalimat penjelasnya sendiri. */
function tanpaKomentar(sumber: string): string {
  return sumber
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ 	]*\/\/.*$/gm, "");
}

/**
 * Baris penutup "Lainnya"/"Semua Judul" menuju `/discover` polos. Ia bukan
 * ISI menu — ia jalan keluar — jadi tes tentang isi menu membuangnya dulu.
 */
const tanpaPenutup = <T extends { href: string }>(items: T[]): T[] =>
  items.filter((i) => i.href !== "/discover");

const labelMenu = (menus: ReturnType<typeof buildNavMenus>, key: string) =>
  menus.find((m) => m.key === key)?.items.map((i) => i.label) ?? [];
const hrefMenu = (menus: ReturnType<typeof buildNavMenus>, key: string) =>
  menus.find((m) => m.key === key)?.items.map((i) => i.href) ?? [];

describe("1. Menu Genre ikut menghitung katalog VIDEO", () => {
  it("kategori yang HANYA dipunyai video tetap muncul", () => {
    // Inilah keluhan aslinya. Diukur di produksi 2026-11-14: katalog drama 41
    // judul / 6 kategori, katalog video 397 judul / 24 kategori — menu lama
    // cuma melihat yang pertama.
    const menus = buildNavMenus(
      [drama({ category: "Action" })],
      [
        video({ id: "v1", kategori: "Fantasy" }),
        video({ id: "v2", kategori: "Horror" }),
      ],
    );
    const href = hrefMenu(menus, "genre");
    expect(href).toContain("/discover?cat=Fantasy");
    expect(href).toContain("/discover?cat=Horror");
    expect(href).toContain("/discover?cat=Action");
  });

  it("genre OMDb milik video ikut, dan TIDAK kembar dengan kategori", () => {
    // Katalog memakai dua sistem genre sekaligus. Kalau "Horror" muncul
    // sebagai ?cat= DAN ?genre=, penonton melihat satu nama dua kali di menu
    // yang sama dan mengira menunya rusak.
    const menus = buildNavMenus(
      [drama()],
      [video({ kategori: "Horror", genre: "Horror, Mystery" })],
    );
    const href = hrefMenu(menus, "genre");
    expect(href).toContain("/discover?cat=Horror");
    expect(href).not.toContain("/discover?genre=Horror");
    expect(href).toContain("/discover?genre=Mystery");
  });

  it("tiap pilihan memakai NILAI katalog, bukan labelnya", () => {
    // Pagar lama yang tidak boleh ikut longgar: label boleh "Horor", alamatnya
    // WAJIB "Horror". Label yang bocor ke alamat = halaman hampa tanpa error.
    const menus = buildNavMenus([drama()], [video({ kategori: "Horror" })]);
    expect(hrefMenu(menus, "genre")).not.toContain("/discover?cat=Horor");
    expect(labelMenu(menus, "genre")).toContain("Horor");
  });

  it("video tanpa kategori tidak menambah pilihan hampa", () => {
    // `kategori` null adalah keadaan NORMAL (admin belum memilih). Kalau ikut
    // terhitung, menu dapat satu baris kosong yang memulangkan katalog utuh.
    const menus = buildNavMenus([drama()], [video({ kategori: null })]);
    expect(hrefMenu(menus, "genre").filter((h) => h.endsWith("cat="))).toEqual([]);
  });
});

describe("2. Menu Series = enam baris yang ditentukan owner", () => {
  const menus = buildNavMenus(
    [
      drama({ id: "a", kind: "series", status: "Ongoing", year: "2026" }),
      drama({ id: "b", kind: "series", status: "Completed", year: "2025" }),
      drama({ id: "c", kind: "movie", status: "Completed", year: "2024" }),
    ] as Drama[],
    [],
  );
  const href = () =>
    menus.find((m) => m.key === "jenis")?.items.map((i) => i.href) ?? [];
  const label = () =>
    menus.find((m) => m.key === "jenis")?.items.map((i) => i.label) ?? [];

  it("keenam barisnya persis yang diminta owner", () => {
    // Owner 2026-11-14 menyebutnya satu per satu. Dikunci di sini karena
    // daftar menu ini sudah empat kali berubah dalam satu hari.
    expect(label().slice(0, 6)).toEqual([
      "Semua Series",
      "Terbaru",
      "Populer",
      "Unggulan",
      "Update",
      "Tamat",
    ]);
  });

  it("tiap baris menunjuk daftar yang BERBEDA", () => {
    // Inti permintaan owner: "pastikan setiap kita klik harus muncul daftar
    // film yang kita klik". Alamat kembar = dua tombol, satu hasil.
    const alamat = href().filter((h) => h !== "/discover");
    expect(new Set(alamat).size).toBe(alamat.length);
  });

  it("memakai ulang halaman tab yang sudah ada, bukan aturan baru", () => {
    expect(href()).toContain("/katalog?tab=terpopuler");
    expect(href()).toContain("/katalog?tab=unggulan");
    expect(href()).toContain("/katalog?tab=update");
  });

  it("'Daftar Film' & 'Film Terbaru' DICORET owner — tidak boleh kembali", () => {
    expect(label()).not.toContain("Daftar Film");
    expect(label()).not.toContain("Film Terbaru");
    expect(href()).not.toContain("/discover?kind=movie");
  });

  it("'Tamat' hilang selama belum ada serial yang tamat", () => {
    // Satu-satunya baris TANPA cadangan: daftar yang jatuh ke "semua serial"
    // akan berbohong tentang isinya. Diukur 2026-11-14: nol dari 41 judul
    // berstatus Completed, jadi hari ini barisnya memang tidak digambar.
    const tanpaTamat = buildNavMenus(
      [drama({ kind: "series", status: "Ongoing" })] as Drama[],
      [],
    );
    const l =
      tanpaTamat.find((m) => m.key === "jenis")?.items.map((i) => i.label) ?? [];
    expect(l).not.toContain("Tamat");
    expect(l).toContain("Semua Series");
  });
});

describe("3. Menu Populer", () => {
  const menus = buildNavMenus(
    [drama({ year: "2026", imdbRating: "8.1" })] as Drama[],
    [],
  );

  it("memakai label baru 'Terpopuler'", () => {
    expect(labelMenu(menus, "populer")).toContain("Terpopuler");
  });

  it("TIDAK kehilangan satu pun pilihan lama", () => {
    // Mengganti label gampang menyeret pilihan lain ikut terhapus. Keempatnya
    // harus tetap ada — hilangnya satu = fitur yang lenyap tanpa diminta.
    const href = hrefMenu(menus, "populer");
    for (const s of ["populer", "rating", "year", "episodes", "title"]) {
      expect(href, `urutan ${s} hilang dari menu Populer`).toContain(
        `/discover?sort=${s}`,
      );
    }
  });

  it("'Judul A-Z' tidak muncul DUA KALI di bar yang sama", () => {
    // Ia dipindah dari menu "Lainnya" ke "Populer". Kalau yang lama lupa
    // dicabut, satu pilihan sama tergambar di dua tombol bersebelahan.
    expect(hrefMenu(menus, "lainnya")).not.toContain("/discover?sort=title");
  });
});

describe("4. Tahun terbaru paling depan", () => {
  it("dropdown Tahun urut MENURUN", () => {
    const menus = buildNavMenus(
      [
        drama({ id: "a", year: "2021" }),
        drama({ id: "b", year: "2026" }),
        drama({ id: "c", year: "2024" }),
      ] as Drama[],
      [],
    );
    expect(
      tanpaPenutup(menus.find((m) => m.key === "tahun")?.items ?? []).map(
        (i) => i.label,
      ),
    ).toEqual(["2026", "2024", "2021"]);
  });

  it("tahun yang hanya dipunyai VIDEO ikut masuk", () => {
    // 70 dari 481 video tayang menyimpan tahunnya hanya di dalam judul.
    const menus = buildNavMenus(
      [drama({ year: "2024" })],
      [video({ title: "Film Baru (2026)", year: null })],
    );
    expect(
      tanpaPenutup(menus.find((m) => m.key === "tahun")?.items ?? []).map(
        (i) => i.label,
      ),
    ).toEqual(["2026", "2024"]);
  });

  it("strip kuning TIDAK lagi memuat tahun sama sekali", () => {
    // ⚠️ ARAH TES INI DIBALIK 2026-11-25. Dulu ia menjaga URUTAN tahun di
    // strip (terbaru dulu); kini owner meminta tahun DILEPAS dari strip
    // seluruhnya (*"untuk negara dan tahun masukan ke kategori saja"*), jadi
    // yang dijaga sekarang: tak ada satu pun chip tahun yang nyangkut di sana.
    // Urutan tahun TETAP dijaga — di menu dropdown "Tahun", oleh tes tepat di
    // atas ini. Nol pengawasan hilang.
    const tahun = STRIP_KATALOG.map((i) => i.label).filter((l) =>
      /^(19|20)\d{2}$/.test(l),
    );
    expect(tahun, "tahun masih nyangkut di strip kuning").toEqual([]);
  });
});

// ===========================================================================
// 5. PEMBAGIAN MENU GENRE vs LAINNYA — owner 2026-11-14, putaran koreksi
// sesudah melihat localhost: "untuk genre kamu buat khusus genre film,
// populer jangan dimasukkan IMDB, lainnya isi dengan dracin, k-drama dan
// sejenisnya dan cukup tulisan lainnya".
// ===========================================================================
describe("5. Genre khusus film, sisanya di Lainnya", () => {
  /** Campuran genre film + kategori khas drama Asia. */
  const menus = buildNavMenus(
    [
      drama({ id: "a", category: "Action" }),
      drama({ id: "b", category: "Tycoon" }),
      drama({ id: "c", category: "Harem" }),
      drama({ id: "d", category: "Time Travel" }),
    ],
    [video({ kategori: "Horror" })],
  );
  const genre = menus.find((m) => m.key === "genre");
  const lainnya = menus.find((m) => m.key === "lainnya");

  it("menu Genre HANYA berisi genre film", () => {
    // ⚠️ CARA MEMERIKSANYA BERGANTI 2026-11-24, maksudnya tidak: kategori
    // khas drama (Tycoon, Harem, Wuxia, …) tak boleh bocor ke menu Genre.
    // Dulu cukup mencocokkan dua nilai yang kebetulan ada di katalog uji
    // (`cat=Action|Horror`); sesudah SELURUH genre resmi ikut digambar,
    // patokan itu menandai 25 genre sah sebagai "liar".
    // Kini dicocokkan ke `GENRE_FILM` — sumber kebenarannya sendiri.
    const baku = new Set(GENRE_FILM.map((g) => g.toLowerCase()));
    const liar = tanpaPenutup(genre?.items ?? []).filter((i) => {
      const u = new URL(i.href, "https://x").searchParams;
      const nilai = decodeURIComponent(u.get("genre") ?? u.get("cat") ?? "");
      return !baku.has(nilai.toLowerCase());
    });
    expect(
      liar.map((i) => i.label),
      "kategori khas drama bocor ke menu Genre",
    ).toEqual([]);
  });

  it("kategori khas drama pindah ke menu Lainnya", () => {
    const href = lainnya?.items.map((i) => i.href) ?? [];
    expect(href).toContain("/discover?cat=Tycoon");
    expect(href).toContain("/discover?cat=Harem");
    expect(href).toContain("/discover?cat=Time+Travel");
  });

  it("menu Lainnya bernama persis 'Lainnya'", () => {
    // Owner mengoreksi "Genre Lainnya" -> "Lainnya" pada hari yang sama.
    expect(lainnya?.label).toBe("Lainnya");
  });

  it("nol kategori HILANG — tiap kategori berisi punya satu rumah", () => {
    // Pagar paling penting: memisahkan daftar itu gampang membuang yang
    // tidak masuk kedua saringan, dan hilangnya nol error.
    const semua = [
      ...(genre?.items ?? []),
      ...(lainnya?.items ?? []),
    ].map((i) => i.href);
    for (const h of [
      "/discover?cat=Action",
      "/discover?cat=Horror",
      "/discover?cat=Tycoon",
      "/discover?cat=Harem",
      "/discover?cat=Time+Travel",
    ]) {
      expect(semua, `${h} tidak punya rumah di menu mana pun`).toContain(h);
    }
  });

  it("nol kategori KEMBAR di dua menu", () => {
    const a = new Set(tanpaPenutup(genre?.items ?? []).map((i) => i.href));
    const kembar = tanpaPenutup(lainnya?.items ?? []).filter((i) =>
      a.has(i.href),
    );
    expect(kembar.map((i) => i.label)).toEqual([]);
  });

  it("menu Populer TIDAK memuat IMDb lagi", () => {
    const kaya = buildNavMenus(
      [drama({ imdbRating: "8.5", year: "2026" })] as never,
      [],
    );
    const populer = kaya.find((m) => m.key === "populer");
    expect(
      populer?.items.filter((i) => i.label.startsWith("IMDb")).map((i) => i.label),
      "owner meminta IMDb KELUAR dari menu Populer",
    ).toEqual([]);
    // ...dan 2026-11-14 keluar dari SELURUH navbar ("lainnya kamu hapus yang
    // ada IMDBnya"). Alamatnya tetap hidup; yang dilepas cuma tombolnya.
    const semua = kaya.flatMap((m) => m.items.map((i) => i.href));
    expect(semua.filter((h) => h.includes("rating="))).toEqual([]);
  });

  it("daftar GENRE_FILM memakai ejaan yang dikenal pencocokan otomatis", () => {
    // Ejaan yang menyimpang ("SciFi" bukan "Sci-Fi") membuat satu genre
    // diam-diam terbuang dari menu walau katalognya punya isi.
    const peta = readFileSync("lib/kategori-otomatis.ts", "utf-8");
    for (const g of ["Action", "Sci-Fi", "Film-Noir", "Reality-TV"]) {
      expect(GENRE_FILM).toContain(g);
      expect(peta, `${g} tidak dikenal PETA_GENRE`).toContain(`"${g}"`);
    }
  });

  it("menu panjang dapat KOLOM, menu pendek tidak", () => {
    // Kolom banyak untuk daftar pendek justru lebih sulit dibaca — mata harus
    // melompat antar kolom untuk lima baris.
    expect(genre?.kolom).toBe(KOLOM_GENRE);
    // ⚠️ "Lainnya" TETAP tanpa kolom. Siang 2026-11-24 ia sempat diberi 4
    // kolom karena isinya membengkak jadi 47 pilihan; owner lalu menilai
    // hasilnya "terlalu penuh" dan isinya dikembalikan ke ±10. Untuk daftar
    // sependek itu kolom banyak justru lebih sulit dibaca — mata harus
    // melompat antar kolom untuk sepuluh baris.
    expect(lainnya?.kolom).toBeUndefined();
    // Pembanding: menu PANJANG memang dapat kolom, supaya patokan di atas
    // tidak diam-diam berubah jadi "tak ada yang dapat kolom".
    expect(genre?.items.length, "menu Genre tak lagi panjang").toBeGreaterThan(20);
  });

  it("Tahun & Negara ikut dapat kolom, jumlahnya sesuai panjang label", () => {
    const kaya = buildNavMenus(
      [
        drama({ id: "a", year: "2026", country: "South Korea" }),
        drama({ id: "b", year: "2025", country: "Japan" }),
      ] as never,
      [],
    );
    expect(kaya.find((m) => m.key === "tahun")?.kolom).toBe(KOLOM_TAHUN);
    expect(kaya.find((m) => m.key === "negara")?.kolom).toBe(KOLOM_NEGARA);
    // Owner 2026-11-15: Genre & Negara harus sama dengan Tahun (4 kolom,
    // semua pilihan terlihat tanpa digulir). Yang beda cuma lebar sel.
    expect(KOLOM_GENRE).toBe(KOLOM_TAHUN);
    expect(KOLOM_NEGARA).toBe(KOLOM_TAHUN);
    expect(kaya.find((m) => m.key === "negara")?.lebarNama).toBe(true);
    expect(kaya.find((m) => m.key === "tahun")?.lebarNama).toBeUndefined();
  });

  it("NavMenus menggambar kolomnya sebagai kelas UTUH", () => {
    // 🪤 Pagar paling penting di berkas ini. Tailwind memindai kode sebagai
    // TEKS, jadi kelas yang dirangkai saat jalan (`grid-cols-${n}`) tidak
    // pernah ikut ke CSS: menunya tetap satu kolom, nol error, dan tidak ada
    // tes render yang bisa menangkapnya (kelasnya tetap tertulis di HTML).
    // 🪤 Komentar DIBUANG dulu — pelajaran docs/lintasai/INDEX.md: tes yang
    // memeriksa isi berkas bisa lulus (atau gagal) dari komentarnya sendiri.
    // Versi pertama tes ini MERAH padahal kodenya benar, karena komentar di
    // NavMenus.tsx menjelaskan pola `grid-cols-${…}` yang justru dilarangnya.
    const sumber = tanpaKomentar(
      readFileSync("app/components/beranda/NavMenus.tsx", "utf-8"),
    );
    expect(sumber).not.toMatch(/grid-cols-\$\{/);
    for (const kelas of ["sm:grid-cols-2", "lg:grid-cols-3", "sm:grid-cols-4", "w-[36rem]"]) {
      expect(sumber, `kelas ${kelas} tidak ditulis utuh`).toContain(kelas);
    }
    // Selalu mulai satu kolom di HP untuk menu pendek — lihat komentar berkas.
    // Genre/Negara mulai 2 kolom (bukan 1) supaya 24 nama tidak harus digulir.
    expect(sumber).toContain("grid-cols-1");
    expect(sumber).toContain("whitespace-nowrap");
    expect(sumber).toContain("lebarNama");
  });

  it("tinggi dropdown mengikuti TINGGI LAYAR, bukan angka tetap", () => {
    // Daftar Genre kini 23 baris. Batas tetap seperti `max-h-80` membuat
    // pilihan terakhir harus digulir di dalam kotak kecil — persis yang
    // diminta owner supaya hilang ("tampilkan semua, buat yang rapi").
    const sumber = readFileSync(
      "app/components/beranda/NavMenus.tsx",
      "utf-8",
    );
    expect(sumber).not.toContain("max-h-80");
    expect(sumber).toContain("vh");
  });
});

// ===========================================================================
// 6. DRAMA ASIA (Dracin / K-Drama) — owner 2026-11-14 memilih "jalan 1":
// isi kolom Negara, lalu barisnya muncul.
// ===========================================================================
describe("6. Baris drama Asia menyala dari data, bukan daftar tetap", () => {
  it("TETAP digambar walau kolom negara masih kosong", () => {
    // ⚠️ DIBALIK 2026-11-24 — patokan ini DULU menuntut sebaliknya.
    //
    // Syarat lamanya tak pernah terpenuhi: diukur di katalog PRODUKSI, dari
    // 41 judul hanya SATU yang `country`-nya terisi, dan judul itu "Meg 2
    // The Trench" — film Hollywood. Pagar `kind=series` menolaknya (memang
    // itu gunanya), jadi kelima baris tak pernah muncul dan owner dua kali
    // (14 & 24 Nov) mengira fiturnya belum dibuat. Owner lalu memutuskan
    // barisnya selalu digambar, menerima bahwa ia kosong untuk sementara.
    const menus = buildNavMenus([drama({ country: undefined })] as never, []);
    const label = menus.find((m) => m.key === "lainnya")?.items.map((i) => i.label) ?? [];
    for (const l of ["Dracin", "K-Drama", "J-Drama", "Drama Thailand", "Drama Taiwan"]) {
      expect(label, `baris "${l}" hilang`).toContain(l);
    }
  });

  it("MUNCUL sendiri begitu ada serial dari negara itu", () => {
    const menus = buildNavMenus(
      [
        drama({ id: "a", kind: "series", country: "China" }),
        drama({ id: "b", kind: "series", country: "South Korea" }),
      ] as never,
      [],
    );
    const lainnya = menus.find((m) => m.key === "lainnya");
    const href = lainnya?.items.map((i) => i.href) ?? [];
    // ⚠️ "Dracin" SENGAJA tidak lagi memakai penyaring negara (owner
    // 2026-11-24: *"untuk dracin kamu masukan ke drama asia saja"*) — ia
    // diarahkan ke seksi Drama Asia karena penyaring negaranya memulangkan
    // 0 judul. Patokannya ada di tes berikutnya.
    // Keempat baris LAIN tetap memakai penyaring negara, dan K-Drama di sini
    // yang membuktikan mekanisme itu masih hidup.
    expect(href).toContain("/discover?negara=South+Korea&kind=series");
    expect(href).toContain("/katalog?tab=update");
  });

  it("FILM dari negara itu tidak ikut terbawa saat barisnya DIKLIK", () => {
    // ⚠️ PATOKANNYA SUDAH BERGESER DUA KALI, tapi YANG DIJAGA SAMA PERSIS
    // sejak awal: "Dracin" berarti DRAMA China, jadi film Hollywood
    // ko-produksi China tidak boleh muncul di hasilnya.
    //   1. dulu  — barisnya disembunyikan saat datanya kosong
    //   2. siang — barisnya selalu ada, alamatnya wajib membawa `kind=series`
    //   3. kini  — alamatnya menunjuk seksi "Drama Asia" (owner 2026-11-24),
    //              jadi yang dijaga: seksi itu sendiri menolak film
    //
    // Ini bukan kasus karangan — judul itu nyata di katalog produksi:
    // "Meg 2 The Trench", country "United States, China, Thailand, …".
    const film = drama({ id: "film-hollywood", kind: "movie", country: "China" });
    const menus = buildNavMenus([film] as never, []);
    const item = menus
      .find((m) => m.key === "lainnya")
      ?.items.find((i) => i.label === "Dracin");
    expect(item, "baris Dracin hilang").toBeTruthy();
    expect(
      item!.href,
      "Dracin tidak lagi menunjuk seksi Drama Asia — owner memindahkannya ke sana",
    ).toBe("/katalog?tab=update");

    // Patokan sebenarnya: isi seksi tujuannya MEMANG tanpa film. Memeriksa
    // alamatnya saja tidak cukup — alamat yang benar menuju daftar yang salah
    // tetap menampilkan film Hollywood itu ke penonton.
    const isi = isiTabLengkap([film] as never, "update");
    expect(
      isi.map((d) => d.id),
      "film ikut terbawa ke seksi Drama Asia",
    ).not.toContain("film-hollywood");
  });

  it("kolom negara berisi DAFTAR tetap cocok", () => {
    // Nilai aslinya sering "United States, China, Thailand" — disamakan utuh
    // akan melewatkan hampir semua judul ko-produksi.
    const menus = buildNavMenus(
      [drama({ kind: "series", country: "United States, China, Germany" })] as never,
      [],
    );
    const label = menus.find((m) => m.key === "lainnya")?.items.map((i) => i.label) ?? [];
    expect(label).toContain("Dracin");
  });

  it("isian Negara di panel admin TIDAK boleh dikunci lagi", () => {
    // 🪤 Lingkaran setan yang baru dibuka: panel berisi kotak Negara dulu
    // hanya digambar kalau salah satu fieldnya SUDAH terisi — jadi Negara
    // mustahil diisi pertama kali. Tanpa penjaga ini, syarat itu gampang
    // dipasang kembali "supaya panelnya tidak ramai", dan jalan 1 mati lagi
    // tanpa satu pun error.
    const sumber = tanpaKomentar(
      readFileSync("app/components/admin/DramaForm.tsx", "utf-8"),
    );
    expect(sumber).not.toMatch(/\{\(imdbIdMeta \|\|[^)]*country\) && \(/);
    expect(sumber, "kotak Negara hilang dari form").toContain(">Negara<");
  });
});

// ===========================================================================
// 7. ATURAN KERAS: tiap baris menu HARUS mengubah halaman yang dilihat owner.
// ===========================================================================
describe("7. Nol baris menu yang 'diklik tapi halamannya sama'", () => {
  /**
   * Penyaring yang DIKENAL daftar film (`saringFilm` di lib/film-jelajah.ts).
   * Di luar daftar ini, sebuah penyaring hanya mengenai katalog drama —
   * sementara daftar FILM-lah yang memenuhi layar (ratusan judul), jadi
   * halamannya nyaris tidak berubah dan tombolnya terbaca seperti mati.
   */
  const DIKENAL_FILM = new Set(["cat", "genre", "negara", "year", "kind", "q"]);

  /**
   * `sort` SENGAJA dikecualikan: ia MENGURUT, bukan MENYARING. Grid drama di
   * bagian atas halaman benar-benar berubah urutannya saat diklik, jadi
   * halamannya tidak "sama" — yang tidak ikut berubah cuma urutan daftar film
   * di bawahnya. Itu batas yang diketahui, bukan tombol mati.
   */
  const MENGURUT = new Set(["sort"]);

  const menus = buildNavMenus(
    [
      drama({ id: "a", category: "Tycoon", kind: "series", country: "China" }),
      drama({ id: "b", category: "Action", year: "2026", imdbRating: "8.5" }),
    ] as never,
    [video({ kategori: "Horror" })],
  );

  for (const m of menus) {
    it(`menu "${m.label}" hanya memakai penyaring yang dikenal daftar film`, () => {
      const liar: string[] = [];
      for (const item of m.items) {
        // /katalog?tab= punya halamannya sendiri yang memuat daftar itu utuh
        // (lib/tab-katalog.ts), jadi ia tidak perlu dikenal `saringFilm`.
        if (item.href.startsWith("/katalog")) continue;
        const p = new URLSearchParams(item.href.split("?")[1] ?? "");
        // `kind=series` membuat daftar film KOSONG, jadi apa pun yang
        // dipasangkan dengannya tetap mengubah halaman secara kasatmata.
        if (p.get("kind") === "series") continue;
        for (const k of p.keys()) {
          if (!DIKENAL_FILM.has(k) && !MENGURUT.has(k)) {
            liar.push(`${item.label} -> ?${k}=`);
          }
        }
      }
      expect(
        liar,
        `baris ini memakai penyaring yang TIDAK mengenai daftar film, jadi ` +
          `halamannya nyaris tak berubah saat diklik: ${liar.join(", ")}`,
      ).toEqual([]);
    });
  }

  it("menu Negara menampung lebih dari 12 negara", () => {
    // 🪤 Lubang yang ketahuan dari uji-balik: menurunkan BATAS_MENU_NEGARA
    // kembali ke 12 TIDAK memerahkan satu pun tes. Owner 2026-11-14 minta
    // "negara bisa kamu tambahkan lagi negaranya" — tanpa pagar ini, angka
    // itu gampang dikecilkan lagi "supaya menunya pendek", dan keluhannya
    // kembali tanpa ada yang tahu.
    const banyakNegara = Array.from({ length: 30 }, (_, i) =>
      drama({ id: `n${i}`, country: `Negara${String(i).padStart(2, "0")}` }),
    );
    const menus = buildNavMenus(banyakNegara as never, []);
    const negara = menus.find((m) => m.key === "negara");
    // ⚠️ PAGARNYA DIPERKUAT 2026-11-25, bukan dilonggarkan: menu Negara kini
    // memuat SELURUH negara yang ada isinya (owner: *"agar semua negara bisa
    // muncul"*), dikelompokkan per benua. Dulu tes ini mematok tepat
    // BATAS_MENU_NEGARA; sekarang ia menuntut NOL negara terpotong.
    const pilihan = tanpaPenutup(negara?.items ?? []).filter((i) => !i.kepalaGrup);
    expect(
      pilihan.length,
      "ada negara yang terpotong dari menu — owner meminta semuanya muncul",
    ).toBe(banyakNegara.length);
    expect(pilihan.length).toBeGreaterThan(BATAS_MENU_NEGARA);
    // Judul kelompok benua wajib ADA (pembanding: tanpa ini, daftar datar
    // sepanjang 57 baris juga akan lulus tes di atas).
    expect(
      (negara?.items ?? []).filter((i) => i.kepalaGrup).length,
      "negara tidak dikelompokkan per benua",
    ).toBeGreaterThan(0);
  });

  it("penyaring Serial benar-benar mengosongkan daftar film", () => {
    // Pagar untuk perbaikan di saringFilm. Tanpa ini, "Daftar Serial" kembali
    // memulangkan ratusan film di bawah grid — tepat keluhan owner.
    expect(saringFilm([video({ kategori: "Horror" })], { kind: "series" })).toEqual(
      [],
    );
    expect(
      saringFilm([video({ kategori: "Horror" })], { kind: "movie" }),
    ).toHaveLength(1);
  });
});

// ===========================================================================
// 8. LABEL NEGARA — menu naik 12 -> 24 nama, dan separuhnya sempat berbahasa
// Inggris ("Czech Republic" berdiri di antara "Cina" dan "Korea").
// ===========================================================================
describe("8. Tiap negara di menu punya nama Indonesia", () => {
  it("24 negara teratas katalog tidak ada yang tertinggal Inggris", () => {
    // Fallback `labelNegara` sengaja memulangkan nama asli — lebih baik
    // terbaca daripada chipnya hilang. Tapi daftar separuh-Indonesia terbaca
    // seperti terjemahan yang belum selesai, dan itu yang paling cepat
    // terlihat atasan saat menu dibuka.
    const BELUM_DITERJEMAHKAN = [
      "Ireland",
      "Hungary",
      "Czech Republic",
      "South Africa",
      "Iceland",
      "Finland",
    ];
    for (const n of BELUM_DITERJEMAHKAN) {
      expect(labelNegara(n), `${n} masih tergambar dalam bahasa Inggris`).not.toBe(n);
    }
  });

  it("nama asing yang BELUM terdaftar tetap tergambar apa adanya", () => {
    // Pagar yang TIDAK boleh ikut longgar: katalog yang tumbuh tidak pernah
    // kehilangan chip hanya karena namanya belum sempat didaftarkan.
    expect(labelNegara("Negara Antah Berantah")).toBe("Negara Antah Berantah");
  });

  it("alamatnya TETAP memakai nama asli, bukan labelnya", () => {
    // Kalau label ikut masuk ke alamat, chip "Cina" tergambar rapi lalu
    // memulangkan halaman hampa — rusak tanpa satu pun pesan error.
    const menus = buildNavMenus(
      [drama({ country: "China" }), drama({ id: "b", country: "Japan" })] as never,
      [],
    );
    const negara = menus.find((m) => m.key === "negara");
    expect(negara?.items.map((i) => i.href)).toContain("/discover?negara=China");
    expect(negara?.items.map((i) => i.label)).toContain("Cina");
  });
});

// ===========================================================================
// 9. BARIS PENUTUP "LAINNYA" — owner 2026-11-14: "genre di bawah tulisan
// perang kamu tambahkan lainnya ... tambahkan juga tulisan lainnya".
// ===========================================================================
describe("9. Tiap dropdown punya jalan keluar 'Lainnya'", () => {
  const menus = buildNavMenus(
    [
      drama({ id: "a", category: "Action", year: "2026", country: "Japan" }),
      drama({ id: "b", category: "Tycoon", year: "2025", country: "China" }),
    ] as never,
    [video({ kategori: "Horror" })],
  );

  for (const m of menus.filter((x) => x.key !== "lainnya")) {
    it(`menu "${m.label}" diakhiri baris Lainnya`, () => {
      const akhir = m.items[m.items.length - 1];
      expect(akhir.label).toBe("Lainnya");
      expect(akhir.href).toBe("/discover");
    });
  }

  it("menu Lainnya TIDAK dapat baris kembar", () => {
    // Namanya sudah "Lainnya" dan ia sudah punya "Semua Judul" ber-alamat
    // sama — dua baris identik dalam satu dropdown.
    const lainnya = menus.find((m) => m.key === "lainnya");
    const kePolos = (lainnya?.items ?? []).filter((i) => i.href === "/discover");
    expect(kePolos.length).toBeLessThanOrEqual(1);
  });

  it("baris penutup TIDAK menolong menu yang isinya kurang", () => {
    // Ia ditambahkan SESUDAH ambang MIN_ITEM_MENU dinilai. Kalau dihitung
    // sebagai isi, menu berisi satu pilihan akan lolos — dan itu cuma
    // menambah satu klik untuk sampai ke tempat yang sama.
    // ⚠️ CONTOHNYA BERGANTI 2026-11-24 dari menu Genre ke menu NEGARA.
    // Menu Genre tak bisa lagi jadi contoh "menu yang isinya kurang": sejak
    // seluruh genre resmi ikut digambar, ia selalu punya 27 pilihan. Menu
    // Negara masih dihitung dari katalog, jadi aturan ambang itu masih
    // berlaku di sana — dan itulah yang sedang diuji.
    const sedikit = buildNavMenus([drama({ country: "China" })], []);
    expect(sedikit.find((m) => m.key === "negara")).toBeUndefined();
  });
});

// ===========================================================================
// 10. HASIL /discover DISATUKAN — owner 2026-11-14: "hasil yang di munculkan
// jangan dipisah antara drama dan film, kamu jadikan satu".
// ===========================================================================
describe("10. Drama & film tergambar di SATU daftar", () => {
  const sumber = tanpaKomentar(
    readFileSync("app/components/DramaBrowser.tsx", "utf-8"),
  );

  it("tidak ada lagi bagian film terpisah di bawah grid", () => {
    // 🪤 Inilah sebab keluhan "setiap diklik halamannya sama": grid atas
    // sering cuma 0-1 judul (katalog drama 41), sementara ratusan film yang
    // benar-benar cocok duduk di bagian bawah yang mudah dikira bagian lain
    // halaman.
    expect(sumber).not.toMatch(/<HasilPlayly\b/);
  });

  it("kedua jenis kartu digambar di grid yang SAMA", () => {
    // Keduanya berbentuk poster 2:3, jadi satu grid memang cocok.
    expect(sumber).toContain("<CatalogCard");
    expect(sumber).toContain("<KartuVideo");
    expect((sumber.match(/className=\{GRID_CLASS\}/g) ?? []).length).toBe(1);
  });

  it("hitungannya SATU angka, bukan 'N drama · M film'", () => {
    // Dua angka di atas dua daftar membuat penonton mengira hasilnya habis
    // di angka pertama.
    expect(sumber).toContain("{hasil.length} judul");
    expect(sumber).not.toMatch(/\{filtered\.length\} drama/);
  });

  it("keadaan kosong dinilai dari daftar GABUNGAN", () => {
    // Dulu "Tidak ada drama yang cocok" bisa muncul padahal ada 123 film
    // cocok di bawahnya — pesan yang menyuruh penonton menyerah.
    expect(sumber).toContain("hasil.length === 0");
    expect(sumber).not.toContain("filtered.length === 0");
  });
});
