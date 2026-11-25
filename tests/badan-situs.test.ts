// Penjaga TEMA BADAN SITUS — satu latar untuk seluruh halaman katalog penonton.
//
// ⚠️ NAMA BERKAS BERUBAH 2026-11-23, dari `badan-terang.test.ts`: temanya kini
// GELAP (owner: *"warna ini lebih bagus terlihat elegan dan mewah"*), dan nama
// berkas yang menjanjikan "terang" akan menyesatkan pembaca berikutnya.
// Isi penjaganya TIDAK dilonggarkan — ditambah satu arah salah yang dulu
// mustahil (saklar nyala + latar gelap), sebab arah itu kini bisa terjadi.
//
// ⚠️ KENAPA TES INI WAJIB ADA: kerusakan tema warna TIDAK menimbulkan error
// apa pun. Build tetap hijau, `tsc` tetap exit 0, halaman tetap membalas 200 —
// yang terjadi cuma teks yang warnanya sama dengan latarnya, alias tulisan yang
// hilang sama sekali dari layar. Satu-satunya yang bisa menangkapnya lebih dulu
// adalah penjaga seperti ini (atau mata manusia, yang tidak selalu ada).
//
// Yang dijaga BUKAN warna tertentu — owner sudah menggantinya TIGA kali dalam
// satu hari (merah → hijau sage → gelap+emas). Yang dijaga adalah DUA hal yang
// kalau putus merusak diam-diam:
//   1. saklar tema & nada latarnya tidak boleh menunjuk arah berbeda;
//   2. tiap teks terang punya pasangan gelapnya — jalan pulang ke tema terang
//      lewat satu baris, tanpa membangun 40+ kelas dari nol.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { BADAN_SITUS, TEKS_SEKUNDER } from "../app/components/beranda/shell";

/**
 * Halaman katalog penonton yang WAJIB mengambil latarnya dari `BADAN_SITUS`,
 * dan dari berkas mana latarnya dipasang. Halaman akun & dashboard admin
 * TIDAK di sini: keduanya memakai `BADAN_TERANG_PENUH` yang membalik palet,
 * dan sampai 2026-11-23 owner belum meminta keduanya ikut gelap.
 */
const HALAMAN_KATALOG = [
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

describe("badan situs: saklar tema dan latarnya tidak boleh berbeda arah", () => {
  /**
   * Nada latar yang dianggap TERANG dan GELAP. Daftarnya sempit dengan sengaja:
   * nada tengah (zinc-500) tidak masuk keduanya, jadi memasangnya akan membuat
   * tes ini MERAH — dan itu benar, sebab nada tengah tidak terbaca di kedua
   * arah teks.
   */
  const LATAR_TERANG = /\bbg-(white|zinc-(50|100|200)|stone-(50|100)|neutral-(50|100))\b/;
  // `latar` = token LATAR HALAMAN (app/globals.css), ditambahkan 2026-11-24.
  // Ia memang lebih TERANG daripada `gelap-950` — owner memilihnya supaya
  // halaman terasa hidup seperti mockup — tapi ARAHNYA tetap gelap: teks putih
  // di atasnya 15,82:1. Yang dijaga tes ini arahnya, bukan nadanya.
  const LATAR_GELAP =
    /\bbg-(black|latar|gelap-\d{3}|zinc-(900|950)|stone-(900|950)|neutral-(900|950))\b/;

  it("BADAN_SITUS membawa latarnya sendiri", () => {
    // Tanpa `bg-*`, `<body className="bg-black">` (app/layout.tsx) menembus
    // dari belakang — dan itu kebetulan benar untuk tema gelap, jadi
    // kelalaiannya tak akan terlihat sampai tema terang dinyalakan lagi.
    expect(BADAN_SITUS).toMatch(/\bbg-\S+/);
  });

  it("saklar `tema-terang` dan nada latarnya menunjuk arah yang SAMA", () => {
    // ⚠️ INI penjaga kerusakan paling senyap di seluruh tema: nol error, build
    // hijau, halaman membalas 200 — yang terjadi cuma teks hilang dari layar.
    // Dua arah salahnya nyata, keduanya pernah mungkin terjadi hari ini saat
    // tema diganti tiga kali:
    //   - saklar NYALA + latar gelap  -> `terang:text-zinc-900` ikut menyala,
    //     jadi tulisan GELAP di atas latar GELAP.
    //   - saklar MATI + latar putih   -> komponen tetap di warna dasarnya,
    //     jadi tulisan PUTIH di atas latar PUTIH.
    // Yang dijaga BUKAN "warnanya harus gelap" — owner boleh menggantinya
    // kapan saja; yang dijaga adalah kedua bagian itu tidak boleh berbeda arah.
    const saklarNyala = BADAN_SITUS.split(/\s+/).includes("tema-terang");

    if (saklarNyala) {
      expect(
        BADAN_SITUS,
        "saklar `tema-terang` menyala, jadi latarnya WAJIB nada terang — " +
          "varian `terang:` memaksa teks jadi gelap",
      ).toMatch(LATAR_TERANG);
    } else {
      expect(
        BADAN_SITUS,
        "tanpa saklar `tema-terang` komponen tetap di warna dasarnya yang " +
          "TERANG di atas gelap, jadi latarnya WAJIB nada gelap",
      ).toMatch(LATAR_GELAP);
    }
  });

  it("saklar `tema-terang` masih terpasang di globals.css (jalan pulang)", () => {
    // Hari ini saklarnya tidak dipakai — tema situs gelap. Tes ini TETAP ada
    // karena @custom-variant itulah yang membuat 40+ varian `terang:` di 18
    // berkas bisa dinyalakan ulang lewat SATU baris `BADAN_SITUS`. Kalau
    // definisinya terhapus "karena tidak terpakai", jalan pulang ke tema
    // terang hilang tanpa jejak dan harus dibangun dari nol.
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/@custom-variant terang \(&:is\(\.tema-terang \*\)\);/);
  });

  it.each(HALAMAN_KATALOG)(
    "$berkas memakai BADAN_SITUS ($catatan)",
    ({ berkas }) => {
      const isi = readFileSync(berkas, "utf8");
      // Dirujuk lewat KONSTANTA, bukan ditulis ulang sebagai teks: kalau owner
      // minta ganti temanya, satu tempat yang diubah. Halaman yang menuliskan
      // kelasnya sendiri akan tertinggal dan jadi belang tanpa error.
      expect(isi).toContain("BADAN_SITUS");
    },
  );
});

