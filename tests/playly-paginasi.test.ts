// Penjaga permanen: DramaKu wajib mengambil SELURUH video Playly, bukan cuma
// halaman pertama.
//
// Kenapa tes ini ada (bug nyata, 2026-09-14): Playly memotong daftar video per
// halaman dan memberi tahu lewat `hasMore`. Kode lama memanggil alamatnya polos
// dan tidak pernah meminta halaman berikutnya — jadi dari 42 video milik akun
// mitra, hanya 20 yang pernah sampai ke DramaKu.
//
// Yang membuatnya mahal untuk ditemukan: daftar Playly urut TERLAMA DULU, jadi
// yang tidak terambil justru video yang BARU diunggah. Owner melaporkannya
// sebagai "9 video baru hilang", padahal video itu tidak pernah sekali pun
// terlihat — dan tidak ada error, log merah, atau halaman rusak yang muncul.
// Kerusakan sepenuhnya SENYAP.
//
// Kalau suatu saat paginasi ini hilang lagi (mis. seseorang menyederhanakan
// fetch-nya jadi satu panggilan), tes di bawah langsung MERAH.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Kunci Playly TIDAK diambil dari database di tes ini — store dipalsukan supaya
// tes tidak menyentuh Supabase maupun berkas apa pun. Dengan record null,
// getPlaylyKeyCached() jatuh ke process.env, yang kita atur per-tes di bawah.
vi.mock("@/lib/store", () => ({
  getPlaylyKeyRecord: async () => null,
  getPlaylyKeyRecordCached: async () => null,
  setPlaylyKeyRecord: async () => {},
  clearPlaylyKeyRecord: async () => {},
}));

const { fetchPlaylyVideosKita, readPlaylyConfig } = await import("../lib/playly");

/** Config dari env KOSONG — hasilnya sama di laptop siapa pun dan di CI. */
const CONFIG = readPlaylyConfig({});
const KUNCI_TES = "plyk_kunci_untuk_tes_1234";

/** Satu video berbentuk seperti yang benar-benar dikirim Playly. */
function videoPalsu(nomor: number, creator = "coklat") {
  const id = String(1789000000000 + nomor);
  return {
    id,
    title: `Video ke-${nomor}`,
    creator,
    // Bentuk relatif — persis yang dipakai Playly (terverifikasi 2026-09-14).
    embedUrl: `/id/${id}/embed`,
    duration: "2:20",
  };
}

/**
 * Playly palsu yang MEMOTONG daftar per halaman, seperti aslinya.
 *
 * `batasServer` meniru hal penting: Playly memaksakan batasnya sendiri. Katalog
 * publik mereka mematok 100 walau kita meminta 500. Jadi kode kita tidak boleh
 * memajukan offset sebanyak yang DIMINTA — harus sebanyak yang benar-benar
 * DIKIRIM. Kalau keliru, ada video yang terlompati diam-diam.
 */
