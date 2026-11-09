// Penjaga pelengkap durasi kartu video (lib/durasi-video-publik.ts).
//
// Kerusakan yang dijaga SENYAP semua: durasi yang salah tidak melempar error —
// kartunya cuma memajang angka yang keliru, atau durasi berkas kita tertimpa
// angka IMDb tanpa ada yang tahu.
import { describe, it, expect } from "vitest";
import { detikTayangan, lengkapiDurasiVideo } from "../lib/durasi-video-publik";

describe("detikTayangan — Playly menang, IMDb jadi cadangan", () => {
  it("durasi Playly dipakai apa adanya", () => {
    // Itu panjang BERKAS kita sendiri — paling tepat, tak boleh ditimpa.
    expect(detikTayangan(5813, "91 min")).toBe(5813);
  });

  it("Playly kosong -> pakai runtime IMDb", () => {
    // Nilai nyata dari data produksi: "91 min" pada entri playly:imdb.
    expect(detikTayangan(null, "91 min")).toBe(91 * 60);
    expect(detikTayangan(undefined, "106 min")).toBe(106 * 60);
    expect(detikTayangan(0, "84 min")).toBe(84 * 60);
  });

  it("dua-duanya kosong -> null, bukan 0", () => {
    // 0 akan tergambar "0:00" di kartu — angka yang terlihat sah padahal
    // artinya "kami tidak tahu". Aturan yang sama dengan lencana poster.
    expect(detikTayangan(null, null)).toBeNull();
    expect(detikTayangan(null, "")).toBeNull();
    expect(detikTayangan(null, "N/A")).toBeNull();
    expect(detikTayangan(undefined, undefined)).toBeNull();
  });

  it("durasi Playly nol/negatif dianggap kosong", () => {
    // Playly mengirim null untuk 298 dari 489 video; nol & negatif ikut
    // diperlakukan sama supaya tidak ada "0:00" yang lolos ke kartu.
    expect(detikTayangan(0, "91 min")).toBe(5460);
    expect(detikTayangan(-5, "91 min")).toBe(5460);
  });
});

describe("lengkapiDurasiVideo — isi yang kosong, jangan timpa yang ada", () => {
  const video = (
    id: string,
    detik: number | null,
    label: string,
    year: string | null = null,
  ) => ({ id, durationSeconds: detik, durationLabel: label, year });

  it("video tanpa durasi dapat label dari runtime IMDb", () => {
    // Kasus nyata yang owner tunjuk: Americana (2025) — Playly kirim null,
    // IMDb punya runtime.
    const hasil = lengkapiDurasiVideo(
      [video("americana", null, "-")],
      { americana: { runtime: "91 min" } },
    );
    expect(hasil[0].durationSeconds).toBe(5460);
    expect(hasil[0].durationLabel).toBe("1:31:00");
  });

  it("durasi dari Playly TIDAK PERNAH ditimpa runtime IMDb", () => {
    // Pagar terpenting di berkas ini. Runtime IMDb adalah panjang FILMNYA,
    // bukan panjang berkas kita — menimpanya berarti kartu memajang angka
    // yang tidak cocok dengan apa yang benar-benar diputar penonton.
    const hasil = lengkapiDurasiVideo(
      [video("dragonheart", 5813, "1:36:53")],
      { dragonheart: { runtime: "91 min" } },
    );
    expect(hasil[0].durationSeconds).toBe(5813);
    expect(hasil[0].durationLabel).toBe("1:36:53");
  });

  it("tanpa data IMDb, videonya dibiarkan apa adanya", () => {
    // 33 video nyata begini: durasi kosong DAN belum dicocokkan ke IMDb.
    const hasil = lengkapiDurasiVideo([video("v1", null, "-")], {});
    expect(hasil[0].durationLabel).toBe("-");
    expect(hasil[0].durationSeconds).toBeNull();
  });

  it("IMDb tercocokkan tapi runtime-nya 'N/A' tetap dibiarkan", () => {
    const hasil = lengkapiDurasiVideo(
      [video("v1", null, "-")],
      { v1: { runtime: "N/A" } },
    );
    expect(hasil[0].durationLabel).toBe("-");
  });

  it("detik dan label SELALU diperbarui bersama", () => {
    // Dua bentuk dari satu data yang saling berbeda adalah bug paling sulit
    // dilihat: pemutar membaca detiknya, kartu membaca labelnya.
    const hasil = lengkapiDurasiVideo(
      [video("v1", null, "-")],
      { v1: { runtime: "120 min" } },
    );
    const { durationSeconds, durationLabel } = hasil[0];
    expect(durationSeconds).toBe(7200);
    expect(durationLabel).toBe("2:00:00");
  });

  it("daftar campuran: yang terisi utuh, yang kosong dilengkapi", () => {
    const hasil = lengkapiDurasiVideo(
      [video("ada", 3600, "1:00:00"), video("kosong", null, "-")],
      { ada: { runtime: "200 min" }, kosong: { runtime: "95 min" } },
    );
    expect(hasil[0].durationLabel).toBe("1:00:00");
    expect(hasil[1].durationLabel).toBe("1:35:00");
  });

  it("daftar kosong tidak melempar error", () => {
    expect(lengkapiDurasiVideo([], {})).toEqual([]);
  });
});

