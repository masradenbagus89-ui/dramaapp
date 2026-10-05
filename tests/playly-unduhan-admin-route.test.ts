// Penjaga POST /api/admin/playly/unduhan — isian manual link unduhan di panel admin.
//
// Store ASLI menulis ke folder sementara (Supabase dimatikan), sesi admin
// dipalsukan. Yang dijaga:
//   1. Tanpa sesi admin = 401, nol yang tertulis.
//   2. Satu kotak salah = SELURUH simpanan ditolak (400) dengan alasan per
//      posisi — kalau diteruskan sebagian, link lama di kotak yang salah ketik
//      ikut terhapus diam-diam.
//   3. Simpan = MENGGANTI link video itu saja; video lain tak tersentuh.
//   4. videoId diambil dari body utama, bukan dari item.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sesi = { email: "admin@contoh.id" as string | null };

vi.mock("@/lib/supabase", () => ({
  useSupabase: false,
  eq: (v: string) => `eq.${v}`,
  sbSelect: async () => [],
  sbUpsert: async () => {},
  sbDelete: async () => {},
  sbRpc: async () => null,
}));
vi.mock("@/lib/session", () => ({
  isAdminRequest: async () => sesi.email !== null,
  getAdminEmail: async () => sesi.email,
}));

const { POST } = await import("../app/api/admin/playly/unduhan/route");
const { getPlaylyLinkUnduhan, upsertPlaylyLinkUnduhan } = await import("../lib/store");

const GDRIVE = "https://drive.google.com/file/d/abc/view";
const MEGA = "https://mega.nz/file/xyz";
let dirTes: string;

function kirim(body: unknown) {
  return POST(
    new Request("http://localhost/api/admin/playly/unduhan", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "http://localhost", host: "localhost" },
      body: JSON.stringify(body),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  );
}

beforeEach(() => {
  dirTes = mkdtempSync(join(tmpdir(), "dramaku-admin-unduhan-"));
  vi.spyOn(process, "cwd").mockReturnValue(dirTes);
  sesi.email = "admin@contoh.id";
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(dirTes, { recursive: true, force: true });
});

describe("POST /api/admin/playly/unduhan", () => {
  it("tanpa sesi admin = 401 dan nol link tertulis", async () => {
    sesi.email = null;
    const res = await kirim({ videoId: "v1", links: [{ provider: "google", quality: "1080p", url: GDRIVE }] });
    expect(res.status).toBe(401);
    expect(await getPlaylyLinkUnduhan()).toEqual([]);
  });

  it("menyimpan link sah dan mengembalikan daftar terbaru", async () => {
    const res = await kirim({
      videoId: "v1",
      links: [
        { provider: "google", quality: "1080p", url: GDRIVE },
        { provider: "mega", quality: "480p", url: MEGA },
      ],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.disimpan).toBe(2);
    expect(body.links.map((l: { provider: string }) => l.provider)).toEqual(["google", "mega"]);
  });

  it("satu kotak salah = SELURUH simpanan ditolak, link lama tetap utuh", async () => {
    await upsertPlaylyLinkUnduhan([{ videoId: "v1", provider: "mega", quality: "480p", url: MEGA }]);
    const res = await kirim({
      videoId: "v1",
      links: [
        { provider: "google", quality: "1080p", url: GDRIVE },
        { provider: "telegram", quality: "480p", url: MEGA },
      ],
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ditolak).toEqual([{ index: 1, alasan: expect.stringContaining("bukan domain Telegram") }]);
    const sisa = await getPlaylyLinkUnduhan();
    expect(sisa.map((l) => `${l.provider}/${l.quality}`)).toEqual(["mega/480p"]);
  });

  it("simpan MENGGANTI link video itu; kotak yang dikosongkan terhapus; video lain utuh", async () => {
    await upsertPlaylyLinkUnduhan([
      { videoId: "v1", provider: "mega", quality: "480p", url: MEGA },
      { videoId: "v2", provider: "mega", quality: "480p", url: MEGA },
    ]);
    const res = await kirim({ videoId: "v1", links: [{ provider: "google", quality: "1080p", url: GDRIVE }] });
    expect(res.status).toBe(200);
    const semua = await getPlaylyLinkUnduhan();
    expect(semua.map((l) => `${l.videoId}/${l.provider}`).sort()).toEqual(["v1/google", "v2/mega"]);
  });

  it("item tak bisa menulis ke video lain lewat videoId di dalamnya", async () => {
    await kirim({
      videoId: "v1",
      links: [{ videoId: "v-lain", provider: "google", quality: "1080p", url: GDRIVE }],
    });
    expect((await getPlaylyLinkUnduhan()).map((l) => l.videoId)).toEqual(["v1"]);
  });

  it("links bukan array = 400, bukan dianggap 'hapus semua'", async () => {
    await upsertPlaylyLinkUnduhan([{ videoId: "v1", provider: "mega", quality: "480p", url: MEGA }]);
    const res = await kirim({ videoId: "v1" });
    expect(res.status).toBe(400);
    expect(await getPlaylyLinkUnduhan()).toHaveLength(1);
  });

  it("asal permintaan asing ditolak (anti-CSRF dari guardMutation)", async () => {
    const res = await POST(
      new Request("http://localhost/api/admin/playly/unduhan", {
        method: "POST",
        headers: { "Content-Type": "application/json", origin: "https://jahat.id", host: "localhost" },
        body: JSON.stringify({ videoId: "v1", links: [] }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );
    expect(res.status).toBe(403);
  });
});
