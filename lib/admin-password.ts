// Hash & verifikasi password admin PER-AKUN. Pakai scrypt bawaan Node (tak ada
// paket tambahan). Password asli TIDAK pernah disimpan — yang disimpan hanya
// salt acak + hash. Verifikasi memakai timingSafeEqual (anti tebak lewat waktu).
//
// Dipisah dari route/login agar bisa dites & dipakai ulang.
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

export type PasswordRecord = { hash: string; salt: string };

const KEYLEN = 64; // panjang hash (byte)

/** Buat salt acak + hash dari password. `salt` boleh diisi (untuk verifikasi/tes). */
export function hashPassword(password: string, salt?: string): PasswordRecord {
  const s = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, s, KEYLEN).toString("hex");
  return { hash, salt: s };
}

/** True kalau `password` cocok dengan record (salt + hash) tersimpan. */
export function verifyPassword(
  password: string,
  record: PasswordRecord | null | undefined,
): boolean {
  if (!record || !record.hash || !record.salt) return false;
  let computed: Buffer;
  try {
    computed = scryptSync(password, record.salt, KEYLEN);
  } catch {
    return false;
  }
  const stored = Buffer.from(record.hash, "hex");
  if (stored.length !== computed.length) return false;
  return timingSafeEqual(stored, computed);
}
