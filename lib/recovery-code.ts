// Kode pemulihan password penonton.
//
// Dipakai saat penonton lupa password: email + kode ini menggantikan peran
// "link reset lewat email" — project belum bisa kirim email (butuh domain
// milik sendiri), jadi jalur pulih dibuat tanpa ketergantungan luar.
//
// Yang disimpan di database HANYA hash-nya (scrypt + salt, memakai ulang
// lib/admin-password.ts). Kode aslinya ditampilkan SEKALI saat dibuat dan
// tidak bisa dilihat lagi — persis seperti kode cadangan 2FA.
import { randomInt } from "node:crypto";
import {
  hashPassword,
  verifyPassword,
  type PasswordRecord,
} from "./admin-password";

/**
 * Huruf & angka tanpa karakter yang mudah tertukar saat disalin tangan:
 * 0/O dan 1/I/L sengaja dibuang supaya penonton tak salah ketik.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const GROUP_LEN = 4;
const GROUP_COUNT = 4;

/** Panjang kode tanpa tanda hubung. 31^16 kemungkinan — tak bisa ditebak. */
export const RECOVERY_CODE_LEN = GROUP_LEN * GROUP_COUNT;

/** Buat kode pemulihan baru, mis. "ABCD-EFGH-JKMN-PQRS". */
export function generateRecoveryCode(): string {
  let raw = "";
  // randomInt dari node:crypto = acak kelas kripto & tanpa bias (bukan Math.random).
  for (let i = 0; i < RECOVERY_CODE_LEN; i++) {
    raw += ALPHABET[randomInt(ALPHABET.length)];
  }
  const groups: string[] = [];
  for (let i = 0; i < raw.length; i += GROUP_LEN) {
    groups.push(raw.slice(i, i + GROUP_LEN));
  }
  return groups.join("-");
}

/**
 * Samakan bentuk sebelum dibandingkan: huruf besar, tanpa tanda hubung/spasi.
 * Penonton sering menyalin dengan format berbeda — itu tak boleh bikin gagal.
 */
export function normalizeRecoveryCode(code: string): string {
  return (code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Hash kode untuk disimpan. Kode asli TIDAK pernah disimpan. */
export function hashRecoveryCode(code: string): PasswordRecord {
  return hashPassword(normalizeRecoveryCode(code));
}

/** True kalau kode yang diketik cocok dengan record tersimpan. */
export function verifyRecoveryCode(
  code: string,
  record: PasswordRecord | null | undefined,
): boolean {
  const normalized = normalizeRecoveryCode(code);
  // Panjang salah = pasti bukan kode kami; tolak lebih awal tanpa hitung hash.
  if (normalized.length !== RECOVERY_CODE_LEN) return false;
  return verifyPassword(normalized, record);
}
