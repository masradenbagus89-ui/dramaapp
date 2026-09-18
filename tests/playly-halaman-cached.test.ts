// Penjaga permanen: halaman penonton WAJIB lewat pintu ber-cache (2026-09-18).
//
// KENAPA TES INI MEMBACA BERKAS SUMBER, bukan menjalankan kodenya. Yang dijaga
// di sini adalah keputusan yang akibatnya baru muncul saat `next build`: pintu
// mana yang dipanggil menentukan halamannya tercatat static atau dynamic.
// Menjalankan fungsinya tidak bisa membuktikan itu — kedua pintu mengembalikan
// daftar yang sama persis (dibuktikan di tests/playly-gabungan.test.ts), dan
// bedanya cuma opsi `revalidate` yang dioper ke Supabase.
//
// Sejarahnya: /playly diam-diam berubah jadi dynamic antara 2026-09-15 dan
// 2026-09-18 dan LOLOS seluruh 653 tes, karena tak ada satu pun yang menanyakan
// pertanyaan ini. Saat Supabase tidak menjawab (insiden 522, 2026-09-16),
// halaman static tetap melayani penonton sedangkan yang dynamic ikut mati.
//
// Tes ini rapuh terhadap penggantian NAMA fungsi — itu disengaja: nama yang
// berganti memaksa orang yang menggantinya membaca catatan ini, dan itu jauh
// lebih murah daripada situs yang mati diam-diam saat database bermasalah.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function sumber(pathRelatifRepo: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../${pathRelatifRepo}`, import.meta.url)),
    "utf8",
  );
}

/** `getPlaylyVideosGabungan` yang BUKAN bagian dari `...GabunganCached`. */
const PINTU_SEGAR = /getPlaylyVideosGabungan(?!Cached)/;
const PINTU_CACHED = /getPlaylyVideosGabunganCached/;

const HALAMAN_PENONTON = [
  "app/playly/page.tsx",
  "app/beranda/page.tsx",
  "app/discover/page.tsx",
];

describe("halaman penonton memakai pintu BER-CACHE", () => {
  it.each(HALAMAN_PENONTON)("%s memanggil versi Cached", (berkas) => {
    expect(sumber(berkas)).toMatch(PINTU_CACHED);
  });

  it.each(HALAMAN_PENONTON)("%s TIDAK memanggil versi segar", (berkas) => {
    // Satu panggilan segar di halaman mana pun sudah cukup membuat SELURUH
    // halaman itu dinamis — tidak ada "sedikit dinamis".
    expect(sumber(berkas)).not.toMatch(PINTU_SEGAR);
  });

  it.each(HALAMAN_PENONTON)("%s tetap menyatakan revalidate", (berkas) => {
    // Pintu ber-cache saja tidak cukup: tanpa `export const revalidate`,
    // halamannya tidak pernah disegarkan ulang.
    expect(sumber(berkas)).toMatch(/export const revalidate = \d+/);
  });
});

describe("gerbang izin pemutar tetap memakai pintu SEGAR", () => {
  const GERBANG = "app/api/playly/video/route.ts";

  it("memanggil versi segar, bukan yang ber-cache", () => {
    // Gerbang ini memutuskan sebuah video boleh diputar atau tidak. Daftar izin
    // yang boleh basi berarti video yang baru disembunyikan admin masih bisa
    // ditonton sampai cache habis — itu melemahkan pengaman, bukan optimasi.
    const isi = sumber(GERBANG);
    expect(isi).toMatch(PINTU_SEGAR);
    expect(isi).not.toMatch(PINTU_CACHED);
  });

  it("tetap force-dynamic — tidak ada yang bisa di-cache di sini", () => {
    expect(sumber(GERBANG)).toMatch(/export const dynamic = "force-dynamic"/);
  });
});

describe("varian Cached benar-benar meminta cache", () => {
  it("getPublishedPlaylyWebhookVideosCached mengoper revalidate", () => {
    // Tanpa periksa ini, seseorang bisa menghapus opsi `revalidate` di dalamnya
    // dan SELURUH tes lain tetap hijau: tes gabungan mem-mock lib/store, jadi
    // isi fungsi aslinya tak pernah dijalankan. Yang berubah cuma satu hal yang
    // tak kelihatan sampai `next build` — halaman kembali jadi dynamic.
    const isi = sumber("lib/store.ts");
    const mulai = isi.indexOf(
      "export async function getPublishedPlaylyWebhookVideosCached",
    );

    expect(mulai).toBeGreaterThan(-1);
    expect(isi.slice(mulai, mulai + 600)).toMatch(/revalidate:\s*CATALOG_TTL_SECONDS/);
  });
});

describe("jalur TULIS webhook tidak boleh ber-cache", () => {
  it("getPlaylyWebhookVideos dibaca tanpa opsi revalidate", () => {
    // upsertPlaylyWebhookVideo dan penghapusnya membaca-lalu-menulis lewat
    // fungsi ini. Daftar basi di sana akan MENIMPA baris yang masuk di sela
    // cache — video hilang tanpa jejak error apa pun.
    const isi = sumber("lib/store.ts");
    const blok = isi.slice(
      isi.indexOf("export async function getPlaylyWebhookVideos"),
      isi.indexOf("export async function getPublishedPlaylyWebhookVideos"),
    );

    expect(blok).not.toBe("");
    expect(blok).not.toMatch(/revalidate/);
  });
});
