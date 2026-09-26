// Penjaga KETAHANAN saat Playly bermasalah — lahir dari insiden 2026-09-26.
//
// APA YANG TERJADI: Playly membalas **HTTP 402** (Payment Required — urusan
// pembayaran/kuota di akun kita, BUKAN kesalahan kode), dan seketika SELURUH
// video hilang dari /beranda, /film, dan /discover, sementara tiap halaman
// tonton membalas 404. Tak satu pun baris kode bisa memperbaiki 402; yang bisa
// dikendalikan adalah AKIBATNYA.
//
// Pola yang dipasang: `stale-if-error` (skills/tahan-gagal/SKILL.md §2 lapis
// 2) — "jangan hapus cache hanya karena sumbernya gagal; data basi yang jujur
// jauh lebih berguna daripada layar kosong".
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PlaylyVideoPublik } from "../lib/playly-publik";
import type { PlaylyWebhookVideo } from "../lib/store";

const state = {
  katalog: {
    videos: [] as PlaylyVideoPublik[],
    hiddenCount: 0,
    error: null as string | null,
  },
  webhook: [] as PlaylyWebhookVideo[],
  hidden: [] as string[],
  hiddenGagal: false,
  cadangan: { videos: [] as PlaylyVideoPublik[], disimpanPada: "" },
  cadanganGagal: false,
  /** Apa yang DITULIS ke salinan — untuk membuktikan penulisnya bukan pembaca. */
  ditulis: [] as PlaylyVideoPublik[][],
};

vi.mock("../lib/playly-publik", () => ({
  getPlaylyVideosPublik: async () => state.katalog,
}));

vi.mock("../lib/store", () => ({
  getPublishedPlaylyWebhookVideos: async () => state.webhook,
  getPublishedPlaylyWebhookVideosCached: async () => state.webhook,
  getPlaylyHiddenIdsCached: async () => {
    if (state.hiddenGagal) throw new Error("supabase tidak bisa dihubungi");
    return state.hidden;
  },
  getPlaylyGenresCached: async () => ({}),
  getPlaylyCadanganCached: async () => {
    if (state.cadanganGagal) throw new Error("supabase tidak bisa dihubungi");
    return state.cadangan;
  },
  setPlaylyCadangan: async (videos: PlaylyVideoPublik[]) => {
    state.ditulis.push(videos);
  },
}));

const { getPlaylyVideosGabunganCached } = await import(
  "../lib/playly-gabungan"
);

function kartu(id: string): PlaylyVideoPublik {
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
  };
}

beforeEach(() => {
  state.katalog = { videos: [], hiddenCount: 0, error: null };
  state.webhook = [];
  state.hidden = [];
  state.hiddenGagal = false;
  state.cadangan = { videos: [], disimpanPada: "" };
  state.cadanganGagal = false;
  state.ditulis = [];
});

describe("Playly bermasalah → salinan terakhir dipakai", () => {
  it("daftar kosong + error → sajikan salinan, bukan halaman kosong", async () => {
    // Ini reproduksi insidennya: sebelum perbaikan, hasilnya nol video.
    state.katalog = {
      videos: [],
      hiddenCount: 0,
      error: "Playly menolak karena urusan pembayaran/kuota akun (HTTP 402).",
    };
    state.cadangan = {
      videos: [kartu("v1"), kartu("v2")],
      disimpanPada: "2026-09-26T07:00:00.000Z",
    };

    const hasil = await getPlaylyVideosGabunganCached();
    expect(hasil.videos.map((v) => v.id)).toEqual(["v1", "v2"]);
    expect(hasil.dariCadangan).toBe(true);
    // Alasannya TIDAK disembunyikan — admin tetap bisa tahu ada yang salah.
    expect(hasil.error).toContain("402");
  });

  it("daftar kosong TANPA error → JANGAN pakai salinan", async () => {
    // Pembanding wajib. "Pengambilan berhasil, memang belum ada video" adalah
    // keadaan SAH (akun baru, atau semua video sengaja ditarik). Menimpanya
    // dengan salinan akan menghidupkan kembali video yang sudah dibuang.
    state.katalog = { videos: [], hiddenCount: 0, error: null };
    state.cadangan = {
      videos: [kartu("v1")],
      disimpanPada: "2026-09-26T07:00:00.000Z",
    };

    const hasil = await getPlaylyVideosGabunganCached();
    expect(hasil.videos).toEqual([]);
    expect(hasil.dariCadangan).toBeUndefined();
  });

  it("masih ada video dari sumber lain → salinan TIDAK menggeser data baru", async () => {
    // Salinan hanya jaring terakhir. Data yang lebih baru selalu menang.
    state.katalog = { videos: [kartu("baru")], hiddenCount: 0, error: "gangguan sebagian" };
    state.cadangan = {
      videos: [kartu("lama")],
      disimpanPada: "2026-09-26T07:00:00.000Z",
    };

    const hasil = await getPlaylyVideosGabunganCached();
    expect(hasil.videos.map((v) => v.id)).toEqual(["baru"]);
    expect(hasil.dariCadangan).toBeUndefined();
  });

  it("salinan tak terbaca → daftar kosong, BUKAN halaman error", async () => {
    state.katalog = { videos: [], hiddenCount: 0, error: "HTTP 402" };
    state.cadanganGagal = true;

    const hasil = await getPlaylyVideosGabunganCached();
    expect(hasil.videos).toEqual([]);
    expect(hasil.error).toBeTruthy();
  });

  it("belum pernah ada salinan → tidak pura-pura punya isi", async () => {
    state.katalog = { videos: [], hiddenCount: 0, error: "HTTP 402" };
    state.cadangan = { videos: [], disimpanPada: "" };

    const hasil = await getPlaylyVideosGabunganCached();
    expect(hasil.videos).toEqual([]);
    expect(hasil.dariCadangan).toBeUndefined();
  });
});

