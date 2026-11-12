// Penjaga jalur ISI MASSAL (/api/admin/playly/massal) — owner 2026-11-11:
// "bisa kamu buatkan agar saya bisa mengisinya sekali jalan".
//
// Endpoint ini MENULIS ke katalog produksi, dan keenam nilainya tergambar di
// kartu video yang dilihat penonton. Kerusakannya senyap: nilai ngawur tidak
// melempar error — ia cuma tayang.
//
// ⚠️ BEDA DARI tests/admin-playly-meta-route.test.ts: di sini lib/store TIDAK
// dipalsukan. Yang dipalsukan cuma lapisan paling bawah (Supabase) + sesi
// admin, sehingga rantai nyatanya ikut teruji: route -> bacaKirimanMassal ->
// simpanIsianMassalPlayly -> dokumen mana yang benar-benar ditulis. Itulah
// bagian yang paling mungkin salah dan paling tak kelihatan — nama dokumen
// yang tertukar tidak memunculkan error apa pun, cuma nilai yang mendarat di
// kolom yang salah.
import { describe, it, expect, beforeEach, vi } from "vitest";

/** Dokumen app_data palsu: key -> value. */
let dokumen: Record<string, unknown> = {};
/** Urutan key yang DITULIS — dipakai membuktikan dokumen tak berubah tak ditulis. */
let tulisan: string[] = [];
/** Dinyalakan tes tertentu untuk meniru kegagalan penyimpanan. */
let gagalTulis = false;

vi.mock("@/lib/session", () => ({
  isAdminRequest: async () => true,
  getAdminEmail: async () => (adminLogin ? "admin@contoh.test" : null),
}));

let adminLogin = true;

vi.mock("@/lib/request-guard", () => ({
  guardMutation: () => null,
  guardFitur: () => null,
}));

vi.mock("@/lib/supabase", () => ({
  useSupabase: true,
  eq: (v: string) => `eq.${encodeURIComponent(v)}`,
  sbSelect: async (path: string) => {
    const m = path.match(/key=eq\.([^&]+)/);
    const key = m ? decodeURIComponent(m[1]) : "";
    return key in dokumen ? [{ value: dokumen[key] }] : [];
  },
  sbUpsert: async (_tabel: string, row: { key: string; value: unknown }) => {
    if (gagalTulis) throw new Error("Supabase menolak tulisan.");
    tulisan.push(row.key);
    dokumen[row.key] = row.value;
  },
  sbDelete: async () => {},
  sbRpc: async () => null,
}));

const { POST } = await import("../app/api/admin/playly/massal/route");

