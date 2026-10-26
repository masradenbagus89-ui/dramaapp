// Penjaga permanen untuk robot pemantau database (dipasang 2026-10-26).
//
// DUA BUG YANG DIJAGA, keduanya terbukti nyata:
//
// 1. TERLALU JARANG. Robot ini dulu jalan SEKALI SEHARI. Pada 2026-10-26 ia
//    memeriksa jam 07:11 UTC dan LULUS, lalu database mati beberapa menit
//    sesudahnya — dengan jadwal harian, owner baru akan tahu BESOK PAGI.
//    Gangguannya akhirnya ketahuan cuma karena kebetulan ada yang sedang
//    melihat, dan "kebetulan" bukan sistem pemantauan.
//
// 2. ALARM PALSU HARIAN. Repo cermin `ojokesusu/dramaku` ikut menjalankan robot
//    yang sama dan GAGAL tiap hari (24, 25, 26 Oktober semuanya failure). Owner
//    menerima email kegagalan palsu setiap hari — dan itu bahaya sesungguhnya:
//    alarm yang berbohong tiap hari membuat alarm SUNGGUHAN ikut diabaikan.
//
// Keduanya tidak bisa diuji lewat kode aplikasi, jadi yang dikunci di sini isi
// berkas workflow-nya. Kalau suatu hari ada yang mengembalikannya ke harian
// atau membuang pagar repo, berkas inilah yang berteriak.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const WF = readFileSync(".github/workflows/keep-db-awake.yml", "utf-8");

describe("Robot pemantau database — frekuensi", () => {
  it("jalan TIAP JAM, bukan sekali sehari", () => {
    const cron = WF.match(/cron:\s*"([^"]+)"/)?.[1];
    expect(cron, "jadwal cron tidak ketemu").toBeTruthy();
    const [menit, jam] = cron!.split(/\s+/);
    // Jam harus "*" (tiap jam). Kalau berisi angka, berarti kembali ke
    // sekali-sehari dan owner kembali buta sampai 24 jam.
    expect(jam, `jadwal mundur jadi jarang: "${cron}"`).toBe("*");
    expect(menit).toMatch(/^\d+$/);
  });

  it("menitnya BUKAN 0 — menit bulat paling sering ditunda GitHub", () => {
    const cron = WF.match(/cron:\s*"([^"]+)"/)![1];
    expect(cron.split(/\s+/)[0]).not.toBe("0");
  });
});

describe("Robot pemantau database — hanya di repo produksi", () => {
  it("punya pagar `if:` yang mengunci ke repo produksi", () => {
    expect(WF).toContain("github.repository ==");
    expect(WF).toContain("masradenbagus89-ui/dramaapp");
  });

  it("pagar dipasang di JOB, bukan cuma ditulis di komentar", () => {
    // Komentar tak menghentikan apa pun. Yang menghentikan adalah baris `if:`
    // sungguhan di dalam definisi job.
    const barisIf = WF.split("\n").filter(
      (b) => b.trim().startsWith("if:") && b.includes("github.repository"),
    );
    expect(barisIf.length, "pagar `if:` tidak ada sebagai direktif").toBeGreaterThan(0);
  });
});

describe("Robot pemantau database — yang TIDAK boleh hilang", () => {
  it("masih memakai percobaan ulang curl (anti alarm palsu)", () => {
    // Tanpa retry, satu kedipan jaringan sesaat langsung memicu email gagal.
    // Dengan jadwal tiap jam, itu berarti 24 peluang alarm palsu per hari.
    expect(WF).toContain("--retry");
  });

  it("masih menyapa endpoint yang BENAR-BENAR membaca database", () => {
    // /api/dramas ber-mode force-dynamic = tak pernah di-cache, jadi tiap
    // sapaan benar-benar menyentuh tabel. Kalau diganti ke halaman ber-cache,
    // robot ini akan selalu melapor sehat walau database mati.
    expect(WF).toContain("/api/dramas");
  });
});
