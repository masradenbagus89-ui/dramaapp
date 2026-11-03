// -------------------------------------------------------------------------
// OLAH SUARA PEMUTAR — "Volume Stabil" & "Penguat suara" (owner 2026-11-03).
//
// APA ARTINYA buat penonton:
//   • Volume Stabil  = meratakan suara. Dialog bisik dan ledakan tidak lagi
//     berbeda jauh, jadi penonton tak perlu bolak-balik menaikkan-menurunkan
//     volume. Istilah teknisnya DynamicsCompressor.
//   • Penguat suara  = menaikkan suara MELEWATI 100%. Berguna untuk film yang
//     suara aslinya memang direkam pelan. `video.volume` mentok di 1.0, jadi
//     ini satu-satunya cara menaikkannya lebih tinggi.
//
// KENAPA BERKAS INI ADA, padahal tombolnya sudah lama tampil di menu: sampai
// hari ini kedua tombol itu dipasang MATI PERMANEN di PlaylyPlayer
// (`aktif: false, onUbah: () => undefined`) — mesinnya memang tidak pernah
// dibangun, nol `AudioContext` di seluruh project. Owner melaporkannya
// 2026-11-03: "tombol volume dan penguat suara belum berfungsi".
//
// ⚠️ PAGAR YANG TIDAK BOLEH DILONGGARKAN. Web Audio hanya boleh menyentuh
// suara dari berkas yang mengizinkan akses lintas domain (CORS). Kalau sumber
// TIDAK mengizinkan lalu tetap disambungkan, hasilnya BUKAN error melainkan
// **video bisu total** — penonton kehilangan suara dan tak ada satu pun pesan
// yang menjelaskan. Diukur 2026-11-03: berkas video Playly di Cloudflare R2
// membalas NOL header `Access-Control-Allow-Origin`. Karena itu fitur ini
// SELALU lewat gerbang di bawah, tidak pernah dinyalakan berdasarkan dugaan.
//
// Fungsi di sini MURNI (tanpa DOM/jaringan) supaya bisa diuji —
// tests/olah-suara.test.ts. Bagian yang menyentuh Web Audio ada di
// app/components/player/useOlahSuara.ts.
// -------------------------------------------------------------------------

/**
 * Setelan DynamicsCompressor untuk "Volume Stabil".
 *
 * Angkanya dipilih untuk MERATAKAN, bukan memampatkan habis-habisan: film yang
 * terdengar "dipipihkan" justru kehilangan tenaga di adegan aksi. `ratio: 4`
 * adalah kompresi sedang yang lazim dipakai penyiaran, dan `threshold: -28 dB`
 * membuat hanya bagian yang benar-benar keras ikut ditahan.
 */
export const SETELAN_VOLUME_STABIL = {
  /** Mulai menahan di atas nilai ini (dB). Makin rendah = makin banyak yang ditahan. */
  threshold: -28,
  /** Pelembut di sekitar ambang (dB) supaya peralihannya tidak terdengar memotong. */
  knee: 24,
  /** Seberapa kuat ditahan. 4:1 = tiap 4 dB di atas ambang keluar jadi 1 dB. */
  ratio: 4,
  /** Secepat apa menahan saat suara mendadak keras (detik). */
  attack: 0.004,
  /** Secepat apa melepas lagi (detik). Terlalu cepat = suara "memompa". */
  release: 0.25,
} as const;

/**
 * Batas atas "Penguat suara".
 *
 * 2× (≈ +6 dB) dipilih sebagai batas, BUKAN 3× atau lebih: di atas itu suara
 * mulai pecah (clipping) pada film yang aslinya sudah keras, dan penonton akan
 * menyalahkan situsnya, bukan setelannya. Kompresor di atas ikut menahan puncak
 * saat Volume Stabil juga menyala, tapi batas ini tetap berlaku sendiri karena
 * kedua tombol bisa dinyalakan terpisah.
 */
export const PENGUAT_MAKS = 2;

/**
 * Berapa kali lipat suara dikuatkan untuk keadaan tombol tertentu.
 *
 * Dipisah jadi fungsi (bukan nilai langsung di komponen) supaya batasnya
 * teruji: gain yang lolos di atas `PENGUAT_MAKS` adalah cara paling mudah
 * membuat suara pecah, dan kerusakannya tidak kelihatan di layar.
 */
export function gainPenguat(aktif: boolean): number {
  return aktif ? PENGUAT_MAKS : 1;
}

