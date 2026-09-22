// Penjaga KEPALA SITUS sesudah navbar hitam disembunyikan (owner 2026-09-21).
//
// Kenapa perlu dites dengan merender sungguhan: aturannya hidup di dua tempat
// yang saling bergantung — `TopNav` memutuskan KAPAN dirinya menghilang, dan
// `KepalaKatalog` menyediakan gantinya. Kalau salah satu bergeser sendiri,
// sebuah halaman bisa kehilangan SELURUH navigasinya di layar komputer tanpa
// satu pun error (BottomNav cuma muncul di HP, `md:hidden`).
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Alamat halaman yang sedang "dibuka" — diganti tiap kasus uji.
const keadaan = vi.hoisted(() => ({ path: "/beranda" }));

vi.mock("next/navigation", () => ({
  usePathname: () => keadaan.path,
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}));

const { default: TopNav } = await import("../app/components/TopNav");
const { LINKS } = await import("../app/components/TopNav");
const { MenuAplikasi, TUJUAN, TAUTAN_AKUN } = await import(
  "../app/components/beranda/KepalaKatalog"
);

function render(path: string, komponen: Parameters<typeof createElement>[0]) {
  keadaan.path = path;
  return renderToStaticMarkup(createElement(komponen));
}

/** Halaman yang KEPALA SITUSNYA dipegang bar cari merah (KepalaKatalog). */
const PUNYA_BAR_CARI = ["/beranda", "/discover"];

/**
 * Halaman yang TIDAK punya bar cari merah. Di sinilah navbar hitam wajib tetap
 * tergambar — ia satu-satunya navigasi di layar komputer.
 */
const WAJIB_ADA_NAVBAR = [
  "/shorts",
  "/playly",
  "/my-list",
  "/profile",
  "/history",
  "/admin",
  "/drama/contoh-judul",
];

describe("navbar hitam (TopNav)", () => {
  for (const path of PUNYA_BAR_CARI) {
    it(`menghilang di ${path} — kepalanya dipegang bar cari`, () => {
      expect(render(path, TopNav)).toBe("");
    });
  }

  for (const path of WAJIB_ADA_NAVBAR) {
    it(`TETAP tergambar di ${path} — tak ada bar cari di sana`, () => {
      const html = render(path, TopNav);
      expect(
        html,
        `${path} kehilangan navbar padahal tidak punya bar cari — ` +
          `di layar komputer halaman ini jadi tak punya navigasi sama sekali`,
      ).toContain("<header");
      // Pagar isi: bukan cuma ada, tapi memang membawa jalannya.
      expect(html).toContain("/discover");
      expect(html).toContain("/playly");
    });
  }

  it("tetap menghilang di halaman publik & pemutar", () => {
    for (const path of ["/", "/login", "/daftar", "/watch/a/1", "/feed/a"]) {
      expect(render(path, TopNav), path).toBe("");
    }
  });
});