describe("salinan TIDAK boleh menembus pengaman admin", () => {
  it("video yang disembunyikan admin tetap tidak muncul lewat salinan", async () => {
    // Bug "video sembunyi tetap tayang" sudah pernah lolos ke produksi lewat
    // pintu webhook (tests/playly-publik.test.ts). Salinan adalah pintu ketiga;
    // aturannya wajib sama.
    state.katalog = { videos: [], hiddenCount: 0, error: "HTTP 402" };
    state.hidden = ["v2"];
    state.cadangan = {
      videos: [kartu("v1"), kartu("v2")],
      disimpanPada: "2026-09-26T07:00:00.000Z",
    };

    const hasil = await getPlaylyVideosGabunganCached();
    expect(hasil.videos.map((v) => v.id)).toEqual(["v1"]);
  });

  it("GAGAL-AMAN: daftar sembunyi tak terbaca → salinan DITAHAN seluruhnya", async () => {
    // Kalau kita tidak tahu video mana yang sengaja disembunyikan, menyajikan
    // salinan apa adanya bisa menayangkan yang seharusnya tertutup. Lebih baik
    // kosong (skills/owasp/SKILL.md §1 A10: jangan fail-open).
    state.katalog = { videos: [], hiddenCount: 0, error: "HTTP 402" };
    state.hiddenGagal = true;
    state.cadangan = {
      videos: [kartu("v1")],
      disimpanPada: "2026-09-26T07:00:00.000Z",
    };

    const hasil = await getPlaylyVideosGabunganCached();
    expect(hasil.videos).toEqual([]);
  });
});

describe("yang MEMBACA tidak ikut MENULIS", () => {
  it("membaca daftar tidak pernah menyimpan salinan", async () => {
    // §3.7: fungsi yang mengubah data jangan sekaligus jadi sumber jawaban.
    // Kalau pembacaan ikut menulis, tiap halaman yang digambar diam-diam
    // menulis ke database — termasuk saat dibangun ulang tiap 60 detik.
    state.katalog = { videos: [kartu("v1")], hiddenCount: 0, error: null };
    await getPlaylyVideosGabunganCached();
    expect(
      state.ditulis,
      "pembacaan daftar ikut menulis salinan — penulisnya harus endpoint " +
        "yang memang dinamis (app/api/playly/video/route.ts), bukan jalur baca",
    ).toEqual([]);
  });
});

// ===========================================================================
// PENGHEMATAN KUOTA + PESAN YANG BERGUNA.
//
// Insiden yang sama memperlihatkan dua hal lain: pemakaian kita ke Playly
// boros (47 panggilan tiap kali daftar diambil), dan pesan errornya tidak
// memberi tahu apa pun yang bisa dilakukan ("Playly membalas error (HTTP
// 402)").
// ===========================================================================
const { readFileSync } = await import("node:fs");
const { PLAYLY_DETAIL_TTL_SECONDS, PLAYLY_PUBLIK_TTL_SECONDS } = await import(
  "../lib/playly"
);

