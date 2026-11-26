"use client";

// Jendela Report Video: pilih jenis masalah + keterangan opsional, lalu kirim.
// Judul, ID, episode & server ikut terkirim otomatis dari pemutar; nama member
// & waktu laporan diisi server dari sesi (app/api/laporan-video/route.ts).
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { usePenonton } from "../usePenonton";
import JendelaBantuan, { PerluMasuk } from "./JendelaBantuan";
import {
  JENIS_MASALAH,
  MAKS_KETERANGAN,
  type JenisMasalah,
  type VideoDilaporkan,
} from "@/lib/laporan-video";

/** Pesan sukses dibiarkan terbaca sebentar sebelum jendela menutup sendiri. */
const TUTUP_OTOMATIS_MS = 2500;

type Keadaan =
  | { tahap: "isi"; galat?: string }
  | { tahap: "mengirim" }
  | { tahap: "terkirim" }
  | { tahap: "perlu-masuk" };

export default function ModalLaporanVideo({
  open,
  onClose,
  video,
}: {
  open: boolean;
  onClose: () => void;
  video: VideoDilaporkan;
}) {
  const { user, mounted } = usePenonton();
  const [masalah, setMasalah] = useState<JenisMasalah | null>(null);
  const [keterangan, setKeterangan] = useState("");
  const [keadaan, setKeadaan] = useState<Keadaan>({ tahap: "isi" });

  // Tiap kali dibuka = formulir baru (laporan sebelumnya sudah terkirim/batal).
  useEffect(() => {
    if (!open) return;
    setMasalah(null);
    setKeterangan("");
    setKeadaan({ tahap: "isi" });
  }, [open]);

  useEffect(() => {
    if (keadaan.tahap !== "terkirim") return;
    const t = window.setTimeout(onClose, TUTUP_OTOMATIS_MS);
    return () => window.clearTimeout(t);
  }, [keadaan.tahap, onClose]);

  const kirim = async () => {
    if (!masalah) {
      setKeadaan({ tahap: "isi", galat: "Pilih jenis masalahnya dulu." });
      return;
    }
    setKeadaan({ tahap: "mengirim" });
    try {
      const res = await fetch("/api/laporan-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...video, masalah, keterangan }),
      });
      if (res.status === 401) return setKeadaan({ tahap: "perlu-masuk" });
      if (res.ok) return setKeadaan({ tahap: "terkirim" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setKeadaan({ tahap: "isi", galat: data.error ?? "Laporan gagal terkirim. Coba lagi." });
    } catch {
      setKeadaan({ tahap: "isi", galat: "Koneksi terputus. Periksa internet lalu coba lagi." });
    }
  };

  const subjudul = video.episode ? `${video.judul} · Episode ${video.episode}` : video.judul;
  const tamu = mounted && !user;

  return (
    <JendelaBantuan open={open} onClose={onClose} judul="Report Video" subjudul={subjudul}>
      {tamu || keadaan.tahap === "perlu-masuk" ? (
        <PerluMasuk alasan="Masuk dulu untuk melaporkan video, supaya admin bisa mengabari perbaikannya." />
      ) : keadaan.tahap === "terkirim" ? (
        <div role="status" className="space-y-2 p-6 text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-400" aria-hidden="true" />
          <p className="font-semibold text-white">Laporan terkirim</p>
          <p className="text-sm text-zinc-400">Terima kasih! Admin akan memeriksanya secepatnya.</p>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto p-4">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Apa masalahnya?
            </legend>
            <div className="grid gap-2">
              {JENIS_MASALAH.map((m) => (
                <label
                  key={m.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    masalah === m.id
                      ? "border-amber-400 bg-amber-400/10 text-white"
                      : "border-zinc-800 text-zinc-300 hover:border-zinc-600",
                  )}
                >
                  <input
                    type="radio"
                    name="masalah"
                    value={m.id}
                    checked={masalah === m.id}
                    onChange={() => setMasalah(m.id)}
                    className="accent-amber-400"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="keterangan-laporan" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Keterangan tambahan {masalah === "lainnya" ? "(wajib)" : "(opsional)"}
            </label>
            <Textarea
              id="keterangan-laporan"
              value={keterangan}
              maxLength={MAKS_KETERANGAN}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: macet di menit 05:30, suara tidak sinkron…"
              className="min-h-20 border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
            />
            <p className="mt-1 text-right text-[11px] text-zinc-500">
              {keterangan.length}/{MAKS_KETERANGAN}
            </p>
          </div>

          {keadaan.tahap === "isi" && keadaan.galat && (
            <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {keadaan.galat}
            </p>
          )}

          <Button
            type="button"
            onClick={kirim}
            disabled={keadaan.tahap === "mengirim"}
            className="w-full bg-amber-400 font-semibold text-zinc-950 hover:bg-amber-300"
          >
            {keadaan.tahap === "mengirim" && <Loader2 className="size-4 animate-spin" />}
            Kirim laporan
          </Button>
        </div>
      )}
    </JendelaBantuan>
  );
}
