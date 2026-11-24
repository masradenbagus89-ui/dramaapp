// Penjaga syarat owner: "semua chip & menu BERFUNGSI kalau diklik"
// (permintaan 2026-09-10, ditegaskan lagi 2026-09-21).
//
// Bedanya dengan tests/nav-katalog.test.ts: di sana yang diuji fungsi penyusun
// daftarnya; DI SINI komponennya benar-benar DIRENDER lalu alamat yang
// SUNGGUHAN tertulis di HTML itu dijalankan lewat penyaring halaman. Tanpa
// lapisan ini, daftar yang benar masih bisa gagal sampai ke layar — mis.
// halaman memakai daftar tetap alih-alih daftar yang dihitung dari katalog,
// dan chip mati tergambar tanpa satu pun pesan error.
//
// `next/navigation` di-mock karena DramaBrowser memakai useRouter/useSearchParams
// yang cuma hidup di dalam runtime Next.
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FILTER_KOSONG,
  bacaFilter,
  filterDariUrl,
  type CatalogFilter,
} from "../lib/discover";
import { STRIP_KATALOG, buildNavMenus } from "../lib/nav-katalog";
import type { Drama } from "../lib/types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/discover",
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}));

const { default: DramaBrowser } = await import("../app/components/DramaBrowser");
const { default: PublicTopBars } = await import(
  "../app/components/beranda/PublicTopBars"
);

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

/**
 * Katalog uji dibuat semirip mungkin dengan katalog produksi (dibaca
 * 2026-09-21): kategori kurasi & genre sinema OMDb yang BERBEDA, negara
 * gabungan, sebagian judul tanpa tahun, campuran film/serial dan gratis/koin.
 * SENGAJA tanpa `posterImage` — dengan gambar, `Poster` memakai `next/image`
 * yang butuh runtime Next dan tidak bisa dirender di sini.
 */
const KATALOG: Drama[] = [
  stub({
    id: "a",
    title: "Alpha",
    category: "Romance",
    genre: "Horror, Sci-Fi",
    country: "China, United States",
    year: "2026",
    subtitles: ["id"],
    imdbRating: "8.1",
  }),
  stub({
    id: "b",
    title: "Beta",
    category: "Action",
    genre: "Action, Thriller",
    country: "Canada",
    year: "2025",
    premium: true,
  }),
  stub({ id: "c", title: "Gamma", category: "Comedy", kind: "movie", episodes: 1 }),
  stub({ id: "d", title: "Delta", category: "Romance", year: "2017" }),
];

/** Semua alamat /discover yang tertulis di HTML, sudah dibersihkan dari escape. */
function alamatDiHtml(html: string): string[] {
  const hrefs = [...html.matchAll(/href="(\/discover[^"]*)"/g)].map((m) =>
    m[1].replace(/&amp;/g, "&"),
  );
  return [...new Set(hrefs)];
}

function jumlahHasil(href: string): number {
  return filterDariUrl(KATALOG, new URLSearchParams(href.split("?")[1] ?? ""))
    .length;
}

