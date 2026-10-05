// Penjaga field `downloads` di POST /api/webhooks/playly.
//
// Rangkaian utuh, sama seperti tests/playly-webhook-route.test.ts: badan
// mentah -> tanda-tangan -> store ASLI yang menulis ke folder sementara. Yang
// dijaga:
//   1. Payload LAMA (tanpa `downloads`) tetap jalan & tak menyentuh link apa pun.
//   2. `downloads` disimpan lewat validasi yang SAMA dengan impor/admin
//      (https + domain per provider); item rusak dilaporkan, bukan menggugurkan.
//   3. Kiriman ulang tidak menggandakan baris (kombinasi unik).
//   4. Tanda-tangan tetap WAJIB — `downloads` tidak membuka jalan masuk baru.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("@/lib/supabase", () => ({
  useSupabase: false,
  eq: (v: string) => `eq.${v}`,
  sbSelect: async () => [],
  sbUpsert: async () => {},
  sbDelete: async () => {},
  sbRpc: async () => null,
}));

const { POST } = await import("../app/api/webhooks/playly/route");
const { getPlaylyLinkUnduhan, getPlaylyWebhookVideos } = await import("../lib/store");

const SECRET = "rahasia-webhook-untuk-tes";
const EMBED = '<iframe src="https://playly-dashboard.vercel.app/id/1/embed"></iframe>';
const GDRIVE = "https://drive.google.com/file/d/abc/view";
const MEGA = "https://mega.nz/file/xyz";

let dirTes: string;

function kirim(body: string, signature: string | null = null) {
  const sig = signature ?? crypto.createHmac("sha256", SECRET).update(body, "utf8").digest("hex");
  return POST(
    new Request("http://localhost/api/webhooks/playly", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Playly-Signature": sig },
      body,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  );
}

const terbit = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    event: "video.published",
    video: { id: "vid-001", title: "Judul", embed_code: EMBED, ...extra },
  });

beforeEach(() => {
  dirTes = mkdtempSync(join(tmpdir(), "dramaku-webhook-unduhan-"));
  vi.spyOn(process, "cwd").mockReturnValue(dirTes);
  process.env.PLAYLY_WEBHOOK_SECRET = SECRET;
  delete process.env.PLAYLY_EMBED_HOSTS;
  delete process.env.PLAYLY_API_URL;
  for (const p of ["GOOGLE", "TELEGRAM", "CAST", "MEGA"]) {
    delete process.env[`PLAYLY_UNDUHAN_DOMAIN_${p}`];
  }
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.PLAYLY_WEBHOOK_SECRET;
  rmSync(dirTes, { recursive: true, force: true });
});

describe("webhook TANPA downloads (payload lama)", () => {
  it("video tersimpan, balasan tanpa field downloads, nol link tertulis", async () => {
    const res = await kirim(terbit());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, event: "video.published", videoId: "vid-001", aksi: "dibuat" });
    expect(await getPlaylyWebhookVideos()).toHaveLength(1);
    expect(await getPlaylyLinkUnduhan()).toEqual([]);
  });
});

