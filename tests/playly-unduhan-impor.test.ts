// Penjaga IMPOR MASSAL link unduhan (lib/playly-unduhan-impor.ts).
//
// Yang rusak SECARA SENYAP kalau longgar:
//   1. Link menempel ke video yang SALAH (judul ganda ditebak salah satunya).
//   2. Satu baris rusak menghentikan seluruh impor — owner mengira semuanya
//      masuk padahal berhenti di tengah.
//   3. --dry-run diam-diam menulis.
//   4. CSV dari Excel (BOM, kutip, koma di dalam sel) terbaca bergeser kolom.
import { describe, it, expect, vi } from "vitest";
import {
  bacaBerkasImpor,
  cocokkanVideo,
  formatLaporan,
  jalankanImpor,
  pecahCsv,
  type VideoTerdaftar,
} from "../lib/playly-unduhan-impor";
import { terapkanLinkUnduhan, type LinkUnduhan, type LinkUnduhanMasuk } from "../lib/playly-unduhan";
import { bacaDomainUnduhan } from "../lib/playly-unduhan-domain";

const DOMAIN = bacaDomainUnduhan({});
const VIDEOS: VideoTerdaftar[] = [
  { id: "vid-1", title: "Cinta di Ujung Senja" },
  { id: "vid-2", title: "Rahasia Keluarga" },
  { id: "vid-3", title: "Rahasia Keluarga" },
];
const GDRIVE = "https://drive.google.com/file/d/abc/view";

describe("pecahCsv — CSV dari Excel/Sheets", () => {
  it("sel bertanda kutip boleh memuat koma, kutip ganda, dan baris baru", () => {
    const hasil = pecahCsv('a,b\n"x, y","kata ""kutip""\nlanjut"\n');
    expect(hasil).toEqual([
      { sel: ["a", "b"], nomor: 1 },
      { sel: ["x, y", 'kata "kutip"\nlanjut'], nomor: 2 },
    ]);
  });

  it("CRLF & baris kosong dilewati, nomor baris tetap sesuai berkas", () => {
    expect(pecahCsv("a\r\n\r\nb\r\n").map((b) => b.nomor)).toEqual([1, 3]);
  });
});

describe("bacaBerkasImpor", () => {
  it("CSV: BOM dibuang, kolom dikenali tanpa peduli huruf besar & urutan", () => {
    const baris = bacaBerkasImpor(`﻿URL,Kualitas,Provider,Video\n${GDRIVE},1080p,google,vid-1\n`, "csv");
    expect(baris).toEqual([{ nomor: 2, video: "vid-1", provider: "google", quality: "1080p", url: GDRIVE }]);
  });

  it("CSV tanpa kolom wajib = berkas salah (melempar), bukan laporan penuh penolakan", () => {
    expect(() => bacaBerkasImpor("video,url\nvid-1,x\n", "csv")).toThrow(/provider, quality/);
  });

  it("JSON: array objek; item bukan objek tetap jadi baris (yang nanti dilewati)", () => {
    const baris = bacaBerkasImpor(
      JSON.stringify([{ video: "vid-1", provider: "google", quality: 1080, url: GDRIVE }, 5]),
      "json",
    );
    expect(baris[0]).toMatchObject({ nomor: 1, quality: "1080" });
    expect(baris[1]).toMatchObject({ nomor: 2, video: "" });
  });

  it("JSON yang bukan array/rusak = melempar", () => {
    expect(() => bacaBerkasImpor("{", "json")).toThrow();
    expect(() => bacaBerkasImpor("{}", "json")).toThrow(/array/);
  });
});

describe("cocokkanVideo — ID dulu, lalu judul persis", () => {
  it("ID cocok persis", () => {
    expect(cocokkanVideo("vid-1", VIDEOS)).toEqual({ ok: true, id: "vid-1" });
  });

  it("judul cocok tanpa peduli huruf besar & spasi berlebih", () => {
    expect(cocokkanVideo("  cinta di  UJUNG senja ", VIDEOS)).toEqual({ ok: true, id: "vid-1" });
  });

  it("judul GANDA dilewati dengan menyebut id kandidatnya — tidak ditebak", () => {
    const hasil = cocokkanVideo("Rahasia Keluarga", VIDEOS);
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.alasan).toContain("vid-2, vid-3");
  });

  it("judul sebagian TIDAK dianggap cocok", () => {
    expect(cocokkanVideo("Cinta", VIDEOS).ok).toBe(false);
  });
});