function kirim(body: unknown) {
  return POST(
    new Request("http://localhost/api/admin/playly/massal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  );
}

beforeEach(() => {
  dokumen = {};
  tulisan = [];
  gagalTulis = false;
  adminLogin = true;
});

describe("POST /api/admin/playly/massal", () => {
  it("menyimpan banyak video dalam SATU permintaan", async () => {
    const res = await kirim({
      perubahan: [
        { videoId: "v1", kualitas: "HD", rating: "7.4" },
        { videoId: "v2", kualitas: "HD", rating: "6,1" },
        { videoId: "v3", jenis: "series", tahun: "2024", durasi: "1:47:00" },
      ],
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tersimpan).toBe(3);

    expect(dokumen["playly:kualitas"]).toEqual({ v1: "HD", v2: "HD" });
    expect(dokumen["playly:rating"]).toEqual({ v1: "7.4", v2: "6.1" });
    expect(dokumen["playly:jenis"]).toEqual({ v3: "series" });
    expect(dokumen["playly:meta-manual"]).toEqual({
      v3: { tahun: "2024", durasiDetik: 6420 },
    });
  });

  it("hanya menulis dokumen yang ISINYA berubah", async () => {
    // 🪤 Menulis ulang dokumen yang tidak berubah memperlebar jendela bentrok
    // dengan penulis lain (webhook, admin lain) tanpa menghasilkan apa pun.
    await kirim({ perubahan: [{ videoId: "v1", rating: "7.4" }] });
    expect(tulisan).toEqual(["playly:rating"]);
    expect(tulisan).not.toContain("playly:jenis");
    expect(tulisan).not.toContain("playly:genre");
  });

  it("kategori mendarat di dokumen playly:genre, bukan dokumen lain", async () => {
    // Nama kiriman ("kategori") berbeda dari nama dokumennya ("genre") sejak
    // awal. Tertukar = nilai mendarat di kolom yang salah, nol error.
    await kirim({ perubahan: [{ videoId: "v1", kategori: "Action" }] });
    expect(dokumen["playly:genre"]).toEqual({ v1: "Action" });
  });

  it("nilai ngawur DILAPORKAN, dan nilai lama TIDAK terhapus", async () => {
    // 🪤 Pagar terpenting berkas ini. Di jalur satuan, nilai tak terbaca berarti
    // "kosongkan" — aman karena orangnya sedang memandangi kotak itu. Di sini
    // 40 baris dikirim sekaligus; menghapus diam-diam berarti rating yang sudah
    // benar lenyap tanpa ada yang tahu.
    dokumen["playly:rating"] = { v1: "8.8" };

    const res = await kirim({ perubahan: [{ videoId: "v1", rating: "abc" }] });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.tersimpan).toBe(0);
    expect(data.ditolak).toHaveLength(1);
    expect(data.ditolak[0]).toMatchObject({ videoId: "v1", kolom: "rating" });
    // Nilai lama utuh — dan dokumennya tidak ditulis ulang sama sekali.
    expect(dokumen["playly:rating"]).toEqual({ v1: "8.8" });
    expect(tulisan).toEqual([]);
  });

  it("kolom yang TIDAK dikirim tidak tersentuh", async () => {
    dokumen["playly:meta-manual"] = { v1: { tahun: "2020", durasiDetik: 3600 } };

    await kirim({ perubahan: [{ videoId: "v1", durasi: "1:47:00" }] });

    expect(dokumen["playly:meta-manual"]).toEqual({
      v1: { tahun: "2020", durasiDetik: 6420 },
    });
  });

  it("kotak yang dikosongkan mengembalikan video ke sumber otomatis", async () => {
    dokumen["playly:kualitas"] = { v1: "CAM" };
    await kirim({ perubahan: [{ videoId: "v1", kualitas: "" }] });
    expect(dokumen["playly:kualitas"]).toEqual({});
  });

  it("balasan memuat peta TERBARU supaya layar tak perlu memanggil GET lagi", async () => {
    dokumen["playly:rating"] = { lama: "5.0" };
    const res = await kirim({ perubahan: [{ videoId: "v1", rating: "7.4" }] });
    const data = await res.json();
    expect(data.peta.rating).toEqual({ lama: "5.0", v1: "7.4" });
    // Kelima peta selalu ikut, bukan cuma yang berubah — layar memakai apa
    // adanya, jadi peta yang hilang akan terbaca sebagai "semuanya terhapus".
    expect(Object.keys(data.peta).sort()).toEqual([
      "jenis",
      "kategori",
      "kualitas",
      "meta",
      "rating",
    ]);
  });

  it("bukan admin -> 401 dan NOL tulisan", async () => {
    adminLogin = false;
    const res = await kirim({ perubahan: [{ videoId: "v1", rating: "7.4" }] });
    expect(res.status).toBe(401);
    expect(tulisan).toEqual([]);
  });

  it("daftar perubahan tidak dikirim -> 400", async () => {
    const res = await kirim({ bukanPerubahan: [] });
    expect(res.status).toBe(400);
  });

  it("kiriman kelewat banyak DITOLAK, bukan dipotong diam-diam", async () => {
    // Memotong diam-diam membuat admin mengira semuanya tersimpan padahal
    // sebagian tertinggal.
    const banyak = Array.from({ length: 1001 }, (_, i) => ({
      videoId: `v${i}`,
      rating: "7.0",
    }));
    const res = await kirim({ perubahan: banyak });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/maksimal/i);
    expect(tulisan).toEqual([]);
  });

  it("daftar kosong -> 400, tidak menulis apa pun", async () => {
    const res = await kirim({ perubahan: [] });
    expect(res.status).toBe(400);
    expect(tulisan).toEqual([]);
  });

  it("penyimpanan gagal -> 500, pesan internal tidak membocorkan apa-apa yang rahasia", async () => {
    gagalTulis = true;
    const res = await kirim({ perubahan: [{ videoId: "v1", rating: "7.4" }] });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.ok).toBeUndefined();
    expect(JSON.stringify(data)).not.toMatch(/admin@contoh\.test/);
  });
});
