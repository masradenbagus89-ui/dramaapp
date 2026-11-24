// NONTON BARENG — jembatan situs Next ↔ server real-time (nobar-server).
//
// SERVER-ONLY. Berkas ini membaca NOBAR_SECRET; jangan diimpor komponen "use client".
//
// Pembagian tugas:
//   • Next (berkas ini + app/api/watch-room/*): memeriksa video ada di daftar
//     kurasi, memegang cookie HttpOnly kunci peserta, menerbitkan tiket socket.
//   • nobar-server: satu-satunya pemilik data Room (DB), sinkron, chat.
//
// Env (service SITUS di Railway):
//   NOBAR_SECRET        sama persis dengan env nobar-server (≥32 huruf)
//   NOBAR_PUBLIC_URL    alamat publik nobar-server, mis. https://nobar-xxx.up.railway.app
//   NOBAR_INTERNAL_URL  opsional — alamat jaringan privat Railway (lebih cepat,
//                       tak lewat internet); kosong = pakai NOBAR_PUBLIC_URL.
// Salah satu kosong → fitur MATI dengan rapi: tombol tak muncul, route 404.
import { hashRahasia } from "@/nobar-server/src/tiket";

const PANJANG_RAHASIA_MIN = 32;
const BATAS_TUNGGU_MS = 8000;
/** Cookie kunci peserta bertahan seminggu — sama dengan umur riwayat Room berakhir. */
export const UMUR_COOKIE_NOBAR_DETIK = 7 * 24 * 60 * 60;

const bersihkanUrl = (u: string | undefined) => (u ?? "").trim().replace(/\/+$/, "");

export function rahasiaNobar(): string {
  const r = process.env.NOBAR_SECRET ?? "";
  return r.length >= PANJANG_RAHASIA_MIN ? r : "";
}

/** Alamat yang dipakai BROWSER untuk menyambung socket. */
export function urlPublikNobar(): string {
  return bersihkanUrl(process.env.NOBAR_PUBLIC_URL);
}

export function nobarAktif(): boolean {
  return Boolean(rahasiaNobar() && urlPublikNobar().startsWith("http"));
}

/**
 * Nama cookie per Room, diturunkan dari token undangan. Per Room (bukan satu
 * cookie global) supaya satu orang bisa ikut beberapa Room sekaligus tanpa
 * saling menimpa. Hash, bukan token mentah: nama cookie terlihat di DevTools
 * & log, dan token = kunci masuk Room.
 */
export function namaCookieNobar(token: string): string {
  return `dramaku_nobar_${hashRahasia(token).slice(0, 16)}`;
}

export type JawabanNobar = { kode: number; isi: Record<string, unknown> };

/** Panggil jalur internal nobar-server. Server mati/lambat → 503, bukan melempar. */
export async function panggilNobar(jalur: string, badan: object): Promise<JawabanNobar> {
  const dasar = bersihkanUrl(process.env.NOBAR_INTERNAL_URL) || urlPublikNobar();
  try {
    const res = await fetch(`${dasar}${jalur}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${rahasiaNobar()}`, "Content-Type": "application/json" },
      body: JSON.stringify(badan),
      cache: "no-store",
      signal: AbortSignal.timeout(BATAS_TUNGGU_MS),
    });
    const isi = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { kode: res.status, isi };
  } catch {
    return { kode: 503, isi: { error: "Server Nonton Bareng sedang tidak bisa dihubungi." } };
  }
}
