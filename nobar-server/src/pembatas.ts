// PEMBATAS LAJU (rate limit) jendela-tetap, di memori proses.
//
// ⚠️ JALAN PINTAS SENGAJA: hitungan hidup di memori SATU proses. Itu cukup
// selama nobar-server berjalan satu instance (pengaturan Railway saat ini).
// Kalau suatu hari di-scale ke beberapa instance, Room juga harus pindah ke
// adapter Redis — saat itu hitungan ini ikut pindah ke Redis.

type Catatan = { jumlah: number; reset: number };

export class PembatasLaju {
  private catatan = new Map<string, Catatan>();
  private readonly batas: number;
  private readonly jendelaMs: number;

  constructor(batas: number, jendelaMs: number) {
    this.batas = batas;
    this.jendelaMs = jendelaMs;
  }

  /** true = boleh lanjut. Memanggilnya sudah MENGHITUNG satu percobaan. */
  boleh(kunci: string, sekarang = Date.now()): boolean {
    const c = this.catatan.get(kunci);
    if (!c || sekarang >= c.reset) {
      // Pangkas ringan supaya peta tak tumbuh tanpa batas di proses yang awet.
      if (this.catatan.size > 50_000) this.catatan.clear();
      this.catatan.set(kunci, { jumlah: 1, reset: sekarang + this.jendelaMs });
      return true;
    }
    if (c.jumlah >= this.batas) return false;
    c.jumlah += 1;
    return true;
  }
}