const CSV_CAMPUR = [
  "video,provider,quality,url",
  `vid-1,google,1080p,${GDRIVE}`, // 2: sah lewat ID
  `Cinta di Ujung Senja,telegram,480p,https://t.me/k/1`, // 3: sah lewat judul
  `vid-tak-ada,google,1080p,${GDRIVE}`, // 4: video tak ada
  `Rahasia Keluarga,google,1080p,${GDRIVE}`, // 5: judul ganda
  `vid-1,mega,1080p,http://mega.nz/file/a`, // 6: bukan https
  `vid-1,telegram,1080p,${GDRIVE}`, // 7: domain bukan milik provider
  `vid-1,sendcm,1080p,${GDRIVE}`, // 8: provider tak dikenal
  `vid-1,google,720p,${GDRIVE}`, // 9: kualitas tak dikenal
  `vid-2,mega,480p,https://mega.nz/file/b`, // 10: sah, SESUDAH baris-baris rusak
].join("\n");

function penyimpanan(awal: LinkUnduhan[] = []) {
  let data = awal;
  return {
    bacaLama: vi.fn(async () => data),
    simpan: vi.fn(async (masuk: LinkUnduhanMasuk[]) => {
      const r = terapkanLinkUnduhan(data, masuk, "2026-10-05T00:00:00.000Z");
      data = r.daftar;
      return r.status;
    }),
    isi: () => data,
  };
}

describe("jalankanImpor — baris rusak TIDAK menghentikan proses", () => {
  it("semua baris sah tersimpan (termasuk yang sesudah baris rusak), sisanya dilaporkan", async () => {
    const s = penyimpanan();
    const laporan = await jalankanImpor({
      teks: CSV_CAMPUR, format: "csv", videos: VIDEOS, domain: DOMAIN, dryRun: false, ...s,
    });

    expect(laporan).toMatchObject({ total: 9, baru: 3, diperbarui: 0, sama: 0 });
    expect(laporan.dilewati.map((d) => d.nomor)).toEqual([4, 5, 6, 7, 8, 9]);
    expect(laporan.dilewati.map((d) => d.alasan)).toEqual([
      expect.stringContaining("tidak ditemukan"),
      expect.stringContaining("judul ganda"),
      expect.stringContaining("https"),
      expect.stringContaining("bukan domain Telegram"),
      expect.stringContaining("provider"),
      expect.stringContaining("kualitas"),
    ]);
    expect(s.isi().map((l) => `${l.videoId}/${l.provider}/${l.quality}`)).toEqual([
      "vid-1/google/1080p",
      "vid-1/telegram/480p",
      "vid-2/mega/480p",
    ]);
  });

  it("impor ULANG berkas yang sama = 'sama', tak ada baris kembar", async () => {
    const s = penyimpanan();
    const opsi = { teks: CSV_CAMPUR, format: "csv" as const, videos: VIDEOS, domain: DOMAIN, dryRun: false, ...s };
    await jalankanImpor(opsi);
    const kedua = await jalankanImpor(opsi);
    expect(kedua).toMatchObject({ baru: 0, diperbarui: 0, sama: 3 });
    expect(s.isi()).toHaveLength(3);
  });

  it("alamat baru untuk kombinasi yang sama = 'diperbarui'", async () => {
    const s = penyimpanan();
    const satu = (url: string) => `video,provider,quality,url\nvid-1,google,1080p,${url}\n`;
    const base = { format: "csv" as const, videos: VIDEOS, domain: DOMAIN, dryRun: false, ...s };
    await jalankanImpor({ ...base, teks: satu(GDRIVE) });
    const r = await jalankanImpor({ ...base, teks: satu("https://drive.google.com/file/d/BARU/view") });
    expect(r).toMatchObject({ baru: 0, diperbarui: 1 });
  });
});

describe("jalankanImpor --dry-run", () => {
  it("TIDAK memanggil simpan sama sekali, tapi laporannya sama dengan aslinya", async () => {
    const s = penyimpanan();
    const kering = await jalankanImpor({
      teks: CSV_CAMPUR, format: "csv", videos: VIDEOS, domain: DOMAIN, dryRun: true, ...s,
    });
    expect(s.simpan).not.toHaveBeenCalled();
    expect(s.isi()).toEqual([]);

    const asli = await jalankanImpor({
      teks: CSV_CAMPUR, format: "csv", videos: VIDEOS, domain: DOMAIN, dryRun: false, ...s,
    });
    expect({ ...kering, dryRun: false }).toEqual(asli);
  });

  it("laporan menyebut jelas bahwa ini simulasi", async () => {
    const s = penyimpanan();
    const l = await jalankanImpor({
      teks: CSV_CAMPUR, format: "csv", videos: VIDEOS, domain: DOMAIN, dryRun: true, ...s,
    });
    const teks = formatLaporan(l);
    expect(teks).toContain("TIDAK ada yang disimpan");
    expect(teks).toContain("baris 5 (Rahasia Keluarga): judul ganda");
  });
});
