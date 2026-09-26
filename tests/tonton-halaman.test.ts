// Penjaga GERBANG halaman tonton — owner 2026-09-26.
//
// Ini bukan tes tampilan, melainkan tes KEAMANAN (rak owasp — IDOR). Alamat
// /tonton/<apa saja> datang dari browser dan boleh diketik siapa pun. Kalau
// halaman ini memakai id-nya langsung untuk meminta video ke Playly, ia
// berubah jadi pintu belakang ke seluruh katalog mereka — termasuk video yang
// sengaja DISEMBUNYIKAN admin dan video milik kreator lain.
//
// Aturan yang dijaga: video harus ada di daftar yang SAMA dengan halaman
// penonton (`getPlaylyVideosGabunganCached`). Aturan yang sama sudah menjaga
// app/api/playly/video/route.ts:51 sejak 2026-09-15; halaman baru ini tidak
// boleh membuka jalan pintas yang sudah ditutup di sana.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { PlaylyVideoPublik } from "../lib/playly-publik";

const state = { videos: [] as PlaylyVideoPublik[] };

vi.mock("../lib/playly-gabungan", () => ({
  getPlaylyVideosGabunganCached: async () => ({
    videos: state.videos,
    error: null,
  }),
}));

// notFound() asli melempar error khusus Next yang ditangkap kerangka router.
// Di sini diganti lemparan biasa supaya bisa ditangkap `expect().rejects`.
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { default: TontonPage, generateMetadata } = await import(
  "../app/tonton/[id]/page"
);

function video(
  id: string,
  ubah: Partial<PlaylyVideoPublik> = {},
): PlaylyVideoPublik {
  return {
    id,
    title: `Video ${id}`,
    durationSeconds: 140,
    durationLabel: "2:20",
    creator: "coklat",
    embedUrl: `https://playly-dashboard.vercel.app/id/${id}/embed`,
    thumbnail: null,
    dramaTitle: null,
    dramaHref: null,
    episode: null,
    year: null,
    genre: null,
    kategori: null,
    rating: null,
    contentRating: null,
    quality: null,
    ...ubah,
  };
}

