"use client";

// Koneksi Nonton Bareng di browser: socket, reconnect, dan isi Room.
//
// Tahan-putus (rak realtime §2.4):
//   • Tiap (re)connect meminta TIKET BARU ke Next — tiket lama basi 60 detik.
//   • Putus karena jaringan → socket.io menyambung ulang sendiri (backoff + jitter).
//   • Ditolak middleware / diputus server → socket.io TIDAK mencoba lagi sendiri,
//     jadi dijadwalkan di sini dengan jeda yang makin panjang.
//   • Sesudah tersambung, server mengirim SNAPSHOT penuh → layar tak pernah
//     menampilkan status basi dari sebelum putus.
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  EVENT,
  selisihJam,
  type AksiKontrol,
  type PesanPublik,
  type PesertaPublik,
  type Snapshot,
  type StatusPemutaran,
} from "@/nobar-server/src/kontrak";

export type Koneksi = "menyambung" | "tersambung" | "terputus" | "berakhir" | "keluar";

/** Pesan yang disimpan di layar — lebih dari ini yang paling lama dibuang (memori HP terbatas). */
const MAKS_PESAN_DIINGAT = 200;
const JEDA_ULANG_MAKS_MS = 15_000;

type Tiket = { tiket: string; url: string };

class TiketDitolak extends Error {}

async function ambilTiket(token: string): Promise<Tiket> {
  const res = await fetch(`/api/watch-room/${token}/tiket`, { method: "POST" });
  if (res.status === 401) throw new TiketDitolak();
  if (!res.ok) throw new Error(`tiket ${res.status}`);
  return (await res.json()) as Tiket;
}

