// Storyboard Generator — mengubah naskah jadi daftar shot siap-produksi.
//
// Dua pekerjaan, keduanya mekanis supaya tidak bisa meleset:
//  1. TIMING: menghitung detik mulai & selesai tiap shot. Subtitle, suara, dan
//     potongan video semuanya membaca angka dari SINI — satu sumber, jadi
//     mustahil subtitle bergeser dari gambarnya.
//  2. PROMPT: merakit prompt video dengan MENYALIN `promptVisual` dari Character
//     Bible apa adanya. Inilah alasan naskah hanya menyimpan `karakterId`:
//     deskripsi wajah tidak pernah ditulis dua kali, jadi tidak bisa berbeda
//     antar-episode.

import { cariKarakter, cariLokasi } from "./bibel-karakter.mjs";

/**
 * Imbuhan gaya yang ditempelkan ke SETIAP prompt shot.
 * Disimpan sebagai satu konstanta supaya seluruh episode punya "tangan
 * sutradara" yang sama; mengubahnya di sini mengubah seluruh serial.
 */
// Catatan warna: kata "teal" SENGAJA dibuang. Mesin gambar menerapkannya ke
// apa saja termasuk RAMBUT tokoh — terlihat jelas pada uji s02, rambut hitam
// berubah kehijauan. Gradasi warna sudah dikerjakan di pipeline ffmpeg
// (eq + vignette + gradasi mood), jadi memintanya dua kali hanya merusak.
export const GAYA_SINEMATIK =
  "cinematic Chinese short-drama style, high contrast, deep shadows, moody low-key lighting, shallow depth of field, 35mm lens look, photorealistic, vertical 9:16 composition";

/**
 * Hal-hal yang selalu merusak drama pendek vertikal kalau muncul.
 * Dikirim sebagai prompt negatif ke mesin video berbayar.
 */
export const PROMPT_NEGATIF =
  "text, watermark, subtitles, logo, extra fingers, deformed hands, distorted face, low resolution, blurry, horizontal composition, cartoon, anime";

/** @typedef {{ id: string, urutan: number, mulaiDetik: number, selesaiDetik: number, durasiDetik: number, mood: string, kamera: string, fokus: string, lokasiNama: string, karakterNama: string[], bijiGambar: number, promptVideo: string, promptNegatif: string, dialog: import("./naskah-episode.mjs").Dialog|null, geserNadaDialog: number, kartuJudul: boolean }} ShotPapan */
/** @typedef {{ episode: number, serialMandarin: string, serialIndonesia: string, judulMandarin: string, judulIndonesia: string, totalDetik: number, shot: ShotPapan[] }} Storyboard */

/**
 * Rakit storyboard dari naskah + Character Bible.
 * @param {import("./naskah-episode.mjs").Naskah} naskah
 * @param {import("./bibel-karakter.mjs").Bibel} bibel
 * @returns {Storyboard}
 */
export function susunStoryboard(naskah, bibel) {
  let jam = 0;
  const shot = naskah.shot.map((s, i) => {
    const mulai = jam;
    jam += s.durasiDetik;
    const lokasi = cariLokasi(bibel, s.lokasiId);
    const tokoh = (s.karakterId ?? []).map((id) => cariKarakter(bibel, id));

    return {
      id: s.id,
      urutan: i + 1,
      mulaiDetik: bulatkan(mulai),
      selesaiDetik: bulatkan(jam),
      durasiDetik: s.durasiDetik,
      mood: s.mood,
      kamera: s.kamera,
      fokus: s.fokus ?? "adegan",
      lokasiNama: lokasi.nama,
      karakterNama: tokoh.map((k) => k.namaIndonesia),
      // Kunci konsistensi wajah pada mesin gambar: potongan acak (seed) dipilih
      // dari tokoh UTAMA shot ini, bukan dari id shot. Tokoh yang sama selalu
      // mendapat angka yang sama, jadi wajahnya ikut sama di seluruh episode.
      bijiGambar: bijiTetap(s.karakterId?.[0] ?? s.lokasiId),
      promptVideo: rakitPrompt(s, lokasi, tokoh, naskah.episode),
      promptNegatif: PROMPT_NEGATIF,
      dialog: s.dialog ?? null,
      // Geseran nada penutur ikut dibawa ke sini supaya perender suara tidak
      // perlu membuka Character Bible lagi — satu sumber, satu kali dicari.
      geserNadaDialog: s.dialog ? cariKarakter(bibel, s.dialog.karakterId).suara.geserNada ?? 0 : 0,
      kartuJudul: Boolean(s.kartuJudul),
    };
  });

  return {
    episode: naskah.episode,
    // Judul SERIAL dan judul EPISODE dibawa terpisah dan keduanya ikut ke sini.
    // Kartu judul menampilkan judul serial; menyamakan keduanya pernah membuat
    // kartu pembuka mencetak judul episode seolah-olah itu nama serialnya.
    serialMandarin: bibel.serial.judulMandarin,
    serialIndonesia: bibel.serial.judulIndonesia,
    judulMandarin: naskah.judulMandarin,
    judulIndonesia: naskah.judulIndonesia,
    totalDetik: bulatkan(jam),
    shot,
  };
}

