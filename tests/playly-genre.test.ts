// Penjaga KATEGORI video — aturan isi + pagar endpoint admin (owner 2026-09-26).
//
// Dua hal yang dijaga, dan keduanya punya kerusakan yang SENYAP:
//
//  1. ATURAN ISI. Kategori yang tersimpan harus salah satu kategori katalog.
//     Nilai ngawur ("action", "Horor", "<script>") tidak cocok dengan baris
//     genre mana pun, jadi videonya diam-diam berhenti muncul di sana — tanpa
//     satu pun error. Admin akan menyimpulkan fiturnya rusak.
//
//  2. PAGAR ENDPOINT (rak owasp §1 broken access). Endpoint ini MENGUBAH apa
//     yang dilihat seluruh pengunjung situs. Otorisasinya wajib ada DI DALAM
//     route handler, bukan bersandar pada middleware saja — CVE-2025-29927
//     membuktikan cek yang cuma ada di middleware bisa dilewati lewat header.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { CATEGORIES, KATEGORI_ISI, parseKategoriVideo } from "../lib/types";

describe("daftar kategori isi", () => {
  it("sama dengan CATEGORIES, hanya tanpa 'Semua'", () => {
    // Diturunkan, bukan diketik ulang — dua daftar yang harus sama persis
    // pasti menyimpang cepat atau lambat.
    expect(KATEGORI_ISI).toEqual(CATEGORIES.filter((c) => c !== "Semua"));
  });

  it("TIDAK memuat 'Semua'", () => {
    // "Semua" adalah pilihan penyaring, bukan kategori. Menyimpannya sebagai
    // kategori sebuah video akan melahirkan baris "Drama Semua" yang tak
    // berarti apa-apa.
    expect(KATEGORI_ISI).not.toContain("Semua");
  });
});

describe("parseKategoriVideo — allowlist, bukan terima apa adanya", () => {
  it("menerima tiap kategori yang sah", () => {
    for (const k of KATEGORI_ISI) {
      expect(parseKategoriVideo(k), k).toBe(k);
    }
  });

  it("merapikan spasi di ujung", () => {
    expect(parseKategoriVideo("  Action  ")).toBe("Action");
  });

  it("menolak nilai yang tidak ada di daftar", () => {
    // Termasuk beda huruf besar-kecil: "action" bukan "Action", dan kalau
    // diloloskan ia tak akan cocok dengan baris genre mana pun.
    for (const buruk of [
      "action",
      "Horor",
      "Semua",
      "<script>alert(1)</script>",
      "",
      "   ",
    ]) {
      expect(parseKategoriVideo(buruk), buruk).toBeNull();
    }
  });

  it("menolak nilai yang bukan teks sama sekali", () => {
    // Body JSON datang dari luar; angka, objek, dan array semuanya mungkin.
    for (const buruk of [null, undefined, 42, true, {}, [], { toString: () => "Action" }]) {
      expect(parseKategoriVideo(buruk)).toBeNull();
    }
  });
});

// ===========================================================================
// PAGAR ENDPOINT — diperiksa dari sumbernya.
//
// Kenapa dari sumber dan bukan dengan memanggil route-nya: route ini menyeret
// sesi, Supabase, dan pembatas laju; menirukan ketiganya di sini berarti yang
// diuji tiruan saya sendiri, bukan pagarnya. Yang ingin dijamin justru hal
// yang mudah hilang saat kode dirapikan — bukan perilaku runtime-nya.
// ===========================================================================
describe("pagar endpoint /api/admin/playly/genre", () => {
  const sumber = readFileSync("app/api/admin/playly/genre/route.ts", "utf-8");
  const kode = sumber
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("jaring pengaman penyaring komentarnya sendiri", () => {
    // Kalau penyaring terlalu rakus dan mengosongkan berkas, seluruh tes di
    // bawah lulus tanpa memeriksa apa pun.
    expect(kode).toContain("export async function POST");
  });

  it("mengambil identitas dari SESI, bukan dari isi kiriman", () => {
    expect(kode).toContain("getAdminEmail(req)");
    expect(
      kode,
      "identitas admin dibaca dari body — siapa pun bisa mengaku jadi admin",
    ).not.toMatch(/body\.email/);
  });

  it("menolak pemanggil yang bukan admin di KEDUA metode", () => {
    expect(kode).toContain("isAdminRequest(req)");
    // 401 muncul di GET dan di POST, bukan cuma salah satu.
    expect((kode.match(/status: 401/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("memakai pembatas laju permintaan", () => {
    expect(kode).toContain("guardMutation");
  });

  it("menyaring nilai lewat allowlist sebelum menyimpan", () => {
    expect(
      kode,
      "kategori disimpan apa adanya dari kiriman — nilai ngawur akan masuk " +
        "database dan videonya berhenti muncul di baris genre tanpa error",
    ).toContain("parseKategoriVideo(body.genre)");
    expect(kode).not.toMatch(/setPlaylyVideoGenre\(videoId,\s*body\./);
  });

  it("GAGAL-AMAN: kegagalan penyimpanan dibalas 500, tidak diloloskan", () => {
    // Rak owasp §1 A10: blok catch tidak boleh berakhir seolah berhasil.
    expect(kode).toMatch(/catch[\s\S]*status: 500/);
    expect(kode).not.toMatch(/catch[\s\S]{0,200}ok:\s*true/);
  });
});

describe("panel admin benar-benar memasang dropdown kategorinya", () => {
  // Pelajaran 2026-09-23: komponen bisa lengkap dan teruji sementara NOL
  // halaman memasangnya, dan build/tsc/test semuanya diam.
  it("halaman admin mengoper kategori yang sudah tersimpan", () => {
    const halaman = readFileSync("app/admin/videos/playly/page.tsx", "utf-8");
    expect(halaman).toContain("getPlaylyGenres()");
    expect(
      halaman,
      "panel admin tidak menerima kategori tersimpan — dropdown akan selalu " +
        "terlihat kosong walau datanya ada",
    ).toMatch(/initialGenres=\{genres\}/);
  });

  it("panelnya menawarkan seluruh kategori + pilihan mengosongkan", () => {
    const panel = readFileSync(
      "app/components/admin/PlaylyVisibilityManager.tsx",
      "utf-8",
    );
    expect(panel).toContain("KATEGORI_ISI");
    expect(panel).toContain("Tanpa kategori");
    expect(panel).toContain("/api/admin/playly/genre");
  });
});
