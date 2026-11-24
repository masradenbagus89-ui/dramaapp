// TIKET & KUNCI — kriptografi kecil yang dipakai Next (penerbit) dan
// nobar-server (pemeriksa). Hanya bergantung pada node:crypto, jadi aman
// diimpor route server Next. JANGAN diimpor komponen browser.
//
// Tiga benda berbeda, jangan tertukar:
//   • TOKEN UNDANGAN  — bagian link /watch-room/<token>. Boleh dibagikan.
//   • KUNCI PESERTA   — bukti "saya peserta X". Hidup di cookie HttpOnly
//                       domain Dramaku, tak pernah terlihat JavaScript.
//   • TIKET           — kartu masuk socket berumur 60 detik, dibuat Next dari
//                       kunci peserta. Terlihat JavaScript, tapi cepat basi.
// Database hanya menyimpan HASH token & kunci: bocornya isi tabel tidak
// memberi siapa pun akses ke Room.
import crypto from "node:crypto";

/** Umur tiket koneksi socket. Pendek, karena tiket ini terlihat oleh JavaScript. */
export const UMUR_TIKET_MS = 60_000;

/** 32 byte acak = 256 bit → mustahil ditebak, berapa pun percobaannya. */
export function buatRahasiaAcak(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashRahasia(nilai: string): string {
  return crypto.createHash("sha256").update(nilai).digest("hex");
}

/** Bentuk token/kunci yang sah — memfilter sampah sebelum menyentuh database. */
export function bentukRahasiaSah(x: unknown): x is string {
  return typeof x === "string" && /^[A-Za-z0-9_-]{43}$/.test(x);
}

function tandaTangan(isi: string, rahasia: string): string {
  return crypto.createHmac("sha256", rahasia).update(isi).digest("base64url");
}

function samaPersis(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

type IsiTiket = { k: string; exp: number };

/**
 * Terbitkan tiket untuk peserta yang hash kuncinya `hashKunci`.
 * Yang dibawa tiket adalah HASH kunci, bukan kuncinya — tiket yang bocor dari
 * JavaScript tidak membuka cookie peserta, dan basi dalam 60 detik.
 */
export function buatTiket(rahasia: string, hashKunci: string, sekarang = Date.now()): string {
  const isi = Buffer.from(
    JSON.stringify({ k: hashKunci, exp: sekarang + UMUR_TIKET_MS } satisfies IsiTiket),
  ).toString("base64url");
  return `${isi}.${tandaTangan(isi, rahasia)}`;
}

/** Hash kunci peserta dari tiket yang sah & belum basi, atau null. */
export function bacaTiket(rahasia: string, tiket: unknown, sekarang = Date.now()): string | null {
  if (!rahasia || typeof tiket !== "string" || tiket.length > 512) return null;
  const titik = tiket.indexOf(".");
  if (titik < 1) return null;
  const isi = tiket.slice(0, titik);
  if (!samaPersis(tiket.slice(titik + 1), tandaTangan(isi, rahasia))) return null;
  try {
    const data = JSON.parse(Buffer.from(isi, "base64url").toString("utf8")) as IsiTiket;
    if (typeof data.k !== "string" || typeof data.exp !== "number") return null;
    return data.exp > sekarang ? data.k : null;
  } catch {
    return null;
  }
}

/** Pemeriksa header `Authorization: Bearer <rahasia>` untuk jalur internal Next → server. */
export function bearerSah(header: string | undefined, rahasia: string): boolean {
  if (!rahasia || !header?.startsWith("Bearer ")) return false;
  return samaPersis(header.slice(7), rahasia);
}
