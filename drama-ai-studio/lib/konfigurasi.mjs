// Konfigurasi studio: membaca .env dan menentukan mesin mana yang BOLEH dipakai.
//
// Tidak memakai paket `dotenv` — satu fungsi 15 baris sudah cukup, dan
// menambah dependensi berarti menambah yang harus dirawat selamanya.
//
// Prinsip yang ditegakkan: ketiadaan kunci API BUKAN galat. Studio selalu
// punya jalan lokal yang gratis, jadi owner bisa melihat hasil utuh sebelum
// memutuskan membelanjakan apa pun.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Mesin bawaan — selalu gratis, selalu tersedia, nol panggilan internet. */
export const MESIN_LOKAL = { visual: "lokal", suara: "lokal", teks: "lokal" };

/**
 * Baca `.env` di folder studio lalu gabungkan dengan environment proses.
 * Nilai dari proses MENANG supaya owner bisa menimpa sekali jalan tanpa
 * mengedit berkas.
 * @returns {Record<string,string>}
 */
export function bacaEnv() {
  const berkas = join(AKAR, ".env");
  /** @type {Record<string,string>} */
  const dari = {};
  if (existsSync(berkas)) {
    for (const baris of readFileSync(berkas, "utf8").split(/\r?\n/)) {
      const t = baris.trim();
      if (!t || t.startsWith("#")) continue;
      const pisah = t.indexOf("=");
      if (pisah < 1) continue;
      const kunci = t.slice(0, pisah).trim();
      // Buang kutip pembungkus kalau ada; nilai kosong tetap dianggap kosong.
      const nilai = t.slice(pisah + 1).trim().replace(/^["']|["']$/g, "");
      if (nilai) dari[kunci] = nilai;
    }
  }
  return { ...dari, ...bersihkan(process.env) };
}

/** Buang entri kosong supaya `??` dan pengecekan "ada kunci" tidak tertipu. */
function bersihkan(obj) {
  /** @type {Record<string,string>} */
  const keluar = {};
  for (const [k, v] of Object.entries(obj)) if (typeof v === "string" && v !== "") keluar[k] = v;
  return keluar;
}

/**
 * @typedef {object} Konfigurasi
 * @property {Record<string,string>} env
 * @property {number} batasBiayaUsd
 * @property {boolean} adaKunciVideo
 * @property {boolean} adaKunciSuara
 * @property {boolean} adaKunciTeks
 * @property {string} modelVideoDefault
 */

/** Model video yang dipakai kalau owner tidak memilih sendiri. */
export const MODEL_VIDEO_DEFAULT = "fal-ai/kling-video/v1.6/standard/image-to-video";
export const MODEL_SUARA_DEFAULT = "minimax/speech-02-turbo";
export const MODEL_TEKS_DEFAULT = "claude-sonnet-5";

/**
 * @returns {Konfigurasi}
 */
export function muatKonfigurasi() {
  const env = bacaEnv();
  return {
    env,
    batasBiayaUsd: Number(env.STUDIO_BATAS_BIAYA_USD ?? 0) || 0,
    adaKunciVideo: Boolean(env.FAL_KEY),
    adaKunciSuara: Boolean(env.MINIMAX_API_KEY && env.MINIMAX_GROUP_ID),
    adaKunciTeks: Boolean(env.ANTHROPIC_API_KEY),
    modelVideoDefault: env.STUDIO_MODEL_VIDEO || MODEL_VIDEO_DEFAULT,
  };
}

/**
 * Terjemahkan pilihan owner ("--mesin berbayar") jadi nama mesin konkret,
 * lalu laporkan kunci apa saja yang masih kurang.
 *
 * Mengembalikan daftar kunci yang hilang alih-alih langsung melempar: pemanggil
 * yang hanya ingin MELIHAT estimasi biaya harus tetap bisa melihatnya walau
 * kuncinya belum ada.
 *
 * @param {Konfigurasi} cfg
 * @param {"lokal"|"berbayar"} mode
 * @returns {{ mesin: { visual: string, suara: string, teks: string }, kunciHilang: string[] }}
 */
export function pilihMesin(cfg, mode) {
  if (mode === "lokal") return { mesin: { ...MESIN_LOKAL }, kunciHilang: [] };

  const kunciHilang = [];
  if (!cfg.adaKunciVideo) kunciHilang.push("FAL_KEY");
  if (!cfg.adaKunciSuara) kunciHilang.push("MINIMAX_API_KEY + MINIMAX_GROUP_ID");

  return {
    mesin: {
      visual: cfg.modelVideoDefault,
      suara: MODEL_SUARA_DEFAULT,
      teks: cfg.adaKunciTeks ? MODEL_TEKS_DEFAULT : "lokal",
    },
    kunciHilang,
  };
}

/** Folder keluaran satu episode; dibuat oleh pemanggil kalau belum ada. */
export function folderKeluaran(nomorEpisode) {
  return join(AKAR, "keluaran", `episode-${String(nomorEpisode).padStart(2, "0")}`);
}

export { AKAR };
