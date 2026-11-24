// PENYIMPANAN — kontrak data Nonton Bareng + implementasi memori.
//
// Server hanya bicara lewat antarmuka `Penyimpanan`. Dua implementasi:
//   • PenyimpananMemori   — tes & localhost tanpa database (hilang saat restart).
//   • PenyimpananSupabase — produksi (penyimpanan-supabase.ts).
import crypto from "node:crypto";
import type { Peran, StatusPemutaran } from "./kontrak.ts";

export type StatusRuang = "aktif" | "berakhir";

export type RuangDb = {
  id: string;
  tokenHash: string;
  videoId: string;
  judul: string;
  poster: string | null;
  status: StatusRuang;
  /** ms epoch */
  aktivitas: number;
};

export type PesertaDb = {
  id: string;
  ruangId: string;
  kunciHash: string;
  nama: string;
  email: string | null;
  peran: Peran;
  /** ms epoch — dipakai memilih Host pengganti (yang paling lama ikut). */
  bergabung: number;
};

export type PesanDb = {
  id: string;
  ruangId: string;
  pesertaId: string;
  isi: string;
  dikirim: number;
};

export type DataRuangBaru = Pick<RuangDb, "tokenHash" | "videoId" | "judul" | "poster">;
export type DataPesertaBaru = Pick<PesertaDb, "ruangId" | "kunciHash" | "nama" | "email" | "peran">;

export type AturanBersih = {
  /** Room aktif tanpa aktivitas selama ini → diakhiri. */
  diamMs: number;
  /** Room berakhir sejak selama ini → dihapus beserta peserta & chat-nya. */
  simpanMs: number;
};

export interface Penyimpanan {
  buatRuang(data: DataRuangBaru): Promise<RuangDb>;
  ruangDariToken(tokenHash: string): Promise<RuangDb | null>;
  ruangDariId(id: string): Promise<RuangDb | null>;
  catatAktivitas(ruangId: string, pada: number): Promise<void>;
  akhiriRuang(ruangId: string, pada: number): Promise<void>;

  buatPeserta(data: DataPesertaBaru): Promise<PesertaDb>;
  pesertaDariKunci(kunciHash: string): Promise<PesertaDb | null>;
  daftarPeserta(ruangId: string): Promise<PesertaDb[]>;
  ubahNama(pesertaId: string, nama: string): Promise<void>;
  /** Turunkan Host lama (kalau ada) LALU naikkan Host baru — urutan ini wajib (indeks unik 1 Host/Room). */
  pindahHost(ruangId: string, dariId: string | null, keId: string): Promise<void>;

  simpanPesan(data: Omit<PesanDb, "id" | "dikirim">): Promise<PesanDb>;
  /** Pesan terbaru, diurutkan lama → baru. */
  pesanTerakhir(ruangId: string, jumlah: number): Promise<PesanDb[]>;

  bacaStatus(ruangId: string): Promise<StatusPemutaran | null>;
  simpanStatus(ruangId: string, status: StatusPemutaran): Promise<void>;

  bersihkan(sekarang: number, aturan: AturanBersih): Promise<{ diakhiri: number; dihapus: number }>;
}

/**
 * Implementasi memori. Dipakai tes integrasi & `npm start` tanpa env Supabase.
 * ⚠️ JALAN PINTAS SENGAJA: semua data hilang saat proses mati — jangan dipakai
 * di produksi (index.ts menolak jalan tanpa Supabase kalau NODE_ENV=production).
 */
export class PenyimpananMemori implements Penyimpanan {
  private ruang = new Map<string, RuangDb & { berakhirPada: number | null }>();
  private peserta = new Map<string, PesertaDb>();
  private pesan: PesanDb[] = [];
  private status = new Map<string, StatusPemutaran>();
  private urutPesan = 0;

