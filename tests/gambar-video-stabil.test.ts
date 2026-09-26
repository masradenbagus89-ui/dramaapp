// Penjaga ALAMAT GAMBAR YANG TIDAK MATI — 2026-09-26, sesudah rilis 47b307a.
//
// CACAT YANG DIPERBAIKI, dan ini pelajaran tentang kelalaian yang rapi:
// penanda video sengaja TIDAK mengirim `contentUrl` karena alamat berkas
// videonya bertanda tangan & berumur pendek — alasan yang ditulis panjang di
// komentar. Lalu di baris berikutnya dikirimlah `thumbnailUrl` yang punya
// masalah PERSIS SAMA, tanpa diperiksa. Terukur di produksi:
// `X-Amz-Expires=21600` = 6 jam.
//
// Kenapa tak ketahuan saat dikerjakan: gambarnya SELALU hidup saat diperiksa
// manusia — halaman disegarkan tiap 60-300 detik, jauh di bawah 6 jam. Yang
// terdampak cuma pemakai yang menyimpan alamat berhari-hari (Google) atau
// berjam-jam (pratinjau share). Kerusakan yang mustahil terlihat dari layar.
//
// Aturan yang lahir: SEBELUM mengirim alamat pihak ketiga ke konsumen yang
// menyimpannya lama, periksa dulu apakah alamat itu punya masa berlaku —
// lihat query-nya, jangan percaya bahwa "gambar pasti alamat tetap".
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { alamatGambarVideo } from "../lib/tonton";
import { videoJsonLd } from "../lib/structured-data";

describe("alamatGambarVideo", () => {
  it("memulangkan alamat milik KITA, bukan alamat penyedia", () => {
    expect(alamatGambarVideo("1790342663839")).toBe("/api/thumb/1790342663839");
  });

  it("menyandikan id yang memuat karakter aneh", () => {
    // Id datang dari penyedia; bentuknya tidak dijamin selamanya polos.
    expect(alamatGambarVideo("a/b?c")).toBe("/api/thumb/a%2Fb%3Fc");
  });

  it("alamatnya TETAP — dua panggilan menghasilkan hal yang sama", () => {
    // Inti perbaikan: alamat yang disimpan Google hari ini harus tetap
    // menunjuk gambar yang sama berbulan-bulan kemudian.
    expect(alamatGambarVideo("v1")).toBe(alamatGambarVideo("v1"));
    expect(alamatGambarVideo("v1")).not.toContain("X-Amz");
  });
});

