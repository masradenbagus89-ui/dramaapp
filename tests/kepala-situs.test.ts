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