describe("isian manual MENANG atas semua sumber otomatis", () => {
  // Owner 2026-11-09: "kalau yang tidak ada gimana cara isi manualnya".
  // Ini satu-satunya jalan mengisi film yang TIDAK ADA di IMDb sama sekali,
  // jadi ia tidak boleh kalah oleh tebakan mana pun.
  const video = (
    id: string,
    detik: number | null,
    label: string,
    year: string | null = null,
  ) => ({ id, durationSeconds: detik, durationLabel: label, year });

  it("tahun manual menimpa tahun dari IMDb", () => {
    const hasil = lengkapiDurasiVideo(
      [video("v1", null, "-", "2019")],
      {},
      { v1: { tahun: "2024" } },
    );
    expect(hasil[0].year).toBe("2024");
  });

  it("durasi manual menimpa durasi dari PLAYLY — koreksi sadar admin", () => {
    // Pagar terpenting di sini. Durasi Playly normalnya menang atas IMDb,
    // TAPI kalau admin sampai mengetiknya sendiri berarti ia sedang
    // membetulkan angka yang salah — kalah di sini membuat koreksinya
    // terlihat "tidak tersimpan" padahal tersimpan.
    const hasil = lengkapiDurasiVideo(
      [video("v1", 3600, "1:00:00")],
      { v1: { runtime: "91 min" } },
      { v1: { durasiDetik: 145 } },
    );
    expect(hasil[0].durationSeconds).toBe(145);
    expect(hasil[0].durationLabel).toBe("2:25");
  });

  it("tanpa entri manual, urutan lama tetap berlaku", () => {
    // Playly menang atas IMDb — perilaku sebelum fitur manual ada.
    const hasil = lengkapiDurasiVideo(
      [video("v1", 3600, "1:00:00", "2020")],
      { v1: { runtime: "91 min" } },
      {},
    );
    expect(hasil[0].durationSeconds).toBe(3600);
    expect(hasil[0].year).toBe("2020");
  });

  it("manual boleh mengisi SALAH SATU saja", () => {
    // Panel admin mengirim field yang diubah saja. Mengisi tahun tidak boleh
    // ikut menghapus durasi yang sudah benar, dan sebaliknya.
    const hanyaTahun = lengkapiDurasiVideo(
      [video("v1", 3600, "1:00:00")],
      {},
      { v1: { tahun: "2024" } },
    );
    expect(hanyaTahun[0].year).toBe("2024");
    expect(hanyaTahun[0].durationSeconds).toBe(3600);

    const hanyaDurasi = lengkapiDurasiVideo(
      [video("v1", null, "-", "2020")],
      {},
      { v1: { durasiDetik: 300 } },
    );
    expect(hanyaDurasi[0].year).toBe("2020");
    expect(hanyaDurasi[0].durationLabel).toBe("5:00");
  });

  it("film yang TIDAK ADA di IMDb pun bisa lengkap", () => {
    // Kasus yang memicu fitur ini: nol data IMDb, nol durasi dari Playly.
    const hasil = lengkapiDurasiVideo(
      [video("lokal", null, "-", null)],
      {},
      { lokal: { tahun: "2024", durasiDetik: 5400 } },
    );
    expect(hasil[0].year).toBe("2024");
    expect(hasil[0].durationLabel).toBe("1:30:00");
  });
});