describe("gerbang & bentuk /api/thumb/[id]", () => {
  const sumber = readFileSync("app/api/thumb/[id]/route.ts", "utf-8");
  const kode = sumber
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("jaring pengaman penyaring komentarnya sendiri", () => {
    expect(kode).toContain("export async function GET");
  });

  it("MENGALIHKAN, tidak menyalurkan byte gambarnya", () => {
    // Situs ini pernah mati total & di-pause Vercel karena menyalurkan byte
    // video lewat server (29,71 GB dari jatah 10 GB, 2026-08-26). Menyalurkan
    // gambar jauh lebih kecil, tapi arahnya sama — dan jatahnya sama.
    expect(kode).toContain("NextResponse.redirect");
    expect(
      kode,
      "route ini mulai membaca isi gambarnya sendiri — itu jalur yang pernah " +
        "mem-pause seluruh project",
    ).not.toMatch(/arrayBuffer|\.body|new Response\(\s*await/);
  });

  it("memeriksa id SEBELUM dipakai", () => {
    expect(kode).toMatch(/ID_RE\.test\(id\)/);
    expect(kode).toMatch(/status: 400/);
  });

  it("GERBANG: hanya video yang boleh tampil (anti-IDOR)", () => {
    // Tanpa ini, endpoint kita jadi pintu belakang ke seluruh sampul katalog
    // penyedia — termasuk video yang sengaja disembunyikan admin.
    expect(kode).toContain("getPlaylyVideosGabunganCached");
    expect(kode).toMatch(/videos\.find\(\(v\) => v\.id === id\)/);
    expect(kode).toMatch(/status: 404/);
  });

  it("balasan 'tidak ada' dan 'tidak boleh' TIDAK dibedakan", () => {
    // Balasan yang berbeda bisa dipakai menebak id mana yang ada di katalog.
    // Keduanya lewat satu cabang `!video?.thumbnail`.
    expect(kode).toMatch(/!video\?\.thumbnail/);
  });

  it("cache pengalihannya jauh di bawah umur tanda tangan tujuan", () => {
    // Tanda tangan tujuan hidup 21600 detik (6 jam). CDN yang menyimpan
    // pengalihan lebih lama dari itu akan menyajikan penunjuk arah ke alamat
    // yang sudah mati — masalah yang sama, cuma pindah satu lapis.
    const cocok = kode.match(/const CACHE_DETIK = (\d+)/);
    expect(cocok, "CACHE_DETIK hilang").toBeTruthy();
    const detik = Number(cocok![1]);
    expect(detik).toBeGreaterThan(0);
    expect(
      detik,
      "cache pengalihan >= umur tanda tangan (21600 detik) — gambar akan mati " +
        "sebelum cache-nya kedaluwarsa",
    ).toBeLessThan(21600);
  });
});

describe("halaman tonton memakai alamat TETAP untuk Google & share", () => {
  const sumber = readFileSync("app/tonton/[id]/page.tsx", "utf-8");

  it("pratinjau share memakai alamat tetap, bukan sampul apa adanya", () => {
    expect(sumber).toMatch(/images:\s*\[\s*\{[\s\S]{0,120}alamatGambarVideo\(video\.id\)/);
    expect(
      sumber,
      "og:image kembali memakai video.thumbnail langsung — tautan yang " +
        "dikirim pagi lalu dibuka malam kehilangan gambarnya",
    ).not.toMatch(/images:\s*\[\s*\{\s*url:\s*absoluteUrl\(video\.thumbnail\)/);
  });

  it("penanda video juga memakai alamat tetap, dan ABSOLUT", () => {
    // Penanda dibaca mesin dari luar situs, yang tak punya acuan alamat
    // relatif — "/api/thumb/x" saja akan dianggap alamat tak sah.
    expect(sumber).toMatch(/absoluteUrl\(alamatGambarVideo\(video\.id\)\)/);
  });

  it("video tanpa sampul tetap null, bukan alamat yang menunjuk kekosongan", () => {
    // Pembanding: kalau alamat tetap dipasang tanpa syarat, video tak
    // bersampul akan mengirim alamat yang pasti membalas 404 ke Google.
    expect(sumber).toMatch(/video\.thumbnail\s*\n?\s*\?\s*absoluteUrl\(alamatGambarVideo/);
  });
});

describe("kartu & pemutar TETAP memakai alamat langsung", () => {
  // Sengaja TIDAK ikut diubah: di sana alamat langsung sudah benar, lebih
  // cepat (nol singgah di server kita), dan halamannya toh disegarkan jauh
  // sebelum 6 jam. Mengalihkan semuanya lewat server kita berarti menambah
  // satu singgahan untuk 40 gambar per pembukaan beranda — tanpa manfaat.
  for (const berkas of [
    "app/components/beranda/KartuVideo.tsx",
    "app/components/PlaylyVideoGrid.tsx",
  ]) {
    it(`${berkas} tidak ikut dialihkan`, () => {
      const sumber = readFileSync(berkas, "utf-8");
      expect(sumber).not.toContain("alamatGambarVideo");
    });
  }
});

describe("penanda video tetap jujur sesudah perubahan ini", () => {
  it("masih TIDAK mengirim tanggal unggah maupun alamat berkas", () => {
    // Perbaikan gambar tidak boleh diam-diam melonggarkan batas jujur yang
    // sudah diputuskan.
    const data = videoJsonLd(
      {
        title: "Arcadian",
        thumbnail: "https://dramaapp.vercel.app/api/thumb/98765",
        durationSeconds: 5506,
      },
      "https://dramaapp.vercel.app/tonton/arcadian-98765",
      "Nonton Arcadian gratis di DramaKu.",
    );
    expect("uploadDate" in data).toBe(false);
    expect("contentUrl" in data).toBe(false);
    expect(data.thumbnailUrl).toBe("https://dramaapp.vercel.app/api/thumb/98765");
  });
});
