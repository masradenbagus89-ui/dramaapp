// Mesin gambar GRATIS — mengambil satu foto adegan per shot dari layanan
// publik pollinations.ai (tanpa kunci API, tanpa biaya).
//
// KENAPA DIBANGUN SEPERTI INI (tiga keputusan yang semuanya karena diukur):
//
//  1. WAJIB RETRY. Layanan gratis ini sering membalas 503 "Classic API is at
//     its limit, retry after 10s". Dari pengujian, satu gambar butuh 1-3
//     percobaan. Tanpa retry, episode gagal di tengah tanpa sebab yang jelas.
//
//  2. WAJIB CACHE KE DISK. Render ulang episode yang sama tidak boleh mengunduh
//     ulang 18 gambar — itu memakan belasan menit dan membebani layanan gratis
//     orang lain tanpa guna.
//
//  3. GAGAL SATU SHOT TIDAK MEMATIKAN EPISODE. Kalau satu gambar tak kunjung
//     didapat, shot itu jatuh ke kartu gradasi lokal dan episodenya tetap jadi.
//     Episode dengan 17 foto + 1 kartu jauh lebih berguna daripada nol episode.
//
// BATAS JUJUR yang melekat pada tier gratis:
//  - Balasan SELALU 576x1024 walau diminta 1080x1920 → harus diperbesar ~1,9x,
//    jadi hasilnya lebih lembut daripada video jadi sungguhan.
//  - Ada watermark "pollinations.ai" di pojok kanan bawah. Parameter `nologo`
//    diabaikan untuk pemakai anonim. Watermark itu SENGAJA tidak dihapus —
//    itu imbalan memakai layanan gratis orang.

import { existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ALAMAT_DASAR = "https://image.pollinations.ai/prompt/";

/** Ukuran yang diminta. Server tier gratis tetap memulangkan 576x1024. */
const LEBAR_MINTA = 576;
const TINGGI_MINTA = 1024;

/** Berkas di bawah ambang ini pasti bukan gambar (biasanya JSON galat). */
const UKURAN_GAMBAR_MIN_BYTE = 20000;

/** Percobaan per gambar, dan jeda antar percobaan. */
const MAKS_PERCOBAAN = 6;
const JEDA_ANTAR_PERCOBAAN_MS = 10000;
const BATAS_WAKTU_MS = 150000;

/** Prompt terlalu panjang membuat alamat ditolak DAN melemahkan subjeknya. */
const PANJANG_PROMPT_MAKS = 850;

/**
 * @typedef {object} HasilGambar
 * @property {string} shotId
 * @property {string|null} berkas   null = gagal, pemanggil harus pakai cadangan
 * @property {"cache"|"unduh"|"gagal"} sumber
 * @property {number} percobaan
 */

/**
 * Ambil gambar untuk satu shot. Memakai salinan di disk kalau sudah ada.
 *
 * @param {object} p
 * @param {import("../naskah/storyboard.mjs").ShotPapan} p.shot
 * @param {string} p.folderGambar
 * @param {(pesan: string) => void} [p.lapor]
 * @returns {Promise<HasilGambar>}
 */
export async function ambilGambarShot({ shot, folderGambar, lapor = () => {} }) {
  mkdirSync(folderGambar, { recursive: true });
  const berkas = join(folderGambar, `${shot.id}.jpg`);

  if (existsSync(berkas) && statSync(berkas).size >= UKURAN_GAMBAR_MIN_BYTE) {
    return { shotId: shot.id, berkas, sumber: "cache", percobaan: 0 };
  }

  const alamat = susunAlamat(shot);
  for (let percobaan = 1; percobaan <= MAKS_PERCOBAAN; percobaan++) {
    try {
      const jawaban = await fetch(alamat, {
        signal: AbortSignal.timeout(BATAS_WAKTU_MS),
        headers: { accept: "image/*" },
      });
      if (jawaban.ok) {
        const isi = Buffer.from(await jawaban.arrayBuffer());
        // Server membalas 200 berisi JSON galat pada sebagian kegagalan, jadi
        // status 200 saja BUKAN bukti kita menerima gambar.
        if (isi.length >= UKURAN_GAMBAR_MIN_BYTE && isJpeg(isi)) {
          writeFileSync(berkas, isi);
          return { shotId: shot.id, berkas, sumber: "unduh", percobaan };
        }
      }
    } catch {
      // Waktu habis atau jaringan putus — diperlakukan sama: coba lagi.
    }
    if (percobaan < MAKS_PERCOBAAN) {
      lapor(`      ${shot.id}: percobaan ${percobaan} belum berhasil, menunggu...`);
      await jeda(JEDA_ANTAR_PERCOBAAN_MS);
    }
  }
  return { shotId: shot.id, berkas: null, sumber: "gagal", percobaan: MAKS_PERCOBAAN };
}

/**
 * Susun alamat permintaan gambar untuk satu shot.
 * Dipisah jadi fungsi sendiri supaya bisa diuji tanpa menyentuh jaringan.
 * @param {import("../naskah/storyboard.mjs").ShotPapan} shot
 * @returns {string}
 */
export function susunAlamat(shot) {
  const prompt = shot.promptVideo.slice(0, PANJANG_PROMPT_MAKS);
  const kueri = new URLSearchParams({
    width: String(LEBAR_MINTA),
    height: String(TINGGI_MINTA),
    // Seed berasal dari tokoh utama shot (lihat storyboard.mjs): tokoh yang
    // sama -> angka yang sama -> wajah yang sama di seluruh episode.
    seed: String(shot.bijiGambar),
    model: "flux",
    nologo: "true",
  });
  return `${ALAMAT_DASAR}${encodeURIComponent(prompt)}?${kueri}`;
}

/** JPEG selalu diawali FF D8 FF. Penjaga agar JSON galat tak tersimpan jadi .jpg. */
function isJpeg(buf) {
  return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

function jeda(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
