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

  it("bar cari berwarna merah terang, bukan ungu", () => {
    // Owner 2026-09-21: ujung kiri yang ungu (`fuchsia-700`) terlalu mencolok
    // dan tidak sejajar dengan situs katalog pembanding.
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    expect(html).toContain("from-rose-700");
    // Diperiksa pada KELAS GRADASI-nya, bukan kata "fuchsia" begitu saja:
    // warna itu masih dipakai sah di tempat lain (mis. lencana koin pada
    // kartu poster), jadi pencarian yang terlalu lebar akan merah palsu.
    expect(html, "gradasi ungu seharusnya sudah dilepas").not.toContain(
      "from-fuchsia",
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
    expect(html).toContain("Cari film di DramaKu");
    expect(html).toContain(">Action<");
  });

  it("halaman depan: logo memakai lambang situs, bukan huruf dalam kotak", () => {
    const html = renderToStaticMarkup(
      createElement(PublicTopBars, { menus: buildNavMenus(KATALOG) }),
    );
    expect(html).toContain('alt="DramaKu"');
    expect(html).toContain("/logo-mark.png");
    // Kotak kuning berisi huruf "D" yang lama sudah tidak dipakai.
    expect(html).not.toContain("bg-amber-400 font-serif");
  });

  it("logo halaman depan & halaman berkatalog PERSIS sama bentuknya", () => {
    // Keduanya memakai komponen `LogoDramaKu` yang sama. Sebelum 2026-09-21
    // markup-nya disalin di dua tempat dan sempat menyimpang — halaman depan
    // memakai kotak kuning berisi huruf "D" sementara yang lain memakai
    // lambang. Yang dibandingkan potongan logonya, bukan seluruh halaman,
    // sebab alamat tautannya memang sengaja berbeda ("/" vs "/beranda").
    const ambilLogo = (html: string) => {
      const i = html.indexOf("<img");
      expect(i, "gambar logo tidak ditemukan").toBeGreaterThan(-1);
      return html.slice(i, html.indexOf("</a>", i));
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
    expect(html).toContain('width="36"');
    expect(html).toContain("size-9");
    expect(html).toContain("text-xl");
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

  it("bar cari memasang tombol menu halaman pengganti navbar", () => {
    // Navbar hitam disembunyikan di halaman ini, jadi tombol inilah satu-satunya
    // jalan ke Discover/Playly/Admin/Keluar di layar komputer.
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    expect(html).toContain('aria-label="Menu halaman"');
    expect(html).toContain('alt="DramaKu"');
  });

  it("kotak cari memanjang, tidak lagi dipatok 28rem", () => {
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    expect(html).toContain("md:flex-1");
    expect(html).not.toContain("md:max-w-md");
  });

  it("kotak cari memakai tulisan pendek yang diminta owner", () => {
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    expect(html).toContain('placeholder="Cari film di DramaKu"');
    // Kotak carinya tetap kotak cari sungguhan, bukan hiasan.
    expect(html).toContain('role="search"');
    expect(html).toContain('type="search"');
  });

  it("menggambar keenam tombol menu dengan tulisan yang ditentukan owner", () => {
    const html = renderToStaticMarkup(
      createElement(DramaBrowser, { dramas: KATALOG }),
    );
    // Hanya TOMBOL-nya yang ada di HTML — isi dropdown Radix baru dirender
    // saat menunya dibuka, jadi isinya dijaga di tests/nav-katalog.test.ts.
    for (const label of ["Genre", "Series", "Populer", "Negara", "Tahun", "+ More"]) {
      expect(html, `tombol menu "${label}" tidak tergambar`).toContain(
        `>${label}<`,
      );
    }
    expect(html).not.toContain(">Jenis<");
    expect(html).not.toContain(">Lainnya<");
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
    ["bar merah", "from-rose-700 via-rose-600 to-pink-600"],
    ["logo situs", 'alt="DramaKu"'],
    ["tombol menu garis-tiga", 'aria-label="Menu halaman"'],
    ["tulisan kotak cari", `placeholder="${TEKS_KOTAK_CARI}"`],
    ["penanda pencarian", 'role="search"'],
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
