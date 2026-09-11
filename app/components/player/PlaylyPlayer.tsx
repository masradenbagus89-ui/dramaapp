"use client";

// Pemutar DramaKu untuk video Playly.
//
// KENAPA ADA (2026-09-09): halaman /playly dulu memakai <iframe> milik Playly
// (EmbedPlayer). Akibatnya tombol-tombol yang dilihat penonton adalah milik
// pemutar mereka, dan menu titik tiga yang muncul cuma menu bawaan Chrome
// berisi "Playback speed" + "Picture in picture". Isi iframe beda domain, jadi
// menu itu MUSTAHIL diganti dari luar (same-origin policy). Owner memutuskan
// video Playly diputar pemutar sendiri supaya menunya bisa kita isi.
//
// KONSEKUENSI yang disetujui owner: video tidak lagi lewat pemutar resmi
// Playly, jadi hitungan tayang di dashboard mereka bisa berhenti bertambah.
//
// Berbeda dari FeedPlayer (pemutar episode drama: episode, koin, komentar,
// paywall), berkas ini sengaja hanya mengurus SATU video utuh tanpa episode.
// FeedPlayer tidak dipakai ulang di sini karena hampir seluruh isinya tidak
// berlaku untuk video Playly, dan menyeretnya masuk justru menambah jalan yang
// tak pernah dilewati.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  LoaderCircle,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import PlayerMenu, { type OpsiMenu } from "./PlayerMenu";

const KECEPATAN: OpsiMenu[] = [
  { nilai: "0.5", label: "0,5×" },
  { nilai: "1", label: "Normal" },
  { nilai: "1.25", label: "1,25×" },
  { nilai: "1.5", label: "1,5×" },
  { nilai: "2", label: "2×" },
];

// Pencahayaan sinematik = penyetelan tampilan (kontras/warna) seperti mode
// bioskop di TV. Dikerjakan filter CSS, jadi tidak menyentuh isi videonya dan
// tidak menambah data yang diunduh. Angkanya sengaja cukup kuat supaya bedanya
// TERLIHAT saat disalakan — efek yang terlalu halus akan dikira tidak jalan.
const FILTER_SINEMATIK = "contrast(1.18) saturate(1.35) brightness(1.06)";

/** Detik kontrol tetap terlihat setelah penonton berhenti menggerakkan kursor. */
const KONTROL_HILANG_MS = 3000;

