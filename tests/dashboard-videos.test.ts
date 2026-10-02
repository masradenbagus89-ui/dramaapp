// Tes pengunci perilaku untuk jembatan ke dashboard upload
// (lib/dashboard-videos.ts). Fokus: penerjemah bentuk JSON + aturan alamat.
import { describe, it, expect } from "vitest";
import {
  buildDashboardHeaders,
  contohNamaDilewati,
  normalizeVideoDetail,
  normalizeVideos,
  parseAllowedHosts,
  readDashboardConfig,
  ringkasAlasanDilewati,
} from "../lib/dashboard-videos";

const URL_VIDEO = "https://xyz.supabase.co/storage/v1/object/public/videos/a.mp4";

describe("normalizeVideos — penerjemah daftar video", () => {
  it("bentuk Supabase biasa (array + snake_case)", () => {
    const raw = [
      {
        id: "v1",
        title: "Episode 1",
        description: "Awal cerita",
        video_url: URL_VIDEO,
        thumbnail_url: "https://xyz.supabase.co/storage/v1/object/public/thumbs/a.jpg",
        created_at: "2026-08-12T00:00:00Z",
      },
    ];
    const { videos, rejected } = normalizeVideos(raw);
    expect(rejected).toHaveLength(0);
    expect(videos[0]).toEqual({
      id: "v1",
      title: "Episode 1",
      description: "Awal cerita",
      videoUrl: URL_VIDEO,
      thumbnail: "https://xyz.supabase.co/storage/v1/object/public/thumbs/a.jpg",
      createdAt: "2026-08-12T00:00:00Z",
    });
  });

  it("daftar dibungkus { data: [...] } + nama field camelCase", () => {
    const raw = { data: [{ id: "v2", judul: "Judul ID", videoUrl: URL_VIDEO }] };
    const { videos } = normalizeVideos(raw);
    expect(videos).toHaveLength(1);
    expect(videos[0].title).toBe("Judul ID");
  });

  it("daftar bersarang { result: { rows: [...] } }", () => {
    const raw = { result: { rows: [{ url: URL_VIDEO }] } };
    expect(normalizeVideos(raw).videos).toHaveLength(1);
  });

  it("tanpa judul -> judul cadangan, tanpa deskripsi -> teks kosong", () => {
    const { videos } = normalizeVideos([{ url: URL_VIDEO }]);
    expect(videos[0].title).toBe("Video 1");
    expect(videos[0].description).toBe("");
    expect(videos[0].thumbnail).toBeNull();
  });

  it("tanpa alamat video -> dibuang + alasan dicatat", () => {
    const { videos, rejected } = normalizeVideos([{ title: "Kosong" }]);
    expect(videos).toHaveLength(0);
    expect(rejected[0].reason).toBe("tidak ada alamat video");
  });

  // Video yang ditolak harus bisa DIKENALI, bukan cuma dihitung. Owner
  // mengunggah videonya sendiri lewat dashboard Playly dan 20 dari 20 ditolak;
  // tahu "20 ditolak" belum bisa ditindaklanjuti, yang menentukan video MANA.
  it("video yang ditolak membawa JUDULNYA, bukan cuma 'item ke-N'", () => {
    const { rejected } = normalizeVideos([{ title: "Despicable Me 4" }]);
    expect(rejected[0].nama).toBe("Despicable Me 4");
  });

  it("tanpa judul -> pakai id; tanpa keduanya -> nomor urut", () => {
    expect(normalizeVideos([{ id: "1790342663839" }]).rejected[0].nama).toBe(
      "1790342663839",
    );
    expect(normalizeVideos([{ keterangan: "apa pun" }]).rejected[0].nama).toBe(
      "item ke-1",
    );
  });

  it("penolakan karena alamat pun tetap membawa judulnya", () => {
    const { rejected } = normalizeVideos([
      { title: "Film A", url: "http://xyz.co/a.mp4" },
    ]);
    expect(rejected[0].reason).toBe("alamat video harus https");
    expect(rejected[0].nama).toBe("Film A");
  });

  it("alamat http (bukan https) -> ditolak", () => {
    const { videos, rejected } = normalizeVideos([{ url: "http://xyz.co/a.mp4" }]);
    expect(videos).toHaveLength(0);
    expect(rejected[0].reason).toBe("alamat video harus https");
  });

  it("thumbnail http -> dibuang jadi null, videonya tetap lolos", () => {
    const { videos } = normalizeVideos([
      { url: URL_VIDEO, thumbnail: "http://gambar.com/a.jpg" },
    ]);
    expect(videos[0].thumbnail).toBeNull();
    expect(videos[0].videoUrl).toBe(URL_VIDEO);
  });

  it("daftar izin KOSONG -> semua https diterima (beda dari jalur iframe)", () => {
    expect(normalizeVideos([{ url: URL_VIDEO }], []).videos).toHaveLength(1);
  });

  it("daftar izin DIISI -> hanya domain itu yang lolos", () => {
    const izin = ["xyz.supabase.co"];
    expect(normalizeVideos([{ url: URL_VIDEO }], izin).videos).toHaveLength(1);

    const asing = normalizeVideos([{ url: "https://lain.com/a.mp4" }], izin);
    expect(asing.videos).toHaveLength(0);
    expect(asing.rejected[0].reason).toBe("domain video belum diizinkan");
  });

  it("domain yang cuma MIRIP -> tetap ditolak", () => {
    const izin = ["xyz.supabase.co"];
    const hasil = normalizeVideos([{ url: "https://xyz.supabase.co.evil.id/a.mp4" }], izin);
    expect(hasil.videos).toHaveLength(0);
  });

  it("JSON tak dikenal -> kosong, tidak error", () => {
    expect(normalizeVideos({ pesan: "halo" }).videos).toHaveLength(0);
    expect(normalizeVideos(null).videos).toHaveLength(0);
  });
});