function pasangPlaylyPalsu(
  semua: ReturnType<typeof videoPalsu>[],
  opsi: { batasServer?: number; hasMorePalsu?: boolean; tanpaHasMore?: boolean } = {},
) {
  const { batasServer = 20, hasMorePalsu = false, tanpaHasMore = false } = opsi;
  const diminta: string[] = [];

  vi.stubGlobal("fetch", async (url: string | URL) => {
    const alamat = String(url);
    diminta.push(alamat);
    const u = new URL(alamat);
    const offset = Number(u.searchParams.get("offset") ?? 0);
    const limitDiminta = Number(u.searchParams.get("limit") ?? batasServer);
    const dikirim = semua.slice(offset, offset + Math.min(limitDiminta, batasServer));

    const badan: Record<string, unknown> = {
      ok: true,
      count: dikirim.length,
      total: semua.length,
      offset,
      videos: dikirim,
    };
    if (!tanpaHasMore) {
      badan.hasMore = hasMorePalsu ? true : offset + dikirim.length < semua.length;
    }

    return new Response(JSON.stringify(badan), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  return diminta;
}

/** Nyalakan jalur MITRA (kunci ada) atau jalur KATALOG PUBLIK (kunci tidak ada). */
function pakaiKunci(ada: boolean) {
  if (ada) {
    process.env.PLAYLY_API_KEY = KUNCI_TES;
  } else {
    delete process.env.PLAYLY_API_KEY;
    delete process.env.DASHBOARD_API_KEY;
  }
}

const envAsli = { ...process.env };

beforeEach(() => {
  delete process.env.PLAYLY_API_KEY;
  delete process.env.DASHBOARD_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...envAsli };
});

describe("jalur MITRA — seluruh video akun kita wajib terambil", () => {
  it("mengikuti hasMore sampai habis: 42 video dari 3 halaman, bukan 20", async () => {
    // Angka ini bukan karangan: inilah keadaan nyata akun `coklat` pada
    // 2026-09-14 — total 42, Playly melayani 20 per panggilan.
    const semua = Array.from({ length: 42 }, (_, i) => videoPalsu(i + 1));
    const diminta = pasangPlaylyPalsu(semua, { batasServer: 20 });
    pakaiKunci(true);

    const hasil = await fetchPlaylyVideosKita(CONFIG);

    expect(hasil.error).toBeNull();
    expect(hasil.source).toBe("mitra");
    // INTI PENJAGANYA: yang terkumpul harus sebanyak yang Playly akui punya.
    // Kalau paginasi dihapus, angka ini turun jadi 20 dan tes merah.
    expect(hasil.videos).toHaveLength(42);
    expect(diminta).toHaveLength(3);
  });

  it("video yang PALING BARU (ada di halaman terakhir) ikut terambil", async () => {
    // Ini keluhan owner yang sebenarnya. Daftar Playly urut terlama dulu, jadi
    // video baru selalu duduk di halaman paling belakang.
    const semua = Array.from({ length: 42 }, (_, i) => videoPalsu(i + 1));
    pasangPlaylyPalsu(semua, { batasServer: 20 });
    pakaiKunci(true);

    const hasil = await fetchPlaylyVideosKita(CONFIG);
    const idTerbaru = semua[semua.length - 1].id;

    expect(hasil.videos.map((v) => v.id)).toContain(idTerbaru);
  });

  it("meminta limit, dan memajukan offset sesuai halaman", async () => {
    const semua = Array.from({ length: 42 }, (_, i) => videoPalsu(i + 1));
    const diminta = pasangPlaylyPalsu(semua, { batasServer: 20 });
    pakaiKunci(true);

    await fetchPlaylyVideosKita(CONFIG);

    const offsets = diminta.map((u) => new URL(u).searchParams.get("offset"));
    expect(offsets).toEqual([null, "20", "40"]);
    // limit ikut dikirim di semua panggilan — tanpa ini Playly memakai jatah
    // kecilnya sendiri dan jumlah panggilan membengkak.
    expect(diminta.every((u) => new URL(u).searchParams.get("limit") === "100")).toBe(true);
  });

  it("offset maju sebanyak yang DIKIRIM, bukan sebanyak yang diminta", async () => {
    // Playly mematok batasnya sendiri (katalog publik: minta 500, dilayani 100).
    // Kalau offset maju 100 padahal cuma 40 yang dikirim, 60 video terlompati
    // diam-diam — persis kelas bug yang sedang dijaga tes ini.
    const semua = Array.from({ length: 95 }, (_, i) => videoPalsu(i + 1));
    const diminta = pasangPlaylyPalsu(semua, { batasServer: 40 });
    pakaiKunci(true);

    const hasil = await fetchPlaylyVideosKita(CONFIG);

    expect(hasil.videos).toHaveLength(95);
    expect(diminta.map((u) => new URL(u).searchParams.get("offset"))).toEqual([
      null,
      "40",
      "80",
    ]);
  });
});

describe("jalur KATALOG PUBLIK — paginasi juga wajib jalan di sini", () => {
  it("menelusuri semua halaman katalog, lalu menyaring video milik kita saja", async () => {
    // Katalog publik berisi video SEMUA kreator (nyatanya 291 video, milik kita
    // cuma sebagian). Kalau hanya halaman pertama yang diambil, video kita yang
    // duduk di halaman belakang ikut hilang.
    const semua = [
      ...Array.from({ length: 30 }, (_, i) => videoPalsu(i + 1, "bombom")),
      ...Array.from({ length: 12 }, (_, i) => videoPalsu(i + 100, "coklat")),
      ...Array.from({ length: 30 }, (_, i) => videoPalsu(i + 200, "viozahra")),
    ];
    const diminta = pasangPlaylyPalsu(semua, { batasServer: 20 });
    pakaiKunci(false); // tanpa kunci -> turun ke katalog publik

    const hasil = await fetchPlaylyVideosKita(CONFIG);

    expect(hasil.source).toBe("katalog-publik");
    expect(diminta.length).toBeGreaterThan(1); // benar-benar berpindah halaman
    // 12 video milik `coklat` harus terkumpul semua, walau tersebar di
    // halaman 2 dan 3 di antara video kreator lain.
    expect(hasil.videos).toHaveLength(12);
    expect(hasil.videos.every((v) => v.creator === "coklat")).toBe(true);
  });

  it("penyaring kreator TIDAK ikut longgar — video kreator lain tetap dibuang", async () => {
    // Menarik lebih banyak halaman tidak boleh diam-diam berubah jadi
    // "tampilkan punya semua orang" di situs kita.
    const semua = Array.from({ length: 50 }, (_, i) => videoPalsu(i + 1, "bombom"));
    pasangPlaylyPalsu(semua, { batasServer: 20 });
    pakaiKunci(false);

    const hasil = await fetchPlaylyVideosKita(CONFIG);
    expect(hasil.videos).toEqual([]);
  });
});

describe("pengaman paginasi", () => {
  it("balasan TANPA hasMore berhenti di halaman pertama (Playly versi lain tetap jalan)", async () => {
    const semua = Array.from({ length: 42 }, (_, i) => videoPalsu(i + 1));
    const diminta = pasangPlaylyPalsu(semua, { batasServer: 20, tanpaHasMore: true });
    pakaiKunci(true);

    const hasil = await fetchPlaylyVideosKita(CONFIG);

    expect(diminta).toHaveLength(1);
    expect(hasil.videos).toHaveLength(20);
  });

  it("hasMore keliru true padahal video sudah habis: berhenti begitu halaman kosong", async () => {
    // Pengaman pertama: halaman yang tidak memajukan apa pun tapi mengaku masih
    // ada lagi = balasan tak masuk akal. Berhenti, jangan berputar di tempat.
    const semua = Array.from({ length: 42 }, (_, i) => videoPalsu(i + 1));
    const diminta = pasangPlaylyPalsu(semua, { batasServer: 20, hasMorePalsu: true });
    pakaiKunci(true);

    const hasil = await fetchPlaylyVideosKita(CONFIG);

    // 20 + 20 + 2 + (halaman kosong -> berhenti) = 4 panggilan, bukan tak hingga.
    expect(diminta).toHaveLength(4);
    expect(hasil.videos).toHaveLength(42);
    expect(hasil.error).toBeNull();
  });

  it("Playly yang TAK PERNAH habis dihentikan di batas 10 halaman", async () => {
    // Pengaman kedua: kalau tiap halaman terus memberi video baru sambil bilang
    // masih ada lagi, tanpa batas ini server kita berputar tanpa henti dan
    // halaman penonton menggantung. Batasnya PLAYLY_MAKS_HALAMAN = 10.
    const diminta: string[] = [];
    vi.stubGlobal("fetch", async (url: string | URL) => {
      diminta.push(String(url));
      const offset = Number(new URL(String(url)).searchParams.get("offset") ?? 0);
      return new Response(
        JSON.stringify({
          ok: true,
          count: 20,
          total: 999999,
          offset,
          hasMore: true, // selamanya
          videos: Array.from({ length: 20 }, (_, i) => videoPalsu(offset + i + 1)),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    pakaiKunci(true);

    const hasil = await fetchPlaylyVideosKita(CONFIG);

    expect(diminta).toHaveLength(10);
    expect(hasil.videos).toHaveLength(200); // 10 halaman x 20
    expect(hasil.error).toBeNull();
  });

  it("video yang sama muncul di dua halaman TIDAK digandakan", async () => {
    const semua = Array.from({ length: 10 }, (_, i) => videoPalsu(i + 1));
    const diminta: string[] = [];
    // Playly palsu yang "macet": tiap halaman mengirim 5 video yang SAMA,
    // sambil terus bilang masih ada lagi.
    vi.stubGlobal("fetch", async (url: string | URL) => {
      diminta.push(String(url));
      return new Response(
        JSON.stringify({
          ok: true,
          count: 5,
          total: 10,
          offset: 0,
          hasMore: true,
          videos: semua.slice(0, 5),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    pakaiKunci(true);

    const hasil = await fetchPlaylyVideosKita(CONFIG);

    // 10 halaman x 5 video yang sama = tetap 5 baris, bukan 50.
    expect(hasil.videos).toHaveLength(5);
  });
});
