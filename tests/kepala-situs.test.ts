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
const { readdirSync } = await import("node:fs");
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