describe("menu garis-tiga (pengganti navbar di halaman berkatalog)", () => {
  it("membawa SEMUA tujuan yang dulu ada di navbar", () => {
    // Diperiksa dari DAFTARNYA, bukan dari HTML: isi dropdown Radix baru
    // dirender saat menunya dibuka, jadi memeriksanya lewat render statis
    // selalu memulangkan "tidak ada" — dan itu bukan bug.
    expect(TUJUAN.map((t) => t.href)).toEqual([
      "/beranda",
      "/discover",
      "/shorts",
      "/playly",
      "/my-list",
      "/profile",
      "/admin",
    ]);
  });

  it("daftarnya TIDAK menyimpang dari navbar hitam", () => {
    // Keduanya navigasi yang sama dalam dua bentuk. Kalau salah satu bertambah
    // tujuan dan satunya tidak, sebagian halaman kehilangan jalan ke sana
    // tergantung halaman mana yang sedang dibuka — rusak yang SENYAP.
    const dariNavbar = LINKS.map((l) => ({ href: l.href, label: l.label }));
    const dariMenu = TUJUAN.map((t) => ({ href: t.href, label: t.label }));
    expect(dariMenu).toEqual(dariNavbar);
  });

  it("menandai Admin sebagai khusus admin di KEDUA daftar", () => {
    // Kalau tandanya hilang di salah satu, menu Admin bocor ke penonton biasa.
    expect(TUJUAN.find((t) => t.href === "/admin")?.adminOnly).toBe(true);
    expect(LINKS.find((l) => l.href === "/admin")?.adminOnly).toBe(true);
  });

  it("menyediakan tombolnya sendiri, bukan cuma daftar tersembunyi", () => {
    const html = render("/beranda", MenuAplikasi);
    expect(html).toContain('aria-label="Menu halaman"');
    // Logo ikut pindah ke sini — tanpa ini halaman berkatalog kehilangan
    // identitas situsnya sama sekali.
    expect(html).toContain('alt="DramaKu"');
  });

  it("menyimpan jalan MASUK ke akun dengan alamat yang benar", () => {
    // Sejak tombol Masuk/Daftar dilepas dari bar cari (owner 2026-09-21),
    // menu ini SATU-SATUNYA jalan masuk di /beranda & /discover. Diperiksa dari
    // daftarnya, bukan dari HTML: isi dropdown Radix baru dirender saat menunya
    // dibuka — salah alamat di sini terbukti LOLOS dari tes berbasis render.
    expect(TAUTAN_AKUN.map((t) => t.href)).toEqual(["/login", "/daftar"]);
    expect(TAUTAN_AKUN.map((t) => t.label)).toEqual(["Masuk", "Daftar"]);
  });

  it("TIDAK menawarkan Admin untuk penonton biasa", () => {
    // Render server selalu "belum login" (localStorage tak ada di server),
    // jadi ini sekaligus memastikan menu Admin tidak bocor ke HTML publik.
    expect(render("/beranda", MenuAplikasi)).not.toContain('href="/admin"');
  });
});

// ===========================================================================
// PENJAGA BARU 2026-09-22 — navbar liar di halaman depan.
//
// Kenapa ada: HTML produksi `/` terbukti menggambar navbar hitam DI ATAS bar
// cari merah, jadi penonton melihat dua baris kepala lalu satu hilang sendiri
// begitu JavaScript aktif. Sebabnya bukan salah daftar, melainkan BENTUK
// logikanya: denylist "sembunyikan di daftar ini, selain itu tampilkan" →
// nilai `pathname` yang tak dikenali membuat navbar MUNCUL (gagal-terbuka).
// `?? "/"` tidak menolong karena `??` hanya menangkap null/undefined.
// ===========================================================================
const { default: BottomNav } = await import("../app/components/BottomNav");
const { punyaNavbarAtas, punyaNavigasiBawah, TANPA_NAVIGASI_SENGAJA } =
  await import("../lib/navigasi-halaman");
const { readdirSync, readFileSync } = await import("node:fs");
const { join } = await import("node:path");

/** Sidik-jari yang HANYA milik masing-masing navigasi. */
const TANDA_NAVBAR_ATAS = "<header";
const TANDA_NAVIGASI_BAWAH = "fixed bottom-0";

/**
 * Nilai `pathname` yang TERBUKTI menembus penyaring lama (reproduksi
 * 2026-09-22). Keempatnya harus memulangkan navigasi KOSONG: kalau nilainya
 * tak bisa dipercaya, diam jauh lebih baik daripada menggambar kepala kedua.
 */
const NILAI_TAK_TERDUGA = ["", "/index", "/?", "//"];

describe("navigasi tahan nilai pathname yang tak terduga", () => {
  for (const nilai of NILAI_TAK_TERDUGA) {
    it(`navbar atas DIAM untuk pathname ${JSON.stringify(nilai)}`, () => {
      expect(
        render(nilai, TopNav),
        `pathname ${JSON.stringify(nilai)} menggambar navbar — ` +
          `halaman depan akan menampilkan DUA baris kepala lalu berkedip`,
      ).toBe("");
    });

    it(`navigasi bawah DIAM untuk pathname ${JSON.stringify(nilai)}`, () => {
      expect(render(nilai, BottomNav), nilai).toBe("");
    });
  }

  it("aturannya allowlist, bukan denylist — alamat asing DITOLAK", () => {
    // Inti perbaikannya. Kalau suatu saat ini dibalik jadi denylist lagi,
    // bug yang sama kambuh dengan gejala yang sulit dilacak.
    expect(punyaNavbarAtas("/halaman-yang-tidak-pernah-ada")).toBe(false);
    expect(punyaNavigasiBawah("/halaman-yang-tidak-pernah-ada")).toBe(false);
  });

  it("mencocokkan per-segmen, bukan awalan mentah", () => {
    // `/drama` tidak boleh ikut mencocoki `/dramaku`.
    expect(punyaNavbarAtas("/drama")).toBe(true);
    expect(punyaNavbarAtas("/drama/judul-apa-pun")).toBe(true);
    expect(punyaNavbarAtas("/dramaku")).toBe(false);
  });
});

