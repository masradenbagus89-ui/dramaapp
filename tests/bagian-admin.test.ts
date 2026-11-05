// Penjaga NAVIGASI PANEL ADMIN — owner 2026-11-05: "ketika klik dashboard,
// tambah drama, daftar drama, admin, 2FA semua kalau di scroll scroll sudah
// jadi satu hanya awalnya saja yang beda".
//
// Akarnya: `/admin` adalah SATU halaman berisi enam bagian bertumpuk, dan menu
// sidebar cuma meloncat ke posisi. Sejak perbaikan ini, satu menu = satu
// tampilan.
//
// ⚠️ Yang dijaga di sini adalah hal-hal yang kalau putus TIDAK memunculkan
// error apa pun — cuma menu yang diklik lalu tidak menampilkan apa-apa.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  BAGIAN_BAWAAN,
  BAGIAN_SAH,
  JUDUL_BAGIAN,
  KETERANGAN_BAGIAN,
  alamatBagian,
  parseBagianAdmin,
  type BagianAdmin,
} from "../lib/bagian-admin";

const SIDEBAR = readFileSync("app/components/admin/AdminSidebar.tsx", "utf8");
const HALAMAN = readFileSync("app/admin/page.tsx", "utf8");

describe("aturan bagian admin (fungsi murni)", () => {
  it("menerima bentuk alamat apa pun — '#x', 'x', '/admin#x'", () => {
    expect(parseBagianAdmin("#tambah")).toBe("tambah");
    expect(parseBagianAdmin("tambah")).toBe("tambah");
    expect(parseBagianAdmin("/admin#tambah")).toBe("tambah");
    expect(parseBagianAdmin("#KELOLA-ADMIN")).toBe("kelola-admin");
    expect(parseBagianAdmin(" #daftar ")).toBe("daftar");
  });

  it("alamat ngawur jatuh ke bagian bawaan, bukan layar kosong", () => {
    // Layar kosong terbaca seperti panel rusak. Lebih baik membuka dashboard.
    for (const ngawur of ["#ngawur", "", null, undefined, "#", "/admin"]) {
      expect(parseBagianAdmin(ngawur)).toBe(BAGIAN_BAWAAN);
    }
    expect(BAGIAN_BAWAAN).toBe("dashboard");
  });

  it("tiap bagian punya judul & keterangannya", () => {
    // Kepala bagian inilah yang membuat admin tahu sedang di mana. Bagian baru
    // yang lupa diberi judul akan menggambar kepala halaman kosong.
    for (const b of BAGIAN_SAH) {
      expect(JUDUL_BAGIAN[b], `judul untuk ${b}`).toBeTruthy();
      expect(KETERANGAN_BAGIAN[b], `keterangan untuk ${b}`).toBeTruthy();
    }
  });
});

describe("menu sidebar dan isi halaman tidak boleh menyimpang", () => {
  it("setiap menu ber-hash menunjuk bagian yang BENAR-BENAR dirender", () => {
    // 🪤 Inilah bug yang ditemukan saat perbaikan ini dibuat: menu
    // "Keamanan (2FA)" menunjuk `#keamanan`, tapi NOL elemen di halaman punya
    // id itu — diklik pun tidak membawa ke mana-mana, tanpa error apa pun.
    // Tes ini menolak menu yang menunjuk bagian yang tak pernah digambar.
    const hashMenu = [...SIDEBAR.matchAll(/href: "\/admin#([a-z-]+)"/g)].map(
      (m) => m[1],
    );
    expect(hashMenu.length, "menu ber-hash tidak terbaca dari sidebar").toBeGreaterThan(3);

    for (const h of hashMenu) {
      expect(BAGIAN_SAH, `menu /admin#${h} bukan bagian yang sah`).toContain(
        h as BagianAdmin,
      );
      expect(
        HALAMAN,
        `menu /admin#${h} tidak punya cabang render di app/admin/page.tsx — ` +
          `diklik tidak akan menampilkan apa pun`,
      ).toContain(`bagian === "${h}"`);
    }
  });

  it("alamatBagian sepakat dengan ejaan menu di sidebar", () => {
    // Satu salah ketik di salah satu sisi = menu yang membuka bagian bawaan
    // terus-menerus, dan itu terbaca seperti menu mati.
    for (const b of BAGIAN_SAH) {
      if (!SIDEBAR.includes(`/admin#${b}`)) continue;
      expect(SIDEBAR).toContain(`href: "${alamatBagian(b)}"`);
    }
  });
});

describe("dua jebakan urutan yang sudah ditemukan", () => {
  it("Edit di Daftar Drama MEMBUKA bagian form sebelum mengisinya", () => {
    // `loadDramaToForm` menggulung ke elemen #tambah. Kalau bagian form belum
    // dibuka, elemen itu masih tersembunyi — menggulung ke sesuatu yang tak
    // terlihat tidak menghasilkan apa pun, dan tombol Edit terasa mati.
    const blok = HALAMAN.slice(HALAMAN.indexOf("onEdit="));
    const posBuka = blok.indexOf('bukaBagian("tambah")');
    const posIsi = blok.indexOf("loadDramaToForm(d)");

    expect(posBuka, "Edit tidak membuka bagian form").toBeGreaterThan(-1);
    expect(posIsi, "Edit tidak mengisi form").toBeGreaterThan(-1);
    expect(posBuka, "bukaBagian HARUS mendahului loadDramaToForm").toBeLessThan(
      posIsi,
    );
  });

  it("form Tambah Drama DISEMBUNYIKAN, bukan dilepas dari halaman", () => {
    // Sebagian isian form (mis. berkas poster yang sudah dipilih) tidak ikut
    // tersimpan di state halaman. Melepas form dari DOM membuat isian itu
    // hilang diam-diam tiap admin menengok bagian lain.
    expect(HALAMAN).toMatch(/bagian === "tambah" \? undefined : "hidden"/);
    expect(
      HALAMAN,
      'form tidak boleh dirender dengan `bagian === "tambah" && <DramaForm',
    ).not.toMatch(/bagian === "tambah" && \s*<DramaForm/);
  });
});
