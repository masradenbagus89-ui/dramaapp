// -------------------------------------------------------------------------
// ATURAN BERSAMA isi otomatis link unduhan (Google Drive, Mega): pilih file
// milik satu video per kualitas dari daftar nama file sebuah folder.
//
// ATURAN NAMA FILE (owner 2026-10-08): nama file memuat ID video Playly dan
// kualitasnya, mis. `abc123_1080p.mp4` atau `Judul - abc123 - 480p.mkv`.
// Keduanya dicocokkan sebagai KATA UTUH: ID `12` tidak ikut menempel ke file
// `123_1080p.mp4`, supaya link tak pernah nyasar ke video lain.
//
// Murni (tanpa jaringan/env) — aman diimpor dari mana saja.
// -------------------------------------------------------------------------
import { KUALITAS_UNDUHAN, type KualitasUnduhan } from "./playly-unduhan";

export type SaranUnduhan = {
  /** Link per kualitas yang ditemukan tepat SATU file-nya. */
  saran: { quality: KualitasUnduhan; url: string }[];
  /** Kualitas yang punya >1 file cocok — sengaja tak dipilih, admin yang memutuskan. */
  ganda: { quality: KualitasUnduhan; nama: string[] }[];
};

/** Huruf yang punya makna khusus di RegExp di-escape supaya ID diperlakukan apa adanya. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Batas kata = bukan huruf/angka, supaya `_`, `-`, spasi, titik semuanya jadi pemisah. */
function polaKataUtuh(kata: string): RegExp {
  return new RegExp(`(?:^|[^a-z0-9])${escapeRegex(kata.toLowerCase())}(?:[^a-z0-9]|$)`);
}

// ---- COCOKKAN SEMUA (2026-11-16): satu folder × seluruh video sekaligus ----
//
// Pemilik file ditentukan dengan urutan:
//   1. ID video sebagai kata utuh di nama file (aturan lama, paling pasti);
//   2. JUDUL film di AWAL nama file: `Americana (2025) 1080p.mp4`,
//      `Americana.2025.1080p.WEB-DL.mkv`, `[Grup] Americana 2025 480p.mp4`.
//      Judul tanpa tahun (`Americana 1080p.mp4`) juga diterima, asal judul
//      tanpa tahun itu milik SATU video saja.
// Kalau beberapa judul cocok, yang TERPANJANG menang ("Spider Man" mengalahkan
// "Spider"). Yang tetap ragu (dua video sama-sama cocok) dilewati, bukan ditebak.
// Hasilnya selalu diperiksa admin sebelum disimpan — judul mirip bisa meleset.

export type VideoCocok = { id: string; title: string };
export type FileSumber = { name: string; url: string };

/** Huruf kecil, tanpa aksen, selain huruf/angka jadi spasi tunggal. */
export function normalTeks(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const POLA_TAHUN_AKHIR = /[\s([]*\b(?:19|20)\d{2}\b[)\]]*\s*$/;
const POLA_EKSTENSI = /\.[a-z0-9]{2,4}$/i;
/** Label grup di depan nama file: `[Grup] `, `(Rilis) `. */
const POLA_LABEL_DEPAN = /^(?:\s*[[(][^\])]*[\])]\s*)+/;

/** Kunci judul -> id video pemiliknya (lebih dari satu id = judul ganda). */
function petaJudul(videos: VideoCocok[]): Map<string, Set<string>> {
  const peta = new Map<string, Set<string>>();
  const tambah = (kunci: string, id: string) => {
    if (!kunci) return;
    const ids = peta.get(kunci) ?? new Set<string>();
    ids.add(id);
    peta.set(kunci, ids);
  };
  for (const v of videos) {
    tambah(normalTeks(v.title), v.id);
    tambah(normalTeks(v.title.replace(POLA_TAHUN_AKHIR, "")), v.id);
  }
  return peta;
}

function pemilikFile(name: string, videos: VideoCocok[], peta: Map<string, Set<string>>): string | null {
  const kecil = name.toLowerCase();
  const lewatId = videos.filter((v) => polaKataUtuh(v.id).test(kecil));
  if (lewatId.length === 1) return lewatId[0].id;
  if (lewatId.length > 1) return null;

  const inti = normalTeks(name.replace(POLA_EKSTENSI, "").replace(POLA_LABEL_DEPAN, ""));
  let terbaik: string | null = null;
  for (const kunci of peta.keys()) {
    if ((inti === kunci || inti.startsWith(kunci + " ")) && kunci.length > (terbaik?.length ?? 0)) {
      terbaik = kunci;
    }
  }
  const ids = terbaik ? peta.get(terbaik)! : null;
  return ids && ids.size === 1 ? [...ids][0] : null;
}

/** Murni: pasangkan seluruh file ke seluruh video sekaligus, per kualitas. */
export function cocokkanSemuaVideo(
  videos: VideoCocok[],
  files: FileSumber[],
): Record<string, SaranUnduhan> {
  const peta = petaJudul(videos);
  const kelompok = new Map<string, Map<KualitasUnduhan, FileSumber[]>>();
  for (const f of files) {
    const quality = KUALITAS_UNDUHAN.find((q) => polaKataUtuh(q).test(f.name.toLowerCase()));
    if (!quality) continue;
    const id = pemilikFile(f.name, videos, peta);
    if (!id) continue;
    const perQ = kelompok.get(id) ?? new Map<KualitasUnduhan, FileSumber[]>();
    perQ.set(quality, [...(perQ.get(quality) ?? []), f]);
    kelompok.set(id, perQ);
  }

  const hasil: Record<string, SaranUnduhan> = {};
  for (const [id, perQ] of kelompok) {
    const s: SaranUnduhan = { saran: [], ganda: [] };
    for (const quality of KUALITAS_UNDUHAN) {
      const cocok = perQ.get(quality) ?? [];
      if (cocok.length === 1) s.saran.push({ quality, url: cocok[0].url });
      else if (cocok.length > 1) s.ganda.push({ quality, nama: cocok.map((f) => f.name) });
    }
    hasil[id] = s;
  }
  return hasil;
}

/** Pilih file milik `videoId` per kualitas; `urlDari` mengubah file terpilih jadi link. */
export function cocokkanFileUnduhan<F extends { name: string }>(
  videoId: string,
  files: F[],
  urlDari: (file: F) => string,
): SaranUnduhan {
  const id = videoId.trim();
  if (!id) return { saran: [], ganda: [] };
  const polaId = polaKataUtuh(id);
  const milikVideo = files.filter((f) => polaId.test(f.name.toLowerCase()));

  const saran: SaranUnduhan["saran"] = [];
  const ganda: SaranUnduhan["ganda"] = [];
  for (const quality of KUALITAS_UNDUHAN) {
    const polaQ = polaKataUtuh(quality);
    const cocok = milikVideo.filter((f) => polaQ.test(f.name.toLowerCase()));
    if (cocok.length === 1) saran.push({ quality, url: urlDari(cocok[0]) });
    else if (cocok.length > 1) ganda.push({ quality, nama: cocok.map((f) => f.name) });
  }
  return { saran, ganda };
}
