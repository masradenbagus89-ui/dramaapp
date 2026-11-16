// Penjaga "Cocokkan semua" link unduhan (lib/playly-unduhan-cocok.ts
// cocokkanSemuaVideo + lib/playly-unduhan-otomatis.ts + route-nya).
// Yang dijaga — semuanya bentuk "link nyasar ke film lain" yang tak memunculkan error:
//   1. Judul di AWAL nama file dikenali, dengan/tanpa tahun, titik/label grup.
//   2. Judul terpanjang menang ("Spider Man 2" bukan "Spider Man").
//   3. Tahun beda = film beda; judul tanpa tahun yang dimiliki 2 video dilewati.
//   4. >1 file kualitas sama -> ganda, tidak dipilih.
//   5. Satu sumber gagal tak menggagalkan sumber lain; route: admin saja.
import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { cocokkanSemuaVideo, normalTeks } from "../lib/playly-unduhan-cocok";

const sesi = { admin: true };
vi.mock("@/lib/session", () => ({ isAdminRequest: async () => sesi.admin }));
const { cocokkanSemuaSumber } = await import("../lib/playly-unduhan-otomatis");
const { POST } = await import("../app/api/admin/playly/unduhan/cocokkan/route");

afterEach(() => {
  sesi.admin = true;
});

const VIDEOS = [
  { id: "1793887644093", title: "Americana (2025)" },
  { id: "111", title: "Spider Man" },
  { id: "222", title: "Spider Man 2" },
  { id: "333", title: "Darkness of Man (2025)" },
  { id: "444", title: "Darkness of Man (2024)" },
];
const f = (name: string) => ({ name, url: `https://contoh.test/${encodeURIComponent(name)}` });

describe("normalTeks", () => {
  it("huruf kecil, tanpa aksen, tanda baca jadi spasi", () => {
    expect(normalTeks("  Amélie.(2001)_1080p ")).toBe("amelie 2001 1080p");
  });
});

describe("cocokkanSemuaVideo", () => {
  it("judul + tahun dalam berbagai gaya nama file", () => {
    const hasil = cocokkanSemuaVideo(VIDEOS, [
      f("Americana (2025) 1080p.mp4"),
      f("[DramaKu] Americana.2025.480p.WEB-DL.mkv"),
    ]);
    expect(hasil["1793887644093"]).toEqual({
      saran: [
        { quality: "1080p", url: f("Americana (2025) 1080p.mp4").url },
        { quality: "480p", url: f("[DramaKu] Americana.2025.480p.WEB-DL.mkv").url },
      ],
      ganda: [],
    });
  });

  it("judul tanpa tahun diterima kalau judulnya milik satu video saja", () => {
    const hasil = cocokkanSemuaVideo(VIDEOS, [f("Americana 1080p.mp4")]);
    expect(hasil["1793887644093"]?.saran).toHaveLength(1);
  });

  it("judul terpanjang menang", () => {
    const hasil = cocokkanSemuaVideo(VIDEOS, [f("Spider Man 2 1080p.mp4"), f("Spider Man 480p.mp4")]);
    expect(hasil["222"]?.saran.map((s) => s.quality)).toEqual(["1080p"]);
    expect(hasil["111"]?.saran.map((s) => s.quality)).toEqual(["480p"]);
  });

  it("tahun beda = film beda; tanpa tahun padahal judulnya dua video = dilewati", () => {
    const hasil = cocokkanSemuaVideo(VIDEOS, [
      f("Darkness of Man 2024 1080p.mp4"),
      f("Darkness of Man 480p.mp4"),
    ]);
    expect(hasil["444"]?.saran.map((s) => s.quality)).toEqual(["1080p"]);
    expect(hasil["333"]).toBeUndefined();
    expect(hasil["444"]?.saran.some((s) => s.quality === "480p")).toBe(false);
  });

  it("ID video di nama file tetap dikenali (aturan lama)", () => {
    const hasil = cocokkanSemuaVideo(VIDEOS, [f("1793887644093_480p.mp4")]);
    expect(hasil["1793887644093"]?.saran.map((s) => s.quality)).toEqual(["480p"]);
  });

  it("judul di TENGAH nama file atau tanpa kualitas tidak dipakai", () => {
    expect(cocokkanSemuaVideo(VIDEOS, [f("Bukan Americana 2025 1080p.mp4"), f("Americana (2025).mp4")])).toEqual({});
  });

  it("dua file kualitas sama -> ganda, tidak dipilih", () => {
    const hasil = cocokkanSemuaVideo(VIDEOS, [f("Americana 2025 1080p.mp4"), f("Americana (2025) 1080p v2.mkv")]);
    expect(hasil["1793887644093"]).toEqual({
      saran: [],
      ganda: [{ quality: "1080p", nama: ["Americana 2025 1080p.mp4", "Americana (2025) 1080p v2.mkv"] }],
    });
  });
});

describe("cocokkanSemuaSumber", () => {
  it("hasil per provider; sumber yang gagal dilaporkan, sumber lain tetap jalan", async () => {
    const { hasil, sumber } = await cocokkanSemuaSumber(VIDEOS, [
      { provider: "google", ambil: async () => ({ ok: true, files: [f("Americana (2025) 1080p.mp4")] }) },
      { provider: "mega", ambil: async () => ({ ok: false, alasan: "Mega sedang sibuk." }) },
    ]);
    expect(hasil["1793887644093"]?.saran).toEqual([
      { provider: "google", quality: "1080p", url: f("Americana (2025) 1080p.mp4").url },
    ]);
    expect(sumber).toEqual([
      { provider: "google", status: "ok", jumlahFile: 1 },
      { provider: "mega", status: "gagal", alasan: "Mega sedang sibuk." },
    ]);
  });
});

describe("POST /api/admin/playly/unduhan/cocokkan", () => {
  const panggil = (body: unknown) =>
    POST(
      new NextRequest("http://localhost/api/admin/playly/unduhan/cocokkan", {
        method: "POST",
        headers: { "Content-Type": "application/json", origin: "http://localhost", host: "localhost" },
        body: JSON.stringify(body),
      }),
    );

  it("bukan admin = 401", async () => {
    sesi.admin = false;
    expect((await panggil({ videos: VIDEOS })).status).toBe(401);
  });

  it("daftar video kosong = 400", async () => {
    expect((await panggil({ videos: [] })).status).toBe(400);
  });

  it("env Drive & Mega kosong = 502 dengan alasan 'belum diatur'", async () => {
    vi.stubEnv("GOOGLE_DRIVE_API_KEY", "");
    vi.stubEnv("PLAYLY_UNDUHAN_MEGA_FOLDER", "");
    const res = await panggil({ videos: VIDEOS });
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toMatch(/belum diatur/);
    vi.unstubAllEnvs();
  });
});
