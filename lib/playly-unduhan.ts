// -------------------------------------------------------------------------
// PROVIDER UNDUHAN per VIDEO PLAYLY (Google Share / Telegram / Cast / Mega /
// Sendcm / ...) — aturan murninya. Penyimpanannya ada di lib/store.ts, bersama
// dokumen Playly yang lain (`playly:key`, `playly:embeds`, `playly:hidden`).
//
// KENAPA BERKAS TERPISAH dari lib/unduhan.ts (yang mengurus provider DRAMA):
// ruang id-nya beda (videoId Playly vs dramas.id) dan sumber datanya beda.
// Menyatukannya di satu dokumen berarti satu tabrakan id diam-diam menukar
// daftar unduhan antar dua hal yang tak berhubungan. Bentuk & alasannya sengaja
// dibuat KEMBAR dengan lib/unduhan.ts supaya siapa pun yang sudah paham yang
// satu langsung paham yang lain.
//
// UTANG TEKNIS YANG DISENGAJA (sama persis dengan lib/unduhan.ts:6-35):
// tempat yang benar untuk data ini adalah kolomnya sendiri di database, tapi
// menambah kolom butuh DDL dan semua jalur ke sana masih tertutup sejak
// 2026-09-22. Dokumen `app_data` adalah celah yang bisa ditulis PostgREST.
// Cara naik kelas kalau akses database pulih: buat tabel/kolomnya, pindahkan
// isi dokumen, lalu hapus jalur dokumen ini.
//
// PAGAR KEAMANAN — BUKAN KERAPIAN: alamat di sini berakhir di atribut `href`
// halaman penonton. Dokumen `app_data` tidak dijaga CHECK constraint apa pun,
// jadi isinya diperlakukan sebagai DATA TAK-TEPERCAYA dan disaring ULANG tiap
// kali dibaca, bukan dipercaya karena "kan sudah disaring waktu disimpan".
// Alamat berawalan `javascript:` atau `data:` yang lolos ke `href` = kode asing
// berjalan di halaman penonton (XSS), dan kegagalannya tidak memunculkan error
// apa pun. Penyaringnya `parseDownloadProviders` (lib/types.ts).
// -------------------------------------------------------------------------
import { parseDownloadProviders, type DownloadProvider } from "./types";

/** Kunci dokumen di tabel `app_data`. Satu dokumen untuk SELURUH video Playly. */
export const KUNCI_UNDUHAN_PLAYLY = "playly:unduhan";

/** Peta videoId Playly -> daftar providernya. Video yang belum diisi tak punya entri. */
export type PetaUnduhanPlayly = Record<string, DownloadProvider[]>;

/**
 * Nama kunci yang TIDAK boleh dipakai sebagai videoId (prototype pollution).
 *
 * `obj["__proto__"] = ...` bukan sekadar menaruh data: ia MENGGANTI induk objek
 * itu, sehingga field yang tak pernah ditulis siapa pun tiba-tiba punya nilai —
 * dan pemeriksaan di tempat lain ikut salah menjawab tanpa error apa pun
 * (skills/owasp/SKILL.md §4). Playly tidak pernah memakai id seperti ini, jadi
 * membuangnya tidak menghilangkan data yang sah.
 */
const KUNCI_TERLARANG = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Saring dokumen mentah jadi peta yang sah.
 *
 * `kualitasOpsional: true` — inilah satu-satunya beda aturan dari jalur drama.
 * Berkas yang diunggah ke Google Share/Telegram sering tidak pernah disebutkan
 * resolusinya oleh pengunggahnya, dan membuang barisnya karena itu berarti
 * menyembunyikan unduhan yang sebenarnya ADA. Tombolnya nanti tergambar
 * "Download" polos — jujur, bukan menebak "1080p".
 *
 * Entri yang habis disaring TIDAK disimpan sebagai array kosong: kunci yang ada
 * tapi isinya nol membuat tombol DOWNLOAD membuka panel kosong, padahal yang
 * benar adalah jatuh ke perilaku lama (alasan yang sama di lib/unduhan.ts:55).
 */
export function bacaPetaUnduhanPlayly(raw: unknown): PetaUnduhanPlayly {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: PetaUnduhanPlayly = {};
  for (const [videoId, nilai] of Object.entries(raw as Record<string, unknown>)) {
    if (KUNCI_TERLARANG.has(videoId)) continue;
    const daftar = parseDownloadProviders(nilai, { kualitasOpsional: true });
    if (daftar.length) out[videoId] = daftar;
  }
  return out;
}

/**
 * Tempelkan daftar provider ke kartu video. Murni (tanpa jaringan) supaya bisa
 * diuji langsung — saudara `gabungUnduhan` di lib/unduhan.ts.
 *
 * Sengaja generik atas `{ id }`, bukan terikat `PlaylyVideoPublik`: dipanggil di
 * titik gabung KEDUA sumber video (katalog + webhook), dan keduanya cuma perlu
 * sepakat soal id. Video tanpa entri dibiarkan apa adanya — field-nya tidak
 * ditambahkan sebagai array kosong, supaya "belum diisi" tetap bisa dibedakan
 * dari "diisi lalu semuanya ditolak penyaring".
 */
export function tempelUnduhanPlayly<
  T extends { id: string; downloadProviders?: DownloadProvider[] },
>(videos: T[], peta: PetaUnduhanPlayly): T[] {
  return videos.map((v) => {
    const daftar = peta[v.id];
    return daftar?.length ? { ...v, downloadProviders: daftar } : v;
  });
}
