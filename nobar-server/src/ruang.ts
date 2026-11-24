// RUANG AKTIF — keadaan satu Room di memori server selama ada yang memakainya.
//
// Kelas ini sengaja TIDAK tahu soal socket maupun database: ia hanya menjawab
// "siapa online, siapa Host, video Host seharusnya di detik berapa". Socket &
// penyimpanan diurus server.ts. Dengan begitu aturan Room bisa diuji langsung.
import {
  posisiSeharusnya,
  type AksiKontrol,
  type PesertaPublik,
  type RuangPublik,
  type StatusPemutaran,
} from "./kontrak.ts";
import type { PesertaDb, RuangDb } from "./penyimpanan.ts";

type Anggota = { db: PesertaDb; soket: Set<string> };

export class RuangAktif {
  readonly id: string;
  readonly info: RuangPublik;
  status: StatusPemutaran;
  /** true = status berubah sejak terakhir disimpan ke database. */
  kotor = false;
  /** Jam server saat Host terakhir terlihat offline; null = Host online. */
  hostOfflineSejak: number | null = null;
  private anggota = new Map<string, Anggota>();

  constructor(ruang: RuangDb, status: StatusPemutaran, peserta: PesertaDb[], sekarang: number) {
    this.id = ruang.id;
    this.info = { judul: ruang.judul, videoId: ruang.videoId, poster: ruang.poster };
    this.status = status;
    for (const p of peserta) this.anggota.set(p.id, { db: p, soket: new Set() });
    // Saat Room baru dimuat belum ada yang tersambung — termasuk Host.
    this.hostOfflineSejak = sekarang;
  }

  idHost(): string | null {
    for (const a of this.anggota.values()) if (a.db.peran === "host") return a.db.id;
    return null;
  }

  peserta(id: string): PesertaDb | null {
    return this.anggota.get(id)?.db ?? null;
  }

  online(id: string): boolean {
    return (this.anggota.get(id)?.soket.size ?? 0) > 0;
  }

  jumlahOnline(): number {
    let n = 0;
    for (const a of this.anggota.values()) if (a.soket.size > 0) n++;
    return n;
  }

  /** Daftar untuk dikirim ke semua peserta. Host di atas, lalu urut waktu bergabung. */
  daftarPublik(): PesertaPublik[] {
    return [...this.anggota.values()]
      .sort((a, b) =>
        a.db.peran === b.db.peran ? a.db.bergabung - b.db.bergabung : a.db.peran === "host" ? -1 : 1,
      )
      .map((a) => ({ id: a.db.id, nama: a.db.nama, peran: a.db.peran, online: a.soket.size > 0 }));
  }

  /** Satu peserta bisa membuka beberapa tab → dihitung per soket, online selama ≥1 tab hidup. */
  sambung(p: PesertaDb, soketId: string): void {
    const a = this.anggota.get(p.id) ?? { db: p, soket: new Set<string>() };
    // Data peserta terbaru dari database menang (mis. nama baru sesudah gabung ulang).
    a.db = { ...p, peran: a.db.peran };
    a.soket.add(soketId);
    this.anggota.set(p.id, a);
    if (p.id === this.idHost()) this.hostOfflineSejak = null;
  }

  /** @returns true kalau peserta ini sekarang benar-benar offline (tab terakhirnya tertutup). */
  putus(pesertaId: string, soketId: string, sekarang: number): boolean {
    const a = this.anggota.get(pesertaId);
    if (!a) return false;
    a.soket.delete(soketId);
    if (a.soket.size > 0) return false;
    if (pesertaId === this.idHost()) this.hostOfflineSejak = sekarang;
    return true;
  }

  /**
   * Host pengganti = peserta ONLINE yang paling lama ikut. Paling lama ikut
   * dipilih karena dialah yang paling mungkin kenal Host & isi tontonannya.
   */
  pilihPengganti(): string | null {
    const kandidat = [...this.anggota.values()]
      .filter((a) => a.soket.size > 0 && a.db.peran !== "host")
      .sort((a, b) => a.db.bergabung - b.db.bergabung);
    return kandidat[0]?.db.id ?? null;
  }

  gantiHost(keId: string, sekarang: number): void {
    for (const a of this.anggota.values()) a.db.peran = a.db.id === keId ? "host" : "penonton";
    this.hostOfflineSejak = this.online(keId) ? null : sekarang;
  }

  /** Perintah Host. `seq` naik supaya status lama yang datang terlambat bisa dibuang klien. */
  terapkanKontrol(aksi: AksiKontrol, posisi: number, sekarang: number): StatusPemutaran {
    const main = aksi === "putar" ? true : aksi === "jeda" ? false : this.status.main;
    return this.tulis({ main, posisi, pada: sekarang, seq: this.status.seq + 1 });
  }

  /**
   * Laporan berkala Host. Hanya mengubah status kalau BEDA dari perkiraan —
   * kalau sama, tak perlu mengganggu penonton dengan siaran baru.
   * @returns status baru, atau null kalau laporan cocok dengan perkiraan.
   */
  terapkanLaporan(posisi: number, main: boolean, sekarang: number): StatusPemutaran | null {
    const selisih = Math.abs(posisiSeharusnya(this.status, sekarang) - posisi);
    if (main === this.status.main && selisih < AMBANG_LAPORAN_DETIK) return null;
    return this.tulis({ main, posisi, pada: sekarang, seq: this.status.seq + 1 });
  }

  private tulis(status: StatusPemutaran): StatusPemutaran {
    this.status = status;
    this.kotor = true;
    return status;
  }
}

/**
 * Laporan Host yang menyimpang ≥ angka ini dari perkiraan dianggap perubahan
 * nyata (buffering, tab Host sempat tertidur). Di bawahnya = derau jaringan.
 */
const AMBANG_LAPORAN_DETIK = 0.75;
