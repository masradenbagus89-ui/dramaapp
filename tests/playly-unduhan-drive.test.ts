// Penjaga isi otomatis link Google Drive (lib/playly-unduhan-drive.ts + route-nya).
// Yang dijaga:
//   1. ID & kualitas dicocokkan sebagai KATA UTUH — ID `12` tak boleh menempel
//      ke file `123_1080p.mp4` (link nyasar ke video lain tanpa ada yang tahu).
//   2. >1 file untuk kualitas yang sama -> tidak dipilih, dilaporkan "ganda".
//   3. Seluruh halaman folder dibaca (nextPageToken), bukan halaman pertama saja.
//   4. Google gagal / env kosong -> ok:false dengan alasan awam, API key tak bocor.
//   5. Route: bukan admin = 401, dan route tak pernah menulis link.
import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  bacaFolderDrive,
  cariLinkDrive,
  cocokkanFileDrive,
  urlFileDrive,
} from "../lib/playly-unduhan-drive";

const sesi = { admin: true };
vi.mock("@/lib/session", () => ({ isAdminRequest: async () => sesi.admin }));
const { GET } = await import("../app/api/admin/playly/unduhan/drive/route");

const FOLDER = "1AbCdEfGhIjKlMnOp";
const KUNCI = "kunci-rahasia-tes";
const ENV = { GOOGLE_DRIVE_API_KEY: KUNCI, PLAYLY_UNDUHAN_DRIVE_FOLDER: FOLDER };
const fid = (n: number) => `fileId_${String(n).padStart(6, "0")}`;

function jawab(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.restoreAllMocks();
  sesi.admin = true;
});

describe("cocokkanFileDrive", () => {
  it("mengambil 1080p & 480p milik video itu saja", () => {
    const hasil = cocokkanFileDrive("abc123", [
      { id: fid(1), name: "abc123_1080p.mp4" },
      { id: fid(2), name: "Judul Drama - abc123 - 480P.mkv" },
      { id: fid(3), name: "xyz999_1080p.mp4" },
    ]);
    expect(hasil.saran).toEqual([
      { quality: "1080p", url: urlFileDrive(fid(1)) },
      { quality: "480p", url: urlFileDrive(fid(2)) },
    ]);
    expect(hasil.ganda).toEqual([]);
  });

  it("ID pendek tidak menempel ke ID lain yang lebih panjang", () => {
    const hasil = cocokkanFileDrive("12", [
      { id: fid(1), name: "123_1080p.mp4" },
      { id: fid(2), name: "v12_480p.mp4" },
      { id: fid(3), name: "112-480p.mp4" },
    ]);
    expect(hasil.saran).toEqual([]);
  });

  it("kualitas juga kata utuh: 1080p60 / 4480p bukan 1080p / 480p", () => {
    const hasil = cocokkanFileDrive("abc", [
      { id: fid(1), name: "abc_1080p60.mp4" },
      { id: fid(2), name: "abc_4480p.mp4" },
    ]);
    expect(hasil.saran).toEqual([]);
  });

  it("dua file untuk kualitas sama = ganda, tidak dipilih", () => {
    const hasil = cocokkanFileDrive("abc", [
      { id: fid(1), name: "abc_480p.mp4" },
      { id: fid(2), name: "abc_480p (1).mp4" },
      { id: fid(3), name: "abc_1080p.mp4" },
    ]);
    expect(hasil.saran).toEqual([{ quality: "1080p", url: urlFileDrive(fid(3)) }]);
    expect(hasil.ganda).toEqual([{ quality: "480p", nama: ["abc_480p.mp4", "abc_480p (1).mp4"] }]);
  });

  it("ID berisi huruf regex diperlakukan apa adanya", () => {
    const hasil = cocokkanFileDrive("a.c", [
      { id: fid(1), name: "abc_1080p.mp4" },
      { id: fid(2), name: "a.c_1080p.mp4" },
    ]);
    expect(hasil.saran).toEqual([{ quality: "1080p", url: urlFileDrive(fid(2)) }]);
  });

  it("id file Drive yang tak wajar dibuang (tak pernah jadi href)", () => {
    const hasil = cocokkanFileDrive("abc", [{ id: "../evil", name: "abc_1080p.mp4" }]);
    expect(hasil.saran).toEqual([]);
  });
});

describe("bacaFolderDrive", () => {
  it("memisah koma & membuang nilai yang bukan ID folder (anti suntikan ke query)", () => {
    expect(bacaFolderDrive(`${FOLDER}, 2ZyXwVuTsRqPoNm ,' or 1=1`)).toEqual([FOLDER, "2ZyXwVuTsRqPoNm"]);
  });
});

describe("cariLinkDrive", () => {
  it("env kosong = ok:false tanpa memanggil Google", async () => {
    const f = vi.fn();
    const hasil = await cariLinkDrive("abc", {}, f as unknown as typeof fetch);
    expect(hasil.ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("membaca semua halaman folder", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(jawab({ files: [{ id: fid(1), name: "abc_1080p.mp4" }], nextPageToken: "hal2" }))
      .mockResolvedValueOnce(jawab({ files: [{ id: fid(2), name: "abc_480p.mp4" }] }));
    const hasil = await cariLinkDrive("abc", ENV, f as unknown as typeof fetch);
    expect(hasil).toEqual({
      ok: true,
      saran: [
        { quality: "1080p", url: urlFileDrive(fid(1)) },
        { quality: "480p", url: urlFileDrive(fid(2)) },
      ],
      ganda: [],
    });
    const url2 = new URL(f.mock.calls[1][0] as string);
    expect(url2.origin + url2.pathname).toBe("https://www.googleapis.com/drive/v3/files");
    expect(url2.searchParams.get("pageToken")).toBe("hal2");
    expect(url2.searchParams.get("q")).toBe(
      `'${FOLDER}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
    );
  });

  it("Google 404 -> alasan menyebut folder & izin berbagi, API key tak ikut di log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const f = vi.fn().mockResolvedValue(jawab({ error: {} }, 404));
    const hasil = await cariLinkDrive("abc", ENV, f as unknown as typeof fetch);
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.alasan).toMatch(/Folder tidak ditemukan/);
    expect(JSON.stringify(log.mock.calls)).not.toContain(KUNCI);
  });

  it("jaringan putus -> ok:false (gagal aman, bukan lempar error)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const f = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const hasil = await cariLinkDrive("abc", ENV, f as unknown as typeof fetch);
    expect(hasil.ok).toBe(false);
  });
});

describe("GET /api/admin/playly/unduhan/drive", () => {
  const panggil = (q: string) =>
    GET(new NextRequest(`http://localhost/api/admin/playly/unduhan/drive${q}`));

  it("bukan admin = 401", async () => {
    sesi.admin = false;
    expect((await panggil("?videoId=abc")).status).toBe(401);
  });

  it("videoId kosong = 400", async () => {
    expect((await panggil("")).status).toBe(400);
  });
});
