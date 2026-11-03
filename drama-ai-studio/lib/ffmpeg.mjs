// Pembungkus tunggal untuk biner ffmpeg.
//
// KENAPA ADA: seluruh studio hanya boleh menyentuh ffmpeg lewat berkas ini.
// Dua alasan nyata, bukan gaya-gayaan:
//  1. Aturan escape path di dalam "filter graph" ffmpeg BERBEDA dari aturan
//     path biasa, dan di Windows bedanya menjebak (titik-dua drive harus
//     di-escape). Satu tempat = satu kali benar.
//  2. ffmpeg menulis sebab kegagalan ke stderr lalu tetap keluar dengan kode
//     yang mirip-mirip. Tanpa pembungkus, kegagalan render terbaca sebagai
//     "entah kenapa kosong".

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import ffmpegPath from "ffmpeg-static";

/** Jumlah baris akhir stderr ffmpeg yang ikut dibawa saat gagal. */
const BARIS_GALAT_DITAMPILKAN = 12;

/**
 * Alamat biner ffmpeg yang dipaket `ffmpeg-static` (tak butuh hak admin,
 * tak butuh pemasangan setingkat mesin).
 * @returns {string}
 */
export function alamatFfmpeg() {
  if (!ffmpegPath || !existsSync(ffmpegPath)) {
    throw new Error(
      "Biner ffmpeg tidak ditemukan. Jalankan `npm install` di dalam folder drama-ai-studio."
    );
  }
  return ffmpegPath;
}

/**
 * Ubah path berkas agar aman dipakai DI DALAM string filter ffmpeg
 * (mis. `drawtext=fontfile=...`, `subtitles=...`).
 *
 * Di Windows `D:\a\b.ttc` harus jadi `D\:/a/b.ttc`: backslash diganti slash,
 * titik-dua di-escape karena parser filter memakainya sebagai pemisah opsi.
 * @param {string} p
 * @returns {string}
 */
export function pathUntukFilter(p) {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:");
}

/**
 * Escape teks biasa agar aman jadi nilai opsi di dalam filter graph.
 * Dipakai untuk nilai pendek. Untuk teks panjang berbahasa Mandarin pakai
 * `textfile=` — jauh lebih tahan banting daripada menambal escape.
 * @param {string} teks
 * @returns {string}
 */
export function teksUntukFilter(teks) {
  return teks
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%");
}

/**
 * Jalankan ffmpeg dengan daftar argumen (BUKAN string shell).
 *
 * Argumen dikirim sebagai array supaya tanda kutip, spasi, dan huruf Mandarin
 * tidak pernah melewati shell — sumber bug paling sering di pipeline video.
 *
 * @param {string[]} args
 * @param {{ label?: string }} [opsi]
 * @returns {Promise<{ stderr: string }>}
 */
export function jalankanFfmpeg(args, opsi = {}) {
  const label = opsi.label ?? "ffmpeg";
  return new Promise((resolve, reject) => {
    const anak = spawn(alamatFfmpeg(), args, { windowsHide: true });
    let stderr = "";
    anak.stderr.on("data", (b) => {
      stderr += b.toString();
    });
    anak.on("error", (e) =>
      reject(new Error(`${label}: gagal menjalankan ffmpeg — ${e.message}`))
    );
    anak.on("close", (kode) => {
      if (kode === 0) return resolve({ stderr });
      const ekor = stderr.trim().split("\n").slice(-BARIS_GALAT_DITAMPILKAN).join("\n");
      reject(new Error(`${label}: ffmpeg keluar dengan kode ${kode}.\n${ekor}`));
    });
  });
}

/**
 * @typedef {object} InfoVideo
 * @property {number} durasiDetik
 * @property {number} lebar
 * @property {number} tinggi
 * @property {string} codecVideo
 * @property {boolean} adaAudio
 */

/**
 * Baca metadata video dengan memeriksa berkas HASIL — bukan mengandalkan
 * "perintah render tadi tidak error". Render bisa sukses tapi menghasilkan
 * berkas 0 detik; hanya pembacaan ulang yang membuktikan sebaliknya.
 *
 * `ffmpeg-static` tidak memaket ffprobe, jadi info dibaca dari stderr ffmpeg
 * (ffmpeg selalu mencetak ringkasan stream saat membuka berkas).
 *
 * @param {string} berkas
 * @returns {Promise<InfoVideo>}
 */
export async function bacaInfoVideo(berkas) {
  if (!existsSync(berkas)) throw new Error(`Berkas video tidak ada: ${berkas}`);

  // ffmpeg keluar dengan kode != 0 saat tak diberi output; stderr-nya tetap
  // memuat ringkasan stream yang kita butuhkan — jadi galat di sini normal.
  let stderr = "";
  try {
    ({ stderr } = await jalankanFfmpeg(["-hide_banner", "-i", berkas], { label: "baca-info" }));
  } catch (e) {
    stderr = String(e.message);
  }

  const mDur = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const mVid = stderr.match(/Video:\s*([a-zA-Z0-9]+).*?,\s*(\d{2,5})x(\d{2,5})/);
  if (!mDur || !mVid) {
    throw new Error(
      `Tidak bisa membaca metadata dari ${berkas}. Berkasnya kemungkinan rusak atau kosong.`
    );
  }
  const detikMentah = Number(mDur[1]) * 3600 + Number(mDur[2]) * 60 + Number(mDur[3]);
  return {
    // Dibulatkan 2 angka: penjumlahan pecahan menghasilkan 97.03999999999999
    // yang terbaca seperti kerusakan padahal cuma pembulatan biner.
    durasiDetik: Math.round(detikMentah * 100) / 100,
    codecVideo: mVid[1],
    lebar: Number(mVid[2]),
    tinggi: Number(mVid[3]),
    adaAudio: /Audio:\s*[a-zA-Z0-9]/.test(stderr),
  };
}
