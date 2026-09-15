// Penjaga permanen untuk POST /api/webhooks/playly — pintu masuk notifikasi
// video dari Playly.
//
// Bedanya dengan tests/playly-webhook.test.ts: di sana yang diuji fungsi
// satuannya, di SINI yang diuji rangkaian utuhnya — dari badan permintaan
// mentah, lewat pemeriksaan tanda-tangan, sampai apa yang BENAR-BENAR
// tersimpan. Penyimpanannya bukan tiruan: Supabase dimatikan lalu store yang
// asli menulis ke folder sementara, jadi aturan "satu videoId = satu baris"
// benar-benar teruji, bukan cuma dipercaya.
//
// Tiga hal yang kalau longgar akibatnya nyata:
//   1. Tanda-tangan salah TIDAK boleh menyentuh penyimpanan sama sekali.
//      Kalau lolos, siapa pun bisa menaruh video di situs kita.
//   2. Kiriman ulang (retry) TIDAK boleh menggandakan video. Playly sengaja
//      mengirim ulang kalau balasan kita telat — itu normal, bukan gangguan.
//   3. Balasannya harus 200 untuk hal yang memang sudah beres, supaya Playly
//      berhenti mengulang. Membalas error untuk keadaan normal membuat mereka
//      mengetuk selamanya.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Supabase dimatikan: store jatuh ke mode file, dan file itu kita arahkan ke
// folder sementara lewat process.cwd() di bawah. Tanpa ini tes berisiko
// menulis ke database sungguhan kalau env Supabase kebetulan terisi.
vi.mock("@/lib/supabase", () => ({
  useSupabase: false,
  eq: (v: string) => `eq.${v}`,
  sbSelect: async () => [],
  sbUpsert: async () => {},
  sbDelete: async () => {},
  sbRpc: async () => null,
}));

const { POST } = await import("../app/api/webhooks/playly/route");
const { getPlaylyWebhookVideos, getPublishedPlaylyWebhookVideos } = await import(
  "../lib/store"
);

const SECRET = "rahasia-webhook-untuk-tes";
const EMBED = '<iframe src="https://playly-dashboard.vercel.app/id/1/embed"></iframe>';

let dirTes: string;

