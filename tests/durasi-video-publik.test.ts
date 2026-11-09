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
  const video = (id: string, detik: number | null, label: string) => ({
    id,
    durationSeconds: detik,
    durationLabel: label,
  });

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