/**
 * Susun satu prompt dari potongan yang sudah tetap.
 *
 * Urutannya DIUKUR dari hasil, bukan dikira-kira: KAMERA -> siapa -> pakai apa
 * -> sedang apa -> di mana -> gaya.
 *
 * Kenapa kamera paling depan padahal tokoh yang paling penting: mesin gambar
 * memberi bobot terbesar pada kata-kata awal, dan jenis shot ("wide shot",
 * "extreme close-up") hanya 2-4 kata. Saat jenis shot ditaruh di belakang,
 * adegan "keluar dari gerbang penjara" keluar sebagai potret studio — terbukti
 * dari gambar hasil, bukan dari dugaan. Identitas wajah tidak ikut melemah
 * karena yang memegangnya `seed` tetap per-tokoh (lihat bijiGambar), sedangkan
 * deskripsi wajah tetap disalin utuh tepat sesudah kamera.
 *
 * @param {import("./naskah-episode.mjs").Shot} s
 * @param {import("./bibel-karakter.mjs").Lokasi} lokasi
 * @param {import("./bibel-karakter.mjs").Karakter[]} tokoh
 * @param {number} episode
 * @returns {string}
 */
function rakitPrompt(s, lokasi, tokoh, episode) {
  const bagian = [s.kamera];
  const fokus = s.fokus ?? "adegan";

  // Pada shot ber-fokus "objek" tokoh TIDAK disebut sama sekali: menyebut
  // wajah pada close-up liontin membuat mesin gambar menggambar wajah, dan
  // bendanya hilang dari bingkai.
  if (fokus !== "objek") {
    for (const k of tokoh) {
      // Disalin APA ADANYA dari Bible — jangan pernah diparafrase di sini.
      bagian.push(fokus === "wajah" ? k.promptVisual : k.promptRingkas);
      const baju = kostumBabak(k, episode);
      if (baju) bagian.push(`wearing ${baju}`);
    }
  }

  bagian.push(s.aksi, lokasi.promptVisual, GAYA_SINEMATIK);
  return bagian.filter(Boolean).join(". ");
}

/**
 * Ambil kostum tokoh untuk babak yang memuat episode ini.
 *
 * Kunci di Character Bible ditulis sebagai rentang ("ep1-3", "ep4-7"), bukan
 * per-episode, supaya satu babak cukup ditulis sekali. Tanpa fungsi ini kostum
 * harus disalin ke tiap naskah — dan salinan yang tercecer itulah yang bikin
 * tokoh berganti baju di tengah babak tanpa ada yang sadar.
 *
 * @param {import("./bibel-karakter.mjs").Karakter} k
 * @param {number} episode
 * @returns {string|null}
 */
export function kostumBabak(k, episode) {
  for (const [rentang, baju] of Object.entries(k.kostumPerBabak ?? {})) {
    const m = rentang.match(/^ep(\d+)-(\d+)$/);
    if (m && episode >= Number(m[1]) && episode <= Number(m[2])) return baju;
  }
  return null;
}

/** Bulatkan ke 3 angka di belakang koma; menghindari 0.30000000000000004 di JSON. */
function bulatkan(n) {
  return Math.round(n * 1000) / 1000;
}

/**
 * Ubah teks jadi angka yang SELALU sama untuk teks yang sama.
 * Dipakai sebagai seed mesin gambar: hasilnya harus bisa diulang persis,
 * sebab "wajah tokoh berubah tiap render" sama buruknya dengan tidak konsisten.
 * @param {string} teks
 * @returns {number}
 */
function bijiTetap(teks) {
  let h = 2166136261;
  for (const ch of String(teks)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % 1000000;
}
