// -------------------------------------------------------------------------
// DAFTAR KUALITAS di menu pemutar film (owner 2026-11-13).
//
// PERMINTAAN OWNER: menu "Kualitas video" jangan cuma berisi "Auto" — isi
// dengan tangga 1080p / 720p / 480p seperti pemutar lain pada umumnya.
//
// ⚠️ UTANG TEKNIS YANG DISENGAJA, JANGAN DIKIRA BUG. Pilihan di menu ini
// TIDAK mengganti berkas yang diputar, karena memang tidak ada berkas lain:
// diukur 2026-11-13 ke `/api/public-video` Playly untuk 10 film yang sedang
// tayang, field `variants` (tempat Playly menyimpan versi 1080p/720p/480p)
// KOSONG di 10 dari 10 — yang ada hanya satu `videoUrl` mp4. Owner diberi
// tahu konsekuensinya (penonton yang memilih 480p demi hemat kuota tetap
// mengunduh berkas penuh) dan tetap memilih menampilkannya.
//
// CARA MELUNASI utang ini kalau suatu saat Playly mengaktifkan olah-ulang
// video: `variants` akan terisi alamat per kualitas → ambil daftarnya dari
// sana, ganti `src` video saat dipilih, dan kembalikan `currentTime` supaya
// penonton tidak terlempar ke awal. Fungsi di berkas ini tinggal diberi
// masukan daftar nyata itu; bentuk keluarannya sudah sama.
//
// YANG TETAP JUJUR meski pilihannya belum nyata: daftar TIDAK PERNAH
// menawarkan angka di ATAS resolusi berkasnya. Film 720p hanya menampilkan
// 720p dan 480p — menawarkan "1080p" pada berkas 720p adalah janji yang
// bahkan secara teori tidak bisa ditepati, sedangkan angka yang sama atau
// lebih rendah masih mungkin ditepati begitu varian benar-benar ada.
//
// Semua fungsi MURNI (tanpa DOM/jaringan) supaya bisa diuji langsung di
// tests/kualitas-pemutar.test.ts.
// -------------------------------------------------------------------------

/** Satu anak tangga kualitas: tinggi piksel + label yang dibaca penonton. */
type Tangga = { tinggi: number; label: string };

/**
 * Tangga standar industri, dari paling tinggi. Sengaja berhenti di 360p:
 * di bawah itu gambarnya sudah tidak enak ditonton di layar HP sekalipun.
 */
const TANGGA: Tangga[] = [
  { tinggi: 2160, label: "2160p" },
  { tinggi: 1440, label: "1440p" },
  { tinggi: 1080, label: "1080p" },
  { tinggi: 720, label: "720p" },
  { tinggi: 480, label: "480p" },
  { tinggi: 360, label: "360p" },
];

/** Mulai dari tinggi berapa sebuah video pantas diberi lencana HD. */
const AMBANG_HD = 720;

/**
 * Berapa banyak anak tangga yang ditampilkan, dihitung dari kualitas asli.
 * Tiga = persis seperti contoh yang dikirim owner (1080p / 720p / 480p).
 */
const JUMLAH_TANGGA = 3;

/** Nilai yang disimpan untuk baris "Auto". Satu tempat, supaya pemutar dan
 *  daftar ini tidak pernah memakai ejaan yang berbeda. */
export const NILAI_AUTO = "auto";

/** Pilihan kualitas siap tampil di menu pemutar. */
export type OpsiKualitas = {
  /** Nilai yang disimpan pemutar, mis. "1080p". */
  nilai: string;
  label: string;
  /** Teks lencana kecil di kanan label; null = tanpa lencana. */
  lencana: string | null;
};

/**
 * Kelas kualitas sebuah berkas video dari ukuran gambarnya.
 *
 * 🪤 BUKAN sekadar `tinggi`. Film bioskop sering dipotong jadi layar lebar:
 * "Sentimental Value" yang diukur 2026-11-13 berukuran 1916×1036 — tingginya
 * 1036, tapi itu film 1080p, bukan "1036p". Karena itu yang dipakai adalah
 * tinggi EFEKTIF: tinggi sebenarnya ATAU tinggi yang setara kalau gambar
 * selebar itu dibuat 16:9, mana yang lebih besar.
 *
 * Mengembalikan null kalau ukurannya belum diketahui (metadata video belum
 * dimuat) — pemanggil wajib menyiapkan keadaan "belum tahu", bukan menebak.
 */
export function kelasKualitas(lebar: number, tinggi: number): Tangga | null {
  if (!Number.isFinite(lebar) || !Number.isFinite(tinggi)) return null;
  if (lebar <= 0 || tinggi <= 0) return null;

  const tinggiEfektif = Math.max(tinggi, Math.round((lebar * 9) / 16));
  // Toleransi 5%: berkas 1916×1036 (= 1077 efektif) tetap masuk kelas 1080p,
  // sementara 720×... tidak ikut terangkat.
  const cocok = TANGGA.find((t) => tinggiEfektif >= t.tinggi * 0.95);
  return cocok ?? TANGGA[TANGGA.length - 1];
}

/**
 * Daftar pilihan kualitas untuk menu, dari ukuran gambar video yang sedang
 * diputar: baris **Auto** di paling atas (pilihan bawaan), lalu kualitas asli
 * berkasnya, lalu anak tangga di bawahnya.
 *
 * 🪤 "Auto" WAJIB ADA dan wajib paling atas (owner 2026-11-13, putaran kedua:
 * *"sudah ada tapi auto jangan dihilangkan"*). Versi pertama menggantinya
 * dengan tangga resolusi saja, dan itu menghapus satu-satunya baris yang
 * artinya "biarkan pemutar yang memutuskan" — penonton jadi wajib memilih
 * angka walau tidak paham bedanya.
 *
 * Labelnya menyebut angka yang sedang dipakai ("Auto (1080p)") supaya baris
 * ini tidak terbaca sebagai pilihan yang menyembunyikan sesuatu.
 *
 * Ukuran belum diketahui → daftar KOSONG. Pemanggil menampilkan "Auto" polos;
 * menebak "1080p" sebelum metadata dimuat berarti angka di layar bisa berubah
 * sendiri sedetik kemudian.
 */
export function daftarKualitas(lebar: number, tinggi: number): OpsiKualitas[] {
  const kelas = kelasKualitas(lebar, tinggi);
  if (!kelas) return [];

  const mulai = TANGGA.indexOf(kelas);
  const tangga = TANGGA.slice(mulai, mulai + JUMLAH_TANGGA).map((t) => ({
    nilai: t.label,
    label: t.label,
    lencana: t.tinggi >= AMBANG_HD ? "HD" : null,
  }));

  return [
    { nilai: NILAI_AUTO, label: `Auto (${kelas.label})`, lencana: null },
    ...tangga,
  ];
}
