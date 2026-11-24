"use client";

// Halaman Room Nonton Bareng (bagian browser).
//
// Tata letak: video utama; chat + penonton di KANAN pada layar lebar, di BAWAH
// video pada HP. Urutan HP sengaja video → chat → undangan, supaya chat (yang
// paling sering dipakai saat menonton) tak tenggelam di bawah kotak undangan.
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Crown, LoaderCircle, Users, Volume2, Wifi, WifiOff } from "lucide-react";
import PlaylyPlayer from "@/app/components/player/PlaylyPlayer";
import { readUser } from "@/lib/auth";
import { MAKS_PANJANG_NAMA, rapikanNama, TOLERANSI_SELISIH_DETIK } from "@/nobar-server/src/kontrak";
import { useNobar, type Koneksi } from "./useNobar";
import { useSinkronVideo } from "./useSinkronVideo";
import ChatNobar from "./ChatNobar";
import DaftarPenonton from "./DaftarPenonton";
import UndanganNobar from "./UndanganNobar";

/** Peringatan dari server (rate limit, ditolak) hilang sendiri sesudah sekian ms. */
const UMUR_PERINGATAN_MS = 5000;

type Props = {
  token: string;
  judul: string;
  videoId: string;
  poster: string | null;
  /** null = pengunjung belum masuk Room ini (belum punya cookie peserta). */
  namaAwal: string | null;
};

export default function RuangNobar(props: Props) {
  const [sudahGabung, setSudahGabung] = useState(props.namaAwal !== null);
  if (!sudahGabung) {
    return <Kerangka {...props}><FormGabung token={props.token} judul={props.judul} onBerhasil={() => setSudahGabung(true)} /></Kerangka>;
  }
  return <Room {...props} />;
}

function Kerangka({ judul, videoId, children }: Props & { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link
          href={`/tonton/${encodeURIComponent(videoId)}`}
          className="inline-flex items-center gap-1 text-sm text-zinc-400 transition hover:text-rose-300"
        >
          <ChevronLeft className="size-4" />
          Keluar
        </Link>
        <span className="flex items-center gap-1.5 rounded-full bg-rose-600/15 px-2.5 py-1 text-xs font-semibold text-rose-300">
          <Users className="size-3.5" aria-hidden="true" />
          Nonton Bareng
        </span>
        <p className="min-w-0 truncate text-sm text-zinc-400">{judul}</p>
      </header>
      {children}
    </main>
  );
}

function FormGabung({ token, judul, onBerhasil }: { token: string; judul: string; onBerhasil: () => void }) {
  const [nama, setNama] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, setProses] = useState(false);
  // Penonton yang sudah login tak perlu mengetik nama lagi — cukup dikonfirmasi.
  useEffect(() => setNama((n) => n || (readUser()?.name ?? "").slice(0, MAKS_PANJANG_NAMA)), []);

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rapikanNama(nama)) return setGalat(`Isi nama 1-${MAKS_PANJANG_NAMA} huruf.`);
    setProses(true);
    setGalat(null);
    try {
      const res = await fetch(`/api/watch-room/${token}/gabung`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return setGalat(data.error ?? "Gagal masuk Room.");
      // Klik tombol ini juga = "sentuhan pengguna" yang membuka izin video bersuara.
      onBerhasil();
    } catch {
      setGalat("Gagal menghubungi server. Cek koneksi lalu coba lagi.");
    } finally {
      setProses(false);
    }
  };

  return (
    <form onSubmit={kirim} className="mx-auto mt-10 max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h1 className="text-lg font-bold">Kamu diundang nonton bareng</h1>
      <p className="mt-1 text-sm text-zinc-400">{judul}</p>
      <label className="mt-5 block text-sm font-medium text-zinc-300">
        Nama yang tampil ke penonton lain
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          maxLength={MAKS_PANJANG_NAMA}
          autoFocus
          className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-rose-400 focus:outline-none"
        />
      </label>
      {galat && <p role="alert" className="mt-2 text-sm text-rose-300">{galat}</p>}
      <button
        type="submit"
        disabled={proses}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
      >
        {proses && <LoaderCircle className="size-4 animate-spin" />}
        Gabung &amp; mulai nonton
      </button>
    </form>
  );
}

