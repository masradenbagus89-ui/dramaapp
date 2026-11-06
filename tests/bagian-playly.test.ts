// Penjaga NAVIGASI HALAMAN VIDEO PLAYLY — owner 2026-11-06: "sidebar kiri
// video playly terlalu panjang kamu jadikan divider — IMDB / Link download /
// Daftar video Playly".
//
// Akarnya: `/admin/videos/playly` adalah SATU halaman berisi tiga panel besar
// bertumpuk, dan sidebar cuma punya satu baris untuk ketiganya. Sejak
// perbaikan ini, satu menu = satu panel.
//
// ⚠️ Yang dijaga di sini adalah hal-hal yang kalau putus TIDAK memunculkan
// error apa pun — cuma menu yang diklik lalu tidak menampilkan apa-apa, atau
// isian yang hilang diam-diam.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  BAGIAN_PLAYLY_BAWAAN,
  BAGIAN_PLAYLY_SAH,
  JUDUL_BAGIAN_PLAYLY,
  KETERANGAN_BAGIAN_PLAYLY,
  RUTE_PLAYLY,
  alamatBagianPlayly,
  parseBagianPlayly,
  type BagianPlayly,
} from "../lib/bagian-playly";

const SIDEBAR = readFileSync("app/components/admin/AdminSidebar.tsx", "utf8");
const PENAMPIL = readFileSync(
  "app/components/admin/PlaylyBagianAktif.tsx",
  "utf8",
);
const HALAMAN = readFileSync("app/admin/videos/playly/page.tsx", "utf8");

describe("aturan bagian Video Playly (fungsi murni)", () => {
  it("menerima bentuk alamat apa pun — '#x', 'x', alamat penuh", () => {
    expect(parseBagianPlayly("#unduhan")).toBe("unduhan");
    expect(parseBagianPlayly("unduhan")).toBe("unduhan");
    expect(parseBagianPlayly(`${RUTE_PLAYLY}#unduhan`)).toBe("unduhan");
    expect(parseBagianPlayly("#IMDB")).toBe("imdb");
    expect(parseBagianPlayly(" #daftar ")).toBe("daftar");
  });

  it("alamat ngawur jatuh ke bagian bawaan, bukan layar kosong", () => {
    // Layar kosong terbaca seperti halaman rusak. Lebih baik membuka panel
    // yang berisi.
    for (const ngawur of ["#ngawur", "", null, undefined, "#", RUTE_PLAYLY]) {
      expect(parseBagianPlayly(ngawur)).toBe(BAGIAN_PLAYLY_BAWAAN);
    }
    expect(BAGIAN_PLAYLY_BAWAAN).toBe("imdb");
  });

  it("tiap bagian punya judul & keterangannya", () => {
    // Kepala bagian inilah yang membuat admin tahu sedang di panel mana.
    // Bagian baru yang lupa diberi judul menggambar kepala halaman kosong.
    for (const b of BAGIAN_PLAYLY_SAH) {
      expect(JUDUL_BAGIAN_PLAYLY[b], `judul untuk ${b}`).toBeTruthy();
      expect(KETERANGAN_BAGIAN_PLAYLY[b], `keterangan untuk ${b}`).toBeTruthy();
    }
  });
});

describe("menu sidebar dan isi halaman tidak boleh menyimpang", () => {
  it("grup 'Video Playly' punya satu baris menu per bagian yang sah", () => {
    // 🪤 Menu yang menunjuk bagian tak dikenal diam-diam membuka bagian
    // bawaan terus-menerus — terbaca seperti menu mati, tanpa satu pun error.
    const hashMenu = [
      ...SIDEBAR.matchAll(/\$\{RUTE_PLAYLY\}#([a-z-]+)/g),
    ].map((m) => m[1]);

    expect(
      hashMenu.length,
      "menu bagian Playly tidak terbaca dari sidebar",
    ).toBe(BAGIAN_PLAYLY_SAH.length);

    for (const h of hashMenu) {
      expect(
        BAGIAN_PLAYLY_SAH,
        `menu ${RUTE_PLAYLY}#${h} bukan bagian yang sah`,
      ).toContain(h as BagianPlayly);
    }

    // Setiap bagian yang sah WAJIB punya menunya — bagian yang ada di kode
    // tapi tak punya pintu masuk hanya bisa dibuka lewat ketik alamat manual.
    for (const b of BAGIAN_PLAYLY_SAH) {
      expect(hashMenu, `bagian "${b}" tidak punya menu di sidebar`).toContain(b);
    }
  });

  it("setiap bagian BENAR-BENAR dirender oleh penampilnya", () => {
    // Nama prop di penampil = nama bagian. Bagian yang tidak punya propnya
    // akan menggambar kekosongan saat menunya diklik.
    for (const b of BAGIAN_PLAYLY_SAH) {
      expect(
        HALAMAN,
        `halaman tidak mengirim panel untuk bagian "${b}" ke PlaylyBagianAktif`,
      ).toMatch(new RegExp(`${b}=\\{`));
    }
    expect(HALAMAN).toContain("<PlaylyBagianAktif");
  });

  it("alamatBagianPlayly sepakat dengan ejaan menu di sidebar", () => {
    // Satu salah ketik di salah satu sisi = menu yang membuka bagian bawaan
    // terus-menerus, dan itu terbaca seperti menu mati.
    for (const b of BAGIAN_PLAYLY_SAH) {
      expect(alamatBagianPlayly(b)).toBe(`${RUTE_PLAYLY}#${b}`);
    }
    expect(SIDEBAR, "sidebar tidak memakai RUTE_PLAYLY").toContain(
      "RUTE_PLAYLY",
    );
  });
});

describe("jebakan yang sudah terbukti di panel admin lain", () => {
  it("panel yang tidak dibuka DISEMBUNYIKAN, bukan dilepas dari halaman", () => {
    // 🪤 Isian link download yang belum ditekan Simpan hidup di memori
    // komponennya sendiri (PlaylyUnduhanManager, state `draft`). Melepas
    // panel dari DOM membuat isian itu hilang DIAM-DIAM tiap admin menengok
    // menu lain — tanpa error, tanpa peringatan. Jebakan yang persis sama
    // sudah pernah kena di form Tambah Drama (tests/bagian-admin.test.ts).
    expect(PENAMPIL).toMatch(/bagian === nama \? undefined : "hidden"/);
    expect(
      PENAMPIL,
      "panel tidak boleh dirender dengan `bagian === nama && ...`",
    ).not.toMatch(/bagian === nama &&/);
  });

  it("penampil mendengarkan 'click', bukan cuma 'hashchange'", () => {
    // Mengklik menu yang hash-nya SAMA dengan yang sedang dibuka tidak memicu
    // `hashchange`. Tanpa penangkap `click`, menu itu terasa tidak merespons.
    expect(PENAMPIL).toContain('addEventListener("hashchange"');
    expect(PENAMPIL).toContain('addEventListener("click"');
  });
});