describe("beban panggilan ke Playly ditekan", () => {
  it("detail per-video disimpan JAUH lebih lama daripada daftarnya", () => {
    // Sekali mengambil daftar = 1 panggilan daftar + 1 panggilan detail per
    // video (46). Sisi detail itulah pemakai kuota terbesar; TTL yang sama
    // dengan daftar berarti 46 panggilan tiap 5 menit.
    expect(PLAYLY_DETAIL_TTL_SECONDS).toBeGreaterThan(PLAYLY_PUBLIK_TTL_SECONDS);
    expect(PLAYLY_DETAIL_TTL_SECONDS).toBeGreaterThanOrEqual(1800);
  });

  it("TTL detail TIDAK melewati umur tanda tangan sampul (6 jam)", () => {
    // Sampul dari Playly bertanda tangan dan mati setelah 21600 detik
    // (diukur di produksi 2026-09-26). Menyimpannya lebih lama berarti
    // menyajikan alamat yang sudah mati.
    expect(
      PLAYLY_DETAIL_TTL_SECONDS,
      "TTL detail melewati umur tanda tangan sampul — sampulnya akan mati " +
        "sebelum disegarkan",
    ).toBeLessThan(21600);
  });

  it("fungsi detail memakai TTL-nya sendiri, bukan TTL daftar", () => {
    const sumber = readFileSync("lib/playly.ts", "utf-8");
    expect(sumber).toMatch(
      /fetchPlaylyDetailPublik\([\s\S]{0,200}revalidateSeconds: number = PLAYLY_DETAIL_TTL_SECONDS/,
    );
  });
});

describe("pesan HTTP 402 memberi tahu LANGKAHNYA, bukan cuma kodenya", () => {
  const sumber = readFileSync("lib/playly.ts", "utf-8");

  it("402 ditangani terpisah dari error umum", () => {
    // Sebelum perbaikan, 402 jatuh ke cabang umum dan panel admin cuma
    // menulis "Playly membalas error (HTTP 402)" — owner tak tahu harus apa.
    expect(sumber).toMatch(/res\.status === 402/);
  });

  it("pesannya menyebut pembayaran/kuota dan ke mana harus melihat", () => {
    // ⚠️ Potongan string yang dipecah antar-baris disambung DULU. Tanpa ini,
    // frasa seperti "dashboard Playly" terbelah jadi `"... dashboard " +` dan
    // `"Playly dan ..."` sehingga pencocokan gagal walau pesannya benar —
    // kerapuhan cocok-teks yang sudah dua kali menipu di repo ini.
    const blok = sumber.slice(sumber.indexOf("res.status === 402"), undefined);
    const pesan = blok.slice(0, 700).replace(/"\s*\+\s*\n?\s*"/g, "");

    expect(pesan).toMatch(/pembayaran|kuota/i);
    // SEBAB sesungguhnya, diukur 2026-09-26: balasan datang dari Vercel dengan
    // `X-Vercel-Error: DEPLOYMENT_DISABLED` — seluruh project Playly
    // dinonaktifkan, bukan aplikasinya yang rusak. Menyebutnya menghemat
    // berjam-jam penyelidikan yang salah arah.
    expect(pesan).toMatch(/DEPLOYMENT_DISABLED/);
    expect(pesan).toMatch(/Vercel/);
    // Menyatakan terus terang bahwa ini di luar kendali kode — supaya sesi
    // berikutnya tidak membuang waktu memburu bug yang tidak ada.
    expect(pesan).toMatch(/tidak ada yang bisa diperbaiki dari sisi/i);
  });

  it("jaring pengaman penyambung potongan string", () => {
    // Kalau penyambung di atas terlalu rakus dan merusak sumbernya, tes di
    // atas bisa lulus karena alasan yang salah.
    const contoh = '"buka dashboard " +\n        "Playly dan cek"';
    expect(contoh.replace(/"\s*\+\s*\n?\s*"/g, "")).toBe(
      '"buka dashboard Playly dan cek"',
    );
  });
});

describe("penulis salinan: endpoint dinamis, dengan pagarnya", () => {
  const rute = readFileSync("app/api/playly/video/route.ts", "utf-8");
  const kode = rute
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("jaring pengaman penyaring komentarnya sendiri", () => {
    expect(kode).toContain("export async function GET");
  });

  it("menyimpan salinan sesudah pengambilan berhasil", () => {
    expect(kode).toContain("setPlaylyCadangan(videos)");
  });

  it("TIDAK menyimpan saat pengambilan bermasalah atau saat isinya dari salinan", () => {
    // Menyimpan hasil gangguan = menimpa salinan bagus dengan yang rusak.
    // Menyimpan ulang isi salinan = tanggalnya terus diperbarui sehingga
    // terlihat segar padahal basi.
    expect(kode).toMatch(/if \(!error && !dariCadangan\)/);
  });

  it("kegagalan menyimpan TIDAK menggagalkan pemutaran video", () => {
    // Penonton tidak boleh gagal menonton hanya karena pencatatan salinan
    // bermasalah.
    expect(kode).toMatch(/void setPlaylyCadangan\(videos\)\.catch\(/);
  });

  it("gerbang izin TETAP memakai daftar SEGAR, bukan salinan", () => {
    // Salinan boleh menggambar daftar, TIDAK boleh memberi izin menonton —
    // video yang baru disembunyikan admin harus langsung tertutup di sini.
    expect(kode).toContain("getPlaylyVideosGabungan()");
    expect(kode).not.toContain("getPlaylyVideosGabunganCached");
  });
});
