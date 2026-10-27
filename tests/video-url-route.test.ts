// Penjaga permanen untuk /api/video-url (dipasang 2026-10-27).
//
// BUG YANG DIJAGA (terukur di produksi, bukan teori): pemutar dulu merakit
// sendiri alamat video di browser, sehingga alamat episode BERBAYAR tercetak
// ke HTML dan terbaca siapa pun dari View Source — lalu tunnel melayaninya
// (206, `video/mp4`, `ftypmp42`). Route ini menutupnya: alamat hanya lahir
// SESUDAH gerbang paywall dilewati.
//
// DUA hal dikunci di sini, dan keduanya pernah punya sejarah mahal di project ini:
//   1. episode yang ditolak TIDAK boleh membocorkan alamat apa pun di badan respons;
//   2. route ini WAJIB membalas JSON — bukan menyalurkan byte, bukan 307.
//      Menyalurkan byte = penyebab situs MATI TOTAL 2026-08-26 (29,71 GB dari
//      jatah 10 GB). 307 di sini = tiap Range request menyentuh server kita.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const state = {
  base: "https://contoh-tunnel.trycloudflare.com",
  akses: "boleh" as
    | "boleh"
    | "perlu-login"
    | "terkunci"
    | "tak-bisa-dipastikan",
};

vi.mock("@/lib/video-base", () => ({
  getVideoBaseUrl: async () => state.base,
}));

vi.mock("@/lib/paywall-guard", async () => {
  const asli = await vi.importActual<typeof import("../lib/paywall-guard")>(
    "../lib/paywall-guard",
  );
  return {
    // `balasanAksesDitolak` sengaja TIDAK ditiru — kalau kata-kata atau kode
    // statusnya berubah, tes ini ikut berubah, dan itu memang yang diinginkan.
    balasanAksesDitolak: asli.balasanAksesDitolak,
    periksaAksesEpisode: async () => state.akses,
  };
});

const { GET } = await import("../app/api/video-url/route");

function minta(query: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return GET(new Request(`http://localhost/api/video-url${query}`) as any);
}

let envAsli: string | undefined;
beforeEach(() => {
  envAsli = process.env.VIDEO_SIGNING_SECRET;
  state.base = "https://contoh-tunnel.trycloudflare.com";
  state.akses = "boleh";
});
afterEach(() => {
  if (envAsli === undefined) delete process.env.VIDEO_SIGNING_SECRET;
  else process.env.VIDEO_SIGNING_SECRET = envAsli;
});

describe("boleh menonton — alamat diterbitkan", () => {
  it("membalas JSON berisi alamat ke berkas di tunnel", async () => {
    delete process.env.VIDEO_SIGNING_SECRET;
    const res = await minta("?id=drama-uji&ep=3");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe(
      "https://contoh-tunnel.trycloudflare.com/drama-uji/3.mp4",
    );
  });

  it("resolusi ikut dipakai", async () => {
    delete process.env.VIDEO_SIGNING_SECRET;
    const body = await (await minta("?id=d&ep=1&res=720p")).json();
    expect(body.url).toBe("https://contoh-tunnel.trycloudflare.com/d/1.720p.mp4");
  });

  it("dengan rahasia terpasang -> alamat BERTANDA TANGAN", async () => {
    process.env.VIDEO_SIGNING_SECRET = "rahasia-uji";
    const body = await (await minta("?id=drama-uji&ep=40")).json();
    const u = new URL(body.url);
    expect(u.searchParams.get("signature")).toBeTruthy();
    expect(u.searchParams.get("expires")).toBeTruthy();
    expect(u.pathname).toBe("/drama-uji/40.mp4");
  });

  it("mode lokal (tanpa tunnel) -> alamat relatif, tidak ditandatangani", async () => {
    state.base = "";
    process.env.VIDEO_SIGNING_SECRET = "rahasia-uji";
    const body = await (await minta("?id=d&ep=2")).json();
    expect(body.url).toBe("/videos/d/2.mp4");
  });
});

describe("DITOLAK gerbang — nol alamat boleh bocor", () => {
  const kasus = [
    { akses: "perlu-login" as const, status: 401 },
    { akses: "terkunci" as const, status: 403 },
    { akses: "tak-bisa-dipastikan" as const, status: 503 },
  ];

  for (const k of kasus) {
    it(`${k.akses} -> ${k.status} dan badan respons TIDAK memuat alamat`, async () => {
      process.env.VIDEO_SIGNING_SECRET = "rahasia-uji";
      state.akses = k.akses;
      const res = await minta("?id=drama-uji&ep=40");
      expect(res.status).toBe(k.status);
      const teks = await res.text();
      expect(teks).not.toContain("trycloudflare");
      expect(teks).not.toContain(".mp4");
      expect(teks).not.toContain("signature");
    });
  }
});

describe("parameter ngawur ditolak sebelum menyentuh apa pun", () => {
  const buruk = [
    "?id=../rahasia&ep=1",
    "?id=drama&ep=0",
    "?id=drama&ep=1000",
    "?id=drama&ep=abc",
    "?id=&ep=1",
    "?id=drama&ep=1&res=;rm",
  ];
  for (const q of buruk) {
    it(`400 untuk ${q}`, async () => {
      const res = await minta(q);
      expect(res.status).toBe(400);
      expect(await res.text()).not.toContain(".mp4");
    });
  }
});

describe("PAGAR KUOTA — jangan pernah jadi proxy atau redirect", () => {
  // Kalau tes ini merah karena route diubah jadi redirect/proxy, yang salah
  // perubahannya. Lihat komentar kepala berkas route-nya.
  it("bukan redirect: status 200, nol header Location", async () => {
    const res = await minta("?id=d&ep=1");
    expect(res.status).toBe(200);
    expect(res.headers.get("Location")).toBeNull();
  });

  it("balasannya JSON kecil, bukan byte video", async () => {
    const res = await minta("?id=d&ep=1");
    expect(res.headers.get("Content-Type")).toContain("application/json");
    const teks = await res.text();
    expect(teks.length).toBeLessThan(1000);
    expect(teks.startsWith("{")).toBe(true);
  });
});

describe("cache WAJIB per-orang", () => {
  // Satu saja disimpan CDN = alamat milik penonton yang sudah bayar disajikan
  // ulang ke orang lain, dan pagarnya batal.
  it("private + no-store, dan tidak pernah public", async () => {
    const cc = (await minta("?id=d&ep=1")).headers.get("Cache-Control") ?? "";
    expect(cc).toContain("private");
    expect(cc).toContain("no-store");
    expect(cc).not.toContain("public");
  });

  it("tetap no-store saat DITOLAK", async () => {
    state.akses = "terkunci";
    const cc = (await minta("?id=d&ep=9")).headers.get("Cache-Control") ?? "";
    expect(cc).toContain("no-store");
  });
});