/**
 * Apakah berkas video berasal dari domain yang sama dengan halaman.
 *
 * Sumber se-origin TIDAK butuh izin CORS sama sekali — Web Audio boleh
 * langsung menyentuhnya. Ini jalur tercepat dan tanpa pemeriksaan jaringan.
 *
 * `null` (alamat belum diambil) dihitung "bukan se-origin" supaya menu tidak
 * sempat menjanjikan fitur yang belum tentu bisa dipakai.
 */
export function seOrigin(src: string | null, hrefHalaman: string): boolean {
  if (!src) return false;
  try {
    const halaman = new URL(hrefHalaman);
    return new URL(src, hrefHalaman).origin === halaman.origin;
  } catch {
    return false;
  }
}

/** Keadaan gerbang olah-suara, dipakai menu untuk memutuskan apa yang tampil. */
export type IzinSuara =
  /** Belum tahu — alamat video belum ada, atau pemeriksaan izin masih jalan. */
  | "memeriksa"
  /** Boleh diolah: sumber se-origin, atau lintas domain yang mengizinkan. */
  | "boleh"
  /** Tidak boleh: sumber lintas domain tanpa izin. Fitur WAJIB tetap mati. */
  | "tidak";

/**
 * Kalimat yang dibaca penonton saat fitur tidak tersedia.
 *
 * Ditulis sebagai sebab yang bisa dimengerti orang awam ("sumbernya tidak
 * mengizinkan"), bukan istilah teknis ("CORS"), DAN tidak menyalahkan
 * penontonnya — tak ada yang bisa mereka lakukan untuk memperbaikinya.
 */
export const ALASAN_SUARA_MATI =
  "tidak tersedia untuk video ini — sumbernya tidak mengizinkan suara diolah";

/** Alasan yang ditampilkan untuk sebuah keadaan gerbang. `undefined` = fitur hidup. */
export function alasanMatiUntuk(izin: IzinSuara): string | undefined {
  return izin === "boleh" ? undefined : ALASAN_SUARA_MATI;
}

// ===========  PERAKITAN RANTAI  ==========================================
//
// Bagian di bawah dipisah dari komponen React SUPAYA BISA DIUJI. Merakit
// Web Audio adalah bagian paling rawan di fitur ini — salah urutan atau salah
// nilai tidak memunculkan error, cuma suara yang hilang atau pecah — dan
// browser tanpa perangkat suara (mesin kerja kita) TIDAK bisa membuktikannya.
// Dengan bentuk ini, aturannya diuji memakai AudioContext tiruan.

/** Bentuk minimum node yang kita butuhkan — cukup untuk dites dengan tiruan. */
export type NilaiAudio = { value: number };
export type RantaiSuara = {
  kompresor: {
    threshold: NilaiAudio;
    knee: NilaiAudio;
    ratio: NilaiAudio;
    attack: NilaiAudio;
    release: NilaiAudio;
  };
  gain: { gain: NilaiAudio };
};

/**
 * Terapkan keadaan dua sakelar ke rantai yang sudah dirakit.
 *
 * ⚠️ VOLUME STABIL MATI = kompresor dibuat TIDAK BERPENGARUH (ratio 1:1,
 * ambang 0 dB) — BUKAN dilepas dari rantai. Melepas-sambung node saat suara
 * sedang jalan menimbulkan bunyi "klik" yang terdengar jelas oleh penonton.
 */
export function terapkanSetelanSuara(
  rantai: RantaiSuara,
  opsi: { volumeStabil: boolean; penguatSuara: boolean },
): void {
  const s = SETELAN_VOLUME_STABIL;
  const k = rantai.kompresor;
  k.threshold.value = opsi.volumeStabil ? s.threshold : 0;
  k.knee.value = opsi.volumeStabil ? s.knee : 0;
  k.ratio.value = opsi.volumeStabil ? s.ratio : 1;
  k.attack.value = s.attack;
  k.release.value = s.release;
  rantai.gain.gain.value = Math.min(gainPenguat(opsi.penguatSuara), PENGUAT_MAKS);
}

/**
 * Perlukah rantai audio dirakit sama sekali?
 *
 * Tidak ada yang dinyalakan = JANGAN sentuh apa pun. Merakit "untuk
 * berjaga-jaga" berarti SEMUA penonton suaranya dialihkan lewat AudioContext
 * walau tak memakai fiturnya — menambah risiko bisu tanpa satu pun manfaat.
 */
export function perluRantaiSuara(opsi: {
  bisa: boolean;
  volumeStabil: boolean;
  penguatSuara: boolean;
}): boolean {
  return opsi.bisa && (opsi.volumeStabil || opsi.penguatSuara);
}
