// Penjaga TATA LETAK pemutar feed: memastikan semua tombol pemutar tetap duduk
// DI DALAM bingkai video, dan tetap bisa diklik setelah masuk ke sana.
//
// KENAPA PENJAGA INI ADA — bug nyata yang tayang di produksi (diperbaiki
// 2026-10-01, rilis 585cfaa): wadah pemutar selebar LAYAR sementara videonya
// dirender object-contain. Di layar lebar video tegak menyusut jadi kolom di
// tengah, dan semua overlay yang menempel ke tepi layar mendarat di pita hitam
// di sampingnya. Di HP tidak kelihatan sama sekali karena di sana video memenuhi
// layar — itulah kenapa bug ini lolos lama: tidak ada error, tidak ada tes
// merah, dan satu-satunya yang melihatnya adalah orang yang kebetulan membuka
// situs di laptop.
//
// Perbaikannya memperkenalkan "panggung": div seukuran gambar video yang
// benar-benar tampil, tempat seluruh overlay dipasang. Berkas ini mengunci tiga
// hal yang kalau rusak TIDAK menimbulkan error apa pun:
//   1. tombol pemutar berada di dalam panggung (bukan di tepi layar lagi),
//   2. panel penuh justru TETAP di luar panggung (kalau ikut masuk, lebarnya
//      menyempit diam-diam),
//   3. tiap tombol di dalam panggung menyalakan pointer-events-auto — panggung
//      sengaja pointer-events-none supaya ketuk play/pause tembus ke <video>,
//      jadi tombol yang lupa menyalakannya akan TAMPIL TAPI MATI saat diklik.
//
// Polanya membaca berkas sumber, sama seperti tests/unduhan-pemasangan.test.ts:
// yang diuji adalah PEMASANGAN, hal yang tidak bisa dibuktikan dengan memanggil
// fungsinya.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Isi berkas sumber, akhir-baris diseragamkan supaya cocokan teks tak rapuh. */
function sumber(berkas: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../${berkas}`, import.meta.url)),
    "utf8",
  ).replace(/\r\n/g, "\n");
}

/** Penanda gaya yang hanya dimiliki div panggung. */
const TANDA_PANGGUNG = "maxWidth: `calc(100dvh";

/**
 * Pisahkan div panggung jadi tag pembukanya + isi di dalamnya.
 *
 * Kedalaman dihitung dengan mencacah "<div" vs "</div>" mulai dari tag panggung,
 * bukan mencocokkan teks penutup tertentu — supaya tes tidak ikut merah hanya
 * karena isinya ditata ulang atau bertambah elemen.
 */
function belahPanggung(isi: string): { tagBuka: string; dalam: string } {
  const posGaya = isi.indexOf(TANDA_PANGGUNG);
  if (posGaya < 0) {
    throw new Error(
      "Panggung pemutar hilang: tidak ada gaya maxWidth yang mengikuti tinggi video. " +
        "Tanpa itu tombol pemutar balik menempel ke tepi LAYAR, bukan ke tepi video.",
    );
  }
  const awalTag = isi.lastIndexOf("<div", posGaya);
  const akhirTagBuka = isi.indexOf(">", isi.indexOf("}}", posGaya));
  if (awalTag < 0 || akhirTagBuka < 0) {
    throw new Error("Tag pembuka panggung tidak utuh.");
  }

  let kedalaman = 1;
  let i = akhirTagBuka + 1;
  while (i < isi.length) {
    const buka = isi.indexOf("<div", i);
    const tutup = isi.indexOf("</div>", i);
    if (tutup < 0) break;
    if (buka >= 0 && buka < tutup) {
      kedalaman += 1;
      i = buka + "<div".length;
      continue;
    }
    kedalaman -= 1;
    if (kedalaman === 0) {
      return {
        tagBuka: isi.slice(awalTag, akhirTagBuka + 1),
        dalam: isi.slice(akhirTagBuka + 1, tutup),
      };
    }
    i = tutup + "</div>".length;
  }
  throw new Error("Penutup panggung tidak ditemukan.");
}

const BERKAS_PEMUTAR = "app/components/FeedPlayer.tsx";

describe("Panggung pemutar feed — tombol wajib di dalam bingkai video", () => {
  it("ukuran panggung mengikuti rasio video yang sedang diputar, bukan angka yang dipatok", () => {
    const isi = sumber(BERKAS_PEMUTAR);

    // Rumus object-contain: yang lebih kecil di antara keduanya yang mengikat.
    expect(isi).toContain("maxWidth: `calc(100dvh * ${videoRatio})`");
    expect(isi).toContain("maxHeight: `calc(100vw / ${videoRatio})`");

    // Rasionya WAJIB dibaca dari videonya sendiri. Kalau dipatok 9/16, film
    // berorientasi mendatar ikut dipaksa masuk kolom sempit.
    expect(
      /setVideoRatio\(\s*v\.videoWidth \/ v\.videoHeight\s*\)/.test(isi),
      "rasio video tidak lagi dibaca dari videoWidth/videoHeight",
    ).toBe(true);
  });

  it("panggung membiarkan ketukan tembus ke video di bawahnya", () => {
    const { tagBuka } = belahPanggung(sumber(BERKAS_PEMUTAR));

    // Tanpa ini panggung menelan semua ketukan, dan play/pause sekali-ketuk
    // plus ketuk-ganda untuk like berhenti berfungsi — tanpa error apa pun.
    expect(tagBuka).toContain("pointer-events-none");
  });

  it("tombol pemutar dipasang DI DALAM panggung", () => {
    const { dalam } = belahPanggung(sumber(BERKAS_PEMUTAR));

    for (const penanda of [
      "<ActionRail", // rail Suka / Komen / Simpan / Bagikan
      "<PlayerControls", // kontrol bawah + tombol gerigi
      'aria-label="Kembali"',
      'aria-label="Putar"',
    ]) {
      expect(
        dalam.includes(penanda),
        `${penanda} keluar dari panggung — di layar lebar ia akan tampil di pita hitam, bukan di videonya`,
      ).toBe(true);
    }
  });

  it("panel penuh TETAP di luar panggung", () => {
    const { dalam } = belahPanggung(sumber(BERKAS_PEMUTAR));

    // Kelimanya panel/modal selebar layar, bukan tombol yang menempel di video.
    // Kalau ikut masuk panggung, lebarnya menyempit diam-diam.
    for (const penanda of [
      "<EpisodePaywall",
      "<EpisodeSheet",
      "<CommentsDrawer",
      "<RewardedAdModal",
    ]) {
      expect(
        dalam.includes(penanda),
        `${penanda} ikut masuk panggung — panelnya akan menyempit mengikuti lebar video`,
      ).toBe(false);
    }
  });

  it("setiap tombol di dalam panggung menyalakan pointer-events-auto", () => {
    const { dalam } = belahPanggung(sumber(BERKAS_PEMUTAR));

    // Panggungnya pointer-events-none, jadi ini BUKAN kerapian melainkan syarat
    // tombolnya hidup. Yang lupa menyalakannya tetap tergambar di layar tapi
    // tidak bereaksi saat diklik — rusak tanpa suara.
    const tagInteraktif = dalam.match(/<(button|Link|a)\b[\s\S]*?>/g) ?? [];
    expect(
      tagInteraktif.length,
      "tidak ada satu pun tombol di dalam panggung — penandanya mungkin berubah",
    ).toBeGreaterThan(0);

    for (const tag of tagInteraktif) {
      const baris = tag.replace(/\s+/g, " ").slice(0, 80);
      expect(
        tag.includes("pointer-events-auto"),
        `tombol di dalam panggung tidak menyalakan pointer-events-auto, jadi tampil tapi mati: ${baris}`,
      ).toBe(true);
    }
  });

  it("komponen anak panggung mengurus sendiri pointer-events-auto", () => {
    // ActionRail & PlayerControls dipanggil sebagai komponen, jadi tag mereka
    // tidak terbaca oleh pemeriksaan di atas — dicek di berkasnya masing-masing.
    expect(sumber("app/components/ActionRail.tsx")).toContain("pointer-events-auto");
    expect(sumber("app/components/player/PlayerControls.tsx")).toContain(
      "pointer-events-auto",
    );
  });
});
