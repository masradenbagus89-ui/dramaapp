import { describe, it, expect } from "vitest";
import {
  GENRE_FILM,
  STRIP_KATALOG,
  alamatCari,
  buildNavMenus,
} from "../lib/nav-katalog";
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
    // ⚠️ JADI ENAM sejak 2026-11-24. Sampai hari itu "lainnya" hilang sendiri
    // kalau katalognya tak punya kategori khas drama maupun negara Asia —
    // dan katalog uji ini memang tidak punya keduanya. Owner lalu meminta
    // seluruh kategori resmi + lima baris drama Asia SELALU digambar, jadi
    // menu itu kini tak pernah kosong. Perubahan ini DISENGAJA; jangan
    // dikembalikan ke lima.
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
    // ⚠️ "Lainnya" sempat diubah jadi "Genre Lainnya" pada hari yang sama,
    // lalu owner MENGOREKSI: "cukup tulisan lainnya (jangan genre lainnya)".
    // Labelnya diuji di tests/nav-menu-lengkap (menunya butuh data khusus);
    // kelima ini dikunci di sini karena sudah TIGA kali jadi soal.
    // "Lainnya" ikut sejak 2026-11-24 — lihat alasannya di patokan di atas.
    expect(buildNavMenus(KAYA).map((m) => m.label)).toEqual([
      "Genre",
      "Series",
      "Populer",
      "Negara",
      "Tahun",
      "Lainnya",
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
    expect(label).toContain("Amerika Serikat");
    expect(label).toContain("Kanada");
    expect(label).not.toContain("United States, Canada");
  });

  it("menerjemahkan LABEL negara tapi TIDAK alamatnya", () => {
    // Inilah kegagalan senyap yang paling mungkin: label "Cina" ikut terkirim
    // ke alamat, padahal penyaring mencocokkan nilai asli OMDb "China" —
    // chip-nya tergambar rapi lalu memulangkan halaman hampa.
    const negara = buildNavMenus(KAYA).find((m) => m.key === "negara");
    const amerika = negara?.items.find((i) => i.label === "Amerika Serikat");
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

  it("tiap pilihan menu Genre memakai nilai BAKU — label tak merusak alamat", () => {
    // ⚠️ PATOKANNYA BERGANTI 2026-11-24. Dulu: "tiap pilihan memulangkan
    // judul". Itu tak berlaku lagi sejak owner meminta SELURUH genre resmi
    // digambar, berisi atau tidak.
    //
    // Yang menggantikannya justru menangkap kerusakan yang LEBIH berbahaya:
    // nilai yang salah ketik. Genre kosong yang sah ("belum ada judulnya")
    // dan genre salah ketik ("?genre=Sci Fi" alih-alih "Sci-Fi") sama-sama
    // memulangkan nol judul — mustahil dibedakan dari jumlah hasil. Dengan
    // mencocokkan ke `GENRE_FILM` (sumber kebenaran yang sama dengan yang
    // dipakai pencocokan otomatis), salah ketik langsung merah.
    //
    // Pelajaran aslinya: tombol "Judul A-Z" menunjuk `?sort=judul`
    // berminggu-minggu padahal nilai yang sah `title`, dan tesnya saat itu
    // cuma memastikan teksnya ADA — hijau di atas tombol yang mati.
    const baku = new Set(GENRE_FILM.map((g) => g.toLowerCase()));
    const genre = buildNavMenus(KAYA).find((m) => m.key === "genre");
    for (const item of genre?.items ?? []) {
      if (item.label === "Lainnya") continue; // baris penutup, bukan genre
      const nilai = decodeURIComponent(
        new URL(item.href, "https://x").searchParams.get("genre") ??
          new URL(item.href, "https://x").searchParams.get("cat") ??
          "",
      );
      expect(
        baku.has(nilai.toLowerCase()),
        `pilihan ${item.label} memakai nilai "${nilai}" yang BUKAN genre baku — ` +
          `ia akan memulangkan nol judul selamanya, bukan menunggu katalog bertambah`,
      ).toBe(true);
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

  /**
   * ⚠️ DUA MENU DIKECUALIKAN sejak 2026-11-24, dan ini keputusan owner yang
   * MENANG atas aturan lama "semuanya berfungsi kalau diklik":
   *   - "genre"   → kini memuat SELURUH genre resmi, berisi atau tidak
   *   - "lainnya" → kini memuat seluruh kategori kurasi + 5 baris drama Asia
   * Owner memintanya 2026-11-24 setelah dua kali mengira fiturnya belum
   * dibuat. Konsekuensinya diterima: pilihan kosong diklik = "Tidak ada
   * drama yang cocok" + tombol Hapus filter.
   *
   * Pengecualiannya SEMPIT — empat menu lain tetap wajib berisi, dan itulah
   * kenapa patokan ini TIDAK dihapus. Penggantinya untuk dua menu yang
   * dikecualikan ada di patokan berikutnya: nilainya wajib dari daftar baku,
   * supaya "kosong karena belum ada judul" tidak bisa tertukar dengan
   * "kosong karena nilainya salah ketik".
   */
  const MENU_BOLEH_KOSONG = new Set(["genre", "lainnya"]);

  it("tiap pilihan menu memulangkan minimal satu judul", () => {
    // Ini syarat owner: "semuanya berfungsi kalau diklik".
    for (const menu of buildNavMenus(KAYA)) {
      if (MENU_BOLEH_KOSONG.has(menu.key)) continue;
      for (const item of menu.items) {
        expect(
          hasilDariTautan(KAYA, item.href).length,
          `${menu.label} > ${item.label} (${item.href}) memulangkan nol judul`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("pembanding: menu yang DIKECUALIKAN memang punya pilihan kosong", () => {
    // Tanpa ini, pengecualian di atas bisa jadi penutup bagi kerusakan: kalau
    // suatu hari menu Genre kembali bersyarat, patokan utama tetap hijau dan
    // tak ada yang memberi tahu bahwa pengecualiannya sudah tak dipakai.
    const genre = buildNavMenus(KAYA).find((m) => m.key === "genre");
    const kosong = (genre?.items ?? []).filter(
      (i) => hasilDariTautan(KAYA, i.href).length === 0,
    );
    expect(
      kosong.length,
      "menu Genre tak lagi memuat genre kosong — pengecualian di atas jadi mubazir",
    ).toBeGreaterThan(0);
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
      // ⚠️ LIMA NEGARA + DUA TAHUN DILEPAS 2026-11-25 (owner: "untuk negara
      // dan tahun masukan ke kategori saja tidak perlu ditampilkan disitu").
      // Merahnya tes lama BUKAN bug — isinya memang sengaja dipendekkan.
      // Keduanya pindah ke menu dropdown bar atas, yang justru lebih lengkap:
      // menu Negara kini memuat SELURUH negara berisi, dikelompokkan per benua.
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
    // Chip NEGARA tidak lagi di strip (owner 2026-11-25). Aturan yang sama
    // tetap diuji untuk menu Negara di test "menerjemahkan LABEL negara tapi
    // TIDAK alamatnya" di atas — jadi nol pengawasan hilang, cuma pindah
    // tempat mengikuti chip-nya.
    expect(cari("Cina"), "negara masih nyangkut di strip").toBeUndefined();
    expect(cari("2026"), "tahun masih nyangkut di strip").toBeUndefined();
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

// ===========================================================================
// NEGARA — owner 2026-11-25: *"untuk negara dan tahun masukan ke kategori saja
// tidak perlu ditampilkan disitu dan untuk negara kamu buat lebih banyak lagi
// atau kamu ada solusi lain agar semua negara bisa muncul"*.
//
// Terukur hari itu: katalog memuat 57 negara, menu cuma memuat 24 teratas.
// Owner memilih (dari 3 pilihan) agar SEMUA muncul, dikelompokkan per benua.
//
// ⚠️ Yang dijaga di sini tiga hal yang kalau putus merusak DIAM-DIAM:
//   1. negara terpotong lagi -> judul hilang dari menu tanpa satu pun error;
//   2. nama kembar (USA / United States) terpecah dua -> satu negara tampil
//      dua kali, masing-masing berisi separuh filmnya;
//   3. judul kelompok ikut terhitung sebagai pilihan -> menu berisi 1 negara
//      lolos ambang, dan penonton dapat dropdown yang tak menambah apa pun.
// ===========================================================================
describe("menu Negara: semua negara, dikelompokkan per benua", () => {
  const dramaNegara = (id: string, country: string) =>
    ({
      id,
      title: `Judul ${id}`,
      category: "Action",
      episodes: 1,
      views: "1",
      synopsis: "",
      gradient: "",
      year: "2026",
      country,
    }) as never;

  const menuNegara = (dramas: unknown[]) =>
    buildNavMenus(dramas as never, []).find((m) => m.key === "negara");

  it("NOL negara terpotong, walau jumlahnya jauh di atas batas lama", () => {
    const banyak = Array.from({ length: 40 }, (_, i) =>
      dramaNegara(`d${i}`, `Negeri${String(i).padStart(2, "0")}`),
    );
    const pilihan = (menuNegara(banyak)?.items ?? []).filter(
      (i) => !i.kepalaGrup && i.href !== "/discover",
    );
    expect(
      pilihan.length,
      "ada negara yang terpotong — owner meminta SEMUA negara muncul",
    ).toBe(40);
  });

  it("negara Asia dikelompokkan dan muncul SEBELUM Eropa", () => {
    const menu = menuNegara([
      dramaNegara("a", "Japan"),
      dramaNegara("b", "South Korea"),
      dramaNegara("c", "France"),
      dramaNegara("d", "Germany"),
    ]);
    const label = (menu?.items ?? []).map((i) => i.label);
    expect(label).toContain("Asia");
    expect(label).toContain("Eropa");
    // Asia lebih dulu: situs ini katalog Asia untuk penonton Indonesia, jadi
    // menaruh Eropa di depan membuat yang paling dicari paling jauh dari mata.
    expect(label.indexOf("Asia")).toBeLessThan(label.indexOf("Eropa"));
    // Judul kelompok BUKAN tautan penyaring.
    const asia = (menu?.items ?? []).find((i) => i.label === "Asia");
    expect(asia?.kepalaGrup).toBe(true);
  });

  it('"USA" dan "United States" jadi SATU baris, bukan dua', () => {
    // Jepang ikut disertakan BUKAN sebagai hiasan: sesudah USA & United States
    // disatukan tinggal SATU negara, dan menu berisi satu pilihan memang
    // sengaja dibuang (MIN_ITEM_MENU). Tanpa negara kedua, tes ini merah
    // karena aturan lain yang justru bekerja benar.
    const menu = menuNegara([
      dramaNegara("a", "USA"),
      dramaNegara("b", "United States"),
      dramaNegara("c", "Japan"),
    ]);
    const label = (menu?.items ?? []).map((i) => i.label);
    expect(label.filter((l) => l === "Amerika Serikat")).toHaveLength(1);
    expect(label, "ejaan mentah USA bocor ke layar").not.toContain("USA");
  });

  it("klik Amerika Serikat ikut membawa judul yang bertanda USA", () => {
    // Inilah akibat nyata yang dirasakan penonton: tanpa penyatuan, separuh
    // filmnya hilang dari hasil tanpa satu pun pesan.
    const katalog = [dramaNegara("a", "USA"), dramaNegara("b", "United States")];
    const hasil = hasilDariTautan(
      katalog as never,
      "/discover?negara=United+States",
    );
    expect(hasil.map((d) => d.id).sort()).toEqual(["a", "b"]);
  });

  it("judul kelompok TIDAK dihitung sebagai pilihan menu", () => {
    // Satu negara saja = menu dibuang (MIN_ITEM_MENU). Kalau judul benuanya
    // ikut terhitung, menu berisi satu pilihan lolos — cuma menambah satu klik
    // ke tempat yang sama.
    expect(menuNegara([dramaNegara("a", "China")])).toBeUndefined();
  });
});
