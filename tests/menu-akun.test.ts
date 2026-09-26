// Penjaga MENU AKUN (avatar) — owner 2026-09-26.
//
// Kenapa perlu penjaga sendiri: "Profile" dilepas dari baris menu navbar dan
// dari menu garis-tiga beranda pada hari yang sama. Satu-satunya jalan yang
// tersisa ke halaman Profil di layar komputer adalah menu di balik avatar ini
// (`BottomNav` cuma muncul di HP, `md:hidden`). Kalau komponennya hilang,
// salah alamat, atau tidak pernah DIPASANG, penonton kehilangan halaman
// Profil-nya tanpa satu pun error — persis jenis kerusakan senyap yang sudah
// dua kali terjadi di repo ini (tombol Unduh 2026-09-23, navbar liar
// 2026-09-22).
//
// Isi dropdown Radix TIDAK tergambar di HTML sampai menunya dibuka, jadi
// alamat & saringan admin diperiksa dari DAFTARNYA — tes berbasis render
// terbukti meloloskan salah alamat pada daftar sejenis (KepalaKatalog,
// 2026-09-21).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { TUJUAN_AKUN, tujuanAkunUntuk } from "../app/components/MenuAkun";

describe("isi menu akun", () => {
  it("membawa Profile, Riwayat, dan Admin dengan alamat yang benar", () => {
    expect(TUJUAN_AKUN.map((t) => t.href)).toEqual([
      "/profile",
      "/history",
      "/admin",
    ]);
    expect(TUJUAN_AKUN.map((t) => t.label)).toEqual([
      "Profile",
      "Riwayat",
      "Admin",
    ]);
  });

  it("menandai Admin sebagai khusus admin", () => {
    expect(TUJUAN_AKUN.find((t) => t.href === "/admin")?.adminOnly).toBe(true);
  });
});

describe("saringan peran — menu Admin tidak boleh bocor", () => {
  it("penonton biasa TIDAK melihat Admin", () => {
    const untukViewer = tujuanAkunUntuk("viewer").map((t) => t.href);
    expect(untukViewer).toEqual(["/profile", "/history"]);
  });

  it("admin melihat semuanya (pembanding — tanpa ini 'tidak muncul' tak bisa dibedakan dari 'tak pernah ada')", () => {
    expect(tujuanAkunUntuk("admin").map((t) => t.href)).toEqual([
      "/profile",
      "/history",
      "/admin",
    ]);
  });

  it("peran yang tidak diketahui diperlakukan seperti penonton biasa", () => {
    // Gagal-AMAN: nilai aneh (sesi rusak, data lama) TIDAK boleh membuka Admin.
    expect(tujuanAkunUntuk(undefined).map((t) => t.href)).not.toContain(
      "/admin",
    );
  });
});

// ===========================================================================
// PENJAGA PEMASANGAN — komponennya benar-benar dipakai, bukan cuma ada.
//
// Pelajaran 2026-09-23: `DownloadButton` pernah tayang lengkap dengan 9 tes
// hijau sementara NOL halaman mengimpornya — build, tsc, dan npm test
// semuanya diam, dan sesi berikutnya menuduh Vercel gagal membangun. Tes
// perilaku tidak pernah bertanya "apakah komponennya dipasang?".
// ===========================================================================
const PEMASANG = [
  {
    berkas: "app/components/TopNav.tsx",
    kenapa:
      "navbar hitam halaman film — di sini avatar satu-satunya jalan ke Profil",
  },
  {
    berkas: "app/components/beranda/KepalaKatalog.tsx",
    kenapa:
      "bar merah /beranda & /discover — Profile sudah dilepas dari menu garis-tiga",
  },
];

describe("menu akun benar-benar DIPASANG, bukan cuma dibuat", () => {
  for (const { berkas, kenapa } of PEMASANG) {
    it(`${berkas} mengimpor MenuAkun`, () => {
      const sumber = readFileSync(berkas, "utf-8");
      const impor = sumber.match(/^import[\s\S]*?;$/gm)?.join(" ") ?? "";
      expect(impor, `${berkas} tidak mengimpor MenuAkun — ${kenapa}`).toContain(
        "MenuAkun",
      );
    });

    it(`${berkas} benar-benar merendernya`, () => {
      const sumber = readFileSync(berkas, "utf-8");
      // Dicari sebagai elemen UTUH (`<MenuAkun />`), bukan sekadar kata
      // "MenuAkun": mutasi 2026-09-23 membuktikan `toContain("<Nama")` masih
      // cocok walau namanya diubah jadi `<NamaXX`, sehingga penjaganya palsu.
      expect(sumber, `${berkas} mengimpor tapi tidak merender — ${kenapa}`).toMatch(
        /<MenuAkun\s*\/>/,
      );
    });
  }
});

describe("hook penonton punya SATU sumber", () => {
  // Aturan "siapa yang sedang login" pernah hidup dalam dua salinan (TopNav &
  // KepalaKatalog) dan kini dibutuhkan di tempat ketiga. Dua salinan yang bisa
  // menyimpang berarti satu kepala situs menganggap penonton sudah login
  // sementara yang lain belum — kerusakan yang tak memunculkan error apa pun.
  const PEMAKAI = [
    "app/components/TopNav.tsx",
    "app/components/beranda/KepalaKatalog.tsx",
    "app/components/MenuAkun.tsx",
  ];

  for (const berkas of PEMAKAI) {
    it(`${berkas} memakai usePenonton, bukan salinannya sendiri`, () => {
      const sumber = readFileSync(berkas, "utf-8");
      expect(sumber).toContain("usePenonton");
      expect(
        sumber,
        `${berkas} membaca localStorage sendiri lagi — kembalikan ke ` +
          `app/components/usePenonton.ts supaya tidak ada dua versi`,
      ).not.toContain("readUser()");
    });
  }
});