/** Semua route halaman yang benar-benar ADA di disk (bukan daftar tulis-tangan). */
function routeDiDisk(dir = "app", prefix = ""): string[] {
  const hasil: string[] = [];
  for (const entri of readdirSync(dir, { withFileTypes: true })) {
    if (entri.isFile() && entri.name === "page.tsx") hasil.push(prefix || "/");
    if (!entri.isDirectory() || entri.name === "api") continue;
    // Route group `(nama)` tidak ikut jadi bagian alamat.
    const potongan = entri.name.startsWith("(") ? "" : `/${entri.name}`;
    hasil.push(...routeDiDisk(join(dir, entri.name), prefix + potongan));
  }
  return hasil;
}

/** Ganti `[id]` jadi nilai contoh supaya bisa diuji sebagai alamat sungguhan. */
const contohAlamat = (route: string) =>
  route.replace(/\[\.\.\.[^\]]+\]/g, "contoh").replace(/\[[^\]]+\]/g, "contoh");

describe("TIAP halaman di disk punya navigasi, atau alasan tertulis", () => {
  const routes = routeDiDisk().sort();

  it("menemukan seluruh halaman (jaring pengaman penyusur itu sendiri)", () => {
    // Kalau penyusurnya rusak dan memulangkan daftar kosong, seluruh tes di
    // bawah lulus tanpa memeriksa apa pun — justru kegagalan paling senyap.
    expect(routes.length).toBeGreaterThanOrEqual(19);
    expect(routes).toContain("/");
    expect(routes).toContain("/beranda");
    expect(routes).toContain("/watch/[id]/[ep]");
  });

  for (const route of routeDiDisk().sort()) {
    it(`${route} — navigasinya jelas`, () => {
      const alamat = contohAlamat(route);
      const adaNavbar = punyaNavbarAtas(alamat);
      const adaBawah = punyaNavigasiBawah(alamat);

      if (!adaNavbar && !adaBawah) {
        // Tak punya navigasi bawaan sama sekali → WAJIB ada alasan tertulis.
        // Tanpa pagar ini, halaman BARU bisa tayang tanpa navigasi apa pun di
        // layar komputer, tanpa satu pun error.
        expect(
          TANPA_NAVIGASI_SENGAJA[route],
          `${route} tidak punya navigasi bawaan dan tidak terdaftar di ` +
            `TANPA_NAVIGASI_SENGAJA (lib/navigasi-halaman.ts). Kalau memang ` +
            `sengaja, tulis alasannya di situ; kalau tidak, tambahkan akarnya ` +
            `ke AKAR_BERNAVBAR_ATAS — halaman ini sekarang tanpa navigasi ` +
            `sama sekali di layar komputer`,
        ).toBeTruthy();
      }

      // Komponen SUNGGUHAN harus sepakat dengan aturannya — bukan cuma
      // aturannya yang diuji terhadap dirinya sendiri.
      const htmlAtas = render(alamat, TopNav);
      expect(htmlAtas.includes(TANDA_NAVBAR_ATAS), `navbar atas di ${route}`).toBe(
        adaNavbar,
      );
      const htmlBawah = render(alamat, BottomNav);
      expect(
        htmlBawah.includes(TANDA_NAVIGASI_BAWAH),
        `navigasi bawah di ${route}`,
      ).toBe(adaBawah);
    });
  }
});