/**
 * JALAN PULANG KE TEMA TERANG — penjaga yang hari ini mengawal tema yang TIDAK
 * sedang dipakai, dan itu memang disengaja.
 *
 * Varian `terang:` di 18 berkas adalah satu-satunya yang membuat tema terang
 * bisa dinyalakan ulang lewat SATU baris `BADAN_SITUS`. Kalau pasangan
 * `terang:` berhenti dirawat sekarang (mudah: hari ini tak satu pun menyala,
 * jadi yang hilang tak terlihat di layar), baris satu itu akan memulangkan
 * halaman dengan tulisan PUTIH di atas PUTIH berbulan-bulan kemudian — dan
 * saat itu tak ada lagi yang tahu kenapa.
 */
describe("jalan pulang ke tema terang tetap utuh", () => {
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

  it("judul 'Jelajah Drama & Film' tetap siap untuk latar putih", () => {
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

// ===========================================================================
// TEKS BARIS KEDUA (genre di bawah judul kartu · keterangan di bawah judul
// seksi) — owner 2026-11-25: *"tulisan tidak terlihat warna abu2"*.
//
// Sebelumnya `text-zinc-500` disalin di LIMA berkas. Terukur terhadap latar
// halaman yang sebenarnya (#480a12 + sapuan oranye `latar-bercahaya`), di
// pojok yang tersorot nilainya cuma **1,16:1** — ambang baca 4,5:1. Putih
// mencapai 4,18:1, batas atas yang bisa dicapai warna saja.
//
// Yang dijaga di sini BUKAN "harus putih" (owner boleh menggantinya kapan
// saja), melainkan: tak ada lagi salinan liar, dan tokennya tetap membawa
// pasangan tema terang. Keduanya rusak TANPA error — cuma tulisan yang
// menghilang dari layar.
// ===========================================================================
describe("teks baris kedua: satu token, bukan lima salinan", () => {
  const PEMAKAI_TEKS_SEKUNDER = [
    "app/components/beranda/KartuVideo.tsx",
    "app/components/beranda/CatalogCard.tsx",
    "app/components/PlaylyVideoGrid.tsx",
    "app/components/beranda/TabKatalogTampilan.tsx",
    // Sapuan MENYELURUH 2026-11-25, putaran kedua (owner: *"kamu cek
    // menyeluruh karena masih ada tulisan yang tidak jelas kamu seragamkan"*).
    // Ketujuhnya menggambar teks LANGSUNG di atas latar halaman — di situlah
    // nada pudar gagal terbaca; di dalam panel/footer yang punya latar gelap
    // sendiri, zinc-400 justru masih 6,76:1 dan sengaja tidak disentuh.
    "app/components/DramaBrowser.tsx",
    "app/components/beranda/CatalogBrowser.tsx",
    "app/components/film/DaftarFilmBerhalaman.tsx",
    "app/film/page.tsx",
    "app/shorts/page.tsx",
    "app/my-list/page.tsx",
    "app/history/page.tsx",
  ];

  /**
   * Berkas yang tidak boleh memakai nada pudar `zinc-500` lagi, walau sebagian
   * sudah tidak punya teks baris kedua sama sekali.
   *
   * `SeksiKatalog` ada di sini TAPI tidak di daftar atas: baris keterangannya
   * DIBUANG owner 2026-11-25 (lihat tests/seksi-baris-geser.test.ts), jadi ia
   * tak lagi memakai token — tapi larangan nada pudarnya tetap berlaku kalau
   * suatu saat ada teks baru ditambahkan di sana.
   */
  const BEBAS_ZINC_500 = [
    ...PEMAKAI_TEKS_SEKUNDER,
    "app/components/beranda/SeksiKatalog.tsx",
  ];

  it("TEKS_SEKUNDER membawa pasangan tema terangnya", () => {
    // Tanpa `terang:`, baris ini jadi PUTIH DI ATAS PUTIH begitu tema terang
    // dinyalakan — hilang total, nol error.
    expect(TEKS_SEKUNDER).toMatch(/\bterang:text-\S+/);
    // Pasangan pembanding: token yang dikosongkan juga harus merah.
    expect(TEKS_SEKUNDER).toMatch(/(^|\s)text-\S+/);
  });

  it.each(PEMAKAI_TEKS_SEKUNDER)("%s memakai token, bukan kelas sendiri", (berkas) => {
    const isi = readFileSync(berkas, "utf8");
    expect(
      isi,
      `${berkas} tidak memakai TEKS_SEKUNDER — warna baris keduanya bisa ` +
        `menyimpang dari halaman lain tanpa ada yang sadar`,
    ).toContain("TEKS_SEKUNDER");
  });

  it.each(BEBAS_ZINC_500)("%s tidak memakai lagi nada pudar", (berkas) => {
    const isi = readFileSync(berkas, "utf8");
    // Dicari di dalam className saja: kata "zinc-500" di KOMENTAR (menjelaskan
    // sejarahnya) tidak boleh ikut merah — kalau ikut, orang akan menghapus
    // catatan sejarahnya demi meloloskan tes.
    const kelas = isi.match(/className=(?:"[^"]*"|\{[^}]*\})/g) ?? [];
    // Diperluas 2026-11-25: bukan cuma zinc-500. Terukur di atas latar
    // halaman (#480a12 + sapuan oranye `.latar-bercahaya`):
    //   zinc-400 = 6,17:1 di latar polos TAPI 1,63:1 di pojok yang tersorot
    //   zinc-500 = 3,27:1 / 1,16:1
    //   zinc-700 = 1,51:1 / 2,50:1   (dipakai ikon keadaan kosong)
    // Ambang baca 4,5:1 — ketiganya gagal persis di tempat teks ini hidup.
    //
    // Varian `terang:` SENGAJA dikecualikan: di tema terang latarnya putih,
    // dan di sana nada gelap justru yang benar.
    // 🪤 JANGAN kembalikan ke `split(/\s+/)` lalu cocokkan utuh: token TERAKHIR
    // di dalam className masih membawa tanda kutip penutup (`text-zinc-500"`),
    // jadi ia tak pernah cocok. Versi pertama penjaga ini begitu, dan uji-balik
    // 2026-11-25 membuktikannya HIJAU walau nada pudar sengaja dikembalikan —
    // penjaga palsu, lebih berbahaya daripada tidak ada penjaga.
    //
    // Lookbehind `(?<![\w:-])` yang menjaga `terang:text-zinc-400` TIDAK ikut
    // kena: varian tema terang memang harus bernada gelap.
    const pudar = (k: string) =>
      /(?<![\w:-])text-zinc-(400|500|700)(?![\w-])/.test(k);
    expect(
      kelas.filter(pudar),
      `${berkas} memakai nada pudar (zinc-400/500/700) di atas latar ` +
        `halaman — praktis tak terbaca di pojok yang tersorot oranye. ` +
        `Pakai TEKS_SEKUNDER (teks) atau IKON_KOSONG (ikon hiasan).`,
    ).toEqual([]);
  });
});
