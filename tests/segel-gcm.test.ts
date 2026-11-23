// Tes pengunci: segel GCM (authentication tag) WAJIB 16 byte penuh.
//
// Lahir dari audit keamanan 2026-11-14 (SEC-007). Ditemukan Semgrep (aturan
// javascript.node-crypto.security.gcm-no-tag-length), lalu DIBUKTIKAN dengan
// dijalankan: tanpa opsi `authTagLength`, `setAuthTag()` di Node menerima
// segel yang DIPOTONG — segel 4 byte diterima dan dekripsinya LOLOS. Artinya
// ketahanan terhadap pemalsuan segel jatuh dari 2^128 ke 2^32. Node sendiri
// menandai pemakaian itu usang lewat peringatan DEP0182.
//
// Yang disegel di sini: kunci API Playly yang disimpan terenkripsi di database
// (lib/playly.ts encryptSecret/decryptSecret). Segel itulah yang membuktikan
// isinya belum diubah siapa pun sejak disimpan.
//
// Tes ini MERAH kalau opsi authTagLength dilepas dari lib/playly.ts.
import { describe, it, expect, beforeAll } from "vitest";
import crypto from "node:crypto";

// Kunci enkripsi dibaca dari env saat fungsi dipanggil.
beforeAll(() => {
  process.env.PLAYLY_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
});

const { encryptSecret, decryptSecret } = await import("../lib/playly");

/** Potong segel di blob "v1.iv.ciphertext.tag" jadi `byte` byte pertama. */
function potongSegel(blob: string, byte: number): string {
  const b = blob.split(".");
  const tag = Buffer.from(b[3], "base64url").subarray(0, byte);
  b[3] = tag.toString("base64url");
  return b.join(".");
}

describe("segel GCM kunci Playly (SEC-007)", () => {
  it("bolak-balik normal tetap jalan", () => {
    const blob = encryptSecret("kunci-playly-contoh");
    expect(decryptSecret(blob)).toBe("kunci-playly-contoh");
  });

  it("segel yang ditulis panjangnya 16 byte penuh", () => {
    const blob = encryptSecret("apa pun");
    const tag = Buffer.from(blob.split(".")[3], "base64url");
    expect(tag.length).toBe(16);
  });

  it("MENOLAK segel yang dipotong — inilah lubang yang ditutup", () => {
    const blob = encryptSecret("kunci-playly-contoh");
    // 4 byte = 32 bit. Tanpa authTagLength, panjang inilah yang dulu LOLOS.
    for (const byte of [4, 8, 12, 15]) {
      expect(() => decryptSecret(potongSegel(blob, byte)), `${byte} byte`).toThrow();
    }
  });

  it("MENOLAK segel yang diutak-atik pada panjang penuh", () => {
    const blob = encryptSecret("kunci-playly-contoh");
    const b = blob.split(".");
    const tag = Buffer.from(b[3], "base64url");
    tag[0] ^= 0xff; // balik satu byte
    b[3] = tag.toString("base64url");
    expect(() => decryptSecret(b.join("."))).toThrow();
  });

  it("MENOLAK isi pesan yang diubah walau segelnya utuh", () => {
    const blob = encryptSecret("kunci-playly-contoh");
    const b = blob.split(".");
    const isi = Buffer.from(b[2], "base64url");
    isi[0] ^= 0xff;
    b[2] = isi.toString("base64url");
    expect(() => decryptSecret(b.join("."))).toThrow();
  });
});
