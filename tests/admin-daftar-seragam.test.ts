// Penjaga KESERAGAMAN daftar panel admin (owner 2026-11-09: "telusuri tab mana
// saja yang perlu search dan pagination kamu seragamkan").
//
// Yang diuji di sini BUKAN aturan cari/halamannya — itu sudah punya tes
// sendiri yang tidak butuh DOM (tests/pencarian.test.ts, tests/paginasi.test.ts).
// Yang diuji: apakah daftar-daftarnya benar-benar MEMAKAI aturan itu.
//
// Kenapa lapisan ini perlu: kesalahan yang paling mudah terjadi saat memasang
// paginasi adalah tetap menggambar `dramas.map(...)` (daftar penuh) sambil
// memasang tombol halaman di bawahnya. Hasilnya tombol halaman yang tidak
// mengubah apa pun — nol error, nol tes merah, dan baru ketahuan kalau ada
// yang benar-benar mengklik. Tes ini menghitung baris yang DIGAMBAR.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UKURAN_BAWAAN } from "../lib/paginasi";
import type { Drama } from "../lib/types";

const { default: DramaList } = await import(
  "../app/components/admin/DramaList"
);

/** Katalog palsu yang SENGAJA lebih panjang dari satu halaman. */
function katalog(jumlah: number): Drama[] {
  return Array.from({ length: jumlah }, (_, i) => ({
    id: `drama-${i + 1}`,
    title: `Drama Nomor ${i + 1}`,
    category: "Action",
    episodes: 10,
    views: "1.0K",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
  })) as Drama[];
}

function render(dramas: Drama[]): string {
  return renderToStaticMarkup(
    createElement(DramaList, {
      dramas,
      onEdit: () => {},
      onDelete: () => {},
    }),
  );
}

/** Berapa baris drama yang benar-benar tergambar. */
function jumlahBaris(html: string): number {
  return (html.match(/Drama Nomor \d+/g) ?? []).length;
}

describe("DramaList — kotak cari & kontrol halaman benar-benar terpasang", () => {
  it("menggambar kotak cari", () => {
    const html = render(katalog(5));
    expect(html).toContain("Cari judul, kategori, atau ID");
  });

  it("daftar panjang DIPOTONG, bukan digambar seluruhnya", () => {
    // Inti tes ini. Kalau komponen masih memetakan daftar penuh, angkanya
    // akan 120 dan tombol halaman di bawahnya cuma hiasan.
    const html = render(katalog(120));
    expect(jumlahBaris(html)).toBe(UKURAN_BAWAAN);
    expect(html).not.toContain("Drama Nomor 120");
  });

  it("daftar pendek digambar utuh, tanpa dipotong", () => {
    const html = render(katalog(7));
    expect(jumlahBaris(html)).toBe(7);
  });

  it("menggambar kontrol halaman saat ada isinya", () => {
    const html = render(katalog(120));
    expect(html).toMatch(/Sebelumnya|Berikutnya/i);
  });

  it("katalog kosong: pesan ajakan, BUKAN kontrol halaman", () => {
    // "Hal 1 dari 1" di atas daftar kosong terbaca seperti panel rusak.
    const html = render([]);
    expect(html).toContain("Belum ada drama");
    expect(html).not.toMatch(/Sebelumnya|Berikutnya/i);
  });

  it("jumlah total tetap dilaporkan apa adanya", () => {
    // Angkanya harus dari daftar PENUH, bukan dari yang tergambar — kalau
    // dibaca dari halaman yang sedang tampil, admin akan mengira katalognya
    // menyusut jadi 50.
    expect(render(katalog(120))).toContain("120 total");
  });
});

describe("daftar admin memakai SATU aturan yang sama", () => {
  // Penjaga keseragaman: ketiga daftar panjang wajib memakai hook & komponen
  // bersama, bukan menyalin polanya. Salinan yang menyimpang persis masalah
  // yang perintah "seragamkan" ini minta diselesaikan.
  const wajibSeragam = [
    "app/components/admin/DramaList.tsx",
    "app/components/admin/PlaylyUnduhanManager.tsx",
    "app/components/admin/PlaylyVideoPicker.tsx",
  ];

  it("ketiganya memakai useDaftarAdmin + KotakCariDaftar + PaginasiDaftar", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    for (const berkas of wajibSeragam) {
      const isi = readFileSync(join(process.cwd(), berkas), "utf-8");
      expect(isi, `${berkas} tidak memakai useDaftarAdmin`).toContain(
        "useDaftarAdmin",
      );
      expect(isi, `${berkas} tidak memakai KotakCariDaftar`).toContain(
        "KotakCariDaftar",
      );
      expect(isi, `${berkas} tidak memakai PaginasiDaftar`).toContain(
        "PaginasiDaftar",
      );
    }
  });

  it("tab IMDb punya kotak cari — PENJAGA SALAH-KLASIFIKASI 2026-11-09", () => {
    // Panel ini (500 judul) sempat dilaporkan "sudah punya search" padahal
    // belum: yang terhitung ternyata teks "Cari di IMDb" di komentar dan
    // tombol per-baris, bukan kotak cari daftar. Owner yang menangkapnya.
    //
    // Dikunci lewat KotakCariDaftar — komponen, bukan kata "cari" — supaya
    // kalimat apa pun di komentar tidak bisa lagi lolos sebagai bukti.
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const isi = readFileSync(
      "app/components/admin/PlaylyVisibilityManager.tsx",
      "utf-8",
    );
    expect(isi).toContain("KotakCariDaftar");
    expect(isi).toContain("saringDenganKetikan");
  });

  it("saringan tombol dihitung SEBELUM ketikan di tab IMDb", () => {
    // Urutannya menentukan arti angka di tombol saringan ("Belum ada IMDb 83").
    // Kalau ketikan ikut mengecilkannya, angka itu berubah makna dari "sisa
    // pekerjaan" jadi "jumlah hasil cari" — tanpa ada yang terlihat salah.
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const isi = readFileSync(
      "app/components/admin/PlaylyVisibilityManager.tsx",
      "utf-8",
    );
    const posSaringan = isi.indexOf("const videoSaringan");
    const posKetikan = isi.indexOf("saringDenganKetikan(videoSaringan");
    expect(posSaringan).toBeGreaterThan(-1);
    expect(posKetikan).toBeGreaterThan(posSaringan);
  });
});
