// -------------------------------------------------------------------------
// KUALITAS VIDEO untuk lencana poster film (owner 2026-10-31).
//
// MASALAHNYA: poster film tampil tanpa keterangan HD/CAM sama sekali. Penyedia
// video TIDAK pernah mengirim mutu berkas (lib/playly.ts `PlaylyVideo` hanya
// berisi judul, durasi, kreator, embed, sampul), dan satu-satunya sumber yang
// ada sebelum ini adalah `quality` milik drama yang dikaitkan admin — padahal
// di produksi NOL kaitan pernah dibuat. Jadi kolomnya memang selalu kosong.
//
// PILIHAN OWNER: turunkan dari LINK UNDUHAN yang sudah kita simpan sendiri
// (lib/playly-unduhan.ts menyimpan per video × provider × kualitas 1080p/480p).
// Itu data nyata milik kita, bukan tebakan — diukur 2026-10-31, tiga dari tiga
// film yang diperiksa di produksi punya link 1080p.
//
// ⚠️ BATAS YANG HARUS JUJUR DIAKUI: "ada berkas 1080p" membuktikan RESOLUSINYA
// tinggi, TIDAK membuktikan sumbernya bukan rekaman bioskop (CAM beresolusi
// tinggi tetap CAM). Karena itu turunan ini sengaja ditempatkan sebagai sumber
// TERAKHIR — nilai yang dipilih manusia selalu menang, dan nilai turunan bisa
// ditimpa. Aturan yang sama dengan poster drama: lencana tak boleh menebak
// (lib/lencana-kartu.ts).
//
// Semua fungsi MURNI (tanpa jaringan/DOM) supaya bisa diuji di
// tests/kualitas-video.test.ts.
// -------------------------------------------------------------------------
import type { LinkUnduhanPublik } from "./playly-unduhan";

/**
 * Label yang boleh lahir dari turunan ini. Sengaja cuma dua, dan sengaja BUKAN
 * "CAM": tak ada satu pun data di sistem yang bisa membuktikan sebuah berkas
 * hasil rekaman bioskop, jadi label itu hanya boleh datang dari manusia.
 */
export type KualitasTurunan = "HD" | "SD";

/** Kualitas unduhan yang dianggap resolusi tinggi. */
const UNDUHAN_HD = "1080p";

/**
 * Turunkan kualitas dari daftar link unduhan sebuah video.
 *
 * Ada berkas 1080p  -> "HD"
 * Hanya 480p        -> "SD"
 * Tidak ada link    -> null (poster TIDAK menggambar lencana apa pun)
 *
 * `null`, bukan "SD", saat daftarnya kosong: belum punya link unduhan bukan
 * berarti videonya beresolusi rendah — itu dua hal berbeda, dan menyamakannya
 * berarti memajang mutu rendah pada film yang belum tentu begitu.
 */
export function kualitasDariUnduhan(
  links: LinkUnduhanPublik[] | undefined,
): KualitasTurunan | null {
  if (!links?.length) return null;
  return links.some((l) => l.quality === UNDUHAN_HD) ? "HD" : "SD";
}

/**
 * Isi `quality` yang masih kosong dengan turunan dari link unduhan.
 *
 * HANYA yang kosong — inilah yang membuat "bisa dikoreksi" berlaku: nilai dari
 * pilihan admin maupun dari drama yang dikaitkan sudah terisi lebih dulu
 * (lib/playly-publik.ts `labelUntuk`), dan fungsi ini tidak pernah menimpanya.
 * Urutan menangnya: pilihan manusia > turunan otomatis.
 */
export function lengkapiKualitasVideo<
  T extends { quality: string | null; linkUnduhan?: LinkUnduhanPublik[] },
>(videos: T[]): T[] {
  return videos.map((v) => {
    if (v.quality) return v;
    const turunan = kualitasDariUnduhan(v.linkUnduhan);
    return turunan ? { ...v, quality: turunan } : v;
  });
}
