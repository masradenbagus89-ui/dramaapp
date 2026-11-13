// Penjaga KESERAGAMAN seluruh kotak cari situs (owner 2026-11-13:
// "telusuri detail lagi semua search harus seragam").
//
// Owner menemukan ketidakseragaman ini satu per satu, lima putaran berturut-
// turut, selalu dari layar — bukan dari kode. Itu tandanya pagar yang kurang:
// tidak ada satu pun tes yang memeriksa bahwa semua permukaan cari memakai
// aturan & perkakas yang SAMA. Berkas ini mengisinya.
//
// Dibaca sebagai TEKS SUMBER, bukan dirender: yang dijaga di sini adalah
// "komponen ini memanggil perkakas bersama", dan itu pertanyaan tentang
// struktur kode — persis yang hilang tiap kali satu kotak cari dibangun
// sendiri-sendiri lalu menyimpang diam-diam.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const baca = (p: string) => readFileSync(p, "utf-8");

/** Semua berkas yang MENYARING daftar dari ketikan orang. */
const PENYARING = [
  "app/components/beranda/HasilPlayly.tsx",
  "app/components/admin/useDaftarAdmin.ts",
  "app/components/admin/PlaylyIsiCepat.tsx",
  "app/components/admin/PlaylyVisibilityManager.tsx",
];

describe("satu aturan pencocokan untuk semua penyaring", () => {
  it("tiap penyaring memakai perkakas bersama lib/pencarian.ts", () => {
    for (const berkas of PENYARING) {
      expect(
        baca(berkas),
        `${berkas} tidak memakai lib/pencarian — kemungkinan menyaring dengan ` +
          `aturannya sendiri, dan aturan sendiri pasti menyimpang`,
      ).toMatch(/from "@\/lib\/pencarian"/);
    }
  });

  it("tak satu pun menyaring sendiri pakai includes/indexOf mentah", () => {
    // Inilah bentuk penyimpangan yang paling mungkin: seseorang menambah
    // kotak cari baru dan menyaringnya dengan `toLowerCase().includes(...)`.
    // Hasilnya terlihat bekerja, tapi aturannya beda dari seluruh situs.
    for (const berkas of [...PENYARING, "app/components/admin/PilihKategori.tsx"]) {
      expect(
        baca(berkas),
        `${berkas} menyaring dengan toLowerCase().includes() — pakai ` +
          `diawaliKetikan/saringDenganKetikan dari lib/pencarian.ts`,
      ).not.toMatch(/toLowerCase\(\)\s*\.\s*includes\(/);
    }
  });

  it("katalog drama memakai diawaliKetikan, bukan pencocokan lama", () => {
    const discover = baca("lib/discover.ts");
    expect(discover).toMatch(/diawaliKetikan\(/);
    // `cocokSemuaKata` sengaja masih ADA di lib/pencarian.ts sebagai jalan
    // pulang kalau owner merasa pencarian terlalu sempit — tapi ia tidak
    // boleh dipakai lagi di jalur pencarian katalog.
    expect(
      discover.replace(/\/\/.*$/gm, ""),
      "lib/discover.ts kembali memakai cocokSemuaKata — dua aturan hidup bersama lagi",
    ).not.toMatch(/cocokSemuaKata\(/);
  });
});

describe("kedua kotak cari situs punya daftar saran", () => {
  // Ketidakseragaman yang owner laporkan di putaran terakhir: mengetik di
  // kotak navbar tidak memunculkan apa-apa, sementara kotak beranda
  // memunculkan daftar saran. Kotak navbar adalah SATU-SATUNYA kotak cari di
  // /film, /katalog, /profile dan seluruh panel admin.
  const KOTAK_CARI = [
    "app/components/beranda/SearchBar.tsx",
    "app/components/TopNav.tsx",
  ];

  it("keduanya memakai hook saran yang SAMA", () => {
    for (const berkas of KOTAK_CARI) {
      expect(
        baca(berkas),
        `${berkas} tidak memakai useDaftarSaran — logika sorotan/keyboard/` +
          `klik-di-luar disalin, dan salinan pasti menyimpang`,
      ).toMatch(/useDaftarSaran\(/);
    }
  });

  it("keduanya menggambar DaftarSaran yang sama", () => {
    for (const berkas of KOTAK_CARI) {
      expect(baca(berkas)).toMatch(/<DaftarSaran/);
    }
  });

  it("logika saran hanya ditulis SEKALI", () => {
    // `pilihSaran` adalah inti pemilihan baris saran. Ia boleh dipanggil dari
    // hook bersama saja — kalau muncul lagi di salah satu kotak cari, berarti
    // ada yang merakit daftarnya sendiri.
    for (const berkas of KOTAK_CARI) {
      expect(
        baca(berkas),
        `${berkas} memanggil pilihSaran langsung — seharusnya lewat useDaftarSaran`,
      ).not.toMatch(/pilihSaran\(/);
    }
    expect(baca("app/components/beranda/useDaftarSaran.ts")).toMatch(/pilihSaran\(/);
  });

  it("navbar mengambil indeksnya sendiri, dan hanya saat dibutuhkan", () => {
    const topnav = baca("app/components/TopNav.tsx");
    expect(topnav).toMatch(/\/api\/saran/);
    // Pagar biaya: pengambilan HARUS dijaga ambang huruf. Tanpa ini navbar
    // menembak katalog di tiap halaman — termasuk panel admin yang tak pernah
    // memakainya.
    expect(
      topnav,
      "pengambilan indeks tidak dijaga MIN_HURUF_SARAN — navbar akan menembak " +
        "katalog lebih sering daripada perlu",
    ).toMatch(/MIN_HURUF_SARAN/);
  });

  it("endpoint saran memakai perakit indeks yang sama dengan halaman publik", () => {
    // Kalau endpoint merakit bentuknya sendiri, saran di navbar dan di
    // beranda bisa berbeda isi untuk ketikan yang sama.
    expect(baca("app/api/saran/route.ts")).toMatch(/rakitIndeksSaran\(/);
  });
});