/** Bentuk props yang dioper Next ke halaman route dinamis. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const props = (id: string) => ({ params: Promise.resolve({ id }) }) as any;

beforeEach(() => {
  state.videos = [];
});

describe("gerbang: hanya video yang SAH yang bisa dibuka", () => {
  it("video yang ada di daftar terbuka normal", () => {
    state.videos = [video("98765", { title: "Arcadian" })];
    return expect(TontonPage(props("arcadian-98765"))).resolves.toBeTruthy();
  });

  it("video DI LUAR daftar dibalas 404, bukan diteruskan ke Playly", async () => {
    // Inti gerbangnya. Id di bawah bentuknya sah dan mungkin benar-benar ada di
    // Playly — tapi ia tidak ada di daftar yang boleh ditonton di situs kita.
    state.videos = [video("98765")];
    await expect(TontonPage(props("tebakan-11111"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("video yang DISEMBUNYIKAN ADMIN ikut tertutup", async () => {
    // Daftar gabungan sudah membuang video yang disembunyikan admin
    // (lib/playly-gabungan.ts aturan 2). Halaman ini tidak boleh punya jalan
    // lain yang melewatinya — jadi daftar kosong berarti 404, titik.
    state.videos = [];
    await expect(TontonPage(props("arcadian-98765"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("alamat yang sudah ter-encode browser tetap terbaca", async () => {
    // Judul ber-spasi/emoji membuat browser meng-encode alamatnya. Tanpa
    // decode, video yang sah akan dibalas 404 — rusak yang cuma muncul untuk
    // sebagian judul, jadi sulit dilacak.
    state.videos = [video("98765", { title: "Arcadian" })];
    await expect(
      TontonPage(props(encodeURIComponent("arcadian-98765"))),
    ).resolves.toBeTruthy();
  });
});

describe("keterangan halaman untuk Google & preview share", () => {
  it("memakai judul videonya", async () => {
    state.videos = [video("98765", { title: "Arcadian" })];
    const meta = await generateMetadata(props("arcadian-98765"));
    expect(String(meta.title)).toContain("Arcadian");
    expect(meta.alternates?.canonical).toBe("/tonton/arcadian-98765");
  });

  it("video asing tidak membocorkan apa pun lewat judul halaman", async () => {
    state.videos = [];
    const meta = await generateMetadata(props("tebakan-11111"));
    expect(meta.title).toBe("Video tidak ditemukan");
  });

  it("sampul kosong = TIDAK menempel gambar preview karangan", async () => {
    state.videos = [video("98765", { thumbnail: null })];
    const meta = await generateMetadata(props("video-98765"));
    expect(meta.openGraph && "images" in meta.openGraph).toBe(false);
    // Pembanding: video bersampul memang menempelkannya.
    state.videos = [video("98765", { thumbnail: "https://contoh.test/s.jpg" })];
    const meta2 = await generateMetadata(props("video-98765"));
    expect(JSON.stringify(meta2.openGraph)).toContain("https://contoh.test/s.jpg");
  });
});

describe("halaman tonton tidak dibuat di muka saat build", () => {
  // Pelajaran 2026-09-19: mem-prerender ratusan halaman yang masing-masing
  // membaca data membekukan rilis selama EMPAT hari, dan penyebab persisnya di
  // dalam Next sampai sekarang belum terverifikasi. Halaman ini sengaja tidak
  // mengulangi jalur itu.
  const sumber = readFileSync("app/tonton/[id]/page.tsx", "utf-8");

  /**
   * Sumber TANPA komentar.
   *
   * Wajib: berkas ini menjelaskan di komentarnya sendiri KENAPA
   * `generateStaticParams` tidak dipakai, dan pemeriksaan cocok-teks polos
   * akan menangkap penjelasan itu lalu melaporkan pelanggaran yang tidak ada.
   * Jebakan yang sama persis sudah tercatat 2026-09-22 pada tes halaman 404.
   */
  const kode = sumber
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("jaring pengaman penyaring komentarnya sendiri", () => {
    // Kalau penyaring terlalu rakus dan mengosongkan seluruh berkas, tes di
    // bawah lulus tanpa memeriksa apa pun — kegagalan paling senyap.
    expect(kode).toContain("export default async function TontonPage");
  });

  it("daftar prerender-nya KOSONG", () => {
    // Yang berbahaya BUKAN keberadaan generateStaticParams, melainkan daftar
    // yang BERISI — itulah yang membuat build menarik data untuk ratusan
    // halaman sekaligus. Fungsinya sendiri justru wajib ada: tanpanya Next
    // menandai route ini `ƒ (Dynamic)` dan tiap pembukaan halaman menembak
    // API video (terukur di build 2026-09-26).
    const mulai = kode.indexOf("export async function generateStaticParams");
    expect(mulai, "generateStaticParams hilang — route ini akan jadi Dynamic " +
      "dan kehilangan cache ISR-nya").toBeGreaterThan(-1);
    const badan = kode.slice(mulai, kode.indexOf("\n}", mulai));
    expect(
      badan,
      "halaman tonton mulai di-prerender saat build — itu jalur yang sudah " +
        "terbukti menjatuhkan `npm run build` berhari-hari (2026-09-19)",
    ).toMatch(/return\s*\[\s*\]\s*;/);
  });

  it("generateStaticParams tidak menyentuh sumber data sama sekali", () => {
    // Satu pembacaan saja cukup menjatuhkan build, walau hasilnya dibuang.
    const mulai = kode.indexOf("export async function generateStaticParams");
    const badan = kode.slice(mulai, kode.indexOf("\n}", mulai));
    for (const pembaca of ["getPlaylyVideosGabungan", "getAllDramas", "sbSelect"]) {
      expect(badan, `tidak boleh memanggil ${pembaca}`).not.toContain(pembaca);
    }
  });

  it("dynamicParams true — kalau tidak, SEMUA halaman tonton jadi 404", () => {
    // Dengan daftar prerender kosong, `false` membuat setiap alamat tonton
    // membalas 404 tanpa satu pun error saat build. Kerusakan paling senyap.
    expect(kode).toMatch(/export const dynamicParams\s*=\s*true/);
  });

  it("memakai pembacaan BER-CACHE, bukan yang segar", () => {
    // Satu pembacaan `no-store` membuat halaman ini dibangun ulang untuk TIAP
    // pengunjung dan ikut mati saat Supabase tak menjawab (lib/supabase.ts:204).
    expect(kode).toContain("getPlaylyVideosGabunganCached");
    expect(kode).not.toMatch(/getPlaylyVideosGabungan\(/);
  });
});
