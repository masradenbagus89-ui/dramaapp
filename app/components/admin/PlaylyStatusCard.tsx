"use client";

// Kartu status sambungan Playly di Dashboard admin.
//
// KENAPA ada: video Playly hanya tampil di halaman publik /discover, jadi tanpa
// kartu ini admin harus membuka situs sebagai pengunjung untuk tahu sambungannya
// hidup atau mati.
//
// Kunci Playly TIDAK pernah menyeberang ke browser: kartu ini memanggil
// /api/videos (server kita sendiri), dan server itulah yang memegang kuncinya.
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Film, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ringkasStatusPlayly,
  type BalasanVideos,
  type RingkasanPlayly,
  type StatusPlayly,
} from "@/lib/playly-status";

const GAYA: Record<StatusPlayly, { titik: string; teks: string; label: string }> = {
  tersambung: {
    titik: "bg-emerald-400",
    teks: "text-emerald-300",
    label: "Tersambung",
  },
  "belum-diatur": {
    titik: "bg-zinc-500",
    teks: "text-zinc-300",
    label: "Belum diatur",
  },
  gagal: { titik: "bg-rose-400", teks: "text-rose-300", label: "Gagal tersambung" },
};

export default function PlaylyStatusCard() {
  const [hasil, setHasil] = useState<RingkasanPlayly | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [jamCek, setJamCek] = useState("");

  const cek = useCallback(async () => {
    setMemuat(true);
    try {
      const res = await fetch("/api/videos", { cache: "no-store" });
      // Balasan bisa saja bukan JSON (mis. halaman error proxy) — jangan sampai
      // itu melempar dan menghapus seluruh kartu dari layar.
      const data = (await res.json().catch(() => null)) as BalasanVideos | null;
      setHasil(ringkasStatusPlayly(res.status, data));
    } catch {
      // Gagal-AMAN: server kita sendiri tak terjangkau -> laporkan gagal,
      // JANGAN diam-diam menampilkan status lama yang mungkin sudah basi.
      setHasil(ringkasStatusPlayly(0, null));
    } finally {
      setJamCek(new Date().toLocaleTimeString("id-ID"));
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void cek();
  }, [cek]);

  const gaya = hasil ? GAYA[hasil.status] : null;

  return (
    <Card className="mt-3 rounded-2xl border-zinc-800 bg-zinc-900/40">
      <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
              <Film className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Playly — dashboard upload
              </p>

              {memuat && !hasil ? (
                <p className="mt-1 text-sm text-zinc-400">Mengecek sambungan…</p>
              ) : (
                hasil &&
                gaya && (
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                    <span
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${gaya.titik}`}
                      aria-hidden="true"
                    />
                    <span className={gaya.teks}>
                      {gaya.label}
                      {hasil.status === "tersambung" &&
                        ` — ${hasil.jumlahVideo} video`}
                    </span>
                  </p>
                )
              )}
            </div>
          </div>

          {hasil?.pesan && (
            <p className="mt-2 flex items-start gap-2 text-xs text-zinc-400">
              {hasil.status === "gagal" && (
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400"
                  aria-hidden="true"
                />
              )}
              <span>{hasil.pesan}</span>
            </p>
          )}

          {/* Video yang ditolak penjaga alamat (mis. bukan https / host tak
              terdaftar). Disebut supaya admin tak bingung "kok jumlahnya kurang". */}
          {hasil?.status === "tersambung" && hasil.dilewati > 0 && (
            <p className="mt-1 text-xs text-amber-300">
              {hasil.dilewati} video dilewati karena alamatnya tidak memenuhi
              syarat keamanan.
            </p>
          )}

          {jamCek && (
            <p className="mt-2 text-xs text-zinc-600">Terakhir dicek {jamCek}</p>
          )}
        </div>

        <Button
          onClick={() => void cek()}
          disabled={memuat}
          variant="outline"
          className="min-h-9 shrink-0 rounded-full px-4 text-xs font-semibold"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${memuat ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Cek ulang
        </Button>
      </CardContent>
    </Card>
  );
}
