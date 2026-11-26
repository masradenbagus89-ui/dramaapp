"use client";

// Tab "Laporan Video" di /admin/bantuan: saring status, cari, ubah status.
// Daftar disegarkan berkala; laporan yang masuk SESUDAH halaman dibuka diberi
// tanda "Baru" + spanduk, supaya admin yang sedang membuka halaman ini tahu
// ada laporan masuk tanpa memuat ulang.
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePolling } from "@/app/components/usePolling";
import {
  labelMasalah,
  STATUS_LAPORAN,
  type LaporanVideo,
  type StatusLaporan,
} from "@/lib/laporan-video";

const JEDA_SEGAR_MS = 20_000;
const JEDA_KETIK_MS = 300;

const WARNA_STATUS: Record<StatusLaporan, string> = {
  pending: "border-amber-400/50 bg-amber-400/10 text-amber-200",
  diproses: "border-sky-400/50 bg-sky-400/10 text-sky-200",
  selesai: "border-emerald-400/50 bg-emerald-400/10 text-emerald-200",
};

const FORMAT_WAKTU = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

type Jumlah = Record<StatusLaporan, number>;

export default function AdminLaporanVideo() {
  const [status, setStatus] = useState<StatusLaporan | "">("pending");
  const [ketikan, setKetikan] = useState("");
  const [q, setQ] = useState("");
  const [laporan, setLaporan] = useState<LaporanVideo[] | null>(null);
  const [jumlah, setJumlah] = useState<Jumlah>({ pending: 0, diproses: 0, selesai: 0 });
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState<string | null>(null);
  // "Baru" = dibuat sesudah titik ini (awalnya: saat halaman dibuka). Diukur
  // dari waktu, bukan dari "belum pernah tampil" — kalau tidak, pindah ke
  // saringan "Semua" menandai laporan lama sebagai baru.
  const [sejak, setSejak] = useState(() => new Date().toISOString());
  // Nomor permintaan terakhir: jawaban saringan lama yang tiba belakangan dibuang.
  const nomorMuat = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(ketikan.trim()), JEDA_KETIK_MS);
    return () => window.clearTimeout(t);
  }, [ketikan]);

  const muat = useCallback(async () => {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (q) sp.set("q", q);
    const nomor = ++nomorMuat.current;
    try {
      const res = await fetch(`/api/admin/laporan-video?${sp}`, { cache: "no-store" });
      const data = (await res.json()) as { laporan?: LaporanVideo[]; jumlah?: Jumlah; error?: string };
      if (nomor !== nomorMuat.current) return;
      if (!res.ok || !data.laporan || !data.jumlah) {
        setGalat(data.error ?? `Gagal memuat (HTTP ${res.status}).`);
        return;
      }
      setGalat(null);
      setLaporan(data.laporan);
      setJumlah(data.jumlah);
    } catch {
      setGalat("Koneksi terputus. Mencoba lagi otomatis…");
    }
  }, [status, q]);

  // Segera muat saat saringan berubah; selebihnya ikut jadwal berkala.
  useEffect(() => {
    void muat();
  }, [muat]);
  usePolling(muat, JEDA_SEGAR_MS, true);

  const ubahStatus = async (id: string, statusBaru: StatusLaporan) => {
    setMenyimpan(id);
    try {
      const res = await fetch("/api/admin/laporan-video", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: statusBaru }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setGalat(data.error ?? "Status gagal disimpan.");
      await muat();
    } finally {
      setMenyimpan(null);
    }
  };

  const baru = new Set((laporan ?? []).filter((l) => l.dibuatPada > sejak).map((l) => l.id));
  const total = jumlah.pending + jumlah.diproses + jumlah.selesai;
  const pilihanStatus: { id: StatusLaporan | ""; label: string; n: number }[] = [
    ...STATUS_LAPORAN.map((s) => ({ id: s.id, label: s.label, n: jumlah[s.id] })),
    { id: "", label: "Semua", n: total },
  ];

  return (
    <div className="space-y-4">
      {baru.size > 0 && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-100">
          <span>
            🔔 <strong>{baru.size} laporan baru</strong> masuk sejak halaman ini dibuka.
          </span>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSejak(new Date().toISOString())} className="h-7 text-amber-200 hover:bg-amber-400/20">
            Tandai sudah dilihat
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Saring status laporan">
          {pilihanStatus.map((p) => (
            <button
              key={p.id || "semua"}
              type="button"
              role="tab"
              aria-selected={status === p.id}
              onClick={() => setStatus(p.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                status === p.id
                  ? "border-amber-400 bg-amber-400 font-semibold text-zinc-950"
                  : "border-zinc-700 text-zinc-300 hover:border-zinc-500",
              )}
            >
              {p.label} <span className="opacity-70">({p.n})</span>
            </button>
          ))}
        </div>
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={ketikan}
            onChange={(e) => setKetikan(e.target.value)}
            placeholder="Cari judul, member, server…"
            aria-label="Cari laporan"
            className="border-zinc-700 bg-zinc-900 pl-9 text-zinc-100"
          />
        </div>
      </div>

      {galat && (
        <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {galat}
        </p>
      )}

      {laporan === null ? (
        <div className="flex justify-center py-12 text-zinc-500">
          <Loader2 className="size-5 animate-spin" aria-label="Memuat laporan" />
        </div>
      ) : laporan.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 py-12 text-center text-sm text-zinc-500">
          {q || status ? "Tidak ada laporan yang cocok dengan saringan ini." : "Belum ada laporan video. 🎉"}
        </p>
      ) : (
        <ul className="space-y-3">
          {laporan.map((l) => (
            <li
              key={l.id}
              className={cn(
                "rounded-xl border bg-zinc-900/50 p-4",
                baru.has(l.id) ? "border-amber-400/60" : "border-zinc-800",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-white">
                    {baru.has(l.id) && <Badge className="mr-2 bg-amber-400 text-zinc-950">Baru</Badge>}
                    {l.judul}
                    {l.episode !== null && <span className="text-zinc-400"> · Ep {l.episode}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {l.jenisKonten === "drama" ? "Drama" : "Video Playly"} · ID {l.kontenId} · Server {l.server}
                  </p>
                </div>
                <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", WARNA_STATUS[l.status])}>
                  {STATUS_LAPORAN.find((s) => s.id === l.status)?.label}
                </span>
              </div>

              <p className="mt-3 text-sm font-medium text-rose-200">{labelMasalah(l.masalah)}</p>
              {l.keterangan && (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-300">{l.keterangan}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-3">
                <p className="text-xs text-zinc-500">
                  {l.namaMember} ({l.email}) · {FORMAT_WAKTU.format(new Date(l.dibuatPada))}
                  {l.ditanganiOleh && ` · diubah ${l.ditanganiOleh}`}
                </p>
                <div className="flex gap-1.5" aria-label="Ubah status">
                  {STATUS_LAPORAN.filter((s) => s.id !== l.status).map((s) => (
                    <Button
                      key={s.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={menyimpan === l.id}
                      onClick={() => void ubahStatus(l.id, s.id)}
                      className="h-7 border-zinc-700 bg-transparent text-xs text-zinc-200 hover:bg-zinc-800"
                    >
                      {s.id === "selesai" ? "✓ Tandai selesai" : s.id === "diproses" ? "Proses" : "Kembalikan ke Pending"}
                    </Button>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
