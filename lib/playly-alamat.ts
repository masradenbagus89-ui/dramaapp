// -------------------------------------------------------------------------
// ALAMAT PLAYLY — satu sumber kebenaran, plus penambal alamat yang sudah
// pensiun.
//
// Dipisah dari lib/playly.ts (yang menyeret crypto + store + Supabase) supaya
// jalur "Video terbaru" di lib/dashboard-videos.ts — berkas mandiri tanpa satu
// pun import — bisa ikut memakainya tanpa menanggung ongkos itu.
//
// KENAPA BERKAS INI ADA (2026-09-29): Playly memindahkan layanannya dari Vercel
// ke Railway. Alamat lamanya masih hidup hari ini, tapi akan dimatikan.
//
// Masalahnya bukan di kode, melainkan di ENVIRONMENT VARIABLES (setelan alamat
// & kunci yang disimpan di panel hosting, di luar repo): `DASHBOARD_API_URL`
// TERBUKTI diisi alamat lama di Vercel — bagian "Video terbaru" hanya tampil
// kalau env itu terisi (app/discover/page.tsx:41), dan bagian itu memang tampil
// di produksi. Env MENANG atas bawaan di kode, jadi mengganti konstanta saja
// tidak menolong jalur itu.
//
// Dan tak seorang pun di tim ini punya akses ke panel Vercel-nya. Maka
// perbaikannya ditaruh di tempat yang memang bisa kita kendalikan: kode.
// -------------------------------------------------------------------------

/** Alamat Playly yang berlaku sekarang. Ganti di SINI kalau mereka pindah lagi. */
export const PLAYLY_BASE_URL = "https://playly-hosting-video.up.railway.app";

/**
 * Alamat Playly yang sudah ditinggalkan.
 *
 * Isinya bukan "alamat yang dilarang", melainkan "alamat yang kita tahu
 * penggantinya". Menambah satu baris di sini cukup untuk menambal seluruh
 * setelan lama yang tak bisa kita sunting.
 */
export const HOST_PLAYLY_PENSIUN = ["playly-dashboard.vercel.app"];

/**
 * Kalau sebuah alamat masih menunjuk Playly yang lama, pulangkan alamat yang
 * sama persis TAPI di host yang baru. Selain itu, pulangkan apa adanya.
 *
 * Fungsi MURNI: tidak membaca env, tidak menulis log, tidak menyentuh jaringan.
 * Jalur (`/api/videos`), query, dan tanda pagar dipertahankan — yang ditukar
 * HANYA bagian hostnya, karena hanya itu yang berubah di sisi Playly (API,
 * kunci, dan bentuk balasannya sama persis; diverifikasi 2026-09-29 dengan
 * membandingkan /api/public-video untuk id yang sama di kedua alamat).
 *
 * ⚠️ BATAS YANG DISENGAJA: ini HANYA menambal alamat yang sudah pensiun. Alamat
 * lain di env tetap dihormati apa adanya — kalau suatu saat Playly memakai
 * domain ketiga dan seseorang menyetelnya lewat env, setelan itu yang dipakai,
 * bukan konstanta di atas. Begitu panel hosting bisa disunting lagi, isi env-nya
 * diperbaiki dan berkas ini boleh disederhanakan.
 */
export function pindahkanAlamatPlaylyPensiun(alamat: string): string {
  const s = alamat.trim();
  if (!s) return s; // kosong tetap kosong — pemanggilnya yang memutuskan artinya

  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return s; // bukan alamat utuh (mis. potongan relatif) — bukan urusan fungsi ini
  }

  const host = url.hostname.toLowerCase();
  const pensiun = HOST_PLAYLY_PENSIUN.some(
    (h) => host === h || host.endsWith(`.${h}`),
  );
  if (!pensiun) return s;

  const baru = new URL(PLAYLY_BASE_URL);
  url.protocol = baru.protocol;
  url.host = baru.host;
  return url.toString();
}