describe("chip strip & menu yang SUNGGUHAN digambar halaman", () => {
  const halaman: [string, string][] = [
    [
      "/discover",
      renderToStaticMarkup(createElement(DramaBrowser, { dramas: KATALOG })),
    ],
    [
      "/ (halaman depan)",
      renderToStaticMarkup(
        createElement(PublicTopBars, { menus: buildNavMenus(KATALOG) }),
      ),
    ],
  ];

  for (const [nama, html] of halaman) {
    it(`${nama}: menggambar seluruh chip strip milik owner`, () => {
      const alamat = new Set(alamatDiHtml(html));
      for (const chip of STRIP_KATALOG) {
        expect(
          alamat.has(chip.href),
          `chip ${chip.label} (${chip.href}) tidak tergambar di ${nama}`,
        ).toBe(true);
      }
    });

    it(`${nama}: tiap alamat yang digambar benar-benar MENYARING`, () => {
      // Aturan yang dijaga di sini BUKAN "harus berisi" — sebagian chip
      // memang belum ada judulnya (keputusan owner 2026-09-21). Yang dijaga:
      // alamatnya harus dikenali `bacaFilter`. Nama parameter yang salah tulis
      // diabaikan DIAM-DIAM, dan chip-nya lalu menampilkan SELURUH katalog
      // seolah penyaringnya bekerja — jauh lebih menyesatkan daripada kosong.
      const alamat = alamatDiHtml(html);
      // Pagar terhadap tes yang lulus karena tak menemukan apa-apa.
      expect(alamat.length).toBeGreaterThanOrEqual(STRIP_KATALOG.length);
      for (const href of alamat) {
        const f = bacaFilter(new URLSearchParams(href.split("?")[1] ?? ""));
        const berubah = (Object.keys(FILTER_KOSONG) as (keyof CatalogFilter)[])
          .filter((k) => f[k] !== FILTER_KOSONG[k]);
        expect(
          berubah.length,
          `${href} tidak mengubah penyaring apa pun — nama parameternya ` +
            `kemungkinan salah tulis`,
        ).toBeGreaterThan(0);
      }
    });
  }

  it("bar cari memakai warna merek, tanpa gradasi ungu/merah lama", () => {
    // RIWAYAT WARNA bar ini, supaya tak ada yang memutarnya balik:
    //   `fuchsia-700` (ungu) → ditolak owner 2026-09-21, terlalu mencolok
    //   → `from-rose-700 via-rose-600 to-pink-600` (merah-pink DramaKu)
    //   → `bg-sage-700` (owner 2026-11-23: *"tema warna jadi soft sage"*)
    //   → `bg-sage-100` di hari yang sama (*"warna hijau atas dan bawah ubah
    //     jadi lebih soft"*). Teksnya ikut dibalik ke `sage-900`, sebab teks
    //     putih di atas sage-100 = 1,20:1 — praktis tak terbaca.
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    // Dipaku pada GRADASI penuhnya, bukan satu nada saja: sejak owner minta
    // *"ada seperti gradasi jadi lebih hidup"* (2026-11-23) bar ini bergradasi,
    // dan patokan `bg-sage-100` jadi merah PALSU karena nada itu kini muncul
    // sebagai `via-sage-100`.
    expect(html).toContain("sapuan-gelombang");
    // GELOMBANG — owner menolak TIGA versi sebelum ini: warna rata, gradasi
    // lurus, lalu lingkaran berkabut (*"masih polos"* dua kali). Dijaga supaya
    // tidak hilang saat kelasnya dirapikan: perbedaan NADA antar warna
    // berdekatan nyaris tak terbaca mata, yang terbaca adalah GARIS.
    // Definisinya CSS sungguhan di app/globals.css — lihat alasannya di sana
    // (SVG ber-spasi tidak bisa ditulis sebagai kelas arbitrer).
    expect(html, "hiasan gelombang hilang — bar jadi polos lagi").toContain(
      "sapuan-gelombang",
    );
    // Diperiksa pada KELAS GRADASI-nya, bukan kata "fuchsia"/"rose" begitu
    // saja: keduanya masih dipakai sah di tempat lain (mis. lencana koin pada
    // kartu poster, kotak ikon panel menu), jadi pencarian yang terlalu lebar
    // akan merah palsu.
    expect(html, "gradasi ungu seharusnya sudah dilepas").not.toContain(
      "from-fuchsia",
    );
    expect(html, "gradasi merah lama seharusnya sudah dilepas").not.toContain(
      "from-rose-700",
    );
  });

  it("halaman depan: bar cari TIDAK lagi memuat tombol Masuk/Daftar", () => {
    // Owner 2026-09-21: "dobel" — halaman depan sudah menawarkannya dua kali
    // di badan halaman plus footer.
    const html = renderToStaticMarkup(
      createElement(PublicTopBars, { menus: buildNavMenus(KATALOG) }),
    );
    expect(html).not.toContain('href="/login"');
    expect(html).not.toContain('href="/daftar"');
    // Pagar: barnya sendiri tetap utuh, bukan kosong karena render gagal.
    // Kotak cari kini di balik tombol (owner 2026-10-29), jadi yang
    // membuktikan "barnya utuh" adalah TOMBOLNYA, bukan tulisan placeholder.
    expect(html).toContain('aria-label="Cari film"');
    // Chip pertama strip kuning. Labelnya Indonesia sejak 2026-10-30
    // (lib/genre.ts); alamatnya tetap ejaan katalog — dijaga terpisah di
    // tests/nav-katalog.test.ts.
    expect(html).toContain(">Aksi<");
  });

  it("halaman depan: logo memakai lambang situs, bukan huruf dalam kotak", () => {
    const html = renderToStaticMarkup(
      createElement(PublicTopBars, { menus: buildNavMenus(KATALOG) }),
    );
    expect(html).toContain('alt="Layarindo"');
    expect(html).toContain("/logo-layarindo.png");
    // Kotak kuning berisi huruf "D" yang lama sudah tidak dipakai.
    expect(html).not.toContain("bg-amber-400 font-serif");
  });

  it("logo halaman depan & halaman berkatalog PERSIS sama bentuknya", () => {
    // Keduanya memakai komponen `LogoSitus` yang sama. Sebelum 2026-09-21
    // markup-nya disalin di dua tempat dan sempat menyimpang — halaman depan
    // memakai kotak kuning berisi huruf "D" sementara yang lain memakai
    // lambang. Yang dibandingkan potongan logonya, bukan seluruh halaman,
    // sebab alamat tautannya memang sengaja berbeda ("/" vs "/beranda").
    //
    // ⚠️ Batas akhirnya DIUBAH 2026-11-21 dari `</a>` ke penutup nama situs.
    // Sejak logo di HP duduk di dalam `<button>` (pembuka menu katalog,
    // SearchBar.tsx), logo PERTAMA tidak lagi punya `</a>` — potongannya jadi
    // melar sampai menelan logo versi komputer di belakangnya, lalu
    // membandingkan `href` yang memang sengaja berbeda. Itu kegagalan PALSU.
    // Yang dijaga tidak berkurang: gambar, seluruh kelasnya, dan nama situs
    // tetap dibandingkan utuh — cuma pembungkusnya yang tidak ikut.
    const ambilLogo = (html: string) => {
      const i = html.indexOf("<img");
      expect(i, "gambar logo tidak ditemukan").toBeGreaterThan(-1);
      // Penutupnya BUKAN lagi teks nama situs: sejak logo Layarindo dipasang
      // (2026-11-23) namanya menyatu di dalam GAMBAR, jadi `DramaKu</span>`
      // tidak ada lagi untuk dijadikan batas. Dipakai gambar KEDUA (versi
      // lambang saja) sebagai penutup — isinya tetap dibandingkan utuh.
      const PENUTUP = "data-lambang-saja";
      const akhir = html.indexOf(PENUTUP, i);
      expect(akhir, "gambar lambang tidak ditemukan").toBeGreaterThan(-1);
      const tutupTag = html.indexOf("/>", akhir);
      return html.slice(i, tutupTag + 2);
    };

    const depan = renderToStaticMarkup(
      createElement(PublicTopBars, { menus: buildNavMenus(KATALOG) }),
    );
    const katalog = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    expect(ambilLogo(depan)).toBe(ambilLogo(katalog));
  });

  it("logo cukup besar untuk dibaca (owner 2026-09-21)", () => {
    // Angkanya dikunci karena owner dua kali menilainya terlalu kecil.
    // 36px sengaja = tinggi kotak cari (`h-9`), jadi bar tidak ikut meninggi.
    const html = renderToStaticMarkup(
      createElement(PublicTopBars, { menus: buildNavMenus(KATALOG) }),
    );
    // TINGGINYA yang dikunci (36px = `h-9`), bukan lebarnya. Sejak logo
    // Layarindo dipasang (2026-11-23), nama situs menyatu di dalam gambar
    // sehingga lebarnya mengikuti panjang tulisan. `size-9` (persegi) dan
    // `text-xl` (nama situs sebagai TEKS) sudah tidak berlaku — keduanya
    // milik logo lama yang berupa lambang kotak + tulisan terpisah.
    expect(html).toContain('height="36"');
    expect(html).toContain("h-9");
    expect(html, "ukuran lama 28px seharusnya sudah naik").not.toContain("size-7");
  });

  it("bar cari sudah TIDAK memuat dropdown penyaring", () => {
    // Keluhan owner 2026-09-21: bar cari terlalu ramai. Keempat dropdown
    // (genre · urutan · tahun · rating) dilepas; penggantinya menu dropdown di
    // bar yang sama + strip kuning, yang semuanya melempar ke /discover.
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    for (const hilang of [
      "Semua genre",
      "Semua tahun",
      "Semua rating",
      "Terbaru ditambah",
    ]) {
      expect(html, `dropdown "${hilang}" seharusnya sudah dilepas`).not.toContain(
        hilang,
      );
    }
  });

  it("bar cari TIDAK lagi memasang tombol garis-tiga, tapi tetap berlogo", () => {
    // ⚠️ DIBALIK 2026-11-14. Tes ini dulu memaksa tombol menu ADA di sini
    // ("satu-satunya jalan ke Discover/Playly/Admin/Keluar di layar
    // komputer"). Alasan itu sudah tidak berlaku: Admin & Keluar pindah ke
    // menu avatar (`MenuAkun`) sejak 2026-09-26, dan owner melepas tombolnya
    // 2026-11-14. Merahnya tes lama bukan bug.
    //
    // Logonya TETAP dijaga — ia dulu menumpang di dalam tombol itu, jadi
    // inilah titik paling mungkin ia ikut terbuang tanpa ada yang sadar.
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    expect(html).not.toContain('aria-label="Menu halaman"');
    expect(html).toContain('alt="Layarindo"');
  });

  it("pencarian /discover kini TOMBOL, seragam dengan seluruh situs", () => {
    // Owner 2026-10-29: *"di bagian discover pun berlaku hal yang sama untuk
    // search"*. Lebar kotaknya sudah tidak relevan — ia tidak lagi duduk di
    // bar. Yang dijaga sekarang: tombolnya ADA (tanpa itu halaman ini
    // kehilangan pencariannya).
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    expect(html).toContain('aria-label="Cari film"');
  });

  it("kotak TERBUKA SENDIRI kalau halaman dibuka dengan kata kunci", () => {
    // ⚠️ Pagar terpenting di halaman ini. /discover adalah halaman HASIL
    // pencarian: kalau penonton tiba lewat `?q=…`, kata kuncinya WAJIB
    // terlihat — tersembunyi di balik tombol, ia tak tahu apa yang sedang
    // dicari dan tak bisa menyuntingnya.
    const sumber = readFileSync("app/components/DramaBrowser.tsx", "utf-8");
    expect(
      sumber,
      "`bukaAwal` hilang — kata kunci yang sedang berlaku akan tersembunyi",
    ).toContain("bukaAwal={Boolean(filter.q)}");
  });

  it("menggambar keenam tombol menu dengan tulisan yang ditentukan owner", () => {
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    // Hanya TOMBOL-nya yang ada di HTML — isi dropdown Radix baru dirender
    // saat menunya dibuka, jadi isinya dijaga di tests/nav-katalog.test.ts.
    for (const label of ["Genre", "Series", "Populer", "Negara", "Tahun", "Lainnya"]) {
      expect(html, `tombol menu "${label}" tidak tergambar`).toContain(
        `>${label}<`,
      );
    }
    // Kunci internal menu ("jenis") tidak boleh bocor jadi tulisan di layar.
    expect(html).not.toContain(">Jenis<");
    // Pagar untuk kunci "lainnya" DIGANTI, bukan dihapus: sejak owner meminta
    // "+ More" diindonesiakan (2026-10-30), "Lainnya" justru label yang BENAR,
    // jadi melarangnya malah bertentangan dengan permintaan. Yang kini dijaga:
    // label Inggris lamanya benar-benar hilang dari layar.
    expect(html).not.toContain(">+ More<");
  });

  it("strip TIDAK lagi memajang negara & pintasan yang tak diminta owner", () => {
    // Keluhan owner 2026-09-21: "terlalu banyak tulisan dan negara lainnya".
    // Sebelumnya strip dihitung dari katalog dan tumbuh jadi 29 chip.
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    for (const hilang of [
      ">Amerika<",
      ">Kanada<",
      ">Inggris<",
      ">Jerman<",
      ">Selandia Baru<",
      ">Adventure<",
      ">Thriller<",
      ">Jelajah<",
      ">Gratis<",
    ]) {
      expect(html, `${hilang} seharusnya sudah tidak ada di strip`).not.toContain(
        hilang,
      );
    }
    // Pagar supaya tes di atas tidak lulus hanya karena stripnya kosong.
    expect(html).toContain(">Cina<");
    expect(html).toContain(">Terpopuler<");
  });

  it("chip yang katalognya berisi memulangkan judul, yang kosong memulangkan NOL", () => {
    // Bedanya "belum ada isinya" (jujur) dengan "penyaring diabaikan"
    // (menyesatkan): yang kedua memulangkan seluruh katalog.
    expect(jumlahHasil("/discover?cat=Action")).toBeGreaterThan(0);
    expect(jumlahHasil("/discover?genre=Horror")).toBeGreaterThan(0);
    expect(jumlahHasil("/discover?negara=China")).toBeGreaterThan(0);
    expect(jumlahHasil("/discover?negara=Japan")).toBe(0);
    expect(jumlahHasil("/discover?genre=Animation")).toBe(0);
  });

  it("strip memajang label Indonesia tapi alamatnya ejaan OMDb", () => {
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    expect(html).toContain(">Cina<");
    expect(html).toContain(">Jepang<");
    expect(html).toContain(">Komedi<");
    expect(html).toContain("/discover?negara=China");
    expect(html).toContain("/discover?negara=Japan");
    // Label TIDAK boleh ikut masuk ke alamat.
    expect(html).not.toContain("negara=Cina");
    expect(html).not.toContain("negara=Jepang");
    expect(html).not.toContain("cat=Komedi");
  });
});

