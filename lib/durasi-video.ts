// -------------------------------------------------------------------------
// BACA DURASI VIDEO DARI HEADER MP4 — fungsi MURNI (tanpa jaringan, tanpa DOM).
//
// KENAPA ADA: kolom Durasi diisi tangan, dan isian massal 2026-09-22 ("119 min"
// untuk 25 serial) tidak punya sumber sama sekali — berkas SQL-nya menyatakan
// sendiri angkanya bukan hasil pembacaan video mana pun. Satu-satunya sumber
// yang JUJUR adalah berkas videonya, dan berkas itu sudah menyimpan durasinya
// di header.
//
// KENAPA TIDAK ffprobe/ffmpeg: tidak terpasang di server, menambah dependensi
// biner ke proses deploy, dan untuk kebutuhan ini berlebihan — yang dicari
// cuma satu angka yang letaknya sudah baku di spesifikasi MP4.
//
// Dipisah dari route API supaya bisa diuji dengan potongan byte buatan, tanpa
// jaringan dan tanpa video sungguhan — tests/durasi-video.test.ts.
// -------------------------------------------------------------------------
import { durasiTayangan } from "./format";
import { isMovie, type Drama } from "./types";

/**
 * Berapa byte awal berkas yang perlu dibaca untuk menemukan durasinya.
 *
 * Atom `moov` (tempat `mvhd` berada) boleh duduk di AWAL atau di AKHIR berkas
 * menurut spesifikasi MP4. Video yang disiapkan untuk streaming hampir selalu
 * menaruhnya di depan ("faststart") — kalau tidak, pemutar harus mengunduh
 * seluruh berkas sebelum bisa memulai. 256KB memberi ruang lega untuk itu
 * sambil tetap jauh lebih kecil daripada satu episode (puluhan MB).
 *
 * Batas jujur: berkas yang `moov`-nya di belakang akan memulangkan `null` —
 * bukan angka salah. Itu disengaja; menebak durasi lebih buruk daripada
 * mengaku tidak tahu.
 */
export const BYTE_HEADER_DIBACA = 256 * 1024;

/**
 * Dua tempat yang dicoba, berurutan: awal berkas lalu EKOR berkas.
 *
 * KENAPA EKOR WAJIB ADA (diukur di produksi 2026-11-09): seluruh 41 video
 * DramaKu berbentuk `ftyp · free · mdat` — data gambar langsung, `moov` di
 * paling belakang. Versi pertama fitur ini cuma membaca awal berkas, dan
 * hasilnya "gagal" pada 41 dari 41 judul. Bukan kasus langka yang bisa
 * dibiarkan: itu bentuk SEMUA berkas di katalog ini.
 *
 * Nilai "-N" adalah suffix range HTTP = "N byte terakhir". Dicoba BELAKANGAN
 * karena berkas ber-faststart (moov di depan) jauh lebih murah dibaca dari
 * awal, dan tiap percobaan berarti satu permintaan ke tunnel PC backup rumahan.
 */
export const JANGKAUAN_DICOBA = [
  `bytes=0-${BYTE_HEADER_DIBACA - 1}`,
  `bytes=-${BYTE_HEADER_DIBACA}`,
] as const;

/**
 * Ukuran baku atom `mvhd` — satu-satunya nilai sah per versi.
 *
 * Dipakai sebagai PENJAGA, bukan kerapian: pencarian 4 huruf "mvhd" di dalam
 * berkas video pasti sesekali menabrak data gambar yang kebetulan berbunyi
 * sama. Terbukti pada berkas produksi 2026-11-09 — kecocokan palsu terbaca
 * sebagai `timescale = 3.865.645.486` lalu menghasilkan 0,00000026 detik.
 * Angka itu tidak error; ia cuma salah.
 */
const UKURAN_MVHD: Record<number, number> = { 0: 108, 1: 120 };

/**
 * Baca durasi (DETIK) dari potongan berkas MP4. `null` = tidak ketemu.
 *
 * Cara kerjanya: cari atom `mvhd` ("movie header"), lalu baca dua angka di
 * dalamnya — `timescale` (berapa satuan waktu per detik) dan `duration`
 * (panjang video dalam satuan itu). Durasi detik = duration / timescale.
 *
 * ⚠️ TATA LETAK — JANGAN diubah tanpa membuka spesifikasinya (ISO/IEC
 * 14496-12). Dihitung dari huruf "m" pada "mvhd":
 *   versi 0: +8 creation(4) · +12 modification(4) · **+16 timescale(4)** · **+20 duration(4)**
 *   versi 1: +8 creation(8) · +16 modification(8) · **+24 timescale(4)** · **+28 duration(8)**
 *
 * 🪤 Versi pertama berkas ini (2026-11-09, sempat TAYANG) memakai +12/+16 dan
 * +20/+24 — meleset 4 byte, sehingga yang terbaca sebagai `timescale`
 * sebenarnya `modification_time`. Itu TIDAK ketahuan oleh tes, karena tes
 * ikut merakit byte dengan offset yang sama salahnya: tesnya memvalidasi kode
 * terhadap asumsi kode itu sendiri. Penjaganya sekarang memakai angka dari
 * berkas produksi SUNGGUHAN (timescale 1000, duration 135600 → 2:16), yang
 * tidak bisa dibuat cocok oleh offset yang salah.
 */
