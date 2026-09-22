// Penjaga permanen: panggilan ke katalog Playly (/api/catalog) WAJIB membawa
// kunci API.
//
// Kenapa tes ini ada: sampai 2026-09-21 katalog Playly terbuka tanpa kunci, dan
// kode kita memanggilnya polos — cuma header Accept. Sejak 2026-09-22 Playly
// mewajibkan kunci (kunci yang SAMA dengan /api/videos, tidak ada kunci kedua);
// tanpa kunci balasannya 401 {"ok":false,"error":"missing_key"} — diverifikasi
// langsung ke server mereka hari itu.
//
// Yang membuatnya layak dikunci tes: kegagalannya SENYAP di halaman penonton.
// fetchPlaylyVideosKita() sengaja tidak pernah melempar (gagal-aman), jadi
// katalog yang ditolak cuma berubah jadi daftar KOSONG — tidak ada error merah,
// tidak ada halaman rusak, tidak ada yang melapor. Kalau suatu saat header
// kuncinya hilang lagi, tes di bawah yang berteriak, bukan penonton.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Store dipalsukan supaya tes tidak menyentuh Supabase. Dengan record null,
// kunci dibaca dari process.env yang kita atur per-tes.
vi.mock("@/lib/store", () => ({
  getPlaylyKeyRecord: async () => null,
  getPlaylyKeyRecordCached: async () => null,
  setPlaylyKeyRecord: async () => {},
  clearPlaylyKeyRecord: async () => {},
}));

const { fetchPlaylyVideosKita, fetchPlaylyVideos, readPlaylyConfig, PLAYLY_KEY_HEADER } =
  await import("../lib/playly");

const CONFIG = readPlaylyConfig({});
const KUNCI_TES = "plyk_kunci_untuk_tes_1234";

/** Satu panggilan yang tercatat: ke mana, dan header apa yang ikut. */
type Panggilan = { url: string; headers: Record<string, string> };

/**
 * Playly palsu. `mitra` menentukan bagaimana /api/videos menjawab, supaya kita
 * bisa menguji jalur katalog baik saat kunci ditolak maupun saat belum dipasang.
 */
function pasangPlaylyPalsu(opsi: { mitra: "401" | "ok" } = { mitra: "401" }) {
  const dicatat: Panggilan[] = [];

  vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) => {
    const alamat = String(url);
    dicatat.push({ url: alamat, headers: { ...((init?.headers as Record<string, string>) ?? {}) } });

    const badan401 = JSON.stringify({ ok: false, error: "missing_key" });
    if (alamat.includes("/api/videos") && opsi.mitra === "401") {
      return new Response(badan401, { status: 401 });
    }

    // Katalog: hanya melayani yang membawa kunci — persis seperti Playly asli.
    if (alamat.includes("/api/catalog")) {
      const headers = dicatat[dicatat.length - 1].headers;
      if (!headers[PLAYLY_KEY_HEADER]) return new Response(badan401, { status: 401 });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        count: 1,
        total: 1,
        offset: 0,
        hasMore: false,
        videos: [
          {
            id: "1789825631099",
            title: "A Semente do Mal",
            creator: "coklat",
            embedUrl: "/id/1789825631099/embed",
            duration: "91:58",
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  return dicatat;
}

const panggilanKatalog = (dicatat: Panggilan[]) =>
  dicatat.filter((p) => p.url.includes("/api/catalog"));

const envAsli = { ...process.env };

beforeEach(() => {
  delete process.env.PLAYLY_API_KEY;
  delete process.env.DASHBOARD_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...envAsli };
});

describe("katalog Playly wajib membawa kunci (berlaku 2026-09-22)", () => {
  it("halaman penonton: kunci ikut dikirim ke katalog, videonya tetap tampil", async () => {
    process.env.PLAYLY_API_KEY = KUNCI_TES;
    const dicatat = pasangPlaylyPalsu({ mitra: "401" });

    const hasil = await fetchPlaylyVideosKita(CONFIG, 0);

    const katalog = panggilanKatalog(dicatat);
    expect(katalog).toHaveLength(1);
    // INTI PENJAGANYA. Tanpa baris ini, kode yang memanggil katalog polos lolos
    // tes — lalu diam-diam mengosongkan halaman penonton di produksi.
    expect(katalog[0].headers[PLAYLY_KEY_HEADER]).toBe(KUNCI_TES);
    expect(hasil.source).toBe("katalog-publik");
    expect(hasil.error).toBeNull();
    expect(hasil.videos).toHaveLength(1);
  });

  it("halaman admin: kunci ikut dikirim ke katalog saat /api/videos menolak", async () => {
    process.env.PLAYLY_API_KEY = KUNCI_TES;
    const dicatat = pasangPlaylyPalsu({ mitra: "401" });

    const hasil = await fetchPlaylyVideos(CONFIG);

    const katalog = panggilanKatalog(dicatat);
    expect(katalog).toHaveLength(1);
    expect(katalog[0].headers[PLAYLY_KEY_HEADER]).toBe(KUNCI_TES);
    expect(hasil.source).toBe("katalog-publik");
    expect(hasil.videos).toHaveLength(1);
  });

  it("kunci TIDAK PERNAH bocor ke query string — hanya lewat header", async () => {
    // Playly juga melayani ?key=<kunci>, dan itulah jebakannya: query ikut
    // tercetak di log server, log proxy, dan Referer. Header tidak.
    process.env.PLAYLY_API_KEY = KUNCI_TES;
    const dicatat = pasangPlaylyPalsu({ mitra: "401" });

    await fetchPlaylyVideosKita(CONFIG, 0);

    for (const p of dicatat) {
      expect(p.url).not.toContain(KUNCI_TES);
      expect(p.url).not.toContain("key=");
    }
  });

  it("kunci belum dipasang: tetap dicoba, gagal-aman, dan pesannya menyebut apa yang harus dilakukan", async () => {
    // Playly menawarkan membuka akses sementara selama masa penyesuaian, jadi
    // mencoba tanpa kunci masih masuk akal. Yang tidak boleh: halaman rusak.
    const dicatat = pasangPlaylyPalsu({ mitra: "401" });

    const hasil = await fetchPlaylyVideosKita(CONFIG, 0);

    const katalog = panggilanKatalog(dicatat);
    expect(katalog).toHaveLength(1);
    expect(katalog[0].headers[PLAYLY_KEY_HEADER]).toBeUndefined();
    expect(hasil.videos).toHaveLength(0);
    // Pesan untuk admin harus bisa DITINDAKLANJUTI, bukan sekadar "HTTP 401".
    expect(hasil.error).toContain("kunci");
    expect(hasil.error).toContain("Setelan");
  });

  it("jalur mitra tetap didahulukan saat kunci diterima — katalog tidak ikut dipanggil", async () => {
    // Pagar anti-regresi ke arah sebaliknya: perubahan ini tidak boleh membuat
    // situs menarik video kreator LAIN padahal /api/videos sudah cukup.
    process.env.PLAYLY_API_KEY = KUNCI_TES;
    const dicatat = pasangPlaylyPalsu({ mitra: "ok" });

    const hasil = await fetchPlaylyVideosKita(CONFIG, 0);

    expect(hasil.source).toBe("mitra");
    expect(panggilanKatalog(dicatat)).toHaveLength(0);
  });
});