function Room(props: Props) {
  const { token, judul, videoId, poster } = props;
  const room = useNobar(token, true);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const sayaHost = room.saya?.peran === "host";
  const sinkron = useSinkronVideo({
    video,
    host: sayaHost,
    status: room.status,
    jamServer: room.jamServer,
    kontrol: room.aksi.kontrol,
    laporan: room.aksi.laporan,
  });

  const [peringatan, setPeringatan] = useState<string | null>(null);
  useEffect(() => {
    if (!room.peringatan) return;
    setPeringatan(room.peringatan.teks);
    const t = setTimeout(() => setPeringatan(null), UMUR_PERINGATAN_MS);
    return () => clearTimeout(t);
  }, [room.peringatan]);

  if (room.koneksi === "berakhir" || room.koneksi === "keluar") {
    return (
      <Kerangka {...props}>
        <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
          <h1 className="text-lg font-bold">{room.koneksi === "berakhir" ? "Room sudah berakhir" : "Tidak bisa masuk"}</h1>
          <p className="mt-2 text-sm text-zinc-400">{room.alasanBerakhir}</p>
          <Link
            href={`/tonton/${encodeURIComponent(videoId)}`}
            className="mt-5 inline-block rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-500"
          >
            Tonton sendiri
          </Link>
        </div>
      </Kerangka>
    );
  }

  const hostOffline = room.host ? !room.host.online : false;

  return (
    <Kerangka {...props}>
      <div className="mx-auto grid max-w-7xl gap-4 px-0 pb-8 md:px-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* KOLOM VIDEO */}
        <div className="min-w-0 space-y-3">
          <div className="relative">
            <PlaylyPlayer
              videoId={videoId}
              title={judul}
              poster={poster}
              nobar={{ terkunci: !sayaHost, onVideo: setVideo }}
            />
            {sinkron.dibisukanBrowser && (
              <button
                type="button"
                onClick={sinkron.nyalakanSuara}
                className="absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-black"
              >
                <Volume2 className="size-4" />
                Ketuk untuk menyalakan suara
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 px-4 md:px-0">
            <h1 className="mr-auto min-w-0 text-lg font-bold md:text-xl">{judul}</h1>
            <LencanaKoneksi koneksi={room.koneksi} />
            {sayaHost ? (
              <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
                <Crown className="size-3.5" aria-hidden="true" />
                Kamu Host — kamu yang mengatur video
              </span>
            ) : (
              <LencanaSinkron selisih={sinkron.selisih} tersambung={room.koneksi === "tersambung"} />
            )}
          </div>

          {!sayaHost && hostOffline && (
            <p role="status" className="mx-4 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-200 md:mx-0">
              Host sedang offline. Kalau tidak kembali dalam 1 menit, peran Host pindah otomatis ke penonton yang paling lama ikut.
            </p>
          )}
        </div>

        {/* PANEL KANAN (desktop) / di bawah video (HP) */}
        <aside className="flex max-h-[70vh] min-h-[420px] flex-col overflow-hidden border-y border-zinc-800 bg-zinc-900 md:rounded-xl md:border lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100vh-6rem)]">
          <DaftarPenonton
            peserta={room.peserta}
            sayaId={room.saya?.id ?? null}
            sayaHost={sayaHost}
            onSerahkan={room.aksi.serahkanHost}
          />
          <ChatNobar
            pesan={room.pesan}
            sayaId={room.saya?.id ?? null}
            bisaKirim={room.koneksi === "tersambung"}
            peringatan={peringatan}
            onKirim={room.aksi.chat}
          />
        </aside>

        <div className="space-y-3 px-4 md:px-0">
          <UndanganNobar token={token} judul={judul} />
          {sayaHost && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Akhiri Room untuk semua penonton? Link undangan tidak bisa dipakai lagi.")) {
                  room.aksi.akhiriRoom();
                }
              }}
              className="w-full rounded-xl border border-rose-500/40 px-4 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
            >
              Akhiri Room
            </button>
          )}
        </div>
      </div>
    </Kerangka>
  );
}

function LencanaKoneksi({ koneksi }: { koneksi: Koneksi }) {
  if (koneksi === "tersambung") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
        <Wifi className="size-3.5" aria-hidden="true" />
        Tersambung
      </span>
    );
  }
  return (
    <span role="status" className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
      {koneksi === "menyambung" ? <LoaderCircle className="size-3.5 animate-spin" /> : <WifiOff className="size-3.5" />}
      {koneksi === "menyambung" ? "Menyambung…" : "Terputus — menyambung ulang…"}
    </span>
  );
}

function LencanaSinkron({ selisih, tersambung }: { selisih: number | null; tersambung: boolean }) {
  if (!tersambung || selisih === null) return null;
  const pas = selisih <= TOLERANSI_SELISIH_DETIK;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pas ? "bg-sky-500/15 text-sky-300" : "bg-amber-400/15 text-amber-300"}`}>
      {pas ? "Sinkron dengan Host" : "Menyesuaikan dengan Host…"}
    </span>
  );
}