  async buatRuang(data: DataRuangBaru) {
    const baris = { ...data, id: crypto.randomUUID(), status: "aktif" as const, aktivitas: Date.now(), berakhirPada: null };
    this.ruang.set(baris.id, baris);
    return salinRuang(baris);
  }
  async ruangDariToken(tokenHash: string) {
    for (const r of this.ruang.values()) if (r.tokenHash === tokenHash) return salinRuang(r);
    return null;
  }
  async ruangDariId(id: string) {
    const r = this.ruang.get(id);
    return r ? salinRuang(r) : null;
  }
  async catatAktivitas(ruangId: string, pada: number) {
    const r = this.ruang.get(ruangId);
    if (r) r.aktivitas = pada;
  }
  async akhiriRuang(ruangId: string, pada: number) {
    const r = this.ruang.get(ruangId);
    if (r && r.status === "aktif") Object.assign(r, { status: "berakhir", berakhirPada: pada });
  }

  async buatPeserta(data: DataPesertaBaru) {
    if (data.peran === "host" && [...this.peserta.values()].some((p) => p.ruangId === data.ruangId && p.peran === "host")) {
      throw new Error("Room ini sudah punya Host.");
    }
    const baris = { ...data, id: crypto.randomUUID(), bergabung: Date.now() };
    this.peserta.set(baris.id, baris);
    return { ...baris };
  }
  async pesertaDariKunci(kunciHash: string) {
    for (const p of this.peserta.values()) if (p.kunciHash === kunciHash) return { ...p };
    return null;
  }
  async daftarPeserta(ruangId: string) {
    return [...this.peserta.values()].filter((p) => p.ruangId === ruangId).map((p) => ({ ...p }));
  }
  async ubahNama(pesertaId: string, nama: string) {
    const p = this.peserta.get(pesertaId);
    if (p) p.nama = nama;
  }
  async pindahHost(_ruangId: string, dariId: string | null, keId: string) {
    if (dariId) {
      const lama = this.peserta.get(dariId);
      if (lama) lama.peran = "penonton";
    }
    const baru = this.peserta.get(keId);
    if (baru) baru.peran = "host";
  }

  async simpanPesan(data: Omit<PesanDb, "id" | "dikirim">) {
    const baris = { ...data, id: String(++this.urutPesan), dikirim: Date.now() };
    this.pesan.push(baris);
    return { ...baris };
  }
  async pesanTerakhir(ruangId: string, jumlah: number) {
    return this.pesan.filter((m) => m.ruangId === ruangId).slice(-jumlah).map((m) => ({ ...m }));
  }

  async bacaStatus(ruangId: string) {
    const s = this.status.get(ruangId);
    return s ? { ...s } : null;
  }
  async simpanStatus(ruangId: string, status: StatusPemutaran) {
    this.status.set(ruangId, { ...status });
  }

  async bersihkan(sekarang: number, aturan: AturanBersih) {
    let diakhiri = 0;
    let dihapus = 0;
    for (const r of [...this.ruang.values()]) {
      if (r.status === "aktif" && sekarang - r.aktivitas > aturan.diamMs) {
        Object.assign(r, { status: "berakhir", berakhirPada: sekarang });
        diakhiri++;
      } else if (r.status === "berakhir" && r.berakhirPada !== null && sekarang - r.berakhirPada > aturan.simpanMs) {
        this.ruang.delete(r.id);
        this.status.delete(r.id);
        for (const p of [...this.peserta.values()]) if (p.ruangId === r.id) this.peserta.delete(p.id);
        this.pesan = this.pesan.filter((m) => m.ruangId !== r.id);
        dihapus++;
      }
    }
    return { diakhiri, dihapus };
  }
}

function salinRuang(r: RuangDb): RuangDb {
  return {
    id: r.id,
    tokenHash: r.tokenHash,
    videoId: r.videoId,
    judul: r.judul,
    poster: r.poster,
    status: r.status,
    aktivitas: r.aktivitas,
  };
}