export function detikDariHeaderMp4(buf: Uint8Array): number | null {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // Mulai dari 4: ukuran atom duduk di 4 byte SEBELUM namanya, jadi kecocokan
  // di posisi 0-3 tidak mungkin punya header yang sah.
  // Sisa 36 byte adalah ruang minimum yang dibutuhkan pembacaan versi 1.
  for (let i = 4; i + 36 <= buf.length; i++) {
    if (
      buf[i] !== 0x6d || // m
      buf[i + 1] !== 0x76 || // v
      buf[i + 2] !== 0x68 || // h
      buf[i + 3] !== 0x64 // d
    ) {
      continue;
    }
    const versi = buf[i + 4];
    // Kecocokan palsu disaring di sini — lihat UKURAN_MVHD. `continue`, bukan
    // `return`: atom yang asli bisa saja muncul setelahnya.
    if (view.getUint32(i - 4) !== UKURAN_MVHD[versi]) continue;

    const skala =
      versi === 1 ? view.getUint32(i + 24) : view.getUint32(i + 16);
    const durasi =
      versi === 1 ? Number(view.getBigUint64(i + 28)) : view.getUint32(i + 20);

    // `duration = 0xFFFFFFFF` adalah penanda baku "panjangnya tidak diketahui"
    // (siaran langsung / berkas yang perekamannya terputus). Angka itu harus
    // ditolak, bukan dibagi — hasilnya jadi durasi raksasa yang terlihat sah.
    if (versi !== 1 && durasi === 0xffffffff) continue;
    if (skala > 0 && durasi > 0) return durasi / skala;
  }
  return null;
}

/**
 * Detik → bentuk yang dipakai kolom Durasi untuk EPISODE: "M.SS".
 *
 * Sengaja memakai titik, bukan titik dua: itu yang diketik owner sendiri di
 * panel admin ("1.47"), dan keduanya sama-sama dibaca `detikDariDurasiEpisode`
 * di lib/format.ts. Memakai bentuk yang sudah dikenal owner membuat hasil
 * pengukuran terlihat seperti isian manusia, bukan format asing yang bikin
 * ragu apakah boleh disunting.
 *
 * Dibulatkan ke detik terdekat — selisih di bawah 1 detik tidak berarti apa
 * pun bagi penonton, dan menyimpan pecahan membuat angkanya sulit disunting.
 */
export function detikKeDurasiEpisode(detik: number): string | null {
  if (!Number.isFinite(detik) || detik <= 0) return null;
  const bulat = Math.round(detik);
  const menit = Math.floor(bulat / 60);
  const sisa = bulat % 60;
  // Lebih dari 999 menit = pembacaan yang hampir pasti salah (episode drama
  // pendek 1-3 menit, film terpanjang pun di bawah 300 menit). Memulangkan
  // null membuatnya ketahuan, bukan tersimpan diam-diam.
  if (menit > 999) return null;
  return `${menit}.${String(sisa).padStart(2, "0")}`;
}

/**
 * Apakah durasi drama ini SUDAH benar menurut aturan tampilan?
 *
 * "Benar" di sini berarti satu hal yang bisa diperiksa: nilainya benar-benar
 * tergambar di poster. Isian seperti "119 min" pada serial lolos sebagai teks
 * tapi tidak pernah tergambar — itulah yang membuatnya bertahan berbulan-bulan
 * tanpa ketahuan.
 *
 * Ditaruh di lib, bukan di dalam komponen DurasiUkurSemua, supaya bisa diuji
 * tanpa merender apa pun — pola yang sama dipakai `videoBelumDicocokkan`
 * (lib/playly-imdb.ts) untuk pencocokan massal Playly.
 */
export function durasinyaSudahBenar(
  d: Pick<Drama, "kind" | "runtime">,
): boolean {
  return durasiTayangan(d.runtime, isMovie(d)) !== null;
}

/**
 * Drama yang durasinya BELUM benar — yang akan dicentang otomatis saat
 * pengisian massal.
 *
 * Pagar "jangan timpa isian tangan": drama yang durasinya sudah tergambar
 * TIDAK masuk daftar ini, jadi koreksi manual owner tidak tertimpa hasil ukur
 * tanpa dia memintanya. Hasil ukurnya tetap ditampilkan untuk dibandingkan —
 * yang ditahan cuma centang otomatisnya.
 */
export function dramaButuhDurasi<T extends Pick<Drama, "kind" | "runtime">>(
  dramas: T[],
): T[] {
  return dramas.filter((d) => !durasinyaSudahBenar(d));
}
