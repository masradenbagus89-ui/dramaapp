// Penjaga permanen untuk /api/playly/video (dipasang 2026-09-09).
//
// Route ini lahir saat halaman /playly berhenti memakai <iframe> Playly dan
// mulai memutar video dengan pemutar DramaKu sendiri (supaya menu titik tiga
// bisa kita isi sendiri). Ia menjawab satu pertanyaan: "alamat berkas video
// ini apa?" — dan dua hal di bawah harus TETAP benar selamanya.
//
// 1) GERBANG: id datang dari browser. Kalau route ini mau meneruskan id apa pun
//    ke Playly, ia berubah jadi pintu belakang ke seluruh katalog mereka —
//    termasuk video yang sudah disembunyikan admin dari halaman penonton.
//
// 2) HANYA ALAMAT, BUKAN ISI VIDEO. Situs ini pernah MATI TOTAL karena
//    /api/teaser menyalurkan byte video lewat server: 29,71 GB dari jatah 10 GB
//    dan Vercel mem-pause seluruh project (tests/teaser-redirect.test.ts).
//    Kerusakannya SENYAP — kode jalan, situs cepat, yang jebol tagihannya.
//    Siapa pun (termasuk AI sesi berikutnya) yang mengubah route ini jadi
//    penyalur video akan langsung melihat tes MERAH.
import { describe, it, expect, beforeEach, vi } from "vitest";

/** Keadaan palsu, bisa diatur per-tes tanpa menyentuh jaringan/Playly. */
const state = {
  videos: [{ id: "1788933611579" }, { id: "1788929757376" }],
  videoUrl: "https://contoh-r2.example.com/videos/1788933611579.mp4?X-Amz-Signature=abc" as
    | string
    | null,
};

/** Dicatat untuk membuktikan gerbang menahan SEBELUM Playly dihubungi. */
const dipanggilDengan: string[] = [];

vi.mock("@/lib/playly-publik", () => ({
  getPlaylyVideosPublik: async () => ({
    videos: state.videos,
    hiddenCount: 0,
    error: null,
  }),
}));

vi.mock("@/lib/playly", () => ({
  fetchPlaylyVideoUrl: async (id: string) => {
    dipanggilDengan.push(id);
    return state.videoUrl;
  },
}));

const { GET } = await import("../app/api/playly/video/route");

function minta(query: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return GET(new Request(`http://localhost/api/playly/video${query}`) as any);
}

beforeEach(() => {
  state.videos = [{ id: "1788933611579" }, { id: "1788929757376" }];
  state.videoUrl =
    "https://contoh-r2.example.com/videos/1788933611579.mp4?X-Amz-Signature=abc";
  dipanggilDengan.length = 0;
});

describe("GET /api/playly/video — gerbang video yang boleh ditonton", () => {
  it("membalas alamat berkas untuk video yang memang tampil di halaman penonton", async () => {
    const res = await minta("?id=1788933611579");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, videoUrl: state.videoUrl });
  });

  it("MENOLAK id yang tidak ada di daftar tampil — dan tidak menghubungi Playly sama sekali", async () => {
    const res = await minta("?id=9999999999");
    expect(res.status).toBe(404);
    // Inti gerbangnya: id asing berhenti di sini, bukan diteruskan.
    expect(dipanggilDengan).toEqual([]);
  });

  it("MENOLAK video yang disembunyikan admin", async () => {
    // Daftar tampil sudah membuang video sembunyi; route ikut membuangnya.
    state.videos = [{ id: "1788929757376" }];
    const res = await minta("?id=1788933611579");
    expect(res.status).toBe(404);
    expect(dipanggilDengan).toEqual([]);
  });

  it("MENOLAK id berisi karakter di luar huruf/angka — tanpa menyentuh daftar maupun Playly", async () => {
    for (const jahat of ["../../etc/passwd", "1788933611579&x=1", "", "a".repeat(65)]) {
      const res = await minta(`?id=${encodeURIComponent(jahat)}`);
      expect(res.status).toBe(400);
    }
    expect(dipanggilDengan).toEqual([]);
  });

  it("membalas 502 kalau alamat gagal diambil — bukan 200 berisi alamat kosong", async () => {
    state.videoUrl = null;
    const res = await minta("?id=1788933611579");
    expect(res.status).toBe(502);
    expect((await res.json()).ok).toBe(false);
  });
});

describe("GET /api/playly/video — WAJIB menunjuk, bukan menyalurkan", () => {
  it("balasannya JSON kecil berisi alamat, BUKAN isi video", async () => {
    const res = await minta("?id=1788933611579");
    expect(res.headers.get("Content-Type")).toContain("application/json");
    // Kalau suatu saat route ini diubah jadi penyalur video, badannya tidak
    // akan lagi berupa JSON pendek berisi videoUrl dan tes ini merah.
    const teks = await res.text();
    expect(teks.length).toBeLessThan(2000);
    expect(JSON.parse(teks).videoUrl).toBe(state.videoUrl);
  });

  it("alamat bertanda tangan TIDAK boleh disimpan CDN (umurnya cuma ~6 jam)", async () => {
    const res = await minta("?id=1788933611579");
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });
});