describe("webhook DENGAN downloads", () => {
  it("video.published + downloads: video & link sama-sama tersimpan", async () => {
    const res = await kirim(
      terbit({
        downloads: [
          { provider: "google", quality: "1080p", url: GDRIVE },
          { provider: "mega", quality: "480p", url: MEGA },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.downloads).toEqual({ baru: 2, diperbarui: 0, sama: 0, ditolak: [] });

    const links = await getPlaylyLinkUnduhan();
    expect(links.map((l) => [l.videoId, l.provider, l.quality, l.url])).toEqual([
      ["vid-001", "google", "1080p", GDRIVE],
      ["vid-001", "mega", "480p", MEGA],
    ]);
    expect(links[0].createdAt).toBe(links[0].updatedAt);
  });

  it("bentuk contoh owner { video_id, downloads } TANPA alamat player = pembaruan link saja", async () => {
    const res = await kirim(
      JSON.stringify({
        video_id: "vid-777",
        downloads: [{ provider: "telegram", quality: "480p", url: "https://t.me/dramaku/1" }],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, event: "video.downloads", videoId: "vid-777" });
    // Data video TIDAK disentuh — tak ada baris video setengah jadi tanpa player.
    expect(await getPlaylyWebhookVideos()).toEqual([]);
    expect((await getPlaylyLinkUnduhan()).map((l) => l.videoId)).toEqual(["vid-777"]);
  });

  it("item rusak dilaporkan per posisi, item sah tetap tersimpan", async () => {
    const res = await kirim(
      terbit({
        downloads: [
          { provider: "google", quality: "1080p", url: GDRIVE },
          { provider: "google", quality: "480p", url: "http://drive.google.com/file/d/a" },
          { provider: "telegram", quality: "1080p", url: MEGA },
          { provider: "sendcm", quality: "1080p", url: GDRIVE },
          { provider: "cast", quality: "1080p", url: "https://cast.contoh.id/a" },
          "bukan objek",
        ],
      }),
    );
    expect(res.status).toBe(200);
    const { downloads } = await res.json();
    expect(downloads.baru).toBe(1);
    expect(downloads.ditolak.map((d: { index: number }) => d.index)).toEqual([1, 2, 3, 4, 5]);
    expect(downloads.ditolak[0].alasan).toContain("https");
    expect(downloads.ditolak[1].alasan).toContain("mega.nz");
    expect((await getPlaylyLinkUnduhan()).map((l) => l.url)).toEqual([GDRIVE]);
  });

  it("item TIDAK bisa menulis ke video lain lewat video_id di dalam item", async () => {
    await kirim(
      terbit({ downloads: [{ video_id: "video-orang-lain", provider: "google", quality: "1080p", url: GDRIVE }] }),
    );
    expect((await getPlaylyLinkUnduhan()).map((l) => l.videoId)).toEqual(["vid-001"]);
  });

  it("kiriman ulang = 'sama', lalu alamat baru = 'diperbarui'; tak pernah kembar", async () => {
    const dl = (url: string) => terbit({ downloads: [{ provider: "google", quality: "1080p", url }] });
    await kirim(dl(GDRIVE));
    const ulang = await (await kirim(dl(GDRIVE))).json();
    expect(ulang.downloads).toMatchObject({ baru: 0, sama: 1 });

    const baru = "https://drive.google.com/file/d/BARU/view";
    const ganti = await (await kirim(dl(baru))).json();
    expect(ganti.downloads).toMatchObject({ baru: 0, diperbarui: 1 });

    const links = await getPlaylyLinkUnduhan();
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe(baru);
  });

  it("downloads bukan array = 400 dan TIDAK menyimpan apa pun", async () => {
    const res = await kirim(terbit({ downloads: { provider: "google" } }));
    expect(res.status).toBe(400);
    expect(await getPlaylyWebhookVideos()).toEqual([]);
  });

  it("pembaruan link saja yang SEMUA itemnya ditolak = 400 dengan rinciannya", async () => {
    const res = await kirim(
      JSON.stringify({ video_id: "vid-1", downloads: [{ provider: "google", quality: "720p", url: GDRIVE }] }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.downloads.ditolak[0].alasan).toContain("kualitas");
    expect(await getPlaylyLinkUnduhan()).toEqual([]);
  });

  it("video.unpublished mengabaikan downloads", async () => {
    await kirim(terbit());
    const res = await kirim(
      JSON.stringify({
        event: "video.unpublished",
        video: { id: "vid-001", downloads: [{ provider: "google", quality: "1080p", url: GDRIVE }] },
      }),
    );
    expect(res.status).toBe(200);
    expect(await getPlaylyLinkUnduhan()).toEqual([]);
  });
});

describe("tanda-tangan tetap WAJIB untuk downloads", () => {
  it("tanda-tangan salah = 401 dan nol link tertulis", async () => {
    const body = JSON.stringify({
      video_id: "vid-1",
      downloads: [{ provider: "google", quality: "1080p", url: GDRIVE }],
    });
    const res = await kirim(body, "0".repeat(64));
    expect(res.status).toBe(401);
    expect(await getPlaylyLinkUnduhan()).toEqual([]);
  });
});
