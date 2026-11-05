// Penjaga LATAR TERANG seragam — owner 2026-11-05: "aku mau semua seragam
// backgroundnya jadi sama dengan beranda (putih)".
//
// ⚠️ KENAPA TES INI WAJIB ADA: kerusakan tema warna TIDAK menimbulkan error
// apa pun. Build tetap hijau, `tsc` tetap exit 0, halaman tetap membalas 200 —
// yang terjadi cuma tulisan PUTIH di atas latar PUTIH, alias teks yang hilang
// sama sekali dari layar. Satu-satunya yang bisa menangkapnya lebih dulu adalah
// penjaga seperti ini (atau mata manusia, yang tidak selalu ada).
//
// Yang dijaga BUKAN "warnanya harus persis zinc-100" — owner boleh menggantinya
// kapan saja. Yang dijaga adalah DUA hal yang kalau putus merusak diam-diam:
//   1. saklar + latar selalu berpasangan;
//   2. tiap teks terang di dalam badan terang punya pasangan gelapnya.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { BADAN_TERANG } from "../app/components/beranda/shell";

/** Halaman katalog penonton yang WAJIB berlatar terang, dan dari mana latarnya. */
const HALAMAN_TERANG = [
  { berkas: "app/components/beranda/BadanKatalog.tsx", catatan: "dipakai / dan /beranda" },
  { berkas: "app/components/DramaBrowser.tsx", catatan: "/discover — Jelajah Drama & Film" },
  { berkas: "app/film/page.tsx", catatan: "/film" },
  { berkas: "app/katalog/page.tsx", catatan: "/katalog" },
  // Ditambahkan 2026-11-05 atas permintaan owner, melengkapi keseragaman.
  { berkas: "app/shorts/page.tsx", catatan: "/shorts" },
  { berkas: "app/history/page.tsx", catatan: "/history — Riwayat tontonan" },
  { berkas: "app/my-list/page.tsx", catatan: "/my-list — Daftar Saya" },
];

/**
 * Komponen yang digambar DI DALAM badan terang. Tiap kelas teks/latar gelap di
 * sini wajib punya pasangan `terang:`-nya, kalau tidak ia hilang atau tak
 * terbaca begitu latarnya jadi putih.
 */
const KOMPONEN_DI_DALAM = [
  "app/components/DramaBrowser.tsx",
  "app/components/beranda/HasilPlayly.tsx",
  "app/components/PlaylyVideoGrid.tsx",
  "app/components/beranda/CatalogCard.tsx",
  // Kartu khusus /my-list dan /history. Keduanya TIDAK memakai CatalogCard,
  // jadi dukungan tema terang di sana tidak otomatis ikut.
  "app/components/DramaCard.tsx",
  "app/components/HistoryCard.tsx",
];

describe("badan terang: saklar dan latar tidak boleh terpisah", () => {
  it("BADAN_TERANG membawa KEDUANYA sekaligus", () => {
    // `tema-terang` = saklar yang menyalakan seluruh varian `terang:`
    // (@custom-variant di app/globals.css). Tanpa itu, semua `terang:text-...`
    // DIAM dan tulisan tetap putih.
    expect(BADAN_TERANG).toContain("tema-terang");
    // Latarnya sendiri. Tanpa ini, bg-black di <body> (app/layout.tsx) menembus
    // dari belakang dan tulisan gelap jadi tak terbaca di atas hitam.
    expect(BADAN_TERANG).toMatch(/\bbg-\S+/);
  });

  it.each(HALAMAN_TERANG)(
    "$berkas memakai BADAN_TERANG ($catatan)",
    ({ berkas }) => {
      const isi = readFileSync(berkas, "utf8");
      // Dirujuk lewat KONSTANTA, bukan ditulis ulang sebagai teks: kalau owner
      // minta ganti warnanya, satu tempat yang diubah. Halaman yang menuliskan
      // kelasnya sendiri akan tertinggal dan jadi belang tanpa error.
      expect(isi).toContain("BADAN_TERANG");
    },
  );
});

describe("tidak ada teks yang hilang di latar putih", () => {
  it.each(KOMPONEN_DI_DALAM)("%s: setiap text-white punya pasangan terang:", (berkas) => {
    const isi = readFileSync(berkas, "utf8");

    // Ambil tiap atribut className lalu periksa per-elemen — memeriksa seluruh
    // berkas sekaligus akan lolos palsu, sebab `terang:` milik elemen LAIN
    // terhitung sebagai pasangan.
    const kelas = isi.match(/className=(?:"[^"]*"|\{[^}]*\})/g) ?? [];
    const pelanggar = kelas.filter((k) => {
      if (!/\btext-white\b/.test(k)) return false;
      // DIKECUALIKAN, dan ini bukan kelonggaran demi meloloskan kerja sendiri:
      // elemen ber-`fill-white` adalah ikon PENUH (tombol play) yang digambar
      // DI ATAS poster/sampul video, bukan di atas latar halaman. Putih di sana
      // justru yang benar — latarnya gambar, bukan kertas putih. Pengecualian
      // ini sempit dengan sengaja: ia menuntut `fill-white`, bukan sekadar
      // "ikon", jadi teks biasa tetap tidak bisa lolos lewat celah ini.
      if (/\bfill-white\b/.test(k)) return false;
      // DIKECUALIKAN JUGA: elemen yang MEMBAWA LATAR GELAPNYA SENDIRI
      // (`bg-black/80` pada tombol hapus di sudut poster). Teks putih di atas
      // latar hitam milik elemen itu sendiri memang benar — latarnya bukan
      // kertas putih halaman. Sempit dengan sengaja: menuntut `bg-black`
      // tertulis di className yang SAMA, jadi teks biasa tetap tak bisa lolos.
      if (/\bbg-black(\/\d+)?\b/.test(k)) return false;
      return !/\bterang:text-/.test(k);
    });

    expect(
      pelanggar,
      `text-white tanpa pasangan terang: di ${berkas} — teks ini akan HILANG ` +
        `(putih di atas putih) begitu halamannya berlatar terang`,
    ).toEqual([]);
  });

  it("judul 'Jelajah Drama & Film' terbaca di latar putih", () => {
    // Judul utama halaman yang owner tunjuk langsung. Dijaga terpisah karena
    // inilah teks paling mencolok kalau hilang — dan paling mudah terlewat,
    // sebab di tema gelap ia tampak baik-baik saja.
    const isi = readFileSync("app/components/DramaBrowser.tsx", "utf8");
    const baris = isi
      .split("\n")
      .find((b) => b.includes("Jelajah Drama &amp; Film"));

    expect(baris).toBeDefined();
    expect(baris).toContain("terang:text-zinc-900");
  });
});
