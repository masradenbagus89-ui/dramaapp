// Tes pengunci: fungsi pembelanjaan koin WAJIB mengunci baris dompet.
//
// Lahir dari audit keamanan 2026-11-14 (SEC-002). Bentuk lama
// dramaapp.coin_spend_unlock membaca saldo ke variabel, memeriksanya, lalu
// menulis — tanpa kunci baris. Dua permintaan serentak dari satu penonton
// sama-sama melihat saldo yang sama, jadi 8 koin bisa membuka beberapa episode
// seharga 8 koin masing-masing (dan saldonya ikut minus). Kelasnya TOCTOU; rak
// skills/owasp/SKILL.md §2 butir 1 menandai "cek-saldo tanpa lock" sebagai
// risiko tinggi.
//
// KENAPA DIUJI DARI BERKAS SQL, bukan dari database: menjalankan DDL ke
// Supabase produksi adalah tombol rilis milik owner (AGENTS.md §5.1/§5.5), dan
// tes tidak boleh menyentuhnya. Yang bisa dijaga mesin di sini adalah SUMBER-nya
// — definisi yang nanti dijalankan owner.
//
// Yang dikunci: definisi `dramaapp.coin_spend_unlock` yang PALING BARU (itulah
// yang menang saat migrasi dijalankan berurutan) harus memegang `for update`.
// Berkas migrasi lama sengaja TIDAK diperiksa — isinya catatan sejarah dan
// tidak boleh diubah surut.
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR_MIGRASI = "supabase_migrations";

/**
 * Buang komentar `--` dari SQL.
 *
 * WAJIB, dan ini bukan kerapian: versi pertama tes ini memeriksa isi berkas
 * apa adanya, lalu LULUS walau `for update` sudah dilepas dari perintahnya —
 * karena kata itu masih tertulis di komentar DI DALAM badan fungsi. Penjaga
 * yang tak pernah bisa merah = hiasan (rak auth §2 RBAC #5). Terbukti saat
 * uji-balik 2026-11-14.
 */
function tanpaKomentar(sql: string): string {
  return sql
    .split("\n")
    .map((baris) => {
      const i = baris.indexOf("--");
      return i < 0 ? baris : baris.slice(0, i);
    })
    .join("\n");
}

function isiBersih(nama: string): string {
  return tanpaKomentar(readFileSync(join(DIR_MIGRASI, nama), "utf-8"));
}

/** Semua berkas migrasi yang mendefinisikan fungsi itu, urut nama (= urut tanggal). */
function berkasPendefinisi(): string[] {
  return readdirSync(DIR_MIGRASI)
    .filter((n) => n.endsWith(".sql"))
    .filter((n) =>
      /create\s+or\s+replace\s+function\s+dramaapp\.coin_spend_unlock/i.test(
        isiBersih(n),
      ),
    )
    .sort();
}

describe("coin_spend_unlock — kunci baris dompet (SEC-002)", () => {
  it("ada berkas migrasi yang mendefinisikannya", () => {
    expect(berkasPendefinisi().length).toBeGreaterThan(0);
  });

  it("definisi TERBARU memegang 'for update'", () => {
    const daftar = berkasPendefinisi();
    const terbaru = daftar[daftar.length - 1];
    const isi = isiBersih(terbaru);

    // Ambil hanya badan fungsi ini, supaya `for update` milik fungsi lain di
    // berkas yang sama tidak ikut terhitung sebagai bukti.
    const mulai = isi.search(
      /create\s+or\s+replace\s+function\s+dramaapp\.coin_spend_unlock/i,
    );
    const badan = isi.slice(mulai);
    const akhir = badan.search(/end;\s*\$\$;/i);
    const fungsi = akhir < 0 ? badan : badan.slice(0, akhir);

    expect(fungsi, `berkas terbaru: ${terbaru}`).toMatch(/for\s+update/i);
  });

  it("kunci diambil SEBELUM tabel unlocks diperiksa", () => {
    // Urutan ini yang menutup kerusakan kedua: dua permintaan untuk episode
    // yang SAMA menarik koin dua kali kalau `exists` dicek sebelum kunci
    // dipegang.
    const daftar = berkasPendefinisi();
    const isi = isiBersih(daftar[daftar.length - 1]);
    const mulai = isi.search(
      /create\s+or\s+replace\s+function\s+dramaapp\.coin_spend_unlock/i,
    );
    const fungsi = isi.slice(mulai);

    const posKunci = fungsi.search(/for\s+update/i);
    const posExists = fungsi.search(/exists\s*\(\s*select[\s\S]{0,80}?unlocks/i);

    expect(posKunci).toBeGreaterThan(-1);
    expect(posExists).toBeGreaterThan(-1);
    expect(posKunci).toBeLessThan(posExists);
  });
});
