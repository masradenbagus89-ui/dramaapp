// Penjaga isi otomatis link Mega (lib/playly-unduhan-mega.ts + route-nya).
// Yang dijaga:
//   1. Link folder di env diurai ketat: hanya https://mega.nz/folder/<id>#<kunci>.
//   2. Link file = format resmi file-di-dalam-folder (yang dibaca balik megajs).
//   3. Subfolder ikut dibaca; folder sendiri tak pernah jadi "file".
//   4. File kualitas sama di DUA folder -> ganda, bukan dipilih salah satunya.
//   5. Mega gagal / env kosong -> ok:false alasan awam, kunci folder tak ke log.
//   6. Route: bukan admin = 401, dan route tak pernah menulis link.
import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

/** Pohon palsu yang dipulangkan "Mega" untuk tes pemuat sungguhan. */
const mega = vi.hoisted(() => ({
  pohon: null as unknown,
  gagal: null as Error | null,
  urlDiminta: [] as string[],
}));
vi.mock("megajs", () => ({
  File: {
    fromURL: (url: string) => {
      mega.urlDiminta.push(url);
      const akar = mega.pohon as Record<string, unknown>;
      return {
        ...akar,
        loadAttributes: async () => {
          if (mega.gagal) throw mega.gagal;
          return akar;
        },
      };
    },
  },
}));

const sesi = { admin: true };
vi.mock("@/lib/session", () => ({ isAdminRequest: async () => sesi.admin }));

const {
  bacaFolderMega,
  cariLinkMega,
  muatFolderMegajs,
  uraiLinkFolderMega,
  urlFileMega,
} = await import("../lib/playly-unduhan-mega");
const { GET } = await import("../app/api/admin/playly/unduhan/mega/route");
const { validasiLinkUnduhan } = await import("../lib/playly-unduhan");
const { bacaDomainUnduhan } = await import("../lib/playly-unduhan-domain");

const KUNCI = "kunciRahasiaFolder1234";
const FOLDER = { handle: "AbCd1234", kunci: KUNCI };
const LINK_FOLDER = `https://mega.nz/folder/${FOLDER.handle}#${KUNCI}`;
const ENV = { PLAYLY_UNDUHAN_MEGA_FOLDER: LINK_FOLDER };

const file = (handle: string, name: string) => ({ name, directory: false, downloadId: [FOLDER.handle, handle] });
const folder = (name: string, children: unknown[]) => ({ name, directory: true, children });

afterEach(() => {
  vi.restoreAllMocks();
  sesi.admin = true;
  mega.pohon = null;
  mega.gagal = null;
  mega.urlDiminta = [];
});

describe("uraiLinkFolderMega", () => {
  it("menerima link folder lengkap dengan kunci", () => {
    expect(uraiLinkFolderMega(LINK_FOLDER)).toEqual(FOLDER);
  });

  it.each([
    ["tanpa kunci", `https://mega.nz/folder/${FOLDER.handle}`],
    ["http", `http://mega.nz/folder/${FOLDER.handle}#${KUNCI}`],
    ["domain tiruan", `https://mega.nz.evil.com/folder/${FOLDER.handle}#${KUNCI}`],
    ["link file, bukan folder", `https://mega.nz/file/${FOLDER.handle}#${KUNCI}`],
    ["karakter asing di kunci", `https://mega.nz/folder/${FOLDER.handle}#kunci"><script>12345`],
    ["bukan URL", "folder saya"],
  ])("menolak %s", (_, raw) => {
    expect(uraiLinkFolderMega(raw)).toBeNull();
  });

  it("bacaFolderMega: beberapa link dipisah koma, yang rusak dibuang", () => {
    expect(bacaFolderMega(`${LINK_FOLDER}, rusak, https://mega.nz/folder/Zz998877#${KUNCI}`)).toEqual([
      FOLDER,
      { handle: "Zz998877", kunci: KUNCI },
    ]);
    expect(bacaFolderMega(undefined)).toEqual([]);
  });
});

describe("urlFileMega", () => {
  it("format file-di-dalam-folder dan lolos validasi domain Mega", () => {
    const url = urlFileMega(FOLDER, "Ff112233");
    expect(url).toBe(`https://mega.nz/folder/${FOLDER.handle}#${KUNCI}/file/Ff112233`);
    const cek = validasiLinkUnduhan(
      { videoId: "abc", provider: "mega", quality: "1080p", url },
      bacaDomainUnduhan({}), // domain bawaan saja, tanpa tambahan env
    );
    expect(cek.ok).toBe(true);
  });
});

