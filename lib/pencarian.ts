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
 * Cocok kalau SEMUA kata yang diketik mengawali salah satu kata di teks.
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
 *
 * ── PREFIX SEARCH sejak 2026-11-13 (keputusan owner) ──
 *
 * Yang berubah: dulu tiap kata dicari sebagai potongan BEBAS di mana saja, jadi
 * mengetik "ight" ikut memulangkan "Kn‑ight" dan "ona" memulangkan "pers‑ona".
 * Sekarang kata yang diketik harus MENGAWALI sebuah kata di teksnya — "fan"
 * menemukan "Fantasy", tapi "antasy" tidak lagi.
 *
 * Kenapa lebih baik: orang mengetik judul dari DEPAN, tidak pernah dari tengah
 * kata. Pencocokan bebas membuat ketikan pendek menyeret judul yang kebetulan
 * mengandung potongan huruf itu di tengah — hasilnya terasa acak, dan daftar
 * saran yang terasa acak mengajarkan orang mengabaikannya.
 *
 * Harga yang dibayar, supaya jujur: potongan TENGAH kata berhenti bekerja.
 * Penonton yang hanya ingat "...formers" tidak lagi menemukan "Transformers".
 * Diperiksa terhadap seluruh tes pencarian yang ada (judul produksi sungguhan):
 * NOL yang rusak — semuanya memang mengetik kata utuh dari depan.
 *
 * 🪤 Caranya memakai SATU spasi di depan, bukan `split(" ")` lalu `some()`.
 * Keduanya memberi jawaban sama, tapi fungsi ini dipanggil sekali untuk TIAP
 * judul di katalog pada TIAP ketikan huruf; memecah string jadi array di jalur
 * sepanas itu membuat sampah memori yang tak perlu. `normalisasiTeks` sudah
 * menjamin pemisahnya spasi tunggal, jadi " " + kata = "awal sebuah kata".
 */
export function cocokSemuaKata(
  kata: string[],
  ...teks: (string | null | undefined)[]
): boolean {
  if (kata.length === 0) return true;
  // Digabung DULU baru dinormalisasi sekali — lebih murah daripada
  // menormalisasi tiap field, dan spasi pemisah mencegah kata palsu terbentuk
  // dari ujung satu field bertemu awal field berikutnya.
  // Spasi di DEPAN membuat kata pertama ikut punya pembatas kiri, jadi ia
  // diperlakukan sama dengan kata-kata sesudahnya.
  const gabungan = " " + normalisasiTeks(teks.filter(Boolean).join(" "));
  return kata.every((k) => gabungan.includes(" " + k));
}

/**
 * Cocok kalau salah satu teks DIAWALI ketikan — dari huruf pertama namanya,
 * bukan dari awal kata mana pun di dalamnya.
 *
 * ⭐ INI ATURAN PENCARIAN SELURUH SITUS sejak 2026-11-13 — kotak cari penonton,
 * saran saat mengetik, video Playly, daftar film di panel admin, dan kolom
 * genre. Owner memintanya bertahap dalam satu sesi, makin tegas tiap putaran:
 *   1. "untuk search gunakan Prefix Search"
 *   2. "saya mau ketika ketik s muncul semua yang berawalan s"
 *   3. "begitu ketik ro, yang muncul pun harus ro dan berlaku di semua search"
 *   4. "dua search ini belum seragam" + gambar kotak cari penonton & admin
 *      yang masih memunculkan judul dengan kata cocok di TENGAH.
 *
 * Aturannya sesederhana yang terlihat di layar: **APA YANG TAMPIL harus
 * DIAWALI APA YANG DIKETIK.** Penonton selalu bisa menjelaskan sendiri kenapa
 * sebuah baris muncul, cukup dengan melihatnya.
 *
 * 🪤 HARGA YANG DIBAYAR — jangan "perbaiki" tanpa menanyakan owner dulu.
 * Ini MEMBALIK perbaikan 2026-09-12 yang dulu juga diminta owner. Kata di
 * tengah judul berhenti ditemukan, dan dua kegagalan ini SENGAJA dihidupkan
 * kembali sebagai konsekuensi yang diterima:
 *   - "knight"      TIDAK lagi menemukan "The Dark Knight"
 *   - "dark knight" TIDAK lagi menemukan "The Dark Knight" (judulnya "The …")
 * Owner diberi tahu persis dua contoh ini sebelum memutuskan, lalu tetap
 * meminta penyeragaman. Kalau suatu saat terasa terlalu sempit, yang
 * dikembalikan adalah `cocokSemuaKata` di bawah — ia sengaja TIDAK dihapus.
 *
 * Beberapa teks boleh dioper sekaligus; cukup SALAH SATU yang diawali
 * ketikan. Dipakai video Playly (judul · kreator · nama drama), dan aturan
 * memilih mana yang boleh ikut cuma satu: teks itu harus TERGAMBAR di hasil.
 *
 * Ketikan kosong memulangkan `true`: "belum mengetik apa-apa" berarti jangan
 * menyaring, bukan berarti tidak ada yang cocok.
 */
export function diawaliKetikan(
  ketikan: string,
  ...teks: (string | null | undefined)[]
): boolean {
  const cari = normalisasiTeks(ketikan);
  if (!cari) return true;
  return teks.some((t) => Boolean(t) && normalisasiTeks(t as string).startsWith(cari));
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
  // ⚠️ Memakai `diawaliKetikan`, BUKAN `cocokSemuaKata` — owner 2026-11-13,
  // putaran 5: "dua search ini belum seragam", disertai gambar dua kotak cari
  // yang memunculkan judul dengan kata cocok di TENGAH ("Menguasai Harem
  // Kaisar" untuk ketikan "ha", "Holiday Special" untuk "sp").
  //
  // Sekarang satu aturan untuk SELURUH situs, sama dengan kolom genre: yang
  // TAMPIL harus DIAWALI yang DIKETIK. Harganya besar dan disengaja — lihat
  // catatan panjang di `diawaliKetikan` di atas.
  if (!normalisasiTeks(ketikan)) return daftar;
  return daftar.filter((item) => diawaliKetikan(ketikan, ...teksDari(item)));
}
