// Tanda tangan alamat video — ⚠️ KHUSUS SERVER.
//
// 🚫 JANGAN pernah diimpor dari komponen `"use client"`. Berkas ini membaca
// `VIDEO_SIGNING_SECRET`; satu impor dari komponen klien berarti rahasianya
// ikut dikirim ke browser (§5.2) dan seluruh pagar ini jadi teater. Itu bukan
// bahaya teoretis: `lib/video.ts` memang diimpor `app/components/FeedPlayer.tsx:18`
// yang berbaris `"use client"` — karena itulah fungsi ini TIDAK ditaruh di sana.
// Penjaga tambahan datang gratis dari Next.js: `node:crypto` di bundle klien
// menggagalkan build, jadi pelanggaran ketahuan saat build, bukan saat tayang.
//
// KENAPA ADA (temuan 2026-10-27, diukur di produksi): episode berbayar bisa
// ditonton siapa pun tanpa login. Alamat `.mp4` tercetak apa adanya ke HTML
// `/watch` & `/feed`, dan tunnel PC backup melayani siapa pun yang tahu
// alamatnya — diuji: `206 PartialContent`, `video/mp4`, isi diawali `ftypmp42`.
// Gerbang `lib/paywall-guard.ts` hanya menjaga jalur API; berkas itu sudah
// menulis batas dirinya sendiri di baris 11-19.
//
// Rencana lengkap + tahapannya:
// `docs/lintasai/rencana/2026-10-27-tutup-kebocoran-paywall-video.md`.

import { createHmac } from "node:crypto";

/**
 * Umur tanda tangan. Dipilih 6 jam, angka yang SAMA dengan umur tanda tangan
 * sampul Playly (`X-Amz-Expires=21600`, diukur di `app/api/thumb/[id]/route.ts:11`)
 * supaya project ini tidak punya dua angka "berapa lama tautan hidup".
 *
 * Kenapa tidak lebih pendek walau lebih aman: tanda tangan yang mati di tengah
 * tontonan membuat video berhenti pada penonton yang SUDAH membayar — kerusakan
 * yang lebih terasa daripada yang dicegah. Pemulihnya tetap ada (pemutar
 * meminta alamat baru saat gagal), tapi jeda 6 jam membuat jalur itu jarang
 * terpakai, bukan jadi andalan.
 *
 * Batas jujur: selama 6 jam itu, tautan yang sengaja dibagikan penonton
 * berbayar MASIH bisa dipakai orang lain. Yang ditutup tanda tangan ini adalah
 * pengambilan massal, penelusuran pustaka, dan tautan abadi — bukan niat
 * berbagi. Menutup itu butuh tanda tangan per-penonton, pekerjaan terpisah.
 */
export const UMUR_TANDA_TANGAN_DETIK = 6 * 60 * 60;

/**
 * Rahasia penanda tangan. Dibaca DI DALAM fungsi, bukan di tingkat modul —
 * pola yang sama dengan `lib/session.ts:24`. Di tingkat modul, nilainya bisa
 * terbaca sekali saat build lalu beku, padahal env diisi owner di panel
 * hosting dan bisa berubah tanpa build ulang.
 */
function rahasia(): string {
  return (process.env.VIDEO_SIGNING_SECRET ?? "").trim();
}

/** Apakah penandatanganan menyala? Dipakai pemanggil untuk melapor apa adanya. */
export function penandaTanganVideoAktif(): boolean {
  return rahasia().length > 0;
}

/**
 * Tempelkan tanda tangan berumur pendek ke alamat video.
 *
 * ⚠️ FORMATNYA MENGIKAT — wajib sama persis dengan yang diperiksa plugin
 * `caddy-signed-urls` di PC backup (Tahap B), kalau tidak video mati total:
 *   1. `issued` & `expires` (detik Unix) dimasukkan sebagai query
 *   2. seluruh query DIURUTKAN, `signature` tidak ikut ditandatangani
 *   3. yang di-HMAC: `"<path>?<query terurut>"` — path saja, tanpa host
 *   4. HMAC-SHA256 → base64url TANPA padding (`digest("base64url")` Node
 *      memang sudah tanpa padding)
 *   5. `signature` ditempel paling belakang
 *
 * Batas yang DIKETAHUI: `path` diambil dari `URL.pathname` yang bentuknya
 * ter-encode, sedangkan Caddy memeriksa path yang sudah di-decode. Keduanya
 * sama HANYA selama id drama tidak memuat karakter yang perlu di-encode —
 * dan memang begitu, `ID_RE` di route pemanggil mewajibkan `^[a-z0-9-]+$`.
 * Kalau suatu hari pola id dilonggarkan, tanda tangan akan gagal cocok dan
 * video mati; itu sebabnya batas ini ditulis di sini, bukan dibiarkan jadi
 * kejutan.
 *
 * Fungsi MURNI: nol efek samping, nol pembacaan waktu tersembunyi (`sekarangDetik`
 * dioper pemanggil) sehingga bisa diuji tanpa memalsukan jam sistem.
 *
 * @param urlAsli alamat lengkap ke berkas video di tunnel
 * @param sekarangDetik detik Unix saat ini
 * @param umurDetik berapa lama tanda tangan berlaku
 * @returns alamat ber-tanda-tangan; **alamat asli apa adanya** kalau rahasianya
 *   belum disetel — sengaja, supaya Tahap A bisa tayang sebelum env diisi dan
 *   sebelum tunnel menegakkan, tanpa mematikan video sedetik pun.
 */
export function tandaTanganiUrlVideo(
  urlAsli: string,
  sekarangDetik: number,
  umurDetik: number = UMUR_TANDA_TANGAN_DETIK,
): string {
  const kunci = rahasia();
  if (!kunci) return urlAsli;

  const u = new URL(urlAsli);
  const issued = Math.floor(sekarangDetik);
  const expires = issued + Math.floor(umurDetik);

  u.searchParams.set("issued", String(issued));
  u.searchParams.set("expires", String(expires));
  // Tanda tangan lama (kalau alamatnya pernah ditandatangani) tidak boleh ikut
  // ditandatangani — itu akan membuat hasilnya tak pernah cocok.
  u.searchParams.delete("signature");
  u.searchParams.sort();

  const yangDitandaTangani = `${u.pathname}?${u.searchParams.toString()}`;
  const tanda = createHmac("sha256", kunci)
    .update(yangDitandaTangani)
    .digest("base64url");

  u.searchParams.set("signature", tanda);
  return u.toString();
}
