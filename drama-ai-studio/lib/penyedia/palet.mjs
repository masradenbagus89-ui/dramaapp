// Palet per-mood: satu tabel yang menentukan WARNA dan NADA tiap adegan.
//
// Digabung dalam satu berkas karena keduanya menyatakan hal yang sama — rasa
// adegan — dan memisahkannya hanya akan membuat warna dan musik bisa berbeda
// pendapat tanpa ada yang sadar.
//
// `mood` di naskah adalah satu-satunya tombol yang dipegang penulis; sisanya
// (gradasi, getar kamera, nada dasar) diturunkan mekanis dari sini.

// ⚠️ NADA WAJIB DI ATAS ~150 Hz. Versi pertama memakai 65-196 Hz dan hasilnya
// TERUKUR hening bagi owner: seluruh tenaga audio jatuh di bawah 200 Hz
// (-17,9 dB di bawah 200 Hz vs -37,5 dB di atasnya), dan speaker laptop/HP
// secara fisik tidak mereproduksi frekuensi serendah itu. "Ada sinyal audio"
// BUKAN "terdengar" — periksa sebaran frekuensinya, bukan cuma volumenya:
//   ffmpeg -i x.mp4 -af "highpass=f=200,volumedetect" -f null -

/** Jenis gradasi ffmpeg: 0 linear, 1 radial, 2 circular, 3 spiral. */
export const GRADASI = { LINEAR: 0, RADIAL: 1, CIRCULAR: 2, SPIRAL: 3 };

/**
 * @typedef {object} Mood
 * @property {[string,string,string]} warna  tiga warna gradasi (format 0xRRGGBB)
 * @property {number} gradasi                salah satu nilai GRADASI
 * @property {[number,number,number]} nadaHz  tiga nada akor bed audio (Hz)
 * @property {number} volume                 0..1, volume bed audio
 * @property {number} zoom                   kekuatan gerak kamera (0.20 = tenang, 0.45 = menekan).
 *                                           Di bawah ~0,20 gerakannya TERUKUR tak terbaca sebagai
 *                                           gerakan: pada 0,14 selama 7 detik owner melaporkan
 *                                           "tidak bergerak" padahal bingkainya memang berubah.
 */

/** @type {Record<string, Mood>} */
export const MOOD = {
  "fajar-dingin": {
    warna: ["0x0A1018", "0x1B2A3A", "0x3E5A70"],
    gradasi: GRADASI.RADIAL,
    nadaHz: [196, 294, 440],
    volume: 0.16,
    zoom: 0.28,
  },
  judul: {
    warna: ["0x05070C", "0x14223A", "0xC8A96A"],
    gradasi: GRADASI.LINEAR,
    nadaHz: [220, 330, 494],
    volume: 0.22,
    zoom: 0.2,
  },
  "korporat-megah": {
    warna: ["0x0C1424", "0x24405E", "0x7C93A8"],
    gradasi: GRADASI.LINEAR,
    nadaHz: [262, 392, 588],
    volume: 0.14,
    zoom: 0.26,
  },
  "dingin-tertahan": {
    warna: ["0x0A0F16", "0x1A2430", "0x46586A"],
    gradasi: GRADASI.RADIAL,
    nadaHz: [185, 278, 416],
    volume: 0.13,
    zoom: 0.24,
  },
  hina: {
    warna: ["0x1A0C14", "0x3A1828", "0x8A3050"],
    // RADIAL, bukan CIRCULAR: circular/spiral menggambar baji bertepi tajam
    // yang terbaca sebagai glitch di layar penuh (diperiksa dari frame hasil,
    // bukan dari dokumentasi). Hanya linear & radial yang aman dipakai.
    gradasi: GRADASI.RADIAL,
    nadaHz: [233, 349, 524],
    volume: 0.17,
    zoom: 0.3,
  },
  kedatangan: {
    warna: ["0x090C14", "0x1C2438", "0xC8A96A"],
    gradasi: GRADASI.RADIAL,
    nadaHz: [175, 262, 392],
    volume: 0.2,
    zoom: 0.28,
  },
  kejut: {
    warna: ["0x14060A", "0x3C1018", "0xD0A050"],
    gradasi: GRADASI.RADIAL,
    nadaHz: [208, 311, 467],
    volume: 0.24,
    zoom: 0.4,
  },
  "kenangan-hujan": {
    warna: ["0x0A1218", "0x203642", "0x5E7E8E"],
    gradasi: GRADASI.LINEAR, // lihat catatan pada mood "hina" soal spiral

    nadaHz: [165, 247, 330],
    volume: 0.18,
    zoom: 0.34,
  },
  "tegang-dekat": {
    warna: ["0x100810", "0x2E1420", "0x7A3848"],
    gradasi: GRADASI.RADIAL,
    nadaHz: [196, 277, 415],
    volume: 0.21,
    zoom: 0.36,
  },
  "hook-gelap": {
    warna: ["0x05060A", "0x16101C", "0x6A2838"],
    gradasi: GRADASI.RADIAL,
    nadaHz: [156, 233, 311],
    volume: 0.26,
    zoom: 0.45,
  },
};

/**
 * Ambil definisi mood. Sengaja MELEMPAR untuk mood yang belum terdaftar.
 *
 * Alternatifnya — diam-diam memakai mood cadangan — akan menghasilkan episode
 * yang ter-render "berhasil" tapi warnanya salah, dan tidak ada yang melapor.
 * Lebih baik berhenti di sini: menambah mood baru hanya butuh satu entri.
 *
 * @param {string} nama
 * @returns {Mood}
 */
export function cariMood(nama) {
  const m = MOOD[nama];
  if (!m) {
    throw new Error(
      `Mood "${nama}" belum terdaftar di lib/penyedia/palet.mjs. ` +
        `Yang ada: ${Object.keys(MOOD).join(", ")}`
    );
  }
  return m;
}