export function useNobar(token: string, aktif: boolean) {
  const [koneksi, setKoneksi] = useState<Koneksi>("menyambung");
  const [sayaId, setSayaId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusPemutaran | null>(null);
  const [peserta, setPeserta] = useState<PesertaPublik[]>([]);
  const [pesan, setPesan] = useState<PesanPublik[]>([]);
  const [alasanBerakhir, setAlasanBerakhir] = useState<string | null>(null);
  const [peringatan, setPeringatan] = useState<{ teks: string; pada: number } | null>(null);
  const soketRef = useRef<Socket | null>(null);
  const selisihJamRef = useRef(0);

  useEffect(() => {
    if (!aktif) return;
    let selesai = false; // komponen dilepas ATAU Room berakhir → berhenti mencoba
    let percobaan = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let soket: Socket | null = null;

    const jedaBerikut = () =>
      Math.min(JEDA_ULANG_MAKS_MS, 1000 * 2 ** percobaan++) * (0.5 + Math.random());

    const akhiri = (k: Koneksi, alasan: string) => {
      selesai = true;
      clearTimeout(timer);
      setKoneksi(k);
      setAlasanBerakhir(alasan);
      soket?.disconnect();
    };

    const jadwalUlang = (fn: () => void) => {
      if (selesai) return;
      clearTimeout(timer);
      timer = setTimeout(fn, jedaBerikut());
    };

    const mulai = async () => {
      let awal: Tiket;
      try {
        awal = await ambilTiket(token);
      } catch (e) {
        if (e instanceof TiketDitolak) return akhiri("keluar", "Sesi kamu di Room ini tidak ditemukan. Buka ulang link undangan.");
        setKoneksi("terputus");
        return jadwalUlang(mulai);
      }
      if (selesai) return;

      let tiketAwal: string | null = awal.tiket;
      soket = io(awal.url, {
        auth: (cb) => {
          // Percobaan pertama memakai tiket yang baru diambil; sesudahnya selalu minta baru.
          if (tiketAwal) {
            const t = tiketAwal;
            tiketAwal = null;
            return cb({ tiket: t });
          }
          ambilTiket(token)
            .then((t) => cb({ tiket: t.tiket }))
            .catch(() => cb({ tiket: "" }));
        },
        reconnectionDelay: 1000,
        reconnectionDelayMax: JEDA_ULANG_MAKS_MS,
        randomizationFactor: 0.5,
      });
      soketRef.current = soket;
      const s = soket;

      s.on("connect", async () => {
        percobaan = 0;
        setKoneksi("tersambung");
        // Jam HP penonton bisa meleset beberapa detik dari jam server; tanpa
        // koreksi ini, "posisi Host sekarang" dihitung dengan jam yang salah.
        const kirim = Date.now();
        try {
          const jamServer = (await s.timeout(5000).emitWithAck(EVENT.waktu)) as number;
          selisihJamRef.current = selisihJam(kirim, Date.now(), jamServer);
        } catch {
          // Tanpa ukuran baru, pakai selisih terakhir — lebih baik dari menebak nol.
        }
      });
      s.on("connect_error", (err) => {
        if (selesai) return;
        if (err.message === "berakhir") return akhiri("berakhir", "Room ini sudah berakhir.");
        setKoneksi("terputus");
        if (!s.active) jadwalUlang(() => s.connect());
      });
      s.on("disconnect", (alasan) => {
        if (selesai) return;
        setKoneksi("terputus");
        if (alasan === "io server disconnect") jadwalUlang(() => s.connect());
      });
      s.on(EVENT.snapshot, (snap: Snapshot) => {
        setSayaId(snap.saya.id);
        setStatus(snap.status);
        setPeserta(snap.peserta);
        setPesan(snap.pesan);
      });
      // `seq` menjaga urutan: status lama yang tiba terlambat tidak menimpa yang baru.
      s.on(EVENT.status, (st: StatusPemutaran) =>
        setStatus((lama) => (!lama || st.seq >= lama.seq ? st : lama)),
      );
      s.on(EVENT.peserta, (daftar: PesertaPublik[]) => setPeserta(daftar));
      s.on(EVENT.pesan, (m: PesanPublik) => setPesan((l) => [...l, m].slice(-MAKS_PESAN_DIINGAT)));
      s.on(EVENT.ditolak, (x: { alasan: string }) => setPeringatan({ teks: x.alasan, pada: Date.now() }));
      s.on(EVENT.berakhir, (x: { alasan: string }) => akhiri("berakhir", x.alasan));
    };

    void mulai();
    return () => {
      selesai = true;
      clearTimeout(timer);
      soket?.removeAllListeners();
      soket?.disconnect();
      soketRef.current = null;
    };
  }, [token, aktif]);

  const kirim = useCallback((event: string, isi?: unknown) => {
    soketRef.current?.emit(event, isi);
  }, []);

  const kontrol = useCallback(
    (aksi: AksiKontrol, posisi: number) => kirim(EVENT.kontrol, { aksi, posisi }),
    [kirim],
  );
  const laporan = useCallback(
    (posisi: number, main: boolean) => kirim(EVENT.laporan, { posisi, main }),
    [kirim],
  );
  const chat = useCallback((isi: string) => kirim(EVENT.chat, { isi }), [kirim]);
  const serahkanHost = useCallback((pesertaId: string) => kirim(EVENT.serahkanHost, { pesertaId }), [kirim]);
  const akhiriRoom = useCallback(() => kirim(EVENT.akhiri), [kirim]);
  /** Jam server menurut perkiraan browser ini. */
  const jamServer = useCallback(() => Date.now() + selisihJamRef.current, []);

  // Peran dibaca dari daftar peserta (bukan dari snapshot saja) supaya ikut
  // berubah saat Host berpindah tanpa perlu snapshot baru.
  const saya = peserta.find((p) => p.id === sayaId) ?? null;
  const host = peserta.find((p) => p.peran === "host") ?? null;

  return {
    koneksi,
    saya,
    host,
    status,
    peserta,
    pesan,
    alasanBerakhir,
    peringatan,
    aksi: { kontrol, laporan, chat, serahkanHost, akhiriRoom },
    jamServer,
  };
}
