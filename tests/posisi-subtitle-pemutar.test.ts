import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * POSISI SUBTITLE DI PEMUTAR (owner 2026-11-02)
 *
 * *"teks arti tulisannya terlalu ke tengah, buat agak turun sedikit
 * (sesuaikan versi HP)."*
 *
 * Panel bawah pemutar adalah satu kolom: [judul + "Eps n / N"] → [subtitle] →
 * [seek bar + tombol + waktu]. Subtitle karena itu terjepit: ruang turunnya
 * dibatasi tinggi blok kontrol di bawahnya.
 */
describe("subtitle pemutar: posisi & pagar", () => {
  const SUMBER = readFileSync("app/components/player/PlayerControls.tsx", "utf-8");
  /** Komentar dibuang — di sana `opacity-0` dan nama kelas disebut untuk
   *  MENJELASKAN kenapa dihindari; penjelasan yang benar bukan pelanggaran. */
  const KODE = SUMBER.split("/*")
    .map((b, i) => (i === 0 ? b : b.split("*/").slice(1).join("*/")))
    .join("")
    .split("\n")
    .filter((baris) => !baris.trim().startsWith("//"))
    .join("\n");

  it("🪤 subtitle BERADA DI LUAR blok kontrol yang memudar", () => {
    // Pagar paling penting di berkas ini. Blok kontrol memudar jadi
    // `opacity-0` saat kontrol disembunyikan. Memindahkan subtitle ke dalamnya
    // — godaan yang wajar saat ingin menurunkannya lebih jauh — membuat
    // terjemahan ikut lenyap padahal filmnya masih berjalan, tanpa satu pun
    // error yang memberi tahu.
    const subtitle = KODE.indexOf("{cueText && (");
    const blokKontrol = KODE.indexOf("{!lockedActive && (");
    expect(subtitle, "blok subtitle tidak ketemu").toBeGreaterThan(-1);
    expect(blokKontrol, "blok kontrol tidak ketemu").toBeGreaterThan(-1);
    expect(
      subtitle,
      "subtitle pindah ke dalam blok kontrol — ia akan ikut memudar hilang " +
        "saat kontrol disembunyikan, padahal filmnya masih jalan",
    ).toBeLessThan(blokKontrol);
  });

  it("subtitle tetap digambar walau episode terkunci paywall", () => {
    // Konsekuensi dari pagar di atas: `{cueText && …}` berdiri sendiri, tidak
    // dibungkus `!lockedActive`.
    const potongan = KODE.slice(
      KODE.indexOf("{cueText && ("),
      KODE.indexOf("{!lockedActive && ("),
    );
    expect(potongan).not.toContain("lockedActive");
  });

  it("penyesuaian HP selalu punya pasangan sm: yang mengembalikan semula", () => {
    // Layar lebar punya ruang berlebih dan tidak pernah dikeluhkan. Tanpa
    // pasangan `sm:`, merapatkan jarak demi HP ikut merapatkan desktop.
    for (const [hp, lebar] of [
      ["mt-6 flex justify-center", "sm:mt-2"], // jarak subtitle dari judul
      ["mt-1 px-3 transition-opacity", "sm:mt-3"], // jarak blok kontrol
      ["mb-2 flex h-6", "sm:mb-3"], // jarak bawah seek bar
    ] as const) {
      expect(KODE, `kelas HP hilang: ${hp}`).toContain(hp);
      expect(KODE, `pasangan ${lebar} hilang — desktop ikut berubah`).toContain(
        lebar,
      );
    }
  });

  it("target sentuh tombol episode tidak dikorbankan demi ruang", () => {
    // `min-h-11` = 44px, ambang target sentuh. Mengecilkannya memang akan
    // menurunkan subtitle beberapa piksel lagi — dengan ongkos tombol yang
    // sulit ditekan di HP. Jangan ditukar.
    expect(KODE).toContain("min-h-11");
  });

  it("seek bar tidak dirapatkan sampai berbahaya", () => {
    // Di bawah seek bar ada baris tombol. Jarak < 8px membuat jari yang
    // menggeser seek bar gampang mendarat di tombol play.
    expect(KODE).not.toContain("mb-1 flex h-6");
    expect(KODE).not.toContain("mb-0 flex h-6");
  });
});
