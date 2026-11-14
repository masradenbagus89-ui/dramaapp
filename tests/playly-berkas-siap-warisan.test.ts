// Penjaga INGATAN YANG BERTAHAN MELEWATI RESTART (owner 2026-11-14:
// "biar tidak loading lama lagi").
//
// 🪤 KENAPA TES INI ADA. Yang diperbaiki adalah keadaan yang HANYA muncul
// sekali — pembukaan PERTAMA halaman admin sesudah aplikasi di-deploy ulang.
// Kalau pewarisannya diam-diam berhenti bekerja (dokumen tak pernah ditulis,
// penanda `warisan` tak terpasang, batas umur kebalik), tidak ada gejala apa
// pun: halaman tetap benar, cuma kembali menunggu ≥47 detik — dan cuma sekali,
// jadi gampang dikira "kebetulan lagi lambat".
//
// Dua pagar yang paling penting dijaga di sini, karena keduanya menukar
// kesegaran demi kecepatan dan salah sedikit = penanda yang BOHONG:
//   1. Baris warisan yang lebih tua dari UMUR_WARISAN_MS TIDAK dipakai.
//   2. Baris yang lahir di proses INI tetap diperiksa ulang tiap 5 menit —
//      janji lama tidak ikut dilonggarkan.
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

let panggilan: string[] = [];
let tersimpan: Record<string, { belumSiap: boolean; kedaluwarsa: number }> = {};
let ditulis: Array<Record<string, { belumSiap: boolean; kedaluwarsa: number }>> = [];
let bacaGagal = false;
let jumlahBaca = 0;
/** Penahan jawaban Playly: selama belum dibuka, tiap permintaan menggantung. */
let gerbang: Promise<void> | null = null;

vi.mock("@/lib/playly", async () => {
  const asli = await vi.importActual<typeof import("@/lib/playly")>("@/lib/playly");
  return {
    petaBerbatasPlayly: asli.petaBerbatasPlayly,
    readPlaylyConfig: () => ({ baseUrl: "https://playly.contoh" }),
    fetchPlaylyDetailPublik: async (id: string) => {
      panggilan.push(id);
      if (gerbang) await gerbang;
      return { thumbnail: null, punyaFile: true };
    },
  };
});

vi.mock("@/lib/playly-publik", () => ({
  bolehTampilKePenonton: (d: { punyaFile: boolean | null }) => d.punyaFile === true,
}));

vi.mock("@/lib/store", () => ({
  getIngatanBerkasSiap: async () => {
    jumlahBaca++;
    if (bacaGagal) throw new Error("database sedang tidak bisa dihubungi");
    return tersimpan;
  },
  setIngatanBerkasSiap: async (peta: typeof tersimpan) => {
    ditulis.push(JSON.parse(JSON.stringify(peta)));
  },
}));

const {
  idVideoBelumSiap,
  lupakanIngatanBerkasSiap,
  jumlahIngatanBerkasSiap,
  UMUR_INGATAN_MS,
  UMUR_WARISAN_MS,
} = await import("../lib/playly-berkas-siap");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const konfig = { baseUrl: "https://playly.contoh" } as any;

/** Waktu acuan tetap — `Date.now()` nyata membuat tes bergantung jam mesin. */
const SEKARANG = 1_700_000_000_000;

