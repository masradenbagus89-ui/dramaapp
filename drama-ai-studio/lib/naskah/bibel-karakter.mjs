// Character Bible — sumber tunggal konsistensi karakter lintas 10 episode.
//
// KENAPA ADA PENJAGA DI SINI: inkonsistensi karakter adalah kerusakan SENYAP.
// Salah ketik `karakterId` tidak memunculkan error apa pun — storyboard tetap
// terbentuk, video tetap ter-render, dan yang terjadi hanyalah wajah tokoh
// berubah di tengah episode. Satu-satunya cara menangkapnya adalah menolak
// naskah yang menyebut karakter yang tidak terdaftar, SEBELUM uang dibelanjakan
// untuk membuat videonya.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @typedef {{ id: string, namaMandarin: string, namaIndonesia: string, promptVisual: string, paletWarna: string[], suara: { idSuaraMinimax: string, kecepatan: number } }} Karakter */
/** @typedef {{ id: string, nama: string, promptVisual: string }} Lokasi */
/** @typedef {{ serial: object, karakter: Karakter[], lokasi: Lokasi[], arcSepuluhEpisode: object[] }} Bibel */

/**
 * Muat Character Bible dari disk lalu periksa keutuhannya.
 * @param {string} [berkas]
 * @returns {Bibel}
 */
export function muatBibel(berkas = join(AKAR, "data", "bibel-karakter.json")) {
  /** @type {Bibel} */
  const bibel = JSON.parse(readFileSync(berkas, "utf8"));
  periksaBibel(bibel);
  return bibel;
}

/**
 * Tolak Bible yang cacat. Melempar galat dengan sebab yang bisa ditindak,
 * bukan sekadar "tidak valid".
 * @param {Bibel} bibel
 */
export function periksaBibel(bibel) {
  if (!Array.isArray(bibel?.karakter) || bibel.karakter.length === 0) {
    throw new Error("Character Bible kosong: tidak ada satu pun karakter.");
  }
  const terlihat = new Set();
  for (const k of bibel.karakter) {
    if (!k.id) throw new Error("Ada karakter tanpa `id`.");
    if (terlihat.has(k.id)) throw new Error(`Karakter dobel: "${k.id}".`);
    terlihat.add(k.id);
    // promptVisual adalah SATU-SATUNYA hal yang menjaga wajah tokoh tidak
    // berubah antar-episode. Kosong = konsistensi mustahil dijaga.
    if (!k.promptVisual || k.promptVisual.trim().length < 20) {
      throw new Error(`Karakter "${k.id}" tidak punya promptVisual yang layak.`);
    }
    // Versi ringkas dipakai pada shot wide/medium. Tanpa itu shot tersebut
    // jatuh ke deskripsi panjang, dan deskripsi panjang memaksa mesin gambar
    // membuat close-up wajah — wide shot-nya hilang tanpa pesan error apa pun.
    if (!k.promptRingkas || k.promptRingkas.trim().length < 10) {
      throw new Error(`Karakter "${k.id}" tidak punya promptRingkas yang layak.`);
    }
    if (k.promptRingkas.length >= k.promptVisual.length) {
      throw new Error(
        `Karakter "${k.id}": promptRingkas tidak lebih pendek dari promptVisual — ` +
          `tidak ada gunanya dan shot wide akan tetap jadi close-up.`
      );
    }
  }
  const lokasiTerlihat = new Set();
  for (const l of bibel.lokasi ?? []) {
    if (!l.id) throw new Error("Ada lokasi tanpa `id`.");
    if (lokasiTerlihat.has(l.id)) throw new Error(`Lokasi dobel: "${l.id}".`);
    lokasiTerlihat.add(l.id);
  }
}

/**
 * Ambil satu karakter. Sengaja MELEMPAR saat tidak ketemu, bukan mengembalikan
 * undefined — supaya salah ketik id berhenti di sini, bukan menjalar jadi
 * video dengan wajah yang salah.
 * @param {Bibel} bibel
 * @param {string} id
 * @returns {Karakter}
 */
export function cariKarakter(bibel, id) {
  const k = bibel.karakter.find((x) => x.id === id);
  if (!k) {
    const daftar = bibel.karakter.map((x) => x.id).join(", ");
    throw new Error(`Karakter "${id}" tidak ada di Character Bible. Yang terdaftar: ${daftar}`);
  }
  return k;
}

/**
 * Ambil satu lokasi. Sama seperti `cariKarakter`: melempar saat tidak ketemu.
 * @param {Bibel} bibel
 * @param {string} id
 * @returns {Lokasi}
 */
export function cariLokasi(bibel, id) {
  const l = (bibel.lokasi ?? []).find((x) => x.id === id);
  if (!l) {
    const daftar = (bibel.lokasi ?? []).map((x) => x.id).join(", ");
    throw new Error(`Lokasi "${id}" tidak ada di Character Bible. Yang terdaftar: ${daftar}`);
  }
  return l;
}
