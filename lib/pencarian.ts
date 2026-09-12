// -------------------------------------------------------------------------
// Aturan "teks ini cocok dengan yang diketik penonton" — SATU tempat untuk
// SELURUH situs: katalog drama (lib/discover.ts) dan video Playly
// (app/components/beranda/HasilPlayly.tsx).
//
// Kenapa dipisah jadi berkas sendiri, bukan ditulis di masing-masing tempat:
// kalau dua permukaan pencarian punya aturan cocok sendiri-sendiri, penonton
// mengetik kalimat yang sama lalu mendapat jawaban berbeda tergantung sedang
// berada di halaman mana — dan tak ada pesan error yang memberi tahu.
//
// Fungsi murni semua (tanpa jaringan/database) supaya aturannya bisa diuji
// langsung; lihat tests/pencarian.test.ts.
// -------------------------------------------------------------------------

/**
 * Samakan bentuk teks sebelum dibandingkan.
 *
 * Tiga hal yang diratakan, masing-masing karena pernah membuat pencarian
 * memulangkan NOL padahal judulnya ada:
 *   1. huruf besar/kecil  -> "CEO" = "ceo"
 *   2. aksen              -> "Alienigena" = "Alienígena"
 *   3. tanda baca & emoji -> "Spider-Man:" = "spider man"
 *
 * Tanda baca diganti SPASI (bukan dihapus) supaya "Spider-Man" pecah jadi dua
 * kata; kalau dihapus ia jadi "spiderman" dan ketikan "spider man" tetap meleset.
 */
export function normalisasiTeks(teks: string): string {
  return teks
    .normalize("NFD") // pisahkan huruf dari aksennya: "í" -> "i" + tanda aksen
    .replace(/\p{M}+/gu, "") // buang tanda aksennya, sisakan hurufnya
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ") // tanda baca/emoji/simbol -> spasi
    .trim();
}

/**
 * Ketikan penonton -> daftar kata yang harus dicari.
 * Daftar KOSONG berarti penonton tidak sedang mencari apa pun (kotak cari
 * kosong, atau isinya cuma spasi/tanda baca) — bukan berarti "tidak ada yang
 * cocok".
 */
export function pecahKataKunci(ketikan: string): string[] {
  const bersih = normalisasiTeks(ketikan);
  return bersih ? bersih.split(" ") : [];
}

/**
 * Cocok kalau SEMUA kata yang diketik muncul di salah satu teks yang diberikan.
 *
 * Sengaja "semua kata, urutan bebas" — bukan mencocokkan kalimat utuh seperti
 * cara lama. Alasannya dari kegagalan nyata di katalog produksi:
 *   - "transformers last knight" (kata "The" dilewat) dulu 0 hasil
 *   - "knight dark" (urutan dibalik)               dulu 0 hasil
 * Penonton mengetik dari ingatan, jadi kata yang terlewat & urutan yang tertukar
 * itu hal biasa, bukan kesalahan yang pantas dibalas halaman kosong.
 *
 * Syaratnya tetap SEMUA kata (bukan salah satu): kalau cukup satu kata, mengetik
 * judul panjang justru memulangkan hampir seluruh katalog.
 */
export function cocokSemuaKata(
  kata: string[],
  ...teks: (string | null | undefined)[]
): boolean {
  if (kata.length === 0) return true;
  // Digabung DULU baru dinormalisasi sekali — lebih murah daripada
  // menormalisasi tiap field, dan spasi pemisah mencegah kata palsu terbentuk
  // dari ujung satu field bertemu awal field berikutnya.
  const gabungan = normalisasiTeks(teks.filter(Boolean).join(" "));
  return kata.every((k) => gabungan.includes(k));
}

/**
 * Saring daftar apa pun dengan ketikan penonton.
 *
 * `teksDari` menentukan bagian mana dari tiap item yang boleh dicari — itulah
 * satu-satunya yang berbeda antara drama (judul/kategori/sinopsis) dan video
 * Playly (judul/kreator/drama terkait). Ketikan kosong memulangkan daftar apa
 * adanya, bukan daftar kosong.
 */
export function saringDenganKetikan<T>(
  daftar: T[],
  ketikan: string,
  teksDari: (item: T) => (string | null | undefined)[],
): T[] {
  const kata = pecahKataKunci(ketikan);
  if (kata.length === 0) return daftar;
  return daftar.filter((item) => cocokSemuaKata(kata, ...teksDari(item)));
}