function tandaTangani(body: string, secret = SECRET): string {
  return crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

/**
 * Kirim satu notifikasi. `signature` sengaja bisa diatur bebas supaya kasus
 * "tanda-tangan salah" dan "header hilang" bisa diuji apa adanya.
 */
function kirim(body: string, signature: string | null = tandaTangani(body)) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (signature !== null) headers["X-Playly-Signature"] = signature;
  return POST(
    new Request("http://localhost/api/webhooks/playly", {
      method: "POST",
      headers,
      body,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  );
}

function payloadTerbit(video: Record<string, unknown> = {}) {
  return JSON.stringify({
    event: "video.published",
    video: {
      id: "vid-001",
      title: "Cinta di Ujung Senja",
      year: 2024,
      genre: "Romance",
      embed_code: EMBED,
      ...video,
    },
  });
}

beforeEach(() => {
  dirTes = mkdtempSync(join(tmpdir(), "dramaku-webhook-"));
  vi.spyOn(process, "cwd").mockReturnValue(dirTes);
  process.env.PLAYLY_WEBHOOK_SECRET = SECRET;
  // Setelan Playly dikosongkan supaya tes memakai domain bawaan, apa pun isi
  // .env.local mesin yang menjalankannya.
  delete process.env.PLAYLY_EMBED_HOSTS;
  delete process.env.PLAYLY_API_URL;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.PLAYLY_WEBHOOK_SECRET;
  rmSync(dirTes, { recursive: true, force: true });
});

describe("POST /api/webhooks/playly — tanda-tangan sah", () => {
  it("menyimpan video baru dengan isi yang benar, lalu membalas 200", async () => {
    const res = await kirim(payloadTerbit());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.videoId).toBe("vid-001");
    expect(body.aksi).toBe("dibuat");

    const tersimpan = await getPlaylyWebhookVideos();
    expect(tersimpan).toHaveLength(1);
    expect(tersimpan[0]).toMatchObject({
      videoId: "vid-001",
      title: "Cinta di Ujung Senja",
      year: 2024,
      genre: "Romance",
      // Yang tersimpan ALAMATNYA, bukan potongan HTML <iframe> yang dikirim.
      embedUrl: "https://playly-dashboard.vercel.app/id/1/embed",
      status: "published",
    });
    expect(tersimpan[0].embedUrl).not.toContain("<");
    // Waktu terima dicatat dalam bentuk ISO yang bisa diurutkan.
    expect(new Date(tersimpan[0].receivedAt).toISOString()).toBe(tersimpan[0].receivedAt);
  });

  it("tanda-tangan dihitung dari badan MENTAH — spasi & indentasi ikut dihitung", async () => {
    // Penjaga untuk kesalahan paling halus di webhook: kalau suatu saat route
    // diubah jadi req.json() lalu JSON.stringify ulang untuk verifikasi, badan
    // dengan indentasi seperti ini akan berubah bentuk dan notifikasi yang SAH
    // ikut tertolak. Tes ini merah begitu itu terjadi.
    const berindentasi = JSON.stringify(JSON.parse(payloadTerbit()), null, 2);
    const res = await kirim(berindentasi);
    expect(res.status).toBe(200);
    expect(await getPlaylyWebhookVideos()).toHaveLength(1);
  });

  it("balasannya pendek dan tidak boleh disimpan cache", async () => {
    const res = await kirim(payloadTerbit());
    const teks = await res.text();
    // Balasan panjang memperlambat, dan balasan lambat membuat Playly
    // menganggap webhook gagal lalu mengirimnya lagi.
    expect(teks.length).toBeLessThan(500);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });
});

describe("POST /api/webhooks/playly — tanda-tangan tidak sah", () => {
  it("secret berbeda: 401 dan TIDAK ada yang tersimpan", async () => {
    const body = payloadTerbit();
    const res = await kirim(body, tandaTangani(body, "secret-penyerang"));

    expect(res.status).toBe(401);
    expect((await res.json()).ok).toBe(false);
    // Inti pengamanannya: penyimpanan tidak tersentuh sama sekali.
    expect(await getPlaylyWebhookVideos()).toEqual([]);
  });

  it("header tanda-tangan tidak dikirim sama sekali: 401, penyimpanan bersih", async () => {
    const res = await kirim(payloadTerbit(), null);
    expect(res.status).toBe(401);
    expect(await getPlaylyWebhookVideos()).toEqual([]);
  });

  it("badan diubah setelah ditandatangani (isi disusupi): 401", async () => {
    const asli = payloadTerbit();
    const tanda = tandaTangani(asli);
    const disusupi = asli.replace(
      "https://playly-dashboard.vercel.app/id/1/embed",
      "https://situs-penyerang.example.com/x",
    );
    const res = await kirim(disusupi, tanda);
    expect(res.status).toBe(401);
    expect(await getPlaylyWebhookVideos()).toEqual([]);
  });

  it("secret server belum di-set: 503 (bukan 401) dan penyimpanan bersih", async () => {
    delete process.env.PLAYLY_WEBHOOK_SECRET;
    const res = await kirim(payloadTerbit());
    // 503 = "coba lagi nanti", jadi notifikasi yang tertahan tetap masuk
    // begitu secret dipasang. 401 akan dibaca Playly sebagai tolakan permanen.
    expect(res.status).toBe(503);
    expect(await getPlaylyWebhookVideos()).toEqual([]);
  });
});

describe("POST /api/webhooks/playly — kiriman ulang (idempoten)", () => {
  it("payload yang sama dikirim dua kali: tetap SATU baris", async () => {
    const body = payloadTerbit();
    const pertama = await kirim(body);
    const kedua = await kirim(body);

    expect(pertama.status).toBe(200);
    expect(kedua.status).toBe(200);
    expect((await pertama.json()).aksi).toBe("dibuat");
    expect((await kedua.json()).aksi).toBe("diperbarui");

    const tersimpan = await getPlaylyWebhookVideos();
    expect(tersimpan).toHaveLength(1);
    expect(tersimpan[0].videoId).toBe("vid-001");
  });

  it("video ID sama dengan judul berubah: barisnya DIPERBARUI, bukan digandakan", async () => {
    await kirim(payloadTerbit());
    await kirim(payloadTerbit({ title: "Judul Setelah Diedit", year: 2025 }));

    const tersimpan = await getPlaylyWebhookVideos();
    expect(tersimpan).toHaveLength(1);
    expect(tersimpan[0].title).toBe("Judul Setelah Diedit");
    expect(tersimpan[0].year).toBe(2025);
  });

  it("video ID BERBEDA tetap jadi baris sendiri", async () => {
    await kirim(payloadTerbit({ id: "vid-001" }));
    await kirim(payloadTerbit({ id: "vid-002" }));

    const tersimpan = await getPlaylyWebhookVideos();
    expect(tersimpan).toHaveLength(2);
    expect(tersimpan.map((v) => v.videoId).sort()).toEqual(["vid-001", "vid-002"]);
  });
});

describe("POST /api/webhooks/playly — video ditarik Playly (unpublish)", () => {
  it("video yang sudah tersimpan berubah jadi tersembunyi dari halaman penonton", async () => {
    await kirim(payloadTerbit());
    expect(await getPublishedPlaylyWebhookVideos()).toHaveLength(1);

    const res = await kirim(
      JSON.stringify({ event: "video.unpublished", video: { id: "vid-001" } }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).hidden).toBe(true);

    // Hilang dari daftar yang boleh tampil...
    expect(await getPublishedPlaylyWebhookVideos()).toEqual([]);
    // ...tapi catatannya tetap ada, dengan status yang jujur.
    const semua = await getPlaylyWebhookVideos();
    expect(semua).toHaveLength(1);
    expect(semua[0].status).toBe("unpublished");
  });

  it("unpublish dikirim dua kali: hasilnya sama, tidak error", async () => {
    await kirim(payloadTerbit());
    const body = JSON.stringify({ event: "video.unpublished", video: { id: "vid-001" } });
    await kirim(body);
    const kedua = await kirim(body);

    expect(kedua.status).toBe(200);
    expect(await getPublishedPlaylyWebhookVideos()).toEqual([]);
    expect(await getPlaylyWebhookVideos()).toHaveLength(1);
  });

  it("video yang diterbitkan ulang muncul lagi", async () => {
    await kirim(payloadTerbit());
    await kirim(JSON.stringify({ event: "video.unpublished", video: { id: "vid-001" } }));
    await kirim(payloadTerbit());

    const tampil = await getPublishedPlaylyWebhookVideos();
    expect(tampil).toHaveLength(1);
    expect(tampil[0].videoId).toBe("vid-001");
  });

  it("unpublish untuk video yang tak dikenal: 200 tanpa membuat baris hantu", async () => {
    const res = await kirim(
      JSON.stringify({ event: "video.unpublished", video: { id: "tidak-pernah-ada" } }),
    );
    // Tak ada yang perlu disembunyikan = keadaannya SUDAH sesuai permintaan.
    // Membalas 404 malah membuat Playly mengulanginya selamanya.
    expect(res.status).toBe(200);
    expect((await res.json()).hidden).toBe(false);
    expect(await getPlaylyWebhookVideos()).toEqual([]);
  });
});

describe("POST /api/webhooks/playly — payload sah tapi isinya bermasalah", () => {
  it("embed_code dari domain asing: 400 dan tidak tersimpan", async () => {
    const res = await kirim(
      payloadTerbit({
        embed_code: '<iframe src="https://situs-penyerang.example.com/x"></iframe>',
      }),
    );
    expect(res.status).toBe(400);
    expect(await getPlaylyWebhookVideos()).toEqual([]);
  });

  it("event yang belum ditangani: 200 'diabaikan', tidak tersimpan", async () => {
    const res = await kirim(
      JSON.stringify({ event: "video.viewed", video: { id: "vid-001" } }),
    );
    // 200 supaya Playly tidak mengulang kejadian yang memang tidak kita tangani.
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.ignored).toBeTruthy();
    expect(await getPlaylyWebhookVideos()).toEqual([]);
  });

  it("badan bukan JSON: 400, tidak tersimpan", async () => {
    const res = await kirim("{ini bukan json");
    expect(res.status).toBe(400);
    expect(await getPlaylyWebhookVideos()).toEqual([]);
  });
});

