"use client";

// Grid video yang di-upload lewat dashboard (playly-dashboard).
//
// Datanya diambil dari /api/videos — jalur milik WebMovie sendiri, yang di
// belakang layar meneruskan ke API dashboard. Video diputar dengan tag <video>
// biasa karena berkasnya ada di Supabase Storage (berkas .mp4 langsung),
// BUKAN player milik orang lain — jadi kita tetap pegang kendali putar/pause.
//
// Empat keadaan tampilan dibedakan supaya tidak ada layar kosong yang bikin
// bingung: sedang memuat / gagal / belum ada video / berhasil.
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Film, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardVideo } from "@/lib/dashboard-videos";

type Status = "loading" | "error" | "empty" | "ready";

export default function DashboardVideoGrid() {
  const [status, setStatus] = useState<Status>("loading");
  const [videos, setVideos] = useState<DashboardVideo[]>([]);
  const [aktif, setAktif] = useState<DashboardVideo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const playerRef = useRef<HTMLDivElement | null>(null);

  const muat = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/videos", { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        videos?: DashboardVideo[];
        error?: string;
      };

      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? `Gagal memuat (HTTP ${res.status}).`);
        setStatus("error");
        return;
      }

      const list = data.videos ?? [];
      setVideos(list);
      setStatus(list.length > 0 ? "ready" : "empty");
    } catch {
      setErrorMsg("Tidak bisa menghubungi server WebMovie.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  // Klik kartu -> pilih video + gulirkan layar ke pemutarnya, supaya di HP
  // pengguna tidak bingung "kok tidak terjadi apa-apa" (pemutar ada di atas).
  const putar = (v: DashboardVideo) => {
    setAktif(v);
    requestAnimationFrame(() => {
      playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <section className="mt-10" aria-labelledby="judul-video-dashboard">
      <h2 id="judul-video-dashboard" className="text-lg font-bold text-white">
        Video terbaru
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        Diambil langsung dari dashboard upload.
      </p>

      {/* 1) Sedang memuat */}
      {status === "loading" && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-video animate-pulse rounded-xl bg-zinc-800" />
          ))}
        </div>
      )}

      {/* 2) Gagal */}
      {status === "error" && (
        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-5">
          <p className="flex items-start gap-2 text-sm text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </p>
          <Button onClick={() => void muat()} className="mt-4 min-h-11 rounded-full px-5 text-sm font-semibold">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Coba lagi
          </Button>
        </div>
      )}

      {/* 3) Belum ada video */}
      {status === "empty" && (
        <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900 p-6 text-center">
          <Film className="mx-auto h-8 w-8 text-zinc-500" aria-hidden="true" />
          <p className="mt-3 text-sm text-zinc-300">
            Belum ada video yang di-upload dari dashboard.
          </p>
          <Button
            onClick={() => void muat()}
            variant="outline"
            className="mt-4 min-h-11 rounded-full px-5 text-sm font-semibold"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Muat ulang
          </Button>
        </div>
      )}

      {/* 4) Berhasil */}
      {status === "ready" && (
        <>
          <div ref={playerRef} className="scroll-mt-4">
            {aktif && (
              <div className="mt-4">
                <video
                  key={aktif.videoUrl}
                  src={aktif.videoUrl}
                  poster={aktif.thumbnail ?? undefined}
                  controls
                  autoPlay
                  playsInline
                  className="aspect-video w-full rounded-xl bg-black"
                >
                  Browser kamu tidak mendukung pemutar video bawaan.
                </video>
                <h3 className="mt-2 text-sm font-semibold text-white">{aktif.title}</h3>
                {aktif.description && (
                  <p className="mt-1 text-xs text-zinc-400">{aktif.description}</p>
                )}
              </div>
            )}
          </div>

          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {videos.map((v) => {
              const dipilih = aktif?.id === v.id;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => putar(v)}
                    aria-current={dipilih ? "true" : undefined}
                    className={`group w-full overflow-hidden rounded-xl border text-left transition ${
                      dipilih
                        ? "border-amber-400 ring-2 ring-amber-400/40"
                        : "border-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    <div className="relative aspect-video w-full bg-zinc-800">
                      {v.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.thumbnail}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Film className="h-7 w-7 text-zinc-600" aria-hidden="true" />
                        </div>
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                        <Play className="h-8 w-8 fill-white text-white" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="p-2.5">
                      <p className="line-clamp-2 text-xs font-semibold text-zinc-100">
                        {v.title}
                      </p>
                      {v.description && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-zinc-400">
                          {v.description}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
