// Tes penjaga untuk pc-backup-agent/hardlink-agent.js.
//
// Latar: drama "Over Your Dead Body" gagal diputar di produksi. Berkasnya ADA
// dan sehat di PC backup, tapi bernama "Over-Your-Dead-Body.mp4" (tanpa angka),
// sementara player selalu meminta "1.mp4". Agent versi lama melewati berkas
// tanpa angka DAN tetap membalas ok:true walau nol hardlink dibuat — jadi admin
// melihat "berhasil" padahal video tetap 404 (kerusakan senyap).
//
// Tes ini mengunci 3 perilaku itu supaya bug yang sama tidak kambuh.
import { afterAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type HasilPetakan = {
  mapping: Record<string, string[]>;
  diabaikan: string[];
};

type HasilHardlink = {
  ok: boolean;
  action?: string;
  count?: number;
  error?: string;
  message?: string;
  needConvert?: string[];
  ignored?: string[];
  cleanFolder?: string;
};

// VIDEO_ROOT dibaca agent saat modul dimuat → set dulu, baru require.
const VIDEO_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "dramaapp-hardlink-"));
process.env.VIDEO_ROOT = VIDEO_ROOT;

const requireCjs = createRequire(import.meta.url);
const agent = requireCjs("../pc-backup-agent/hardlink-agent.js") as {
  petakanEpisode: (namaBerkas: string[]) => HasilPetakan;
  processHardlink: (dramaId: string) => HasilHardlink;
};

/** Bikin folder + berkas kosong, meniru isi folder video di PC backup. */
function siapkanFolder(nama: string, berkas: string[]): string {
  const folder = path.join(VIDEO_ROOT, nama);
  fs.mkdirSync(folder, { recursive: true });
  for (const f of berkas) fs.writeFileSync(path.join(folder, f), "x");
  return folder;
}

afterAll(() => {
  fs.rmSync(VIDEO_ROOT, { recursive: true, force: true });
});

describe("petakanEpisode — tentukan nomor episode dari nama berkas", () => {
  it("berkas tunggal tanpa angka dianggap episode 1 (kasus film 1-episode)", () => {
    const { mapping, diabaikan } = agent.petakanEpisode([
      "Over-Your-Dead-Body.mp4",
    ]);
    expect(mapping["1"]).toEqual(["Over-Your-Dead-Body.mp4"]);
    expect(diabaikan).toEqual([]);
  });

  it("berkas bernomor dipetakan sesuai angkanya", () => {
    const { mapping } = agent.petakanEpisode(["1.mp4", "2.mp4", "Video PM 10.mp4"]);
    expect(mapping["1"]).toEqual(["1.mp4"]);
    expect(mapping["2"]).toEqual(["2.mp4"]);
    expect(mapping["10"]).toEqual(["Video PM 10.mp4"]);
  });

  it("berkas tanpa angka TIDAK ditebak kalau ada berkas bernomor lain", () => {
    const { mapping, diabaikan } = agent.petakanEpisode(["1.mp4", "trailer.mp4"]);
    expect(mapping["1"]).toEqual(["1.mp4"]);
    expect(diabaikan).toEqual(["trailer.mp4"]); // dilaporkan, bukan hilang diam-diam
  });

  it("angka pada ekstensi .mp4 tidak dihitung sebagai nomor episode", () => {
    // Jebakan lama: "trailer.mp4" cocok dengan /(\d+)/ lewat angka 4 di ".mp4",
    // jadi berkas tanpa nomor diam-diam terdaftar sebagai episode 4.
    const { mapping, diabaikan } = agent.petakanEpisode(["5.mp4", "trailer.mp4"]);
    expect(Object.keys(mapping)).toEqual(["5"]);
    expect(diabaikan).toEqual(["trailer.mp4"]);
  });

  it("dua berkas untuk nomor sama dilaporkan sebagai kandidat ganda", () => {
    const { mapping } = agent.petakanEpisode(["ep 1 fix.mp4", "ep 1.mp4"]);
    expect(mapping["1"]).toHaveLength(2);
  });
});

describe("processHardlink — bikin N.mp4 di folder yang disajikan ke penonton", () => {
  it("berkas mp4 tanpa angka jadi 1.mp4 (regresi Over Your Dead Body)", () => {
    const id = "film-satu-episode";
    siapkanFolder(id, ["Over-Your-Dead-Body.mp4"]);

    const hasil = agent.processHardlink(id);

    expect(hasil.ok).toBe(true);
    expect(hasil.count).toBe(1);
    expect(fs.existsSync(path.join(VIDEO_ROOT, id, "1.mp4"))).toBe(true);
  });

  it("berkas mp4 di folder bersih tetap terbaca walau _raw_ sudah ada", () => {
    // Kondisi persis di PC backup: percobaan sebelumnya sudah memindahkan versi
    // .mkv ke _raw_, lalu versi .mp4 hasil konversi di-drop ke folder bersih.
    const id = "raw-sudah-ada";
    siapkanFolder("_raw_" + id, ["raw-sudah-ada.mkv"]);
    siapkanFolder(id, ["Judul-Filmnya.mp4"]);

    const hasil = agent.processHardlink(id);

    expect(hasil.ok).toBe(true);
    expect(fs.existsSync(path.join(VIDEO_ROOT, id, "1.mp4"))).toBe(true);
  });

  it("folder yang cuma berisi .mkv GAGAL dengan pesan konversi, bukan sukses palsu", () => {
    const id = "cuma-mkv";
    siapkanFolder(id, ["cuma-mkv.mkv"]);

    const hasil = agent.processHardlink(id);

    expect(hasil.ok).toBe(false);
    expect(hasil.count).toBe(0);
    expect(hasil.error).toContain("non-MP4");
    expect(hasil.needConvert).toContain("cuma-mkv.mkv");
  });

  it("folder yang sudah punya 1.mp4 dilaporkan already-prepared", () => {
    const id = "sudah-siap";
    siapkanFolder(id, ["1.mp4", "2.mp4"]);

    const hasil = agent.processHardlink(id);

    expect(hasil.ok).toBe(true);
    expect(hasil.action).toBe("already-prepared");
    expect(hasil.count).toBe(2);
  });

  it("folder yang tidak ada dilaporkan gagal, bukan dibuat diam-diam", () => {
    const hasil = agent.processHardlink("belum-pernah-ada");

    expect(hasil.ok).toBe(false);
    expect(hasil.error).toContain("Folder tidak ditemukan");
  });
});