/**
 * Kirim satu notifikasi memakai JALUR A — kunci rahasia polos di header,
 * tanpa tanda-tangan sama sekali. Inilah bentuk yang paling mungkin dipakai
 * Playly kalau mereka tidak mendukung HMAC.
 */
function kirimDenganKunci(body: string, kunci: string | null = SECRET) {
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

describe("POST /api/webhooks/playly — jalur A (x-playly-secret)", () => {
  it("kunci benar tanpa tanda-tangan: 200 dan video tersimpan", async () => {
    const res = await kirimDenganKunci(payloadTerbit());
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    const tersimpan = await getPlaylyWebhookVideos();
    expect(tersimpan).toHaveLength(1);
    expect(tersimpan[0].videoId).toBe("vid-001");
  });

  it("kunci salah: 401 dan penyimpanan TIDAK tersentuh", async () => {
    const res = await kirimDenganKunci(payloadTerbit(), "kunci-punya-penyerang");
    expect(res.status).toBe(401);
    expect(await getPlaylyWebhookVideos()).toEqual([]);
  });

  it("kunci benar tapi kurang satu huruf: 401", async () => {
    const res = await kirimDenganKunci(payloadTerbit(), SECRET.slice(0, -1));
    expect(res.status).toBe(401);
    expect(await getPlaylyWebhookVideos()).toEqual([]);
  });

  it("tanpa header pembuktian apa pun: 401", async () => {
    const res = await kirimDenganKunci(payloadTerbit(), null);
    expect(res.status).toBe(401);
    expect(await getPlaylyWebhookVideos()).toEqual([]);
  });

  it("jalur A idempoten sama seperti jalur B: dua kiriman = satu baris", async () => {
    await kirimDenganKunci(payloadTerbit());
    await kirimDenganKunci(payloadTerbit());
    expect(await getPlaylyWebhookVideos()).toHaveLength(1);
  });

  it("secret server belum di-set: 503, walau kunci di header terlihat benar", async () => {
    delete process.env.PLAYLY_WEBHOOK_SECRET;
    const res = await kirimDenganKunci(payloadTerbit());
    expect(res.status).toBe(503);
    expect(await getPlaylyWebhookVideos()).toEqual([]);
  });
});

describe("POST /api/webhooks/playly — bentuk payload PIPIH & field baru", () => {
  const PIPIH = JSON.stringify({
    id: "vid-500",
    title: "Hujan di Bulan Juni",
    description: "Sinopsis singkat dari Playly.",
    embedUrl: "https://playly-dashboard.vercel.app/id/500/embed",
    thumbnailUrl: "https://playly-dashboard.vercel.app/thumb/500.jpg",
    creator: "coklat",
    duration: 4200,
    year: 2022,
    genre: "Drama",
  });

  it("badan tanpa pembungkus 'video' dan tanpa 'event' tetap tersimpan", async () => {
    const res = await kirim(PIPIH);
    expect(res.status).toBe(200);

    const tersimpan = await getPlaylyWebhookVideos();
    expect(tersimpan).toHaveLength(1);
    expect(tersimpan[0]).toMatchObject({
      videoId: "vid-500",
      title: "Hujan di Bulan Juni",
      description: "Sinopsis singkat dari Playly.",
      embedUrl: "https://playly-dashboard.vercel.app/id/500/embed",
      thumbnailUrl: "https://playly-dashboard.vercel.app/thumb/500.jpg",
      creator: "coklat",
      durationSeconds: 4200,
      year: 2022,
      genre: "Drama",
      status: "published",
    });
  });

  it("field yang tidak dikirim Playly tersimpan null, bukan undefined", async () => {
    // Beda yang penting: undefined HILANG saat JSON.stringify menulis ke
    // penyimpanan, jadi kolomnya lenyap dan pembaca berikutnya tak bisa
    // membedakan "tidak dikirim" dari "belum pernah ada field ini".
    await kirim(payloadTerbit());
    const [v] = await getPlaylyWebhookVideos();
    expect(v.description).toBeNull();
    expect(v.thumbnailUrl).toBeNull();
    expect(v.creator).toBeNull();
    expect(v.durationSeconds).toBeNull();
  });

  it("sampul berbahaya dibuang, tapi videonya TETAP masuk", async () => {
    const res = await kirim(
      JSON.stringify({
        id: "vid-501",
        embedUrl: "https://playly-dashboard.vercel.app/id/501/embed",
        thumbnailUrl: "javascript:alert(document.cookie)",
      }),
    );
    expect(res.status).toBe(200);

    const [v] = await getPlaylyWebhookVideos();
    expect(v.videoId).toBe("vid-501");
    expect(v.thumbnailUrl).toBeNull();
  });

  it("bentuk pipih dengan embedUrl domain asing: 400, tidak tersimpan", async () => {
    const res = await kirim(
      JSON.stringify({ id: "vid-502", embedUrl: "https://situs-penyerang.example.com/x" }),
    );
    expect(res.status).toBe(400);
    expect(await getPlaylyWebhookVideos()).toEqual([]);
  });
});

describe("POST /api/webhooks/playly — badan aneh tidak boleh merobohkan server", () => {
  it("badan KOSONG: 400 dengan JSON yang bisa dibaca, bukan halaman error", async () => {
    const res = await kirim("");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(typeof body.error).toBe("string");
  });

  it("badan berupa array / angka / null: 400, tidak tersimpan", async () => {
    for (const aneh of ["[1,2,3]", "42", "null", '"teks"']) {
      const res = await kirim(aneh);
      expect(res.status).toBe(400);
    }
    expect(await getPlaylyWebhookVideos()).toEqual([]);
  });

  it("badan JSON bersarang sangat dalam: tetap dijawab, tidak melempar", async () => {
    // Bukan uji beban — ini penjaga supaya bentuk tak terduga berakhir sebagai
    // balasan JSON, bukan pengecualian yang menyamar jadi 500.
    const dalam = "[".repeat(200) + "]".repeat(200);
    const res = await kirim(dalam);
    expect([400, 401]).toContain(res.status);
    expect(await getPlaylyWebhookVideos()).toEqual([]);
  });
});
