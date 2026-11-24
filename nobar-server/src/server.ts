// SERVER NONTON BARENG — HTTP internal (untuk Next) + Socket.IO (untuk browser).
//
// Alur kepercayaan:
//   1. Next memanggil /internal/* dengan `Authorization: Bearer NOBAR_SECRET`
//      untuk membuat Room / bergabung. Browser tak pernah memanggil jalur ini.
//   2. Browser menyambung Socket.IO membawa TIKET dari Next (umur 60 detik).
//      Server membaca hash kunci peserta dari tiket → peserta & Room dari DB.
//   3. Tiap event: rate limit → validasi bentuk (kontrak.ts) → izin peran.
//      Perintah video HANYA diterima dari peserta berperan Host di memori server
//      — klaim "saya Host" dari browser tidak pernah dibaca.
import http from "node:http";
import { Server, type Socket } from "socket.io";
import {
  EVENT,
  MAKS_PESERTA,
  RIWAYAT_PESAN,
  rapikanNama,
  rapikanTeks,
  validasiChat,
  validasiIdPeserta,
  validasiKontrol,
  validasiLaporan,
  type PesanPublik,
  type Snapshot,
  type StatusPemutaran,
} from "./kontrak.ts";
import type { Penyimpanan, PesanDb } from "./penyimpanan.ts";
import { PembatasLaju } from "./pembatas.ts";
import { RuangAktif } from "./ruang.ts";
import { bacaTiket, bearerSah, bentukRahasiaSah, buatRahasiaAcak, hashRahasia } from "./tiket.ts";

export type OpsiServer = {
  penyimpanan: Penyimpanan;
  /** NOBAR_SECRET — sama persis dengan yang dipasang di situs Next. */
  rahasia: string;
  /** Origin browser yang boleh menyambung (anti pembajakan koneksi lintas-situs / CSWSH). */
  asalDiizinkan: string[];
  /** Lama Host boleh hilang sebelum perannya dipindah ke penonton lain. */
  masaTungguHostMs?: number;
  /** Room tanpa penonton online dibongkar dari memori sesudah selama ini. */
  jedaBongkarMs?: number;
  intervalSimpanMs?: number;
  intervalBersihMs?: number;
  catat?: (pesan: string) => void;
};

const MENIT = 60_000;
const JAM = 60 * MENIT;
/** Room tanpa aktivitas selama ini dianggap selesai → diakhiri otomatis. */
const ROOM_DIAM_MS = 6 * JAM;
/** Room berakhir disimpan sekian lama (riwayat), lalu dihapus beserta chat-nya. */
const ROOM_DISIMPAN_MS = 7 * 24 * JAM;
/** Badan permintaan internal terbesar — isinya cuma beberapa field pendek. */
const MAKS_BADAN_BYTE = 8 * 1024;

// Batas laju per peserta (jendela 10 detik). Angkanya ditimbang dari pemakaian
// wajar: orang mengetik chat ≤5 pesan/10 detik; Host menggeser video berkali-kali
// saat mencari adegan; laporan Host terjadwal tiap 4 detik.
const JENDELA_MS = 10_000;
const BATAS = { semua: 40, chat: 5, kontrol: 20, laporan: 6 } as const;
/** Pesan identik dari orang yang sama dalam jendela ini = spam, ditolak. */
const JEDA_PESAN_KEMBAR_MS = 15_000;

type DataSoket = { pesertaId: string; ruangId: string };

