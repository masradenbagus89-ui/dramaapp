// Naskah satu episode: pemuat + pemeriksa.
//
// Pemeriksaan di sini dijalankan SEBELUM render berbayar. Alasannya ekonomi,
// bukan kerapian: satu episode berbayar berharga beberapa dolar, dan naskah
// yang cacat baru ketahuan setelah uangnya habis kalau tidak dihadang di sini.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cariKarakter, cariLokasi } from "./bibel-karakter.mjs";

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Batas format drama pendek vertikal: 1-3 menit per episode. */
export const DURASI_MIN_DETIK = 60;
export const DURASI_MAKS_DETIK = 180;

/** Satu shot terlalu panjang = mesin video berbayar menolak / memotongnya. */
export const DURASI_SHOT_MAKS_DETIK = 10;

/**
 * Nilai sah kolom `fokus`, yang menentukan seberapa rinci tokoh dideskripsikan
 * ke mesin gambar. Salah ketik di sini TIDAK menimbulkan error — shot-nya cuma
 * diperlakukan sebagai "adegan" dan close-up wajah diam-diam jadi medium shot.
 * Karena itu nilainya dibatasi dan yang di luar daftar ditolak.
 */
export const FOKUS_SAH = ["wajah", "adegan", "objek"];

/** @typedef {{ tipe: "dialog"|"narasi", karakterId: string, mandarin: string, pinyin: string, indonesia: string }} Dialog */
/** @typedef {{ id: string, lokasiId: string, karakterId: string[], kamera: string, aksi: string, mood: string, durasiDetik: number, dialog: Dialog|null, kartuJudul?: boolean }} Shot */
/** @typedef {{ episode: number, judulMandarin: string, judulIndonesia: string, sinopsis: string, shot: Shot[] }} Naskah */

/**
 * Muat naskah satu episode lalu periksa terhadap Character Bible.
 * @param {number} nomorEpisode
 * @param {import("./bibel-karakter.mjs").Bibel} bibel
 * @returns {Naskah}
 */
export function muatNaskah(nomorEpisode, bibel) {
  const berkas = join(AKAR, "data", `episode-${String(nomorEpisode).padStart(2, "0")}.json`);
  /** @type {Naskah} */
  const naskah = JSON.parse(readFileSync(berkas, "utf8"));
  periksaNaskah(naskah, bibel);
  return naskah;
}

/**
 * Hitung total durasi episode dari shot-nya.
 * Fungsi ini MEMBACA saja — tidak mengubah naskah (§ perintah vs pertanyaan).
 * @param {Naskah} naskah
 * @returns {number}
 */
export function totalDurasi(naskah) {
  return naskah.shot.reduce((j, s) => j + s.durasiDetik, 0);
}

/**
 * Tolak naskah yang cacat, dengan sebab yang bisa langsung diperbaiki.
 * @param {Naskah} naskah
 * @param {import("./bibel-karakter.mjs").Bibel} bibel
 */
export function periksaNaskah(naskah, bibel) {
  if (!Array.isArray(naskah?.shot) || naskah.shot.length === 0) {
    throw new Error(`Episode ${naskah?.episode}: tidak ada satu pun shot.`);
  }

  const idTerlihat = new Set();
  for (const s of naskah.shot) {
    if (!s.id) throw new Error("Ada shot tanpa `id`.");
    if (idTerlihat.has(s.id)) throw new Error(`Shot dobel: "${s.id}".`);
    idTerlihat.add(s.id);

    if (!(s.durasiDetik > 0)) {
      throw new Error(`Shot ${s.id}: durasiDetik harus lebih dari 0.`);
    }
    if (s.durasiDetik > DURASI_SHOT_MAKS_DETIK) {
      throw new Error(
        `Shot ${s.id}: ${s.durasiDetik} detik melewati batas ${DURASI_SHOT_MAKS_DETIK} detik per shot.`
      );
    }

    if (s.fokus !== undefined && !FOKUS_SAH.includes(s.fokus)) {
      throw new Error(
        `Shot ${s.id}: fokus "${s.fokus}" tidak dikenal. Pilih: ${FOKUS_SAH.join(", ")}.`
      );
    }

    // Melempar sendiri kalau id-nya tak terdaftar — inilah penangkap salah ketik.
    cariLokasi(bibel, s.lokasiId);
    for (const kid of s.karakterId ?? []) cariKarakter(bibel, kid);

    if (s.dialog) {
      const d = s.dialog;
      if (!d.mandarin?.trim()) throw new Error(`Shot ${s.id}: dialog tanpa teks Mandarin.`);
      if (!d.indonesia?.trim()) throw new Error(`Shot ${s.id}: dialog tanpa subtitle Indonesia.`);
      // Penutur wajib dikenal: mesin suara memilih warna suara dari sini.
      cariKarakter(bibel, d.karakterId);
      // Penutur yang tidak ada di shot-nya sendiri biasanya salah ketik —
      // KECUALI narasi batin, yang memang suara dari luar adegan.
      if (d.tipe === "dialog" && !(s.karakterId ?? []).includes(d.karakterId)) {
        throw new Error(
          `Shot ${s.id}: "${d.karakterId}" berbicara tapi tidak terdaftar hadir di shot ini.`
        );
      }
    }
  }

  const total = totalDurasi(naskah);
  if (total < DURASI_MIN_DETIK || total > DURASI_MAKS_DETIK) {
    throw new Error(
      `Episode ${naskah.episode}: total ${total} detik di luar format drama pendek ` +
        `(${DURASI_MIN_DETIK}-${DURASI_MAKS_DETIK} detik).`
    );
  }
}
