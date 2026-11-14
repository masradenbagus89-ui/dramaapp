// -------------------------------------------------------------------------
// TAHUN RILIS sebuah tayangan, dan urutan "yang paling baru rilisnya lebih dulu".
//
// KENAPA ADA (owner 2026-11-14): seksi "Film Terbaru" di halaman depan selama
// ini diurutkan dari WAKTU UPLOAD (`receivedAt`, lib/playly-gabungan.ts), jadi
// film 2021 yang kebetulan baru diunggah kemarin duduk di depan film 2026.
// Owner: "lihat dari tahunnya bukan dari yang baru di upload biar terupdate
// film yang benar benar baru".
//
// BERLAKU SE-SITUS, bukan satu baris (owner 2026-11-14, permintaan kedua:
// "seragam ikut tahun rilis"). Karena itu pemanggilnya SATU — titik rakit
// daftar video di lib/playly-gabungan.ts `rakitGabungan` — bukan ditempel di
// tiap halaman. Dua halaman yang memakai aturan berbeda adalah bug yang
// menunggu: penonton melihat urutan berubah hanya karena berpindah halaman,
// dan tak ada error yang memberi tahu siapa pun.
//
// NAMANYA bukan "film" walau berkasnya begitu: serial Playly lewat jalur rakit
// yang sama, dan fungsi yang namanya menjanjikan film tapi juga memproses
// serial adalah nama yang berbohong (§3.7).
//
// ⚠️ KENAPA JUDUL IKUT DIBACA, bukan cukup kolom `year`. Diukur di produksi
// 2026-11-14 atas 481 video yang tayang: 377 punya `year` tersimpan, 70 lagi
// tahunnya HANYA ada di dalam judul ("The Mongoose (2026)"), 34 tak punya di
// mana pun.
//
// Yang membuat pembacaan judul WAJIB bukan angka 70-nya, melainkan SIAPA: 12
// video paling depan hari itu — persis yang dikeluhkan owner — semuanya belum
// dicocokkan metadatanya, jadi `year`-nya null. Mengurut dari kolom `year` saja
// justru melempar film TERBARU ke buntut daftar: kebalikan dari yang diminta,
// dan rusaknya SENYAP (nol error, cuma baris yang isinya salah).
//
// 📌 Angka di atas POTRET SESAAT, bukan sifat tetap — terukur bergerak dalam
// setengah jam yang sama (377 -> 444 bervideo-tahun) karena admin sedang
// melengkapi metadata. Jadi jangan pakai angkanya untuk memutuskan "pembacaan
// judul sudah tak perlu": selama video baru masuk lebih cepat daripada
// pencocokan metadatanya, upload TERBARU akan selalu jadi yang `year`-nya
// paling sering kosong — persis kelompok yang paling penting diurutkan benar.
//
// ⚠️ URUTAN SUMBER: `year` DULU, judul cuma cadangan. `year` sudah berisi
// ketikan admin yang menang atas IMDb (lib/durasi-video-publik.ts:80), dan
// ketikan admin adalah koreksi SADAR manusia — ia tak boleh kalah oleh angka
// yang kebetulan tertulis di nama berkas.
//
// Batas yang diketahui (jujur, bukan disembunyikan): 13 dari 481 video punya
// tahun IMDb yang BEDA dari tahun di judulnya, dan sebagian jelas salah-cocok
// ("Pitfall (2025)" tercatat 1962). Film itu akan duduk di tahun IMDb-nya.
// Cara membetulkannya sudah ada dan tidak butuh kode baru: isi kolom Tahun di
// panel admin — ketikan admin menang atas semuanya.
//
// Semua fungsi MURNI (tanpa jaringan/DOM) supaya aturannya bisa diuji di
// tests/tahun-film.test.ts.
// -------------------------------------------------------------------------

/**
 * Tahun yang tertulis di dalam judul, dalam kurung: "The Mongoose (2026)".
 *
 * HARUS DALAM KURUNG, dan itu pagar yang penting — bukan sekadar "4 angka yang
 * kebetulan ada di judul". Tanpa kurung, "Blade Runner 2049" akan terbaca
 * sebagai film tahun 2049 dan menguasai urutan teratas selamanya.
 *
 * Kurung boleh di tengah: 5 judul di produksi berbentuk "Thudarum (2025) ESub"
 * atau "Imitation (2023) - E02" — embel-embel sesudah tahun adalah sisa nama
 * berkas, dan membuang kelimanya tak ada untungnya.
 *
 * Yang PERTAMA yang diambil kalau ada lebih dari satu: pola penamaan berkas
 * film menaruh tahun rilis tepat sesudah judulnya, apa pun yang menyusul.
 */
export function tahunDariJudul(judul: string | null | undefined): number | null {
  const cocok = String(judul ?? "").match(/\((19|20)\d{2}\)/);
  return cocok ? Number(cocok[0].slice(1, -1)) : null;
}

/**
 * Tahun dari kolom `year` yang sudah ditempel perakit video.
 *
 * Nilainya tidak selalu 4 angka bersih: IMDb memulangkan rentang untuk serial
 * ("2024–2027", "2022–"). Yang diambil angka PERTAMA = tahun MULAI tayang,
 * sebab itulah "kapan judul ini rilis" — memakai tahun tamat akan menaruh
 * serial lama yang baru berakhir di atas film yang benar-benar baru.
 */
export function tahunDariKolom(year: string | null | undefined): number | null {
  const cocok = String(year ?? "").match(/(19|20)\d{2}/);
  return cocok ? Number(cocok[0]) : null;
}

/** Bentuk minimum yang dibutuhkan — sengaja bukan `PlaylyVideoPublik` utuh,
 *  supaya berkas ini tidak ikut terseret tiap kali bentuk kartu berubah. */
export type TayanganBertahun = { title: string; year: string | null };

/**
 * Tahun rilis sebuah film: kolom `year` dulu, judul sebagai cadangan.
 * `null` = tidak ada tahun di mana pun.
 */
export function tahunRilis(v: TayanganBertahun): number | null {
  return tahunDariKolom(v.year) ?? tahunDariJudul(v.title);
}

/**
 * Urutkan film: tahun rilis TERBARU lebih dulu.
 *
 * Dua aturan tambahan, keduanya disengaja:
 *
 * 1. TAHUN SAMA -> urutan masuknya dipertahankan. Daftar yang masuk sudah
 *    terurut terbaru-upload dari lib/playly-gabungan.ts, jadi di antara sesama
 *    film 2026 yang baru diunggah tetap di depan. Memakai `sort` bawaan yang
 *    stabil, bukan mengarang pembanding kedua.
 *
 * 2. TANPA TAHUN -> ke BELAKANG, bukan dibuang. Membuangnya berarti judul yang
 *    metadatanya belum lengkap LENYAP dari situs; menaruhnya di
 *    depan berarti barisnya diisi judul yang justru paling tidak diketahui
 *    kebaruannya. Di belakang = masih bisa dicapai, tidak mengganggu.
 *
 * Memulangkan array BARU — daftar milik pemanggil tidak diubah di tempat
 * (§3.7: fungsi tak boleh punya efek samping tersembunyi).
 */
export function urutMenurutTahunRilis<T extends TayanganBertahun>(videos: T[]): T[] {
  return [...videos].sort((a, b) => {
    const ta = tahunRilis(a);
    const tb = tahunRilis(b);
    if (ta === tb) return 0;
    // null selalu kalah, ke arah mana pun dibandingkan.
    if (ta === null) return 1;
    if (tb === null) return -1;
    return tb - ta;
  });
}