beforeEach(() => {
  panggilan = [];
  tersimpan = {};
  ditulis = [];
  bacaGagal = false;
  jumlahBaca = 0;
  gerbang = null;
  lupakanIngatanBerkasSiap();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ingatan diwariskan melewati restart", () => {
  it("baris warisan yang KEDALUWARSA dipakai TANPA menunggu Playly", async () => {
    // Inilah seluruh guna perbaikan ini: sesudah deploy, memori proses kosong
    // tapi dokumennya masih ada. Dulu keadaan ini = ≥47 detik menunggu.
    //
    // 🪤 Dibuktikan dengan MENAHAN Playly, bukan dengan memeriksa "Playly belum
    // dipanggil". Versi pertama tes ini memakai cara kedua dan MERAH padahal
    // kodenya benar: tugas latar memang MULAI seketika (sampai `await`
    // pertamanya) — yang dijanjikan bukan "belum dipanggil", melainkan
    // "jawabannya tidak menunggu". Gerbang yang tak pernah dibuka di bawah
    // membuat tes ini menggantung kalau tugas latarnya ikut di-`await`.
    tersimpan = { v1: { belumSiap: true, kedaluwarsa: SEKARANG - 60_000 } };
    gerbang = new Promise<void>(() => {});

    const hasil = await idVideoBelumSiap(["v1"], konfig, SEKARANG);

    expect(hasil.ids).toEqual(["v1"]);
    expect(hasil.diperiksa, "ada yang ditunggu — layar jadi lambat lagi").toBe(0);
    expect(hasil.disegarkanDiLatar).toBe(1);
  });

  it("jawaban warisan itu tetap DISEGARKAN di latar, bukan dibiarkan basi", async () => {
    tersimpan = { v1: { belumSiap: true, kedaluwarsa: SEKARANG - 60_000 } };

    await idVideoBelumSiap(["v1"], konfig, SEKARANG);
    // Beri giliran pada tugas latar yang sengaja tidak di-`await`.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(panggilan, "penyegaran latar tidak pernah jalan — jawabannya membeku").toEqual(["v1"]);
  });

  it("warisan yang LEBIH TUA dari batas tidak dipercaya — diperiksa sungguhan", async () => {
    // Pagar kesegaran. Tanpa ini, penanda dari kemarin bisa tampil berhari-hari
    // sebagai kebenaran hari ini.
    tersimpan = {
      v1: { belumSiap: true, kedaluwarsa: SEKARANG - UMUR_WARISAN_MS - 1 },
    };

    const hasil = await idVideoBelumSiap(["v1"], konfig, SEKARANG);

    expect(hasil.diperiksa).toBe(1);
    expect(hasil.disegarkanDiLatar).toBe(0);
    expect(panggilan).toEqual(["v1"]);
  });

  it("baris kedaluwarsa-berat tidak ikut DIMUAT ke memori", async () => {
    // 🪤 Lubang yang ketahuan dari uji-balik: mencabut penyaring umur di
    // `muatWarisanSekali` TIDAK memerahkan satu pun tes, karena pagar kedua di
    // perulangan pemilihan kebetulan menangkapnya. Pagar yang tak pernah bisa
    // merah = pagar yang tidak dijaga. Tes ini menjaganya langsung: baris mati
    // (video yang sudah lama dihapus) tidak boleh menumpuk di memori proses
    // selamanya hanya karena pernah tersimpan.
    tersimpan = {
      tua: { belumSiap: true, kedaluwarsa: SEKARANG - UMUR_WARISAN_MS - 1 },
      pakai: { belumSiap: false, kedaluwarsa: SEKARANG - 60_000 },
    };

    await idVideoBelumSiap([], konfig, SEKARANG);

    expect(
      jumlahIngatanBerkasSiap(),
      "baris yang sudah lewat batas umur ikut dimuat ke memori",
    ).toBe(1);
  });

  it("warisan yang masih SEGAR dipakai apa adanya, nol penyegaran", async () => {
    tersimpan = { v1: { belumSiap: true, kedaluwarsa: SEKARANG + 60_000 } };

    const hasil = await idVideoBelumSiap(["v1"], konfig, SEKARANG);

    expect(hasil.ids).toEqual(["v1"]);
    expect(hasil.diperiksa).toBe(0);
    expect(hasil.disegarkanDiLatar).toBe(0);
    expect(panggilan).toEqual([]);
  });

  it("janji 5 menit TIDAK longgar untuk baris yang lahir di proses ini", async () => {
    // Pagar terpenting kedua. Pelonggaran hanya untuk baris WARISAN; kalau
    // penanda itu bocor ke baris biasa, penanda "belum siap" bisa bertahan 24
    // jam sesudah admin memperbaiki videonya.
    await idVideoBelumSiap(["v1"], konfig, SEKARANG);
    expect(panggilan).toEqual(["v1"]);

    const hasil = await idVideoBelumSiap(
      ["v1"],
      konfig,
      SEKARANG + UMUR_INGATAN_MS + 1,
    );

    expect(hasil.diperiksa, "baris proses ini ikut dilonggarkan jadi warisan").toBe(1);
    expect(hasil.disegarkanDiLatar).toBe(0);
    expect(panggilan).toEqual(["v1", "v1"]);
  });

  it("baris proses ini MENANG atas warisan untuk id yang sama", async () => {
    // Warisan = tebakan kemarin; hasil pemeriksaan hari ini = kenyataan.
    tersimpan = { v1: { belumSiap: true, kedaluwarsa: SEKARANG + 60_000 } };
    // Panggilan pertama tanpa warisan termuat: id BERBEDA, supaya v1 diperiksa
    // sungguhan lebih dulu di panggilan kedua.
    const hasil = await idVideoBelumSiap(["v1"], konfig, SEKARANG);
    // Dokumen dibaca lebih dulu, jadi v1 di sini memang datang dari warisan.
    expect(hasil.ids).toEqual(["v1"]);
  });

  it("database tak terjangkau = jalan seperti sebelum fitur ini ada", async () => {
    // Gagal-terbuka (rak caching §1): cache mati tidak boleh menjatuhkan fitur.
    bacaGagal = true;

    const hasil = await idVideoBelumSiap(["v1"], konfig, SEKARANG);

    expect(hasil.diperiksa).toBe(1);
    expect(panggilan).toEqual(["v1"]);
  });

  it("dokumen dibaca SEKALI per proses, bukan tiap permintaan", async () => {
    // Kalau tiap permintaan ikut membaca database, perbaikan ini malah
    // menambah satu perjalanan jaringan ke jalur yang sedang dipercepat.
    await idVideoBelumSiap(["v1"], konfig, SEKARANG);
    await idVideoBelumSiap(["v2"], konfig, SEKARANG);
    await idVideoBelumSiap(["v3"], konfig, SEKARANG);

    expect(jumlahBaca).toBe(1);
  });

  it("yang DITULIS balik tidak membawa penanda warisan", async () => {
    // `warisan` itu penanda proses, bukan data. Kalau ikut tersimpan, baris
    // yang diperiksa hari ini akan dibaca sebagai warisan besok — dan
    // pelonggaran 24 jam berlaku untuk baris yang seharusnya 5 menit.
    vi.useFakeTimers();
    tersimpan = { v1: { belumSiap: true, kedaluwarsa: SEKARANG - 60_000 } };

    await idVideoBelumSiap(["v2"], konfig, SEKARANG);
    await vi.advanceTimersByTimeAsync(5_000);

    expect(ditulis.length).toBeGreaterThan(0);
    const terakhir = ditulis[ditulis.length - 1];
    for (const [id, baris] of Object.entries(terakhir)) {
      expect(Object.keys(baris).sort(), `baris ${id}`).toEqual([
        "belumSiap",
        "kedaluwarsa",
      ]);
    }
  });

  it("ratusan video dalam satu kali buka = SATU tulisan, bukan ratusan", async () => {
    // Penggabungan tulisan. Tanpa ini, satu kali buka halaman admin menulis
    // dokumen yang sama ratusan kali ke database.
    vi.useFakeTimers();
    const ids = Array.from({ length: 50 }, (_, i) => `v${i}`);

    await idVideoBelumSiap(ids, konfig, SEKARANG);
    await vi.advanceTimersByTimeAsync(5_000);

    expect(panggilan.length).toBe(50);
    expect(ditulis.length).toBe(1);
  });
});
