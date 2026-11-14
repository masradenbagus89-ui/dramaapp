import { describe, it, expect } from "vitest";
import { STRIP_KATALOG, alamatCari, buildNavMenus } from "../lib/nav-katalog";
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
  it("membuat lima menu inti saat datanya memang terisi", () => {
    // Urutannya sejajar dengan situs katalog pembanding.
    //
    // ⚠️ Menu keenam ("lainnya") TIDAK di daftar ini sejak 2026-11-14: isinya
    // kini kategori khas drama + negara drama Asia, dan katalog uji ini tidak
    // punya keduanya — jadi menunya hilang sendiri, persis seperti yang
    // seharusnya. Kemunculannya diuji terpisah di tests/nav-menu-lengkap.
    expect(kunciMenu(KAYA)).toEqual([
      "genre",
      "jenis",
      "populer",
      "negara",
      "tahun",
    ]);
  });

  it("memakai label tombol PERSIS seperti yang ditentukan owner", () => {
    // Owner menentukan keenam tulisan ini dari situs katalog pembanding
    // (2026-09-21, ditegaskan dua kali). Dikunci di sini karena sudah dua kali
    // jadi soal — label bukan detail teknis yang boleh diganti sambil lalu.
    // ⚠️ "Lainnya" sempat diubah jadi "Genre Lainnya" pada hari yang sama,
    // lalu owner MENGOREKSI: "cukup tulisan lainnya (jangan genre lainnya)".
    // Labelnya diuji di tests/nav-menu-lengkap (menunya butuh data khusus);
    // kelima ini dikunci di sini karena sudah TIGA kali jadi soal.
    expect(buildNavMenus(KAYA).map((m) => m.label)).toEqual([
      "Genre",
      "Series",
      "Populer",
      "Negara",
      "Tahun",
    ]);
  });

  it("kunci internal menu TIDAK ikut berubah saat labelnya diganti", () => {
    // `key` dipakai React & tes; memisahkannya dari label itu yang membuat
    // tulisan bisa diganti kapan saja tanpa menyentuh apa pun yang lain.
    expect(kunciMenu(KAYA)).toContain("jenis");
    // `key` "lainnya" SENGAJA dipertahankan walau labelnya kini "Genre
    // Lainnya" — itu justru inti aturan yang diuji di sini.
  });

  it("membuang menu Negara & Tahun saat kolomnya kosong", () => {
    // Ini yang paling mudah salah: kolom `country`/`year` boleh kosong, dan
    // menu yang diklik lalu memulangkan halaman hampa terbaca seperti situs
    // rusak.
    const kunci = kunciMenu(POLOS);
    expect(kunci).not.toContain("negara");
    expect(kunci).not.toContain("tahun");
  });

  it("menu Series HILANG saat katalog tak punya serial sama sekali", () => {
    // ⚠️ Premisnya BERUBAH 2026-11-14. Dulu menu ini hilang kalau katalog cuma
    // punya SATU jenis (semua serial atau semua film), karena isinya memang
    // cuma "Serial" + "Film". Owner merombaknya jadi enam baris yang SEMUANYA
    // tentang serial ("Daftar Film" & "Film Terbaru" dicoret), jadi yang
    // menentukan sekarang cuma: ada serial atau tidak.
    const semuaFilm = POLOS.map((d) => ({ ...d, kind: "movie" as const }));
    expect(kunciMenu(semuaFilm)).not.toContain("jenis");
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
    // Genre sinema yang belum jadi kategori DramaKu → ikut digambar. Labelnya
    // Indonesia sejak 2026-10-30 (lib/genre.ts).
    expect(label).toContain("Horor");
    expect(label).toContain("Fiksi Ilmiah");
    // "Action" sudah jadi kategori, jadi hanya boleh muncul SEKALI.
    expect(label.filter((l) => l === "Aksi")).toHaveLength(1);
    // Penyaringan ganda bekerja atas NILAI ASLI, bukan label — kalau suatu saat
    // dibandingkan pakai label, "Action" dari dua sumber lolos berdua.
    expect(label).not.toContain("Action");
  });

  it("memisahkan alamat kategori (?cat=) dari genre sinema (?genre=)", () => {
    const genre = buildNavMenus(KAYA).find((m) => m.key === "genre");
    const cari = (l: string) => genre?.items.find((i) => i.label === l)?.href;
    // Label Indonesia, alamat ejaan asli katalog. Inilah kegagalan senyap yang
    // paling mungkin: label ikut terkirim ke alamat → halaman hampa.
    expect(cari("Aksi")).toBe("/discover?cat=Action");
    expect(cari("Horor")).toBe("/discover?genre=Horror");
    expect(cari("Fiksi Ilmiah")).toBe("/discover?genre=Sci-Fi");
  });

  it("tiap pilihan menu Genre memulangkan judul — label tak merusak alamat", () => {
    // Pagar nyata atas label-vs-alamat: alamatnya dijalankan sungguhan lewat
    // `bacaFilter` + `filterDariUrl`, sama seperti halaman /discover.
    const genre = buildNavMenus(KAYA).find((m) => m.key === "genre");
    for (const item of genre?.items ?? []) {
      expect(
        hasilDariTautan(KAYA, item.href).length,
        `pilihan ${item.label} (${item.href}) memulangkan nol judul`,
      ).toBeGreaterThan(0);
    }
  });

  it("TIDAK lagi menawarkan ambang IMDb di menu mana pun", () => {
    // ⚠️ DIBALIK 2026-11-14 (owner: "lainnya kamu hapus yang ada IMDBnya").
    // Sebab teknisnya ikut menguatkan: `?rating=` tidak dikenal `saringFilm`,
    // jadi mengkliknya TIDAK mengubah daftar film yang memenuhi layar —
    // tombol yang bekerja dengan benar terlihat seperti tombol mati.
    // Alamatnya TIDAK dimatikan: `/discover?rating=7` tetap berfungsi.
    const semua = buildNavMenus(KAYA).flatMap((m) => m.items.map((i) => i.label));
    expect(semua.filter((l) => l.startsWith("IMDb"))).toEqual([]);
  });

  it("katalog polos pun nol ambang IMDb", () => {
    const semua = buildNavMenus(POLOS).flatMap((m) =>
      m.items.map((i) => i.label),
    );
    expect(semua.filter((l) => l.startsWith("IMDb"))).toHaveLength(0);
  });

  it("menyembunyikan urutan Rating & Tahun saat katalog tak punya datanya", () => {
    // Label "Paling Banyak Ditonton" DIGANTI "Terpopuler" 2026-11-14 (owner:
    // "populer juga perbaiki") — menyamakan kata dengan situs katalog
    // pembanding. Yang diuji tetap sama: pilihan yang datanya nol harus
    // HILANG, bukan tergambar lalu memulangkan urutan apa adanya.
    const populer = buildNavMenus(POLOS).find((m) => m.key === "populer");
    const label = populer?.items.map((i) => i.label) ?? [];
    expect(label).toContain("Terpopuler");
    expect(label).not.toContain("Rating Tertinggi");
    expect(label).not.toContain("Tahun Terbaru");
  });

  it("mengarahkan tautan ke halaman yang MEMBACA penyaringnya", () => {
    // /discover satu-satunya halaman yang membaca penyaring dari alamat URL.
    // Kalau ada yang menunjuk /beranda, tautannya diabaikan DIAM-DIAM.
    //
    // ⚠️ /katalog?tab= ikut sah sejak 2026-11-14: halaman itu membaca `?tab=`
    // lewat `parseTab` (app/components/beranda/TabKatalog.tsx:64) dan memuat
    // persis daftar yang diminta menu Series — Terbaru/Populer/Unggulan/
    // Update. Memakai ulang halaman yang sudah ada jauh lebih aman daripada
    // merakit aturannya kedua kali di /discover.
    for (const m of buildNavMenus(KAYA)) {
      for (const i of m.items) {
        expect(
          i.href === "/katalog" ||
            i.href.startsWith("/katalog?tab=") ||
            i.href.startsWith("/discover"),
          `${m.label} > ${i.label} menunjuk ${i.href}`,
        ).toBe(true);
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
      "Aksi",
      "Anime",
      "Horor",
      "Komedi",
      "Fiksi Ilmiah",
      "Romantis",
      "Cina",
      "India",
      "Jepang",
      "Korea",
      "Thailand",
      // ⚠️ DIBALIK 2026-11-14 (owner: "tahun mulai dari tahun terbaru").
      // Strip ini satu-satunya tempat di situs yang tahunnya MENAIK; menu
      // dropdown "Tahun" sudah menurun sejak dulu. Merahnya tes lama bukan
      // bug — urutannya memang sengaja diubah.
      "2026",
      "2025",
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

  it("chip genre & negara berlabel Indonesia tapi alamatnya ejaan asli", () => {
    // Kegagalan senyap yang paling mungkin: label ikut masuk ke alamat.
    const cari = (l: string) => STRIP_KATALOG.find((c) => c.label === l)?.href;
    expect(cari("Aksi")).toBe("/discover?cat=Action");
    expect(cari("Horor")).toBe("/discover?genre=Horror");
    expect(cari("Fiksi Ilmiah")).toBe("/discover?genre=Sci-Fi");
    expect(cari("Romantis")).toBe("/discover?cat=Romance");
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

// ===========================================================================
// PENJAGA 2026-09-22 — `alamatCari()` satu sumber untuk "ketikan dibawa ke mana".
//
// Kenapa ada: logika ini tadinya DISALIN di empat tempat — TopNav (kotak cari
// kecil), PublicTopBars (halaman depan), KerangkaKepalaKatalog (kerangka
// /discover), dan PersonalRows (tautan rekomendasi genre). Kalau salah satu
// bergeser, pencarian dari satu halaman mendarat berbeda dari halaman lain
// TANPA satu pun error. Ketahuan lewat tinjauan 2026-09-22.
// ===========================================================================
describe("alamatCari", () => {
  it("membawa kata kunci sebagai parameter q", () => {
    expect(alamatCari("naga")).toBe("/discover?q=naga");
  });

  it("kosong/hanya spasi TIDAK membuat parameter kosong", () => {
    // `?q=` kosong akan terbaca sebagai "cari string kosong" oleh penyaring,
    // bukan "tidak mencari" — halaman hasilnya jadi aneh tanpa sebab jelas.
    expect(alamatCari("")).toBe("/discover");
    expect(alamatCari("   ")).toBe("/discover");
  });

  it("memangkas spasi di ujung", () => {
    expect(alamatCari("  naga  ")).toBe("/discover?q=naga");
  });

  it("menyandikan karakter yang merusak alamat", () => {
    // Tanpa penyandian, `&` memotong parameter dan spasi merusak alamat.
    expect(alamatCari("cinta & benci")).toBe("/discover?q=cinta%20%26%20benci");
    expect(alamatCari("50%")).toBe("/discover?q=50%25");
  });

  it("memakai spasi %20, bukan +", () => {
    // Bentuk ini dipertahankan dari 2026-09-10 supaya tautan pencarian lama
    // yang pernah dibagikan penonton tetap berarti sama.
    expect(alamatCari("dua kata")).toContain("%20");
    expect(alamatCari("dua kata")).not.toContain("+");
  });
});