describe("normalizeVideoDetail — penerjemah detail 1 video", () => {
  it("objek polos", () => {
    const v = normalizeVideoDetail({ id: "v9", title: "Satu", video_url: URL_VIDEO });
    expect(v?.id).toBe("v9");
  });

  it("dibungkus { data: {...} }", () => {
    const v = normalizeVideoDetail({ data: { id: "v10", url: URL_VIDEO } });
    expect(v?.id).toBe("v10");
  });

  it("dibungkus { video: {...} }", () => {
    const v = normalizeVideoDetail({ video: { id: "v11", url: URL_VIDEO } });
    expect(v?.id).toBe("v11");
  });

  it("tidak ada alamat video -> null", () => {
    expect(normalizeVideoDetail({ title: "kosong" })).toBeNull();
  });
});

describe("parseAllowedHosts & readDashboardConfig", () => {
  it("daftar domain dirapikan", () => {
    expect(parseAllowedHosts("https://A.co/x, b.co")).toEqual(["a.co", "b.co"]);
  });

  // Alamat contohnya sengaja BUKAN alamat Playly: sejak 2026-09-29 alamat Playly
  // yang pensiun ikut ditukar host-nya (lib/playly-alamat.ts), dan itu akan
  // mengaburkan apa yang sebenarnya diuji di sini — perapian spasi & garis
  // miring. Penukaran hostnya punya tes sendiri di tests/playly-alamat.test.ts.
  it("spasi dan garis miring di ujung alamat API dirapikan", () => {
    const cfg = readDashboardConfig({
      DASHBOARD_API_URL: " https://dashboard-lain.example.com/api/videos/ ",
    });
    expect(cfg.apiUrl).toBe("https://dashboard-lain.example.com/api/videos");
  });

  it("env kosong -> apiUrl kosong (nanti dibalas 503 oleh route)", () => {
    expect(readDashboardConfig({}).apiUrl).toBe("");
  });

  it("nama header kunci dibaca dari env", () => {
    const cfg = readDashboardConfig({ DASHBOARD_API_KEY_HEADER: " X-Playly-Key " });
    expect(cfg.keyHeader).toBe("X-Playly-Key");
  });
});

describe("buildDashboardHeaders — cara kunci dikirim", () => {
  const dasar = { apiUrl: "https://d.example/api/videos", allowedHosts: [] };

  it("nama header diisi -> kunci dikirim lewat header itu, TANPA Authorization", () => {
    // Playly hanya membaca X-Playly-Key; Authorization: Bearer diabaikan,
    // jadi mengirim keduanya sekaligus percuma dan cuma menyebar kunci.
    const headers = buildDashboardHeaders({
      ...dasar,
      apiKey: "rahasia",
      keyHeader: "X-Playly-Key",
    });
    expect(headers["X-Playly-Key"]).toBe("rahasia");
    expect(headers.Authorization).toBeUndefined();
  });

  it("nama header kosong -> jatuh ke cara umum Authorization: Bearer", () => {
    const headers = buildDashboardHeaders({
      ...dasar,
      apiKey: "rahasia",
      keyHeader: "",
    });
    expect(headers.Authorization).toBe("Bearer rahasia");
  });

  it("tanpa kunci -> tidak ada header kunci sama sekali", () => {
    const headers = buildDashboardHeaders({ ...dasar, apiKey: "", keyHeader: "X-Playly-Key" });
    expect(headers.Authorization).toBeUndefined();
    expect(headers["X-Playly-Key"]).toBeUndefined();
    expect(headers.Accept).toBe("application/json");
  });
});

