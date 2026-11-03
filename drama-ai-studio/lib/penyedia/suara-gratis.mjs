// Voice Generation GRATIS — mengubah dialog Mandarin jadi suara yang benar-benar
// diucapkan, tanpa kunci API dan tanpa biaya.
//
// KENAPA PENYEDIA INI, bukan suara neural yang jauh lebih bagus:
//
//  - Suara bawaan Windows: NOL suara Mandarin terpasang (cuma David & Zira
//    berbahasa Inggris), dan memasang paket bahasa butuh hak administrator
//    yang tidak dimiliki akun di mesin ini.
//  - Suara neural Microsoft Edge (zh-CN-XiaoxiaoNeural dkk): kualitasnya jauh
//    lebih baik dan gratis, TAPI dari mesin ini selalu ditolak `403`. Sudah
//    dipastikan bukan salah kode: token Sec-MS-GEC yang dihasilkan di sini
//    DIBANDINGKAN BYTE-PER-BYTE dengan keluaran pustaka resmi `edge-tts`
//    dan hasilnya identik; header, versi Chromium, dan koreksi selisih jam
//    juga sudah disamakan. Penolakan datang dari sisi Microsoft (lazim untuk
//    alamat IP pusat data).
//
// BATAS JUJUR penyedia ini:
//  - HANYA SATU suara untuk semua tokoh. Perbedaan tokoh dibuat dengan
//    menggeser nada (lihat `geserNada` di Character Bible) — membantu
//    membedakan pria/wanita, tapi bukan pengganti aktor suara.
//  - Nadanya datar: ia membacakan, bukan memerankan.
//  - Endpoint tidak resmi dan bisa berubah sewaktu-waktu.

import { existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ALAMAT_DASAR = "https://translate.google.com/translate_tts";

/** Penyedia menolak teks panjang; dialog drama pendek jauh di bawah ini. */
export const PANJANG_TEKS_MAKS = 190;

/** Berkas di bawah ambang ini pasti bukan MP3 (biasanya halaman galat). */
const UKURAN_SUARA_MIN_BYTE = 2000;

const MAKS_PERCOBAAN = 5;
const JEDA_ANTAR_PERCOBAAN_MS = 4000;
const BATAS_WAKTU_MS = 60000;

/** Penyedia menolak permintaan tanpa User-Agent peramban. */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * Susun alamat permintaan suara untuk satu kalimat Mandarin.
 * Dipisah agar bisa diuji tanpa menyentuh jaringan.
 * @param {string} teksMandarin
 * @returns {string}
 */
export function susunAlamatUcapan(teksMandarin) {
  const teks = String(teksMandarin).slice(0, PANJANG_TEKS_MAKS);
  const kueri = new URLSearchParams({
    ie: "UTF-8",
    q: teks,
    tl: "zh-CN",
    client: "tw-ob", // klien yang tidak menuntut kunci
  });
  return `${ALAMAT_DASAR}?${kueri}`;
}

/**
 * @typedef {object} HasilUcapan
 * @property {string} shotId
 * @property {string|null} berkas  null = gagal; shot itu jalan tanpa suara
 * @property {"cache"|"unduh"|"gagal"|"tanpa-dialog"} sumber
 */

/**
 * Ambil suara untuk satu shot. Shot tanpa dialog dilewati, bukan dianggap gagal.
 *
 * @param {object} p
 * @param {import("../naskah/storyboard.mjs").ShotPapan} p.shot
 * @param {string} p.folderSuara
 * @param {(pesan: string) => void} [p.lapor]
 * @returns {Promise<HasilUcapan>}
 */
export async function ambilUcapanShot({ shot, folderSuara, lapor = () => {} }) {
  if (!shot.dialog?.mandarin) return { shotId: shot.id, berkas: null, sumber: "tanpa-dialog" };

  mkdirSync(folderSuara, { recursive: true });
  const berkas = join(folderSuara, `${shot.id}.mp3`);
  if (existsSync(berkas) && statSync(berkas).size >= UKURAN_SUARA_MIN_BYTE) {
    return { shotId: shot.id, berkas, sumber: "cache" };
  }

  const alamat = susunAlamatUcapan(shot.dialog.mandarin);
  for (let percobaan = 1; percobaan <= MAKS_PERCOBAAN; percobaan++) {
    try {
      const jawaban = await fetch(alamat, {
        signal: AbortSignal.timeout(BATAS_WAKTU_MS),
        headers: { "User-Agent": UA, accept: "audio/mpeg,*/*" },
      });
      if (jawaban.ok) {
        const isi = Buffer.from(await jawaban.arrayBuffer());
        // Status 200 bisa berisi halaman galat HTML; periksa isinya, bukan statusnya.
        if (isi.length >= UKURAN_SUARA_MIN_BYTE && isMp3(isi)) {
          writeFileSync(berkas, isi);
          return { shotId: shot.id, berkas, sumber: "unduh" };
        }
      }
    } catch {
      // Waktu habis / jaringan putus — diperlakukan sama: coba lagi.
    }
    if (percobaan < MAKS_PERCOBAAN) await jeda(JEDA_ANTAR_PERCOBAAN_MS);
  }
  lapor(`      ${shot.id}: suara GAGAL diambil — adegan ini jalan tanpa dialog`);
  return { shotId: shot.id, berkas: null, sumber: "gagal" };
}

/**
 * MP3 diawali tag "ID3" atau sync-word frame (0xFF 0xEx/0xFx).
 * Penjaga supaya halaman HTML galat tidak tersimpan jadi .mp3 lalu
 * menggagalkan ffmpeg belakangan dengan pesan yang membingungkan.
 */
function isMp3(buf) {
  if (buf.length < 3) return false;
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true;
  return buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
}

function jeda(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