export function buatServerNobar(opsi: OpsiServer) {
  const { penyimpanan, rahasia } = opsi;
  const catat = opsi.catat ?? ((p: string) => console.log(`[nobar] ${p}`));
  const masaTungguHostMs = opsi.masaTungguHostMs ?? MENIT;
  const jedaBongkarMs = opsi.jedaBongkarMs ?? 5 * MENIT;
  const asal = new Set(opsi.asalDiizinkan);

  const ruangAktif = new Map<string, RuangAktif>();
  // Pemuatan Room yang sedang berjalan — dua penonton yang menyambung serentak
  // tidak boleh memuat Room yang sama dua kali (dua salinan = dua kebenaran).
  const sedangDimuat = new Map<string, Promise<RuangAktif | null>>();
  const timerBongkar = new Map<string, NodeJS.Timeout>();
  const timerHost = new Map<string, NodeJS.Timeout>();
  const pesanTerakhirDari = new Map<string, { isi: string; pada: number }>();
  const laju = {
    semua: new PembatasLaju(BATAS.semua, JENDELA_MS),
    chat: new PembatasLaju(BATAS.chat, JENDELA_MS),
    kontrol: new PembatasLaju(BATAS.kontrol, JENDELA_MS),
    laporan: new PembatasLaju(BATAS.laporan, JENDELA_MS),
  };

  // ------------------------------------------------------------ Room ----

  async function muatRuang(ruangId: string): Promise<RuangAktif | null> {
    const ada = ruangAktif.get(ruangId);
    if (ada) return ada;
    const berjalan = sedangDimuat.get(ruangId);
    if (berjalan) return berjalan;
    const janji = (async () => {
      const ruang = await penyimpanan.ruangDariId(ruangId);
      if (!ruang || ruang.status !== "aktif") return null;
      const sekarang = Date.now();
      const [status, peserta] = await Promise.all([
        penyimpanan.bacaStatus(ruangId),
        penyimpanan.daftarPeserta(ruangId),
      ]);
      const r = new RuangAktif(ruang, status ?? { main: false, posisi: 0, pada: sekarang, seq: 0 }, peserta, sekarang);
      ruangAktif.set(ruangId, r);
      return r;
    })().finally(() => sedangDimuat.delete(ruangId));
    sedangDimuat.set(ruangId, janji);
    return janji;
  }

  function siarkanPeserta(r: RuangAktif) {
    io.to(r.id).emit(EVENT.peserta, r.daftarPublik());
  }

  function siarkanStatus(r: RuangAktif, status: StatusPemutaran, kecuali?: Socket) {
    const isi = { ...status, waktuServer: Date.now() };
    if (kecuali) kecuali.to(r.id).emit(EVENT.status, isi);
    else io.to(r.id).emit(EVENT.status, isi);
  }

  async function simpanRuang(r: RuangAktif) {
    if (!r.kotor) return;
    r.kotor = false;
    try {
      await penyimpanan.simpanStatus(r.id, r.status);
    } catch (e) {
      r.kotor = true; // dicoba lagi di putaran simpan berikutnya
      catat(`status Room ${r.id} gagal disimpan: ${(e as Error).message}`);
    }
  }

  /** Host hilang terlalu lama → pindahkan peran ke penonton online yang paling lama ikut. */
  async function periksaHost(r: RuangAktif) {
    clearTimeout(timerHost.get(r.id));
    timerHost.delete(r.id);
    const idHost = r.idHost();
    if (idHost && r.online(idHost)) return;
    const sejak = r.hostOfflineSejak ?? 0;
    const sisa = masaTungguHostMs - (Date.now() - sejak);
    if (idHost && sisa > 0) {
      timerHost.set(r.id, setTimeout(() => void periksaHost(r), sisa));
      return;
    }
    const pengganti = r.pilihPengganti();
    if (!pengganti) return; // tak ada yang online: tunggu ada yang masuk lagi
    await pindahkanHost(r, idHost, pengganti);
  }

  async function pindahkanHost(r: RuangAktif, dari: string | null, ke: string) {
    try {
      await penyimpanan.pindahHost(r.id, dari, ke);
    } catch (e) {
      catat(`pindah Host Room ${r.id} gagal: ${(e as Error).message}`);
      return;
    }
    r.gantiHost(ke, Date.now());
    siarkanPeserta(r);
  }

  function jadwalBongkar(r: RuangAktif) {
    clearTimeout(timerBongkar.get(r.id));
    timerBongkar.set(
      r.id,
      setTimeout(async () => {
        timerBongkar.delete(r.id);
        if (r.jumlahOnline() > 0) return;
        await simpanRuang(r);
        clearTimeout(timerHost.get(r.id));
        timerHost.delete(r.id);
        ruangAktif.delete(r.id);
      }, jedaBongkarMs),
    );
  }

  async function akhiri(r: RuangAktif, alasan: string) {
    await penyimpanan.akhiriRuang(r.id, Date.now());
    io.to(r.id).emit(EVENT.berakhir, { alasan });
    io.in(r.id).disconnectSockets(true);
    for (const t of [timerBongkar, timerHost]) {
      clearTimeout(t.get(r.id));
      t.delete(r.id);
    }
    ruangAktif.delete(r.id);
  }

  const kePublik = (r: RuangAktif, m: PesanDb): PesanPublik => ({
    id: m.id,
    pesertaId: m.pesertaId,
    nama: r.peserta(m.pesertaId)?.nama ?? "Penonton",
    isi: m.isi,
    dikirim: new Date(m.dikirim).toISOString(),
  });

  // ------------------------------------------------------- HTTP internal ----

  async function bacaBadan(req: http.IncomingMessage): Promise<Record<string, unknown> | null> {
    let ukuran = 0;
    const potongan: Buffer[] = [];
    for await (const p of req) {
      ukuran += (p as Buffer).length;
      if (ukuran > MAKS_BADAN_BYTE) return null;
      potongan.push(p as Buffer);
    }
    try {
      const isi = JSON.parse(Buffer.concat(potongan).toString("utf8"));
      return typeof isi === "object" && isi !== null && !Array.isArray(isi) ? isi : null;
    } catch {
      return null;
    }
  }

  function balas(res: http.ServerResponse, kode: number, isi: unknown) {
    res.writeHead(kode, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(isi));
  }

  const emailSah = (x: unknown) =>
    typeof x === "string" && x.length <= 254 && /^[^\s@]+@[^\s@]+$/.test(x) ? x.toLowerCase() : null;
  const posterSah = (x: unknown) =>
    typeof x === "string" && x.startsWith("https://") && x.length <= 2048 ? x : null;

  const jalurInternal: Record<string, (b: Record<string, unknown>) => Promise<[number, unknown]>> = {
    // Buat Room + Host-nya. Keabsahan videoId (daftar kurasi) SUDAH diperiksa Next.
    "/internal/ruang": async (b) => {
      const videoId = typeof b.videoId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(b.videoId) ? b.videoId : null;
      const judul = rapikanTeks(b.judul, 300);
      const nama = rapikanNama(b.nama);
      if (!videoId || !judul || !nama) return [400, { error: "Data Room tidak lengkap." }];
      const token = buatRahasiaAcak();
      const kunci = buatRahasiaAcak();
      const ruang = await penyimpanan.buatRuang({
        tokenHash: hashRahasia(token),
        videoId,
        judul,
        poster: posterSah(b.poster),
      });
      await penyimpanan.buatPeserta({
        ruangId: ruang.id,
        kunciHash: hashRahasia(kunci),
        nama,
        email: emailSah(b.email),
        peran: "host",
      });
      catat(`Room ${ruang.id} dibuat untuk video ${videoId}`);
      return [201, { token, kunci }];
    },

    // Masuk Room lewat token undangan. Kunci lama yang masih sah = peserta yang sama kembali.
    "/internal/gabung": async (b) => {
      if (!bentukRahasiaSah(b.token)) return [404, { error: "Undangan tidak ditemukan." }];
      const ruang = await penyimpanan.ruangDariToken(hashRahasia(b.token));
      if (!ruang) return [404, { error: "Undangan tidak ditemukan." }];
      if (ruang.status !== "aktif") return [410, { error: "Room ini sudah berakhir." }];
      const nama = rapikanNama(b.nama);
      if (!nama) return [400, { error: "Nama wajib diisi (1-24 huruf)." }];

      if (bentukRahasiaSah(b.kunci)) {
        const lama = await penyimpanan.pesertaDariKunci(hashRahasia(b.kunci));
        if (lama?.ruangId === ruang.id) {
          if (lama.nama !== nama) await penyimpanan.ubahNama(lama.id, nama);
          return [200, { kunci: b.kunci }];
        }
      }
      const peserta = await penyimpanan.daftarPeserta(ruang.id);
      if (peserta.length >= MAKS_PESERTA) {
        return [409, { error: `Room ini sudah penuh (maksimal ${MAKS_PESERTA} orang).` }];
      }
      const kunci = buatRahasiaAcak();
      await penyimpanan.buatPeserta({
        ruangId: ruang.id,
        kunciHash: hashRahasia(kunci),
        nama,
        email: emailSah(b.email),
        peran: "penonton",
      });
      return [201, { kunci }];
    },

    // Info Room untuk halaman /watch-room — termasuk "apakah saya sudah peserta".
    "/internal/info": async (b) => {
      if (!bentukRahasiaSah(b.token)) return [404, { error: "Undangan tidak ditemukan." }];
      const ruang = await penyimpanan.ruangDariToken(hashRahasia(b.token));
      if (!ruang) return [404, { error: "Undangan tidak ditemukan." }];
      if (ruang.status !== "aktif") return [410, { error: "Room ini sudah berakhir." }];
      let saya: { nama: string } | null = null;
      if (bentukRahasiaSah(b.kunci)) {
        const p = await penyimpanan.pesertaDariKunci(hashRahasia(b.kunci));
        if (p?.ruangId === ruang.id) saya = { nama: p.nama };
      }
      return [200, { judul: ruang.judul, videoId: ruang.videoId, poster: ruang.poster, saya }];
    },
  };

  const httpServer = http.createServer(async (req, res) => {
    const jalur = (req.url ?? "").split("?")[0];
    if (req.method === "GET" && jalur === "/health") return balas(res, 200, { ok: true, room: ruangAktif.size });
    const tangani = jalurInternal[jalur];
    if (!tangani || req.method !== "POST") return balas(res, 404, { error: "Tidak ditemukan." });
    if (!bearerSah(req.headers.authorization, rahasia)) return balas(res, 401, { error: "Tidak berwenang." });
    const badan = await bacaBadan(req);
    if (!badan) return balas(res, 400, { error: "Badan permintaan tidak sah." });
    try {
      const [kode, isi] = await tangani(badan);
      balas(res, kode, isi);
    } catch (e) {
      catat(`${jalur} gagal: ${(e as Error).message}`);
      balas(res, 503, { error: "Server Nonton Bareng sedang bermasalah. Coba lagi sebentar." });
    }
  });

  // ------------------------------------------------------------ Socket ----

  const io = new Server(httpServer, {
    // Origin dicek DUA kali: `cors` untuk polling HTTP, `allowRequest` untuk
    // handshake WebSocket (yang tidak tunduk aturan same-origin browser).
    cors: { origin: [...asal], credentials: false },
    allowRequest: (req, cb) => cb(null, asal.has(req.headers.origin ?? "")),
    // Payload event terbesar yang sah = satu pesan chat 300 huruf. 4 KB sudah longgar.
    maxHttpBufferSize: 4096,
    pingInterval: 20_000,
    pingTimeout: 20_000,
  });

  io.use(async (socket, next) => {
    try {
      const hashKunci = bacaTiket(rahasia, socket.handshake.auth?.tiket);
      if (!hashKunci) return next(new Error("tiket"));
      const peserta = await penyimpanan.pesertaDariKunci(hashKunci);
      if (!peserta) return next(new Error("tiket"));
      const r = await muatRuang(peserta.ruangId);
      if (!r) return next(new Error("berakhir"));
      (socket.data as DataSoket) = { pesertaId: peserta.id, ruangId: r.id };
      r.sambung(peserta, socket.id);
      next();
    } catch (e) {
      catat(`handshake gagal: ${(e as Error).message}`);
      next(new Error("server"));
    }
  });

  io.on("connection", async (socket) => {
    const { pesertaId, ruangId } = socket.data as DataSoket;
    const r = ruangAktif.get(ruangId);
    if (!r) return void socket.disconnect(true);
    clearTimeout(timerBongkar.get(ruangId));
    timerBongkar.delete(ruangId);
    await socket.join(ruangId);

    const tolak = (alasan: string) => socket.emit(EVENT.ditolak, { alasan });
    const adalahHost = () => r.idHost() === pesertaId;

    /** Bungkus tiap handler: batas laju total per soket + tangkap error supaya satu event rusak tak menjatuhkan proses. */
    const pada = (nama: string, fn: (isi: unknown, ack?: (x: unknown) => void) => Promise<void> | void) => {
      socket.on(nama, async (isi: unknown, ack?: unknown) => {
        if (!laju.semua.boleh(socket.id)) {
          tolak("Terlalu banyak aksi. Koneksi diputus sebentar.");
          return void socket.disconnect(true);
        }
        try {
          await fn(isi, typeof ack === "function" ? (ack as (x: unknown) => void) : undefined);
        } catch (e) {
          catat(`event ${nama} gagal: ${(e as Error).message}`);
          tolak("Aksi gagal diproses. Coba lagi.");
        }
      });
    };

    pada(EVENT.waktu, (_isi, ack) => ack?.(Date.now()));

    pada(EVENT.kontrol, (isi) => {
      if (!adalahHost()) return void tolak("Hanya Host yang bisa mengatur video.");
      if (!laju.kontrol.boleh(pesertaId)) return void tolak("Terlalu cepat. Tunggu sebentar.");
      const k = validasiKontrol(isi);
      if (!k) return void tolak("Perintah video tidak sah.");
      siarkanStatus(r, r.terapkanKontrol(k.aksi, k.posisi, Date.now()), socket);
      void simpanRuang(r);
    });

    pada(EVENT.laporan, (isi) => {
      if (!adalahHost() || !laju.laporan.boleh(pesertaId)) return;
      const l = validasiLaporan(isi);
      if (!l) return;
      const baru = r.terapkanLaporan(l.posisi, l.main, Date.now());
      if (baru) siarkanStatus(r, baru, socket);
    });

    pada(EVENT.chat, async (isi) => {
      if (!laju.chat.boleh(pesertaId)) return void tolak("Pelan-pelan — maksimal 5 pesan per 10 detik.");
      const teks = validasiChat(isi);
      if (!teks) return void tolak("Pesan kosong atau terlalu panjang (maks 300 huruf).");
      const sekarang = Date.now();
      const terakhir = pesanTerakhirDari.get(pesertaId);
      if (terakhir && terakhir.isi === teks && sekarang - terakhir.pada < JEDA_PESAN_KEMBAR_MS) {
        return void tolak("Pesan yang sama baru saja dikirim.");
      }
      pesanTerakhirDari.set(pesertaId, { isi: teks, pada: sekarang });
      const m = await penyimpanan.simpanPesan({ ruangId, pesertaId, isi: teks });
      io.to(ruangId).emit(EVENT.pesan, kePublik(r, m));
    });

    pada(EVENT.serahkanHost, async (isi) => {
      if (!adalahHost()) return void tolak("Hanya Host yang bisa menyerahkan peran Host.");
      const ke = validasiIdPeserta(isi);
      if (!ke || ke === pesertaId || !r.peserta(ke)) return void tolak("Peserta tujuan tidak ditemukan.");
      if (!r.online(ke)) return void tolak("Peserta itu sedang offline.");
      await pindahkanHost(r, pesertaId, ke);
    });

    pada(EVENT.akhiri, async () => {
      if (!adalahHost()) return void tolak("Hanya Host yang bisa mengakhiri Room.");
      await akhiri(r, "Host mengakhiri Room.");
    });

    socket.on("disconnect", () => {
      if (!ruangAktif.has(ruangId)) return; // Room sudah diakhiri
      r.putus(pesertaId, socket.id, Date.now());
      siarkanPeserta(r);
      if (r.idHost() === pesertaId) void periksaHost(r);
      if (r.jumlahOnline() === 0) jadwalBongkar(r);
    });

    // Snapshot penuh tiap (re)connect = resync: event yang terlewat saat
    // koneksi putus tidak perlu diputar ulang satu per satu.
    const pesan = await penyimpanan.pesanTerakhir(ruangId, RIWAYAT_PESAN).catch(() => []);
    const saya = r.peserta(pesertaId)!;
    socket.emit(EVENT.snapshot, {
      ruang: r.info,
      saya: { id: saya.id, nama: saya.nama, peran: saya.peran },
      status: r.status,
      peserta: r.daftarPublik(),
      pesan: pesan.map((m) => kePublik(r, m)),
      waktuServer: Date.now(),
    } satisfies Snapshot);
    siarkanPeserta(r);
    void periksaHost(r);
  });

  // ------------------------------------------------------ kerja berkala ----

  const putaranSimpan = setInterval(async () => {
    const sekarang = Date.now();
    for (const r of ruangAktif.values()) {
      await simpanRuang(r);
      // Room yang sedang ditonton tak boleh terkena "diam 6 jam".
      if (r.jumlahOnline() > 0) {
        await penyimpanan.catatAktivitas(r.id, sekarang).catch((e: Error) => catat(`aktivitas gagal dicatat: ${e.message}`));
      }
    }
  }, opsi.intervalSimpanMs ?? 30_000);

  const putaranBersih = setInterval(async () => {
    try {
      const hasil = await penyimpanan.bersihkan(Date.now(), { diamMs: ROOM_DIAM_MS, simpanMs: ROOM_DISIMPAN_MS });
      if (hasil.diakhiri || hasil.dihapus) catat(`pembersihan: ${hasil.diakhiri} diakhiri, ${hasil.dihapus} dihapus`);
    } catch (e) {
      catat(`pembersihan gagal: ${(e as Error).message}`);
    }
  }, opsi.intervalBersihMs ?? 10 * MENIT);

  async function tutup() {
    clearInterval(putaranSimpan);
    clearInterval(putaranBersih);
    for (const t of [...timerBongkar.values(), ...timerHost.values()]) clearTimeout(t);
    for (const r of ruangAktif.values()) await simpanRuang(r);
    await new Promise<void>((selesai) => io.close(() => selesai()));
  }

  return { httpServer, io, tutup };
}
