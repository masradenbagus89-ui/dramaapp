// Penjaga BARIS KONTROL PEMUTAR FILM (/tonton) DI LAYAR HP — owner 2026-11-26,
// dari dua tangkapan layar: baris yang sama UTUH di laptop tapi TERPOTONG di HP.
//
// Bug yang dijaga di sini LOLOS KE PRODUKSI dan rusaknya SENYAP — nol error,
// nol gejala di tes lain: baris kontrol adalah satu jalur `flex` yang tidak
// boleh patah, dan tombolnya tidak bisa menyusut. Begitu total lebar isinya
// (7 tombol 36px + angka durasi) melewati lebar layar HP, yang paling kanan
// terdorong KELUAR layar: tombol **layar penuh** dan menu titik tiga hilang
// tanpa jejak, menyisakan PiP menggantung di tepi. Penonton HP kehilangan
// layar penuh — fungsi yang dipakai hampir tiap kali menonton.
//
// Keputusan owner: yang dikorbankan **PiP**, bukan layar penuh. PiP ("Putar di
// Pop-up" = video mengambang di jendela kecil sambil membuka aplikasi lain)
// paling jarang dipakai di HP dan banyak browser HP tak mendukungnya.
//
// Dua arah dijaga sekaligus, karena memperbaiki satu sisi gampang merusak
// sisi lain tanpa ada yang melapor:
//   A. PiP WAJIB tersembunyi di layar kecil (`hidden`) dan muncul lagi dari
//      breakpoint `sm` ke atas — kalau `hidden` lepas, baris meluber lagi;
//   B. layar penuh WAJIB TETAP tampil di HP — kalau suatu saat ikut diberi
//      `hidden`, bug aslinya kembali persis seperti semula.
//
// ⚠️ Komentar dibuang dulu sebelum diperiksa (pola yang sama dipakai
// tests/action-rail-tampil.test.ts:66). Tanpa itu, komentar di PlaylyPlayer.tsx
// yang MENYEBUT nama kelas membuat tes ini hijau walau kelasnya sudah hilang
// dari kode sungguhan — penjaga yang selalu hijau sama saja dengan tak ada.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const MENTAH = readFileSync("app/components/player/PlaylyPlayer.tsx", "utf8");

/** Isi berkas tanpa komentar blok `/* … *\/`, supaya yang diperiksa hanya kode. */
const KODE = MENTAH.split("/*")
  .map((b, i) => (i === 0 ? b : b.split("*/").slice(1).join("*/")))
  .join("");

/**
 * Potong satu elemen `<button>` yang memuat `penanda` (dipakai aria-label-nya).
 * Mengembalikan teks dari `<button` terdekat di sebelah kiri sampai `</button>`.
 */
function blokTombol(penanda: string): string {
  const i = KODE.indexOf(penanda);
  expect(i, `penanda "${penanda}" tidak ada di kode PlaylyPlayer`).toBeGreaterThan(-1);
  const mulai = KODE.lastIndexOf("<button", i);
  const akhir = KODE.indexOf("</button>", i);
  expect(mulai).toBeGreaterThan(-1);
  expect(akhir).toBeGreaterThan(mulai);
  return KODE.slice(mulai, akhir);
}

describe("PlaylyPlayer — baris kontrol muat di layar HP", () => {
  it("PiP disembunyikan di HP dan baru muncul dari breakpoint sm", () => {
    const pip = blokTombol("Putar di Pop-up");
    expect(pip).toContain("hidden");
    expect(pip).toContain("sm:flex");
  });

  it("PiP tidak memakai `flex` telanjang — dua kelas display saling menimpa", () => {
    // `flex` + `hidden` bersamaan = hasilnya bergantung urutan CSS, hal yang
    // tak terlihat dari berkas ini. Jadi `flex` harus DIGANTI, bukan ditambahi.
    const pip = blokTombol("Putar di Pop-up");
    expect(pip).not.toMatch(/"flex\s/);
  });

  it("layar penuh TETAP tampil di HP — ini yang dibela, jangan ikut disembunyikan", () => {
    const penuh = blokTombol("Keluar layar penuh");
    expect(penuh).toContain("flex");
    expect(penuh).not.toContain("hidden");
  });

  it("ketiga tombol kanan masih ada di kode — tak satu pun terhapus", () => {
    expect(KODE).toContain("Putar di Pop-up");
    expect(KODE).toContain("Keluar layar penuh");
    expect(KODE).toContain("<PlayerMenu");
  });
});
