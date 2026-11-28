// Penjaga AMBANG RATING BARIS POSTER PALING ATAS — owner 2026-11-28.
//
// Owner melihat baris paling atas di produksi dan memintanya berisi film
// "terbaru/box office". Yang tergambar saat itu memuat rating 3.7 · 4.5 · 4.7 ·
// 4.8 · 4.9 — film baru, tapi bukan film yang mau ditonjolkan di tempat paling
// menonjol di situs.
//
// ⚠️ Kerusakannya SENYAP kalau ambang ini lepas: barisnya tetap tergambar,
// tetap penuh, tetap film terbaru — cuma pelan-pelan dipenuhi judul ber-rating
// rendah lagi. Nol error, nol halaman gagal; satu-satunya yang berubah adalah
// kesan pertama penonton.
import { describe, it, expect } from "vitest";
import {
  AMBANG_RATING_BARIS_ATAS,
  siapkanTampilanDepan,
} from "../lib/baris-atas";

type FilmUji = {
  id: string;
  thumbnail?: string | null;
  rating?: string | null;
};

/** Film bersampul dengan rating yang ditentukan. Urutan array = urutan tahun. */
const film = (id: string, rating: string | null): FilmUji => ({
  id,
  thumbnail: `https://contoh.test/${id}.jpg`,
  rating,
});

const siapkan = (daftar: FilmUji[], jumlahBaris = 5) =>
  siapkanTampilanDepan<FilmUji, { id: string; thumbnail?: string | null }, { id: string }>({
    film: daftar,
    series: [],
    drama: [],
    jumlahBaris,
    jumlahFilm: 20,
  });

describe("baris poster paling atas menyaring rating rendah", () => {
  it("ambangnya 6.0 — angka yang diukur, bukan dikarang", () => {
    // Dikunci supaya perubahan angka jadi keputusan sadar, bukan kebetulan.
    // Dasarnya terukur: 41 dari 60 film beranda produksi lolos 6.0, sedangkan
    // barisnya cuma butuh 14.
    expect(AMBANG_RATING_BARIS_ATAS).toBe(6.0);
  });

  it("film ber-rating di bawah ambang TIDAK masuk baris atas", () => {
    const { barisAtas } = siapkan([
      film("bagus-1", "7.2"),
      film("jelek-1", "3.7"),
      film("bagus-2", "6.0"),
      film("jelek-2", "5.9"),
      film("bagus-3", "8.1"),
    ]);
    const id = barisAtas.map((b) => b.item.id);
    expect(id).toEqual(["bagus-1", "bagus-2", "bagus-3"]);
    expect(id, "film rating rendah menyusup ke baris atas").not.toContain(
      "jelek-1",
    );
  });

  it("tepat di ambang IKUT, sedikit di bawahnya TIDAK", () => {
    // Batas atas-bawah diuji terpisah: salah tanda pembanding (> dan >=)
    // cuma menggeser satu film dan tidak pernah memunculkan error.
    const { barisAtas } = siapkan([film("pas", "6.0"), film("kurang", "5.9")]);
    expect(barisAtas.map((b) => b.item.id)).toEqual(["pas"]);
  });

  it("film TANPA rating tidak ikut, tapi tidak hilang dari situs", () => {
    const { barisAtas, filmDiDepan } = siapkan([
      film("ada-rating", "7.0"),
      film("tanpa-rating", null),
    ]);
    expect(barisAtas.map((b) => b.item.id)).toEqual(["ada-rating"]);
    // Pagar penting: tersaring dari baris ATAS bukan berarti dibuang. Tanpa
    // pemeriksaan ini, ambang di atas bisa diam-diam melenyapkan film dari
    // seluruh halaman depan.
    expect(
      filmDiDepan.map((f) => f.id),
      "film tanpa rating ikut hilang dari seksi Film Terbaru",
    ).toContain("tanpa-rating");
  });

  it("URUTAN tetap urutan tahun, BUKAN diurut ulang dari rating tertinggi", () => {
    // Owner memilih "terbaru + rating bagus", BUKAN "rating tertinggi dulu" —
    // dua opsi berbeda yang sempat disodorkan. Kalau suatu hari baris ini
    // diurut ulang dari rating, tes inilah yang memberi tahu.
    const { barisAtas } = siapkan([
      film("baru-tapi-6.1", "6.1"),
      film("lebih-lama-9.0", "9.0"),
    ]);
    expect(barisAtas.map((b) => b.item.id)).toEqual([
      "baru-tapi-6.1",
      "lebih-lama-9.0",
    ]);
  });

  it("kalau NOL film lolos ambang, baris atas tidak dikosongkan", () => {
    // Jaring pengaman: baris paling atas yang kosong membuat halaman depan
    // terbaca rusak. Lebih baik menampilkan apa adanya daripada tidak sama
    // sekali — misalnya saat kolom rating belum terisi.
    const { barisAtas } = siapkan([film("a", "2.0"), film("b", null)]);
    expect(
      barisAtas.length,
      "ambang menyapu habis baris atas — halaman depan jadi bolong",
    ).toBeGreaterThan(0);
  });

  it("film tanpa sampul tetap tidak ikut, ambang tidak melonggarkan itu", () => {
    const { barisAtas } = siapkan([
      { id: "tanpa-sampul", thumbnail: null, rating: "9.0" },
      film("bersampul", "6.5"),
    ]);
    expect(barisAtas.map((b) => b.item.id)).toEqual(["bersampul"]);
  });
});
