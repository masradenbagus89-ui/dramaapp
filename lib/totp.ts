// TOTP (RFC 6238) tanpa dependency — kompatibel Google Authenticator/Authy.
// Algoritma standar: HMAC-SHA1, 6 digit, periode 30 detik.
import crypto from "node:crypto";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // Base32 RFC 4648
const STEP = 30; // detik per kode
const DIGITS = 6;

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Rahasia base32 acak (default 20 byte = 160 bit). */
export function generateSecret(bytes = 20): string {
  return base32Encode(crypto.randomBytes(bytes));
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const mac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = mac[mac.length - 1] & 0xf;
  const bin =
    ((mac[offset] & 0x7f) << 24) |
    ((mac[offset + 1] & 0xff) << 16) |
    ((mac[offset + 2] & 0xff) << 8) |
    (mac[offset + 3] & 0xff);
  return String(bin % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** Kode TOTP saat ini untuk sebuah secret. */
export function totp(secret: string, time = Date.now()): string {
  return hotp(secret, Math.floor(time / 1000 / STEP));
}

function timingEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/**
 * Verifikasi token 6-digit. `window` = jumlah langkah toleransi ke depan/belakang
 * (default 1 = ±30 detik) untuk mengakomodasi jam yang sedikit melenceng.
 */
export function verifyTotp(
  secret: string,
  token: string,
  window = 1,
  time = Date.now(),
): boolean {
  const t = (token ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(t)) return false;
  const counter = Math.floor(time / 1000 / STEP);
  for (let w = -window; w <= window; w++) {
    if (timingEqual(hotp(secret, counter + w), t)) return true;
  }
  return false;
}

/** URI otpauth:// untuk di-scan / di-input manual ke aplikasi authenticator. */
export function otpauthURL(
  email: string,
  secret: string,
  issuer = "DramaKu",
): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