describe("muatFolderMegajs (megajs dipalsukan)", () => {
  it("membaca subfolder dan melewati folder", async () => {
    mega.pohon = folder("akar", [
      file("Ff000001", "abc_1080p.mp4"),
      folder("480p", [file("Ff000002", "abc_480p.mp4")]),
    ]);
    expect(await muatFolderMegajs(FOLDER)).toEqual([
      { handle: "Ff000001", name: "abc_1080p.mp4" },
      { handle: "Ff000002", name: "abc_480p.mp4" },
    ]);
    expect(mega.urlDiminta).toEqual([LINK_FOLDER]);
  });

  it("anak tanpa downloadId berbentuk [folder, file] diabaikan", async () => {
    mega.pohon = folder("akar", [{ name: "abc_1080p.mp4", directory: false, downloadId: "Ff000001" }]);
    expect(await muatFolderMegajs(FOLDER)).toEqual([]);
  });
});

describe("cariLinkMega", () => {
  const muatDari = (isi: Record<string, { handle: string; name: string }[]>) =>
    vi.fn(async (f: { handle: string }) => isi[f.handle] ?? []);

  it("env kosong -> belum diatur, Mega tak dipanggil", async () => {
    const muat = muatDari({});
    const hasil = await cariLinkMega("abc", {}, muat);
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.alasan).toMatch(/belum diatur/);
    expect(muat).not.toHaveBeenCalled();
  });

  it("mengisi 1080p & 480p milik video itu saja", async () => {
    const muat = muatDari({
      [FOLDER.handle]: [
        { handle: "Ff000001", name: "Judul - abc - 1080p.mkv" },
        { handle: "Ff000002", name: "abc_480p.mp4" },
        { handle: "Ff000003", name: "abcd_480p.mp4" },
      ],
    });
    expect(await cariLinkMega("abc", ENV, muat)).toEqual({
      ok: true,
      saran: [
        { quality: "1080p", url: urlFileMega(FOLDER, "Ff000001") },
        { quality: "480p", url: urlFileMega(FOLDER, "Ff000002") },
      ],
      ganda: [],
    });
  });

  it("kualitas sama di dua folder -> ganda, tidak dipilih", async () => {
    const lain = { handle: "Zz998877", kunci: KUNCI };
    const muat = muatDari({
      [FOLDER.handle]: [{ handle: "Ff000001", name: "abc_1080p.mp4" }],
      [lain.handle]: [{ handle: "Ff000009", name: "abc 1080p (cadangan).mp4" }],
    });
    const env = { PLAYLY_UNDUHAN_MEGA_FOLDER: `${LINK_FOLDER},https://mega.nz/folder/${lain.handle}#${KUNCI}` };
    expect(await cariLinkMega("abc", env, muat)).toEqual({
      ok: true,
      saran: [],
      ganda: [{ quality: "1080p", nama: ["abc_1080p.mp4", "abc 1080p (cadangan).mp4"] }],
    });
  });

  it("folder tak ada -> alasan awam, kunci folder tak ikut di log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mega.gagal = new Error("ENOENT (-9): Object (typically, node or user) not found. Wrong password?");
    mega.pohon = folder("akar", []);
    const hasil = await cariLinkMega("abc", ENV);
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.alasan).toMatch(/tidak ditemukan/);
    expect(JSON.stringify(log.mock.calls)).not.toContain(KUNCI);
  });

  it("kunci salah -> alasan menyebut bagian setelah #", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mega.gagal = new Error("Attributes could not be decrypted with provided key.");
    mega.pohon = folder("akar", []);
    const hasil = await cariLinkMega("abc", ENV);
    if (!hasil.ok) expect(hasil.alasan).toMatch(/Kunci folder Mega salah/);
    else throw new Error("seharusnya gagal");
  });
});

describe("GET /api/admin/playly/unduhan/mega", () => {
  const panggil = (q: string) =>
    GET(new NextRequest(`http://localhost/api/admin/playly/unduhan/mega${q}`));

  it("bukan admin = 401", async () => {
    sesi.admin = false;
    expect((await panggil("?videoId=abc")).status).toBe(401);
  });

  it("videoId kosong = 400", async () => {
    expect((await panggil("")).status).toBe(400);
  });
});