export default function PlaylyPlayer({
  videoId,
  title,
  poster,
}: {
  videoId: string;
  title: string;
  poster?: string | null;
}) {
  const wadahRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const seekRef = useRef<HTMLDivElement | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);
  const [percobaan, setPercobaan] = useState(0);

  const [paused, setPaused] = useState(true);
  const [curTime, setCurTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState("1");
  const [sinematik, setSinematik] = useState(false);
  const [pipDidukung, setPipDidukung] = useState(false);
  const [pipAktif, setPipAktif] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [kontrolTampil, setKontrolTampil] = useState(true);
  const [menuTerbuka, setMenuTerbuka] = useState(false);

  // Alamat berkas diambil SAAT DIPUTAR, bukan saat halaman dirender: alamatnya
  // bertanda tangan dan hanya berlaku ~6 jam, sedangkan halaman /playly
  // disimpan 300 detik. Kalau ikut dibakar ke halaman, suatu saat penonton
  // menerima alamat yang sudah kedaluwarsa.
  useEffect(() => {
    let dibatalkan = false;
    setVideoUrl(null);
    setGagal(null);

    (async () => {
      try {
        const res = await fetch(`/api/playly/video?id=${encodeURIComponent(videoId)}`);
        const data = await res.json();
        if (dibatalkan) return;
        if (!res.ok || !data?.videoUrl) {
          setGagal(data?.error ?? "Video tidak bisa dimuat.");
          return;
        }
        setVideoUrl(data.videoUrl as string);
      } catch {
        if (!dibatalkan) setGagal("Gagal menghubungi server. Cek koneksi lalu coba lagi.");
      }
    })();

    return () => {
      dibatalkan = true;
    };
  }, [videoId, percobaan]);

  // document/window HANYA disentuh sesudah komponen tampil di browser. Dibaca
  // saat render, hasilnya akan beda antara server dan browser dan React
  // membuang seluruh isi pemutar (hydration mismatch).
  useEffect(() => {
    setPipDidukung(typeof document !== "undefined" && document.pictureInPictureEnabled);
  }, []);

  useEffect(() => {
    const padaUbah = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", padaUbah);
    return () => document.removeEventListener("fullscreenchange", padaUbah);
  }, []);

  // Masuk/keluar PiP dipantau lewat addEventListener, BUKAN prop onEnter...
  // di JSX: React tidak mengenali kedua event itu sebagai prop (ditolak
  // typecheck). Perlu dipantau karena penonton bisa menutup jendela PiP lewat
  // tombol milik browser, dan label menu harus ikut berubah.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const masuk = () => setPipAktif(true);
    const keluar = () => setPipAktif(false);
    v.addEventListener("enterpictureinpicture", masuk);
    v.addEventListener("leavepictureinpicture", keluar);
    return () => {
      v.removeEventListener("enterpictureinpicture", masuk);
      v.removeEventListener("leavepictureinpicture", keluar);
    };
  }, [videoUrl]);

  // Kontrol menghilang sendiri saat video berjalan supaya tidak menutupi
  // gambar. Ditahan selama menu terbuka — menu yang lenyap saat sedang dibaca
  // membuat penonton mengira menunya rusak.
  useEffect(() => {
    if (paused || menuTerbuka || !kontrolTampil) return;
    const t = setTimeout(() => setKontrolTampil(false), KONTROL_HILANG_MS);
    return () => clearTimeout(t);
  }, [paused, menuTerbuka, kontrolTampil]);

  const bangunkanKontrol = useCallback(() => setKontrolTampil(true), []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  }, []);

  const togglePip = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      // Browser boleh menolak (mis. video belum siap). Bukan alasan merusak
      // pemutar — cukup tidak terjadi apa-apa.
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const wadah = wadahRef.current;
    if (!wadah) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wadah.requestFullscreen();
    } catch {
      // Sebagian browser HP menolak layar penuh pada elemen non-video.
    }
  }, []);

  const geserKe = (e: React.PointerEvent<HTMLDivElement>) => {
    const bar = seekRef.current;
    const v = videoRef.current;
    if (!bar || !v || !dur) return;
    const kotak = bar.getBoundingClientRect();
    const rasio = Math.min(Math.max((e.clientX - kotak.left) / kotak.width, 0), 1);
    v.currentTime = rasio * dur;
    setCurTime(v.currentTime);
  };

  const ubahSpeed = (nilai: string) => {
    setSpeed(nilai);
    if (videoRef.current) videoRef.current.playbackRate = Number(nilai);
  };

  const ubahVolume = (nilai: number) => {
    setVolume(nilai);
    setMuted(nilai === 0);
    const v = videoRef.current;
    if (v) {
      v.volume = nilai;
      v.muted = nilai === 0;
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const baru = !muted;
    v.muted = baru;
    setMuted(baru);
  };

  // KENAPA Volume Stabil & Penguat Suara dimatikan untuk video Playly:
  // keduanya butuh Web Audio API, dan Web Audio hanya boleh menyentuh suara
  // dari berkas yang mengizinkan akses lintas domain (CORS). Berkas video
  // Playly disimpan di Cloudflare R2 TANPA header Access-Control-Allow-Origin
  // (dicek langsung 2026-09-09), jadi memaksakannya cuma menghasilkan video
  // bisu. Dites dari alamat berkasnya, bukan diasumsikan: kalau suatu hari
  // videonya disajikan dari domain kita sendiri, kedua fitur ini hidup
  // sendirinya tanpa mengubah kode.
  const olahSuaraBisa = seOrigin(videoUrl);
  const alasanSuaraMati = olahSuaraBisa
    ? undefined
    : "tidak tersedia untuk video ini — sumbernya tidak mengizinkan suara diolah";

  const sedangMemuat = !videoUrl && !gagal;

  return (
    <div
      ref={wadahRef}
      onPointerMove={bangunkanKontrol}
      onPointerLeave={() => !paused && !menuTerbuka && setKontrolTampil(false)}
      className="relative aspect-video w-full overflow-hidden rounded-xl bg-black"
    >
      {sedangMemuat && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900">
          <LoaderCircle className="size-8 animate-spin text-amber-400" />
          <span className="sr-only">Memuat video…</span>
        </div>
      )}

      {gagal && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-zinc-900 px-6 text-center">
          <AlertTriangle className="size-8 text-rose-300" aria-hidden="true" />
          <p className="text-sm text-rose-200">{gagal}</p>
          <button
            type="button"
            onClick={() => setPercobaan((n) => n + 1)}
            className="flex items-center gap-2 rounded-full border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-zinc-400"
          >
            <RotateCcw className="size-4" />
            Coba lagi
          </button>
        </div>
      )}

      {videoUrl && (
        <video
          ref={videoRef}
          key={videoUrl}
          src={videoUrl}
          poster={poster ?? undefined}
          title={title}
          autoPlay
          playsInline
          // controls bawaan SENGAJA dimatikan: justru dari situ menu titik tiga
          // Chrome ("Playback speed" + "Picture in picture") muncul, dan itu
          // yang digantikan menu kita di kanan bawah.
          controls={false}
          preload="metadata"
          className="absolute inset-0 h-full w-full bg-black object-contain transition-[filter] duration-300"
          style={{ filter: sinematik ? FILTER_SINEMATIK : undefined }}
          onClick={togglePlay}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onTimeUpdate={(e) => setCurTime(e.currentTarget.currentTime)}
          onDurationChange={(e) => setDur(e.currentTarget.duration || 0)}
          onVolumeChange={(e) => {
            setVolume(e.currentTarget.volume);
            setMuted(e.currentTarget.muted);
          }}
          onError={() =>
            setGagal(
              "Video gagal diputar. Alamatnya mungkin sudah kedaluwarsa — coba lagi.",
            )
          }
        />
      )}

      {videoUrl && paused && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Putar"
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm transition hover:bg-black/70">
            <Play className="ml-1 size-7 fill-white text-white" strokeWidth={0} />
          </span>
        </button>
      )}

      {videoUrl && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-3 pb-2.5 pt-10 transition-opacity duration-300",
            kontrolTampil || paused || menuTerbuka
              ? "opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >
          <div
            ref={seekRef}
            role="slider"
            aria-label="Posisi video"
            aria-valuemin={0}
            aria-valuemax={Math.round(dur)}
            aria-valuenow={Math.round(curTime)}
            tabIndex={0}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              geserKe(e);
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) geserKe(e);
            }}
            className="mb-1.5 flex h-5 cursor-pointer touch-none select-none items-center"
          >
            <div className="relative h-1 w-full rounded-full bg-white/25">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-amber-400"
                style={{ width: dur ? `${(curTime / dur) * 100}%` : "0%" }}
              />
              <div
                className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 shadow"
                style={{ left: dur ? `${(curTime / dur) * 100}%` : "0%" }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={paused ? "Putar" : "Jeda"}
              className="flex size-9 items-center justify-center rounded-full text-white transition hover:bg-white/15"
            >
              {paused ? (
                <Play className="size-5 fill-white" strokeWidth={0} />
              ) : (
                <Pause className="size-5 fill-white" strokeWidth={0} />
              )}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted || volume === 0 ? "Nyalakan suara" : "Bisukan"}
              className="flex size-9 items-center justify-center rounded-full text-white transition hover:bg-white/15"
            >
              {muted || volume === 0 ? (
                <VolumeX className="size-5" />
              ) : (
                <Volume2 className="size-5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => ubahVolume(Number(e.target.value))}
              aria-label="Volume"
              className="hidden h-1 w-16 cursor-pointer accent-amber-400 sm:block"
            />

            <span className="ml-1 text-[11px] tabular-nums text-white/80">
              {fmtTime(curTime)} / {fmtTime(dur)}
            </span>

            <div className="ml-auto flex items-center gap-1">
              <PlayerMenu
                onTerbukaChange={setMenuTerbuka}
                pip={{ didukung: pipDidukung, aktif: pipAktif, onToggle: togglePip }}
                volumeStabil={{
                  aktif: false,
                  onUbah: () => undefined,
                  alasanMati: alasanSuaraMati,
                }}
                penguatSuara={{
                  aktif: false,
                  onUbah: () => undefined,
                  alasanMati: alasanSuaraMati,
                }}
                sinematik={{ aktif: sinematik, onUbah: setSinematik }}
                // Terjemahan & Kualitas tampil apa adanya (keputusan owner
                // 2026-09-09). Playly TIDAK mengirim berkas subtitle maupun
                // varian resolusi — dicek ke API mereka, kosong di 9 dari 9
                // video. Daftar pilihannya sengaja tidak dikarang supaya tidak
                // ada tombol yang diklik lalu tidak terjadi apa-apa.
                terjemahan={{
                  nilai: "mati",
                  opsi: [{ nilai: "mati", label: "Mati" }],
                  onPilih: () => undefined,
                  catatan: "Sumber video ini tidak menyertakan berkas terjemahan.",
                }}
                kecepatan={{ nilai: speed, opsi: KECEPATAN, onPilih: ubahSpeed }}
                kualitas={{
                  nilai: "auto",
                  opsi: [{ nilai: "auto", label: "Auto" }],
                  onPilih: () => undefined,
                  catatan:
                    "Sumber video ini hanya menyediakan satu kualitas, jadi tidak ada pilihan lain.",
                }}
              />

              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={fullscreen ? "Keluar layar penuh" : "Layar penuh"}
                className="flex size-9 items-center justify-center rounded-full text-white transition hover:bg-white/15"
              >
                {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Apakah berkas video berasal dari domain yang sama dengan halaman ini.
 *
 * Dipakai sebagai syarat fitur olah-suara (Volume Stabil, Penguat Suara): Web
 * Audio API menolak memproses media dari domain lain yang tidak mengizinkan
 * akses lintas domain, dan hasilnya video jadi bisu — bukan pesan error. Lebih
 * baik fitur ditandai tidak tersedia daripada penonton kehilangan suara.
 *
 * null (alamat belum diambil) dihitung "bukan se-origin" supaya menu tidak
 * sempat menampilkan fitur yang belum tentu bisa dipakai.
 */
function seOrigin(src: string | null): boolean {
  if (!src || typeof window === "undefined") return false;
  try {
    return new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}
