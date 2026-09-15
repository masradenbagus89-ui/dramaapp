// Penjaga untuk JALUR GAGAL POST /api/webhooks/playly — bagian yang tidak bisa
// diuji di tests/playly-webhook-route.test.ts karena butuh penyimpanan yang
// SENGAJA rusak, dan mock modul di vitest berlaku per-berkas.
//
// Kenapa ini layak punya berkas sendiri: kegagalan penyimpanan adalah satu-
// satunya keadaan di mana membalas 200 berakibat KEHILANGAN DATA PERMANEN.
// Playly membaca 200 sebagai "sudah masuk" lalu tidak pernah mengirim ulang —
// padahal videonya tak pernah tersimpan. Tidak ada error di layar siapa pun.
//
// Tiga hal yang dikunci di sini:
//   1. Penyimpanan gagal -> 500 (= "kirim ulang nanti"), BUKAN 200.
//   2. Server tidak roboh: yang keluar tetap JSON, bukan halaman error Next.js.
//   3. Log server TIDAK memuat kunci rahasia — log Vercel bisa dibaca siapa pun
//      yang punya akses dashboard, jadi rahasia yang bocor ke situ ikut bocor.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const PESAN_GAGAL = "Supabase timeout setelah 5000ms";

vi.mock("@/lib/store", () => ({
  upsertPlaylyWebhookVideo: vi.fn(async () => {
    throw new Error(PESAN_GAGAL);
  }),
  setPlaylyWebhookVideoStatus: vi.fn(async () => {
    throw new Error(PESAN_GAGAL);
  }),
}));

const { POST } = await import("../app/api/webhooks/playly/route");

const SECRET = "rahasia-webhook-untuk-tes";

const PAYLOAD = JSON.stringify({
  event: "video.published",
  video: {
    id: "vid-001",
    title: "Cinta di Ujung Senja",
    embed_code: '<iframe src="https://playly-dashboard.vercel.app/id/1/embed"></iframe>',
  },
});

function kirim(body: string, kunci: string | null = SECRET) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (kunci !== null) headers["x-playly-secret"] = kunci;
  return POST(
    new Request("http://localhost/api/webhooks/playly", {
      method: "POST",
      headers,
      body,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  );
}

let logError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.PLAYLY_WEBHOOK_SECRET = SECRET;
  delete process.env.PLAYLY_EMBED_HOSTS;
  delete process.env.PLAYLY_API_URL;
  // Dibungkam supaya keluaran tes tetap bersih, tapi tetap direkam supaya
  // isinya bisa diperiksa di bawah.
  logError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.PLAYLY_WEBHOOK_SECRET;
});

describe("POST /api/webhooks/playly — penyimpanan gagal", () => {
  it("membalas 500, BUKAN 200 — supaya Playly mengirim ulang", async () => {
    const res = await kirim(PAYLOAD);
    // 200 di sini berarti video hilang diam-diam: Playly menganggap sudah
    // terkirim dan tak akan pernah mengulanginya.
    expect(res.status).toBe(500);
  });

  it("balasannya tetap JSON yang bisa dibaca, bukan halaman error", async () => {
    const res = await kirim(PAYLOAD);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(typeof body.error).toBe("string");
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("unpublish yang gagal disimpan juga 500, bukan 200", async () => {
    const res = await kirim(
      JSON.stringify({ event: "video.unpublished", video: { id: "vid-001" } }),
    );
    expect(res.status).toBe(500);
  });

  it("kegagalan dicatat ke log server — bukan ditelan diam-diam", async () => {
    await kirim(PAYLOAD);
    expect(logError).toHaveBeenCalled();
    const tercatat = logError.mock.calls.flat().join(" ");
    expect(tercatat).toContain("playly-webhook");
    // Sebab aslinya harus ikut, kalau tidak penelusuran jadi buntu.
    expect(tercatat).toContain("Supabase timeout");
  });

  it("log TIDAK memuat kunci rahasia maupun badan permintaan", async () => {
    await kirim(PAYLOAD);
    const tercatat = logError.mock.calls.flat().join(" ");
    // Inti aturannya: apa pun yang masuk log ikut terbaca siapa pun yang bisa
    // membuka log Vercel. Kunci di situ = kunci bocor.
    expect(tercatat).not.toContain(SECRET);
    expect(tercatat).not.toContain("embed_code");
  });

  it("pesan untuk Playly tidak membocorkan rincian dalaman server", async () => {
    const res = await kirim(PAYLOAD);
    const body = await res.json();
    // "Supabase" / nama tabel / jejak stack tidak boleh keluar: itu peta gratis
    // bagi siapa pun yang berhasil menebak kuncinya.
    expect(body.error).not.toContain("Supabase");
    expect(body.error).not.toContain("timeout");
  });

  it("kunci salah tetap 401 dan penyimpanan tidak pernah dipanggil", async () => {
    // Urutannya penting: verifikasi harus terjadi SEBELUM penyimpanan. Kalau
    // terbalik, kiriman palsu ikut membebani database.
    const res = await kirim(PAYLOAD, "kunci-penyerang");
    expect(res.status).toBe(401);
    expect(logError).not.toHaveBeenCalled();
  });
});

describe("POST /api/webhooks/playly — badan permintaan tidak terbaca", () => {
  it("koneksi putus saat membaca badan: 400 JSON, server tidak roboh", async () => {
    // Keadaan nyata: pengirim memutus koneksi di tengah jalan, lalu req.text()
    // MELEMPAR. Tanpa try di route, ini keluar sebagai halaman error 500 Next.js
    // — yang tidak bisa dibaca Playly sebagai instruksi kirim-ulang.
    const reqPalsu = {
      headers: new Headers({ "x-playly-secret": SECRET }),
      text: async () => {
        throw new Error("ECONNRESET: koneksi terputus");
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(reqPalsu as any);

    expect(res.status).toBe(400);
    expect((await res.json()).ok).toBe(false);
    expect(logError).toHaveBeenCalled();
  });
});