// =====================================================================
// RINGKASAN VIDEO YANG DILEWATI (2026-10-01)
//
// Terjadi di produksi: 20 dari 20 video owner ditolak, dan balasan API cuma
// berbunyi "skipped: 20". Tanpa sebab dan tanpa identitas, angka itu tidak bisa
// ditindaklanjuti siapa pun — sebabnya hanya tercatat di log Vercel yang tak
// bisa diakses tim ini.
// =====================================================================

describe("ringkasAlasanDilewati", () => {
  it("menghitung per alasan, bukan cuma totalnya", () => {
    const hasil = ringkasAlasanDilewati([
      { reason: "tidak ada alamat video", value: "item ke-1" },
      { reason: "tidak ada alamat video", value: "item ke-2" },
      { reason: "alamat video harus https", value: "http://a/b.mp4" },
    ]);
    expect(hasil).toEqual({
      "tidak ada alamat video": 2,
      "alamat video harus https": 1,
    });
  });

  it("alasan yang hilang/rusak tidak menguap diam-diam", () => {
    const hasil = ringkasAlasanDilewati([
      { reason: "", value: "x" },
      { reason: undefined as never, value: "y" },
    ]);
    // Dihitung sebagai "tidak diketahui", BUKAN dibuang — kalau dibuang,
    // jumlah di kartu tidak akan cocok dengan angka `skipped` dan admin
    // akan mengira ada video yang hilang entah ke mana.
    expect(hasil["sebab tidak diketahui"]).toBe(2);
  });
});

describe("contohNamaDilewati", () => {
  it("memulangkan judul video yang ditolak", () => {
    const hasil = contohNamaDilewati([
      { reason: "tidak ada alamat video", value: "item ke-1", nama: "Despicable Me 4" },
      { reason: "tidak ada alamat video", value: "item ke-2", nama: "Film B" },
    ]);
    expect(hasil).toEqual(["Despicable Me 4", "Film B"]);
  });

  // 🔒 PENJAGA KEAMANAN — alasan utama fungsi ini dipisah ke lib supaya bisa
  // diuji. Alamat berkas Playly BERTANDA TANGAN dan berlaku beberapa jam;
  // menampilkannya di kartu admin sama saja membagikan kunci pintu videonya.
  it("TIDAK PERNAH membocorkan alamat video (field value) ke tampilan", () => {
    const alamatRahasia =
      "https://playly-videos.r2.cloudflarestorage.com/a.mp4?X-Amz-Signature=RAHASIA";
    const hasil = contohNamaDilewati([
      { reason: "alamat video harus https", value: alamatRahasia, nama: "Film A" },
    ]);
    expect(hasil).toEqual(["Film A"]);
    expect(hasil.join(" ")).not.toContain("X-Amz-Signature");
    expect(hasil.join(" ")).not.toContain("cloudflarestorage");
  });

  it("dibatasi 5 nama supaya kartu tidak jadi dinding teks", () => {
    const banyak = Array.from({ length: 20 }, (_, i) => ({
      reason: "tidak ada alamat video",
      value: `item ke-${i + 1}`,
      nama: `Film ${i + 1}`,
    }));
    expect(contohNamaDilewati(banyak)).toHaveLength(5);
  });

  it("judul kepanjangan dipotong, judul kosong dilewati", () => {
    const hasil = contohNamaDilewati([
      { reason: "x", value: "y", nama: "   " },
      { reason: "x", value: "y", nama: "A".repeat(200) },
    ]);
    expect(hasil).toHaveLength(1);
    expect(hasil[0].length).toBe(80);
  });

  it("tanpa nama sama sekali -> daftar kosong, bukan error", () => {
    expect(contohNamaDilewati([{ reason: "x", value: "y" }])).toEqual([]);
    expect(contohNamaDilewati([])).toEqual([]);
  });
});
