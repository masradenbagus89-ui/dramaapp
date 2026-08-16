"use client";

// Daftar video dari API pihak lain + pemutarnya. Ini juga halaman BUKTI
// bahwa jalur "terima data API -> tinggal play" benar-benar jalan.
//
// Empat keadaan tampilan sengaja dibedakan supaya tidak ada layar putih yang
// bikin bingung: sedang memuat / gagal / kosong / berhasil.
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Inbox, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmbedPlayer from "./EmbedPlayer";
import type { ExternalVideo } from "@/lib/external-video";

type Status = "loading" | "error" | "empty" | "ready";

export default function ExternalVideoBrowser() {
  const [status, setStatus] = useState<Status>("loading");
  const [videos, setVideos] = useState<ExternalVideo[]>([]);
  const [active, setActive] = useState<ExternalVideo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [skipped, setSkipped] = useState(0);

  const muat = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/external-videos", { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        videos?: ExternalVideo[];
        skipped?: number;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? `Gagal memuat (HTTP ${res.status}).`);
        setStatus("error");
        return;
      }

      const list = data.videos ?? [];
      setVideos(list);
      setSkipped(data.skipped ?? 0);
      setActive(list[0] ?? null);
      setStatus(list.length > 0 ? "ready" : "empty");
    } catch {
      setErrorMsg("Tidak bisa menghubungi server aplikasi ini.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-white">Video dari API luar</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Datanya dijemput dari API penyedia; videonya diputar oleh player milik
          mereka. Aplikasi ini hanya menampilkan bingkainya.
        </p>
      </header>

      {/* 1) Sedang memuat */}
      {status === "loading" && (
        <div className="space-y-3" aria-busy="true">
          <div className="aspect-video w-full animate-pulse rounded-xl bg-zinc-800" />
          <div className="h-11 w-full animate-pulse rounded-lg bg-zinc-800" />
          <p className="text-sm text-zinc-400">Mengambil data dari API…</p>
        </div>
      )}

      {/* 2) Gagal */}
      {status === "error" && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-5">
          <p className="flex items-start gap-2 text-sm text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </p>
          <Button
            onClick={() => void muat()}
            className="mt-4 min-h-11 rounded-full px-5 text-sm font-semibold"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Coba lagi
          </Button>
        </div>
      )}

      {/* 3) Kosong (API jalan, tapi tidak ada video yang lolos) */}
      {status === "empty" && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 text-center">
          <Inbox className="mx-auto h-8 w-8 text-zinc-500" aria-hidden="true" />
          <p className="mt-3 text-sm text-zinc-300">Belum ada video yang bisa ditampilkan.</p>
          {skipped > 0 && (
            <p className="mt-2 text-xs text-amber-300">
              {skipped} video dilewati karena domainnya belum diizinkan. Tambahkan
              domain penyedia ke <code className="font-mono">EXTERNAL_VIDEO_EMBED_HOSTS</code>,
              lalu muat ulang.
            </p>
          )}
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
      {status === "ready" && active && (
        <>
          <EmbedPlayer src={active.embedUrl} title={active.title} />
          <p className="mt-2 text-sm font-semibold text-white">{active.title}</p>
          <p className="text-xs text-zinc-500">Sumber: {active.provider}</p>

          {videos.length > 1 && (
            <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {videos.map((v) => {
                const dipilih = v.id === active.id;
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => setActive(v)}
                      aria-current={dipilih ? "true" : undefined}
                      className={`flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
                        dipilih
                          ? "border-amber-400 bg-amber-400/15 text-amber-200"
                          : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800"
                      }`}
                    >
                      <Play className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="line-clamp-2">
                        {v.episode !== null ? `Ep ${v.episode} — ` : ""}
                        {v.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {skipped > 0 && (
            <p className="mt-4 text-xs text-amber-300">
              Catatan: {skipped} video dilewati karena domainnya belum ada di
              daftar izin.
            </p>
          )}
        </>
      )}
    </div>
  );
}
