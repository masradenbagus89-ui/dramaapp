// Tes pengunci untuk kode pemulihan password penonton (Tahap 7).
//
// Yang paling penting dikunci: kode disimpan sebagai HASH (bukan teks asli),
// verifikasi memaafkan beda format ketik, dan kode salah selalu ditolak.
import { describe, it, expect } from "vitest";
import {
  generateRecoveryCode,
  normalizeRecoveryCode,
  hashRecoveryCode,
  verifyRecoveryCode,
  RECOVERY_CODE_LEN,
} from "../lib/recovery-code";

describe("generateRecoveryCode — bentuk kode", () => {
  it("berbentuk 4 grup 4 karakter dipisah tanda hubung", () => {
    expect(generateRecoveryCode()).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);
  });

  it("panjang tanpa tanda hubung sesuai RECOVERY_CODE_LEN", () => {
    expect(normalizeRecoveryCode(generateRecoveryCode())).toHaveLength(
      RECOVERY_CODE_LEN,
    );
  });

  it("tidak memakai karakter yang mudah tertukar (0 O 1 I L)", () => {
    // 200 kode: cukup untuk menangkap huruf terlarang yang lolos sesekali.
    const semua = Array.from({ length: 200 }, () => generateRecoveryCode()).join("");
    expect(semua).not.toMatch(/[01OIL]/);
  });

  it("dua kode berturut-turut tidak sama (benar-benar acak)", () => {
    expect(generateRecoveryCode()).not.toBe(generateRecoveryCode());
  });
});

describe("normalizeRecoveryCode — memaafkan beda format ketik", () => {
  it("huruf kecil, spasi, dan tanda hubung diabaikan", () => {
    expect(normalizeRecoveryCode(" abcd-efgh jkmn-pqrs ")).toBe("ABCDEFGHJKMNPQRS");
  });

  it("nilai kosong tidak bikin error", () => {
    expect(normalizeRecoveryCode("")).toBe("");
  });
});

describe("verifyRecoveryCode — cocokkan dengan hash tersimpan", () => {
  it("kode yang benar -> lolos", () => {
    const kode = generateRecoveryCode();
    expect(verifyRecoveryCode(kode, hashRecoveryCode(kode))).toBe(true);
  });

  it("🔒 kode asli TIDAK tersimpan di record (hanya hash + salt)", () => {
    const kode = generateRecoveryCode();
    const rec = hashRecoveryCode(kode);
    const isi = JSON.stringify(rec);
    expect(isi).not.toContain(normalizeRecoveryCode(kode));
    expect(Object.keys(rec).sort()).toEqual(["hash", "salt"]);
  });

  it("ditulis huruf kecil tanpa tanda hubung -> tetap lolos", () => {
    const kode = generateRecoveryCode();
    const rec = hashRecoveryCode(kode);
    expect(verifyRecoveryCode(normalizeRecoveryCode(kode).toLowerCase(), rec)).toBe(true);
  });

  it("🔒 kode lain -> ditolak", () => {
    const rec = hashRecoveryCode(generateRecoveryCode());
    expect(verifyRecoveryCode(generateRecoveryCode(), rec)).toBe(false);
  });

  it("🔒 panjang salah -> ditolak", () => {
    const kode = generateRecoveryCode();
    const rec = hashRecoveryCode(kode);
    expect(verifyRecoveryCode("ABCD", rec)).toBe(false);
    expect(verifyRecoveryCode(normalizeRecoveryCode(kode) + "X", rec)).toBe(false);
  });

  it("🔒 record kosong/tak ada -> ditolak (akun Tahap 6 tanpa kode)", () => {
    const kode = generateRecoveryCode();
    expect(verifyRecoveryCode(kode, null)).toBe(false);
    expect(verifyRecoveryCode(kode, undefined)).toBe(false);
    expect(verifyRecoveryCode(kode, { hash: "", salt: "" })).toBe(false);
  });
});