describe("perilaku 19 halaman tidak berubah dari yang diukur di produksi", () => {
  // Diukur satu per satu dari HTML produksi 2026-09-22 SEBELUM perbaikan —
  // satu-satunya yang sengaja BERUBAH adalah `/` (itulah bug-nya).
  const DIUKUR_BERNAVBAR = [
    "/shorts",
    "/playly",
    "/my-list",
    "/profile",
    "/history",
    "/video-eksternal",
    "/lupa-password",
    "/admin",
    "/admin/settings/playly",
    "/drama/contoh",
  ];
  const DIUKUR_TANPA_NAVBAR = ["/login", "/daftar", "/beranda", "/discover"];

  for (const alamat of DIUKUR_BERNAVBAR) {
    it(`${alamat} TETAP bernavbar seperti sebelumnya`, () => {
      expect(punyaNavbarAtas(alamat), alamat).toBe(true);
    });
  }
  for (const alamat of DIUKUR_TANPA_NAVBAR) {
    it(`${alamat} TETAP tanpa navbar seperti sebelumnya`, () => {
      expect(punyaNavbarAtas(alamat), alamat).toBe(false);
    });
  }

  it("HANYA `/` yang sengaja berubah — navbar liarnya hilang", () => {
    expect(punyaNavbarAtas("/")).toBe(false);
    // Di HP, bar bawah halaman depan juga berhenti berkedip.
    expect(punyaNavigasiBawah("/")).toBe(false);
  });
});

// ===========================================================================
// PENJAGA 2026-09-22 — dua kotak cari WAJIB bertulisan sama.
//
// Kenapa ada: situs punya dua kotak cari (lebar di bar merah, kecil di navbar
// hitam) yang berperilaku sama — keduanya melempar ke /discover. Tulisannya
// sudah DUA KALI menyimpang karena ditulis terpisah, dan dua kotak yang sama
// dengan tulisan beda terbaca seperti dua situs berbeda.
// ===========================================================================
const { TEKS_KOTAK_CARI } = await import(
  "../app/components/beranda/SearchBar"
);

describe("tulisan kotak cari", () => {
  it("kotak cari kecil di navbar memakai tulisan yang SAMA", () => {
    // Diperiksa dari HTML yang benar-benar dirender, bukan dari konstantanya
    // saja — menulis ulang teksnya langsung di TopNav akan lolos kalau yang
    // diuji cuma nilai konstanta.
    const html = render("/shorts", TopNav);
    expect(html).toContain(`placeholder="${TEKS_KOTAK_CARI}"`);
  });

  it("tulisan lama TIDAK tertinggal di mana pun", () => {
    expect(render("/shorts", TopNav)).not.toContain("Cari drama, kategori");
  });

  it("kotaknya tetap kotak PENCARIAN, bukan kolom biasa", () => {
    // Pagar fungsi: tulisan boleh diubah owner kapan saja, tapi penanda
    // pencarian tak boleh ikut hilang (pembaca layar & tombol hapus browser).
    expect(render("/shorts", TopNav)).toContain('type="search"');
  });
});

// ===========================================================================
// PENJAGA 2026-09-22 (putaran kedua) — halaman 404 dan sumber tunggal.
//
// Kenapa ada: tinjauan hari yang sama menemukan bahwa pembalikan denylist →
// allowlist membuat halaman 404 kehilangan SELURUH navigasi bawaan. Alamat
// yang tidak punya halaman tidak cocok dengan akar mana pun, jadi `TopNav`
// dan `BottomNav` sama-sama diam di sana. Terukur di produksi: /tautan-basi-uji
// balas 404 dengan nol navbar dan nol bar bawah.
//
// PRE-MORTEM rencana hari itu sudah menulis persis risiko ini ("allowlist
// melewatkan satu halaman → kehilangan navigasinya, senyap"), tapi penyusur
// disk di atas cuma memungut berkas bernama `page.tsx` — dan `not-found.tsx`
// bukan `page.tsx`, jadi lolos. Pelajaran: penyusur berbasis nama berkas hanya
// menjaga yang namanya kamu sebut.
// ===========================================================================
const { default: NotFound } = await import("../app/not-found");

