// -------------------------------------------------------------------------
// PAGINASI daftar panel admin — potong daftar panjang jadi beberapa halaman.
//
// KENAPA ADA (owner 2026-11-06): "buatkan pagination dimana setiap halaman
// bisa kita adjust (25,50,100,150,200, dst) ada sebelumnya - berikutnya".
// Daftar video Playly berisi ratusan judul dan TIAP baris menggambar 3
// dropdown + panel pencarian IMDb — menggambar semuanya sekaligus membuat
// halaman berat dan mustahil ditelusuri.
//
// Semua fungsi di sini MURNI (tanpa DOM/state) supaya aturannya bisa diuji di
// tests/paginasi.test.ts. Yang dijaga adalah kerusakan SENYAP: nomor halaman
// yang keluar rentang tidak memunculkan error apa pun — daftarnya cuma kosong,
// dan layar kosong terbaca seperti panel rusak.
// -------------------------------------------------------------------------

/**
 * Pilihan "berapa baris per halaman".
 *
 * Angka terbesar sengaja melampaui jumlah video yang ada hari ini (±500), jadi
 * memilihnya sama dengan "tampilkan semua" — tanpa perlu nilai khusus yang
 * harus diperlakukan beda di setiap perhitungan.
 */
export const UKURAN_HALAMAN = [25, 50, 100, 150, 200, 500] as const;

export type UkuranHalaman = (typeof UKURAN_HALAMAN)[number];

/**
 * Ukuran yang dipakai saat panel baru dibuka.
 *
 * Dipilih 50, bukan yang terbesar: tiap baris di daftar video menggambar tiga
 * dropdown + panel pencarian IMDb, jadi 500 baris sekaligus itulah keadaan
 * berat yang sedang diperbaiki.
 */
export const UKURAN_BAWAAN: UkuranHalaman = 50;

/** Halaman pertama. Ditulis sekali supaya "mulai dari 1, bukan 0" tidak
 *  tersebar sebagai angka ajaib di beberapa berkas. */
export const HALAMAN_PERTAMA = 1;

/**
 * Berapa halaman yang dibutuhkan untuk menampung `total` baris.
 *
 * Daftar KOSONG tetap memulangkan 1, bukan 0: "Halaman 1 dari 0" itu mustahil
 * dibaca, dan pembagian apa pun terhadap 0 halaman menghasilkan angka liar.
 */
export function hitungJumlahHalaman(total: number, ukuran: number): number {
  if (ukuran <= 0) return 1;
  return Math.max(1, Math.ceil(Math.max(0, total) / ukuran));
}

/**
 * Paksa nomor halaman masuk ke rentang yang benar-benar ada.
 *
 * 🪤 INI PENJAGA UTAMANYA, dan ia dipanggil SAAT RENDER — bukan lewat efek
 * yang membetulkan state sesudahnya. Tiga kejadian nyata membuat nomor halaman
 * jadi kedaluwarsa tanpa ada yang menyentuh tombol halaman:
 *   - saringan diganti (359 video -> 61 video, halaman 3 lenyap);
 *   - sebuah video selesai dicocokkan lalu keluar dari saringan "Belum";
 *   - "baris per halaman" dinaikkan 25 -> 200.
 * Membetulkannya lewat efek berarti ada satu render di mana daftarnya KOSONG
 * lebih dulu — dan kosong itulah yang terbaca seperti kerusakan.
 */
export function jepitHalaman(
  halaman: number,
  total: number,
  ukuran: number,
): number {
  const maks = hitungJumlahHalaman(total, ukuran);
  if (!Number.isFinite(halaman)) return HALAMAN_PERTAMA;
  return Math.min(Math.max(Math.trunc(halaman), HALAMAN_PERTAMA), maks);
}

/**
 * Ambil potongan baris untuk satu halaman.
 *
 * Nomor halaman dijepit DI DALAM fungsi ini, bukan dipercayakan ke pemanggil:
 * pemanggil yang lupa menjepit akan memulangkan array kosong — gagal senyap,
 * bukan error yang kelihatan.
 */
export function potongHalaman<T>(
  items: T[],
  halaman: number,
  ukuran: number,
): T[] {
  if (ukuran <= 0) return [...items];
  const aman = jepitHalaman(halaman, items.length, ukuran);
  const awal = (aman - HALAMAN_PERTAMA) * ukuran;
  return items.slice(awal, awal + ukuran);
}

/** Satu petak di deretan nomor halaman: nomornya, atau "…" untuk yang dilompati. */
export type PetakHalaman = number | "…";

/**
 * Deretan nomor halaman yang digambar sebagai tombol (owner 2026-11-06:
 * "halamannya tertera juga misal 1,2,3,4 dst jadi kalau mau halaman 3 tinggal
 * klik saja").
 *
 * Halaman pertama dan terakhir SELALU ikut, dan halaman yang sedang dibuka
 * selalu ada di deretan — tanpa itu, orang kehilangan jejak posisinya begitu
 * daftarnya belasan halaman.
 *
 * `maks` membatasi lebar deretan supaya 15 halaman tidak menjadi 15 tombol
 * yang membungkus ke baris berikutnya.
 */
export function daftarNomorHalaman(
  aktif: number,
  jumlah: number,
  maks = 7,
): PetakHalaman[] {
  const total = Math.max(1, Math.trunc(jumlah));
  const kini = jepitHalaman(aktif, total, 1); // ukuran 1 -> jumlah halaman = total
  const batas = Math.max(5, Math.trunc(maks)); // di bawah 5, jendelanya tak berarti

  if (total <= batas) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  // Sisakan dua petak untuk halaman pertama & terakhir.
  const ruang = batas - 2;
  let awal = Math.max(2, kini - Math.floor((ruang - 1) / 2));
  let akhir = awal + ruang - 1;
  if (akhir > total - 1) {
    akhir = total - 1;
    awal = Math.max(2, akhir - ruang + 1);
  }

  const petak: PetakHalaman[] = [1];
  // "…" hanya dipasang kalau yang dilompati LEBIH dari satu halaman —
  // mengganti satu nomor dengan "…" membuat tombolnya hilang tanpa menghemat
  // tempat sama sekali.
  if (awal > 3) petak.push("…");
  else if (awal === 3) petak.push(2);
  for (let i = awal; i <= akhir; i++) petak.push(i);
  if (akhir < total - 2) petak.push("…");
  else if (akhir === total - 2) petak.push(total - 1);
  petak.push(total);
  return petak;
}
