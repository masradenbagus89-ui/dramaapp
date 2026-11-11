// Penjaga INGATAN "video mana yang berkasnya belum ada di Playly"
// (lib/playly-berkas-siap.ts) — owner 2026-11-11.
//
// 🪤 KENAPA TES INI ADA. Seluruh gunanya berkas itu adalah MENGHEMAT panggilan
// ke Playly: 489 video × 1 permintaan, 4 sekaligus, lantai ≥47 detik. Kalau
// ingatannya diam-diam berhenti bekerja — salah bandingkan waktu, kunci
// kedaluwarsa kebalik, atau dua permintaan saling menimpa — TIDAK ADA GEJALA
// APA PUN di layar: halaman tetap benar, tetap tampil, cuma kembali lambat dan
// Playly kembali dibanjiri. Persis kelas kerusakan yang tak pernah dilaporkan.
//
// Playly dipalsukan (vi.mock) — tes ini nol menyentuh jaringan.
import { describe, it, expect, beforeEach, vi } from "vitest";

/** Berapa kali tiap video ditanyakan ke Playly. Inilah angka yang dijaga. */
let panggilan: string[] = [];
/** Jawaban per video: true = berkasnya ada, false = tidak ada, null = tidak tahu. */
let punyaFilePer: Record<string, boolean | null> = {};
/** Gerbang penahan, supaya dua permintaan bisa dibuat benar-benar bersamaan.
 *  SATU promise bersama + SATU pembuka — bukan satu pembuka per panggilan,
 *  karena yang terakhir akan menimpa yang sebelumnya dan semuanya macet. */
let gerbang: Promise<void> | null = null;
let bukaGerbang: (() => void) | null = null;

vi.mock("@/lib/playly", async () => {
  const asli = await vi.importActual<typeof import("@/lib/playly")>("@/lib/playly");
  return {
    // petaBerbatasPlayly ASLI sengaja dipakai: pagar "maksimal 4 sekaligus"
    // ikut teruji, bukan dipalsukan jadi tak berbatas.
    petaBerbatasPlayly: asli.petaBerbatasPlayly,
    readPlaylyConfig: () => ({ baseUrl: "https://playly.contoh" }),
    fetchPlaylyDetailPublik: async (id: string) => {
      panggilan.push(id);
      if (gerbang) await gerbang;
      // `??` TIDAK dipakai: null adalah jawaban yang sah ("tidak tahu"), dan
      // `null ?? true` akan diam-diam mengubahnya jadi "berkasnya ada".
      return {
        thumbnail: null,
        punyaFile: id in punyaFilePer ? punyaFilePer[id] : true,
      };
    },
  };
});

vi.mock("@/lib/playly-publik", () => ({
  // "Boleh tampil" di sini disederhanakan jadi "berkasnya ada" — aturan
  // lengkapnya sudah punya tes sendiri di tests/playly-publik.test.ts.
  bolehTampilKePenonton: (d: { punyaFile: boolean | null }) => d.punyaFile === true,
}));

const {
  idVideoBelumSiap,
  lupakanIngatanBerkasSiap,
  jumlahIngatanBerkasSiap,
  UMUR_INGATAN_MS,
} = await import("../lib/playly-berkas-siap");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const konfig = { baseUrl: "https://playly.contoh" } as any;

beforeEach(() => {
  panggilan = [];
  punyaFilePer = {};
  gerbang = null;
  bukaGerbang = null;
  lupakanIngatanBerkasSiap();
});

describe("ingatan berkas Playly", () => {
  it("menjawab benar + mengingat hasilnya", async () => {
    punyaFilePer = { a: true, b: false, c: true };

    const h1 = await idVideoBelumSiap(["a", "b", "c"], konfig, 1_000);

    expect(h1.ids).toEqual(["b"]);
    expect(h1.diperiksa).toBe(3);
    expect(jumlahIngatanBerkasSiap()).toBe(3);
  });

  it("buka KEDUA kalinya nol menyentuh Playly — inti seluruh perbaikan", async () => {
    punyaFilePer = { a: true, b: false };
    await idVideoBelumSiap(["a", "b"], konfig, 1_000);
    panggilan = [];

    const h2 = await idVideoBelumSiap(["a", "b"], konfig, 1_000 + 60_000);

    expect(panggilan).toEqual([]); // <- kalau ini merah, penghematannya mati
    expect(h2.diperiksa).toBe(0);
    expect(h2.ids).toEqual(["b"]);
  });

  it("sesudah ingatan kedaluwarsa, diperiksa lagi", async () => {
    punyaFilePer = { a: false };
    await idVideoBelumSiap(["a"], konfig, 1_000);
    panggilan = [];

    // Tepat di batas umur dianggap SUDAH kedaluwarsa (kedaluwarsa <= sekarang).
    await idVideoBelumSiap(["a"], konfig, 1_000 + UMUR_INGATAN_MS);

    expect(panggilan).toEqual(["a"]);
  });

  it("hanya video yang BELUM diingat yang ditanyakan", async () => {
    punyaFilePer = { a: true, b: false, c: false };
    await idVideoBelumSiap(["a", "b"], konfig, 1_000);
    panggilan = [];

    const h = await idVideoBelumSiap(["a", "b", "c"], konfig, 2_000);

    expect(panggilan).toEqual(["c"]); // a & b dijawab dari ingatan
    expect(h.diperiksa).toBe(1);
    expect(h.ids).toEqual(["b", "c"]);
  });

  it("'tidak tahu' TIDAK disimpan — video rusak tak disembunyikan 5 menit", async () => {
    // punyaFile null = Playly tak terjawab / balasannya tak dikenali.
    // Menyimpannya sebagai "aman" adalah kerusakan senyap.
    punyaFilePer = { a: null };

    const h = await idVideoBelumSiap(["a"], konfig, 1_000);

    expect(h.ids).toEqual([]);
    expect(jumlahIngatanBerkasSiap()).toBe(0);

    panggilan = [];
    await idVideoBelumSiap(["a"], konfig, 1_500);
    expect(panggilan).toEqual(["a"]); // diperiksa ulang, bukan dipercaya
  });

  it("dua permintaan bersamaan TIDAK menembak Playly dua kali", async () => {
    // Justru ini yang paling mungkin terjadi: keluhan aslinya "lama", dan admin
    // yang tak sabar mengklik menunya lagi. Tanpa pengaman, 489 jadi 978.
    punyaFilePer = { a: false, b: true };
    gerbang = new Promise<void>((r) => {
      bukaGerbang = r;
    });

    const p1 = idVideoBelumSiap(["a", "b"], konfig, 1_000);
    const p2 = idVideoBelumSiap(["a", "b"], konfig, 1_000);
    // Beri kesempatan keduanya benar-benar masuk sebelum gerbang dibuka.
    await new Promise((r) => setTimeout(r, 10));
    bukaGerbang!();
    const [h1, h2] = await Promise.all([p1, p2]);

    expect(panggilan.filter((id) => id === "a")).toHaveLength(1);
    expect(panggilan.filter((id) => id === "b")).toHaveLength(1);
    expect(h1.ids).toEqual(["a"]);
    expect(h2.ids).toEqual(["a"]);
  });

  it("daftar kosong = nol panggilan, nol error", async () => {
    const h = await idVideoBelumSiap([], konfig, 1_000);
    expect(h.ids).toEqual([]);
    expect(h.diperiksa).toBe(0);
    expect(panggilan).toEqual([]);
  });
});