describe("halaman 404 tetap punya jalan ke seluruh situs", () => {
  const html = renderToStaticMarkup(createElement(NotFound));

  it("membawa tombol menu berisi seluruh tujuan", () => {
    expect(
      html,
      "halaman 404 tanpa tombol menu: penonton nyasar tak bisa mencapai " +
        "Shorts/Playly/My List/Profile dari sini, dan TopNav memang diam di " +
        "alamat asing sejak penyaringnya jadi allowlist",
    ).toContain('aria-label="Menu halaman"');
  });

  it("membawa identitas situs", () => {
    expect(html).toContain('alt="DramaKu"');
  });

  it("tetap menyediakan dua jalan pulang di badan halaman", () => {
    // Ini sudah ada sebelumnya — dijaga supaya tidak ikut hilang saat kepala
    // situs ditambahkan di atasnya.
    expect(html).toContain('href="/beranda"');
    expect(html).toContain('href="/discover"');
  });

  it("TIDAK bergantung pada pembacaan katalog", () => {
    // Halaman error tidak boleh butuh database — kalau databasenya justru yang
    // sedang bermasalah, 404-nya ikut gagal. Bar cari merah butuh
    // `buildNavMenus(dramas)`, jadi SENGAJA tidak dipakai di sini.
    //
    // Diperiksa dari IMPOR & bentuk fungsinya, bukan dari sebutan teks:
    // versi pertama tes ini mencocokkan kata "buildNavMenus" dan MERAH karena
    // kena komentar di berkas itu yang justru menjelaskan kenapa fungsi itu
    // TIDAK dipakai. Pelajaran: memeriksa kode dengan cocok-teks ikut
    // menangkap komentar.
    const sumber = readFileSync("app/not-found.tsx", "utf-8");
    const impor = sumber.match(/^import[\s\S]*?;$/gm)?.join(" ") ?? "";
    expect(impor).not.toMatch(/lib\/(dramas|nav-katalog|store)/);
    // Komponen yang mengambil data harus `async`; yang ini tidak boleh.
    expect(sumber).toContain("export default function NotFound()");
  });
});

describe("posisi menempel kepala situs punya SATU sumber", () => {
  // Nilai ini tadinya ditulis tangan di empat berkas. Beda 56px (`top-14` vs
  // `top-0`) membuat bar cari bergeser tepat saat kerangka pemuatan ditukar
  // isi sungguhan — poster yang mau diklik penonton ikut melompat.
  const PEMAKAI = [
    "app/components/DramaBrowser.tsx",
    "app/components/beranda/CatalogBrowser.tsx",
    "app/components/beranda/PublicTopBars.tsx",
    "app/components/beranda/KerangkaKepalaKatalog.tsx",
  ];

  for (const berkas of PEMAKAI) {
    it(`${berkas} memakai konstantanya, bukan teks tulis-tangan`, () => {
      const sumber = readFileSync(berkas, "utf-8");
      expect(sumber).toContain("KELAS_MENEMPEL_KEPALA");
      expect(
        sumber,
        `${berkas} masih menulis kelas menempel sendiri — kalau salah satu ` +
          `pemakai bergeser, bar cari melompat saat isi halaman masuk`,
      ).not.toMatch(/className="sticky top-/);
    });
  }
});

describe("tulisan kotak cari tidak bisa basi di tiruan tes", () => {
  it("nilai konstantanya dipatok", () => {
    // tests/kerangka-discover.test.ts me-mock SearchBar sehingga HARUS menulis
    // teks ini dengan tangan. Patokan di sini membuat tiruan itu tak bisa
    // diam-diam berbeda dari aslinya.
    expect(TEKS_KOTAK_CARI).toBe("Cari film di DramaKu");
  });
});

describe("susunan kepala katalog punya SATU sumber", () => {
  // ⚠️ Lubang ini ketahuan dari mutation check: `chromeKatalog()` diberi
  // komentar "sumbernya sengaja dikunci satu", tapi TAK ADA satu pun tes yang
  // menjaganya — mengembalikan susunan tulis-tangan di `CatalogBrowser` lolos
  // hijau. Klaim tanpa penjaga cuma niat, bukan pagar.
  const PEMAKAI = [
    "app/components/DramaBrowser.tsx",
    "app/components/beranda/CatalogBrowser.tsx",
    "app/components/beranda/KerangkaKepalaKatalog.tsx",
  ];

  for (const berkas of PEMAKAI) {
    it(`${berkas} memakai chromeKatalog(), bukan susunan sendiri`, () => {
      const sumber = readFileSync(berkas, "utf-8");
      expect(sumber).toContain("chromeKatalog(menus)");
      expect(
        sumber,
        `${berkas} merakit susunan kepalanya sendiri — kalau salah satu ` +
          `pemakai bertambah/berkurang tombol, halaman terasa seperti situs ` +
          `berbeda dan kepala situs melompat saat isi halaman masuk`,
      ).not.toMatch(/brand:\s*<MenuAplikasi/);
    });
  }
});