// ===========================================================================
// PENJAGA 2026-09-22 — kerangka kepala /discover selagi katalog belum siap.
//
// Kenapa perlu: /discover TIDAK merender apa pun di server (DramaBrowser
// memakai useSearchParams, jadi wajib dibungkus <Suspense>), sehingga isi
// `fallback` adalah SATU-SATUNYA yang dilihat penonton sebelum JavaScript
// aktif. Sampai hari ini isinya cuma tulisan "Memuat..." di layar hitam —
// halaman katalog utama terbaca seperti situs rusak.
//
// Yang dijaga BUKAN "ada kerangkanya", tapi kerangkanya membawa penanda kepala
// yang SAMA dengan kepala aslinya. Kalau menyimpang, kepala situs melompat
// tepat di depan mata penonton saat isinya masuk.
// ===========================================================================
const { default: KerangkaKepalaKatalog } = await import(
  "../app/components/beranda/KerangkaKepalaKatalog"
);
const { TEKS_KOTAK_CARI } = await import(
  "../app/components/beranda/SearchBar"
);
const { readFileSync } = await import("node:fs");

describe("kerangka kepala /discover", () => {
  const menus = buildNavMenus(KATALOG);
  const kerangka = renderToStaticMarkup(
    createElement(KerangkaKepalaKatalog, { menus }),
  );
  const kepalaAsli = renderToStaticMarkup(
    createElement(DramaBrowser, { dramas: KATALOG }),
  );

  /** Penanda yang membuat kepala situs dikenali sebagai DramaKu. */
  const TANDA_KEPALA: Array<[string, string]> = [
    // Diganti 2026-11-23 dari "from-rose-700 via-rose-600 to-pink-600" saat
    // tema situs jadi soft sage. Yang dijaga tetap SAMA: kerangka pemuatan
    // dan kepala asli wajib sewarna, supaya bar tidak berkedip ganti warna
    // tepat saat isinya datang.
    ["bar warna merek", "sapuan-gelombang"],
    ["hiasan gelombang bar", "sapuan-gelombang"],
    ["logo situs", 'alt="Layarindo"'],
    // "tombol menu garis-tiga" dikeluarkan dari daftar ini 2026-11-14 — owner
    // melepas tombolnya, jadi penandanya tidak ada lagi di kepala MANA PUN.
    // Membiarkannya di sini membuat kerangka & kepala asli sama-sama merah
    // padahal keduanya memang sudah cocok.
    // Kotak cari TIDAK lagi duduk di bar sejak 2026-10-29 (owner: pencarian
    // jadi tombol di seluruh situs), jadi `placeholder` & `role="search"`
    // memang sudah tidak ada di HTML awal. Penggantinya TOMBOLNYA — itulah
    // yang sekarang wajib sama antara kerangka dan kepala sungguhan.
    ["tombol cari", 'aria-label="Cari film"'],
  ];

  for (const [nama, tanda] of TANDA_KEPALA) {
    it(`membawa ${nama}, sama dengan kepala aslinya`, () => {
      expect(
        kepalaAsli,
        `${nama} tidak ada di kepala ASLI — penandanya berubah, ` +
          `perbarui daftar TANDA_KEPALA di tes ini`,
      ).toContain(tanda);
      expect(
        kerangka,
        `${nama} tidak ada di KERANGKA — kepala situs akan melompat saat ` +
          `isi halaman masuk, dan penonton melihat dua bentuk berbeda`,
      ).toContain(tanda);
    });
  }

  it("membawa strip chip sebanyak yang sebenarnya", () => {
    // Strip yang isinya beda jumlah membuat tinggi halaman berubah saat isinya
    // masuk — poster yang mau diklik penonton ikut bergeser.
    const hitung = (html: string) =>
      STRIP_KATALOG.filter((i) => html.includes(`href="${i.href}"`)).length;
    expect(hitung(kerangka)).toBe(STRIP_KATALOG.length);
    expect(hitung(kerangka)).toBe(hitung(kepalaAsli));
  });

  // CATATAN: "kotak carinya benar-benar tersambung" TIDAK bisa dijaga dari
  // sini. Penjaga versi pertama memeriksa ada `<form>` di HTML dan itu LOLOS
  // saat penanganya dilepas — `SearchBar` menggambar `<form>` tanpa peduli
  // tersambung atau tidak. Penjaga yang sah ada di tests/kerangka-discover.ts
  // (menangkap props yang diterima SearchBar, lalu MENJALANKAN penanganya).

  it("halaman /discover TIDAK kembali memakai tulisan polos", () => {
    // Penjaga langsung atas permintaan owner. Diperiksa dari berkas sumbernya
    // karena `fallback` sebuah <Suspense> tak bisa dirender terpisah di sini.
    const sumber = readFileSync("app/discover/page.tsx", "utf-8");
    expect(sumber).toContain("<KerangkaKepalaKatalog menus={menus} />");
    expect(sumber).not.toContain(
      '<div className="py-16 text-center text-sm text-zinc-500">Memuat...</div>',
    );
  });
});
