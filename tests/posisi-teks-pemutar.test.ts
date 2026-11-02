import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * POSISI TEKS DI PANEL BAWAH PEMUTAR (owner 2026-11-02, dua putaran)
 *
 * Putaran 1 — *"teks arti tulisannya terlalu ke tengah, buat turun sedikit."*
 * Putaran 2, dengan tangkapan layar yang menandai JUDUL + "Eps n / N" (bukan
 * subtitle) — *"masih belum pas, turunkan lagi, tulisannya masih agak ke
 * atas."*
 *
 * Panel bawah adalah satu kolom ber-`absolute bottom-0`:
 *   [judul + Eps n/N] → [subtitle] → [garis geser + durasi] → [tombol]
 *
 * Karena panel menempel ke DASAR layar, satu-satunya cara menurunkan teks di
 * atas adalah MEMANGKAS ruang di bawahnya. Berkas ini menjaga ruang mana yang
 * sudah dipanen dan mana yang HARAM dipanen.
 */
describe("panel bawah pemutar: ruang yang sudah dipanen", () => {
  const SUMBER = readFileSync("app/components/player/PlayerControls.tsx", "utf-8");
  /** Komentar dibuang — di sana nama kelas disebut untuk MENJELASKAN kenapa
   *  dipakai/dihindari; penjelasan yang benar bukan pelanggaran. */
  const KODE = SUMBER.split("/*")
    .map((b, i) => (i === 0 ? b : b.split("*/").slice(1).join("*/")))
    .join("")
    .split("\n")
    .filter((baris) => !baris.trim().startsWith("//"))
    .join("\n");

  it("angka durasi menumpang baris garis geser, bukan baris sendiri", () => {
    // Baris durasi sendiri di bawah tombol memakan ~18px yang mendorong
    // seluruh blok judul ke atas. Dipindah ke samping garis geser, ruangnya
    // kembali TANPA penonton kehilangan angkanya.
    expect(KODE).toContain('className="mb-2 flex items-center gap-2 sm:mb-3"');
    expect(
      KODE,
      "baris durasi sendiri muncul lagi di bawah tombol — blok judul akan " +
        "terdorong ke atas lagi, persis keluhan owner",
    ).not.toMatch(/<p className="mt-1 text-\[10px\] tabular-nums/);
  });

  it("🪤 seekBarRef menempel pada GARIS GESERNYA, bukan pembungkus baris", () => {
    // Pagar paling penting di berkas ini. Posisi lompatan video dihitung dari
    // getBoundingClientRect() elemen ber-ref (FeedPlayer.tsx:577). Kalau ref
    // naik ke pembungkus, lebarnya ikut menghitung angka durasi di sampingnya
    // — setiap ketukan mendarat di detik yang salah, makin ke kanan makin
    // meleset, dan tak ada error apa pun yang memberi tahu.
    const i = KODE.indexOf("ref={seekBarRef}");
    expect(i, "seekBarRef tidak ketemu").toBeGreaterThan(-1);
    const blok = KODE.slice(i, i + 700);
    expect(
      blok,
      "elemen ber-seekBarRef bukan anak flex-1 — ref kemungkinan naik ke " +
        "pembungkus yang juga memuat angka durasi",
    ).toContain("flex h-6 flex-1");

    const pembungkus = KODE.indexOf('"mb-2 flex items-center gap-2 sm:mb-3"');
    expect(pembungkus).toBeGreaterThan(-1);
    expect(pembungkus, "ref berada di LUAR/di atas pembungkus").toBeLessThan(i);
  });

  it("penyesuaian HP selalu punya pasangan sm: yang mengembalikan semula", () => {
    // Layar lebar punya ruang berlebih dan tidak pernah dikeluhkan.
    for (const [hp, lebar] of [
      ["mt-6 flex justify-center", "sm:mt-2"], // jarak subtitle dari judul
      ["mt-0 px-3 transition-opacity", "sm:mt-3"], // jarak blok kontrol
      ["mb-2 flex items-center gap-2", "sm:mb-3"], // jarak bawah garis geser
      ["pb-6 pt-10", "sm:pb-7"], // jarak dasar panel
    ] as const) {
      expect(KODE, `kelas HP hilang: ${hp}`).toContain(hp);
      expect(KODE, `pasangan ${lebar} hilang — desktop ikut berubah`).toContain(
        lebar,
      );
    }
  });
});

describe("panel bawah pemutar: ruang yang HARAM dipanen", () => {
  const SUMBER = readFileSync("app/components/player/PlayerControls.tsx", "utf-8");
  const KODE = SUMBER.split("/*")
    .map((b, i) => (i === 0 ? b : b.split("*/").slice(1).join("*/")))
    .join("")
    .split("\n")
    .filter((baris) => !baris.trim().startsWith("//"))
    .join("\n");

  it("🪤 subtitle TIDAK BOLEH pindah ke dalam blok kontrol yang memudar", () => {
    // Di sana ada ±48px ruang lagi dan godaannya kuat. Tapi blok itu memudar
    // jadi opacity-0 saat kontrol disembunyikan — subtitle ikut lenyap padahal
    // filmnya masih berjalan, tanpa satu pun error.
    const subtitle = KODE.indexOf("{cueText && (");
    const blokKontrol = KODE.indexOf("{!lockedActive && (");
    expect(subtitle).toBeGreaterThan(-1);
    expect(blokKontrol).toBeGreaterThan(-1);
    expect(
      subtitle,
      "subtitle pindah ke dalam blok kontrol — ia akan ikut memudar hilang " +
        "saat kontrol disembunyikan, padahal filmnya masih jalan",
    ).toBeLessThan(blokKontrol);
  });

  it("target sentuh tombol episode tetap 44px", () => {
    // `min-h-11` = 44px. Mengecilkannya memang menurunkan judul beberapa
    // piksel lagi — dengan ongkos tombol yang sulit ditekan di HP.
    expect(KODE).toContain("min-h-11");
  });

  it("tombol play tetap 44px dan garis geser tetap setinggi h-6", () => {
    // Dua-duanya area sentuh. Memanen piksel dari sini menukar tampilan
    // dengan ketepatan jari — pertukaran yang tidak pernah diminta owner.
    expect(KODE).toContain("size-11");
    expect(KODE).toContain("flex h-6 flex-1");
    expect(KODE).not.toContain("flex h-5 flex-1");
    expect(KODE).not.toContain("flex h-4 flex-1");
  });

  it("panel tidak dirapatkan lagi ke tepi bawah layar", () => {
    // Tombol play sudah ~24px dari tepi, dan tepi itu milik gesture "kembali"
    // sistem di HP. Lebih rapat = jari yang menekan play sesekali menarik
    // gesture sistem.
    for (const haram of ["pb-5 pt-10", "pb-4 pt-10", "pb-3 pt-10", "pb-2 pt-10"]) {
      expect(KODE, `panel dirapatkan jadi ${haram}`).not.toContain(haram);
    }
  });
});
