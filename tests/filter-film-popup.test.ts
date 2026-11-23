// Penjaga POP UP "Filter Film" — satu-satunya alat penyaring situs ini sejak
// 2026-11-23.
//
// ⚠️ BERKAS INI BARU, dan ketiadaannya sendiri adalah temuan: pop up ini lahir
// 2026-11-23 dan langsung dipakai bar bawah HP TANPA satu pun penjaga. Hari itu
// juga ia jadi isi tombol FILTER di baris tab layar komputer (owner: *"isi
// filter samakan dengan filter di bawah"*), sehingga SELURUH penyaringan situs
// bergantung padanya. Jaminan yang dulu dipegang tes `FilterKatalog` — pilihan
// dihitung dari katalog, nilai `sort` benar-benar dikenali /discover — pindah
// ke sini bersama fiturnya.
//
// KENAPA diperiksa dari SUMBER, bukan dari hasil render: isi Radix Dialog tidak
// pernah tergambar sampai dibuka, dan membukanya butuh jsdom + mock router +
// jaringan palsu. Yang dijaga di bawah adalah hal-hal yang bisa rusak DIAM-DIAM
// tanpa semua itu — dan tiap patokannya menunjuk kerusakan nyata, bukan gaya
// penulisan.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { SORT_OPTIONS, FILTER_KOSONG } from "../lib/discover";
import { tanpaKomentar } from "./bantu/tanpa-komentar";

const SUMBER = tanpaKomentar(
  readFileSync("app/components/beranda/FilterFilmPopup.tsx", "utf-8"),
);

describe("pilihan penyaringnya tidak boleh ditulis-tangan", () => {
  it("daftar urutan diambil dari SORT_OPTIONS, bukan disalin", () => {
    // ⚠️ Inilah pelajaran paling mahal di area ini. Tombol "Judul A-Z" di
    // dropdown lama menunjuk `?sort=judul` berminggu-minggu, padahal nilai yang
    // dikenal `title`. `parseSort` (lib/discover.ts:18) menjatuhkan nilai tak
    // dikenal DIAM-DIAM ke "relevance", jadi tombolnya diklik lalu menampilkan
    // katalog apa adanya — nol error. Daftar yang DISALIN pasti mengulangnya;
    // daftar yang DIIMPOR mustahil menyimpang.
    expect(SUMBER).toContain("SORT_OPTIONS");
    expect(SUMBER).toContain('from "@/lib/discover"');
  });

  it("nilai sort yang ditulis langsung (kalau ada) tetap dikenali /discover", () => {
    // Nilai bawaan `sort: "populer"` ditulis langsung — sah, tapi harus tetap
    // ada di daftar resmi. Patokan ini menangkap seluruh kelas salah-ketik,
    // bukan satu kasus.
    const sah = SORT_OPTIONS.map((o) => o.value) as readonly string[];
    const ditulis = [...SUMBER.matchAll(/sort:\s*"([a-z]+)"/g)].map((m) => m[1]);
    const nyasar = ditulis.filter((v) => !sah.includes(v));
    expect(
      nyasar,
      `nilai sort tak dikenal /discover — penyaringnya akan memulangkan ` +
        `katalog apa adanya. Yang sah: ${sah.join(", ")}`,
    ).toEqual([]);
  });

  it('nilai "tidak menyaring" DIBUANG dari alamat, bukan dikirim', () => {
    // ⚠️ KENAPA INI YANG DIJAGA, dan bukan "KOSONG harus sama dengan nilai
    // kosong /discover" — patokan itu DICOBA lebih dulu dan ternyata KELIRU:
    // /discover tidak punya satu nilai kosong, melainkan BERBEDA per kunci.
    // `FILTER_KOSONG` (lib/discover.ts:356) berbunyi `cat: "Semua"` sementara
    // year/negara/genre/kind semuanya "all". Pop up ini memakai satu penanda
    // internal "all" untuk keenamnya — dan itu SAH justru karena penanda itu
    // tak pernah dikirim: barisnya membuang nilai yang sama dengan KOSONG
    // sebelum alamat dirakit, sehingga kunci yang tak disaring HILANG dari
    // alamat dan `bacaFilter` memulangkan nilai kosongnya sendiri.
    //
    // Yang akan merusak diam-diam: seseorang "menyederhanakan" perakitan alamat
    // jadi selalu `params.set`. Alamatnya lalu memuat `?cat=all`, dan sejak itu
    // kategori bernama "all" (kalau suatu saat ada) mustahil dipilih —
    // sementara halamannya tetap terlihat baik-baik saja.
    expect(FILTER_KOSONG.cat, "FILTER_KOSONG.cat berubah — baca ulang catatan di atas").toBe(
      "Semua",
    );
    expect(SUMBER.match(/const KOSONG = "([a-z]+)"/)?.[1]).toBe("all");
    expect(
      SUMBER,
      "penyaring yang kosong ikut dikirim ke alamat — lihat catatan di atas",
    ).toContain("!== KOSONG");
  });

  it("genre, negara & tahun DIHITUNG dari katalog, bukan daftar tetap", () => {
    // Aturan project sejak 2026-09-21: pilihan yang diklik lalu memulangkan
    // halaman kosong lebih menyesatkan daripada pilihan yang tidak ada.
    for (const sumberData of ["availableGenres", "getYearOptions"]) {
      expect(
        SUMBER,
        `${sumberData} hilang — daftarnya kemungkinan jadi tulis-tangan`,
      ).toContain(sumberData);
    }
  });
});

describe("katalognya tidak ikut membebani tiap halaman", () => {
  it("diambil lewat /api/dramas SAAT DIBUKA, bukan dioper sebagai prop", () => {
    // Pop up ini hidup di bar bawah yang ada di SEMUA halaman, dan sejak
    // 2026-11-23 juga di baris tab tiap halaman katalog. Mengopernya sebagai
    // prop dari komponen server berarti seluruh katalog + sinopsisnya tertanam
    // di HTML setiap halaman — dibayar semua pengunjung, dipakai sebagian kecil.
    expect(SUMBER).toContain('fetch("/api/dramas")');
    expect(
      SUMBER,
      "pop up menerima katalog sebagai prop — ongkos datanya pindah ke HTML",
    ).not.toMatch(/\{\s*terbuka,\s*onTutup,\s*dramas/);
  });
});

describe("dipakai DUA pemicu, dan keduanya pop up yang sama", () => {
  it("bar bawah HP & tombol FILTER baris tab memakai komponen ini", () => {
    // Inti permintaan owner 2026-11-23. Dua alat penyaring yang berbeda isinya
    // membuat penonton HP dan penonton komputer punya KEMAMPUAN berbeda — bukan
    // sekadar tampilan berbeda. Dipaku supaya salah satunya tidak diam-diam
    // kembali merakit penyaring sendiri.
    for (const berkas of [
      "app/components/BottomNav.tsx",
      "app/components/beranda/FilterKatalog.tsx",
    ]) {
      expect(
        tanpaKomentar(readFileSync(berkas, "utf-8")),
        `${berkas} tak lagi memakai pop up bersama`,
      ).toContain("FilterFilmPopup");
    }
  });
});
