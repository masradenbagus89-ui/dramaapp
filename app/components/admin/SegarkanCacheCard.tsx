"use client";

// Kartu "Segarkan cache" di Dashboard admin.
//
// Halaman penonton disimpan & dipakai ulang supaya cepat (1-5 menit). Simpan
// lewat panel admin sudah membuang simpanan itu otomatis; tombol ini untuk
// perubahan yang tak lewat panel (mis. data diedit langsung di Supabase).
// Bentuknya meniru KatalogStatusCard supaya admin cukup belajar satu pola.
import { useState } from "react";
import { RefreshCw, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Hasil = { ok: boolean; pesan: string };

export default function SegarkanCacheCard() {
  const [memuat, setMemuat] = useState(false);
  const [hasil, setHasil] = useState<Hasil | null>(null);

  async function segarkan() {
    setMemuat(true);
    setHasil(null);
    try {
      const res = await fetch("/api/admin/cache", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setHasil(
        res.ok
          ? { ok: true, pesan: "Beres. Pengunjung berikutnya melihat data terbaru." }
          : { ok: false, pesan: data.error ?? `Gagal (HTTP ${res.status}).` },
      );
    } catch {
      setHasil({ ok: false, pesan: "Tidak tersambung ke server. Coba lagi." });
    } finally {
      setMemuat(false);
    }
  }

  return (
    <Card className="mt-3 rounded-2xl border-zinc-800 bg-zinc-900/40">
      <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
              <Zap className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Cache halaman penonton
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                Simpan di panel ini sudah menyegarkan otomatis. Pakai tombol ini
                kalau data diubah di luar panel.
              </p>
            </div>
          </div>

          {hasil && (
            <p
              role="status"
              className={`mt-2 text-xs ${hasil.ok ? "text-emerald-300" : "text-rose-300"}`}
            >
              {hasil.pesan}
            </p>
          )}
        </div>

        <Button
          onClick={() => void segarkan()}
          disabled={memuat}
          variant="outline"
          className="min-h-9 shrink-0 rounded-full px-4 text-xs font-semibold"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${memuat ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Segarkan cache
        </Button>
      </CardContent>
    </Card>
  );
}
