"use client";

import { useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  KELAS_KEPALA_TABEL,
  KELAS_WARNA_TOMBOL,
  labelTombolProvider,
} from "@/app/components/unduhan-kelas";
import type { DownloadProvider } from "@/lib/types";

/**
 * Modal daftar provider unduhan untuk tombol DOWNLOAD di halaman detail.
 *
 * Pola modalnya mengikuti RewardedAdModal (`open`/`onClose` + `fixed inset-0`),
 * BUKAN Radix/shadcn Dialog: berkas components/ui/dialog.tsx memang ada di repo
 * tapi nol pemakai, jadi memakainya berarti memperkenalkan pola kedua untuk hal
 * yang sama.
 *
 * Warna kepala tabel, warna tombol, dan label kualitasnya datang dari
 * app/components/unduhan-kelas.ts — SATU sumber bersama dengan popup provider
 * video Playly. Sebelum 2026-09-30 ketiganya disalin di kedua berkas, dan
 * warna yang berbeda di dua halaman tidak memunculkan error apa pun.
 *
 * Alamat provider dibuka LANGSUNG ke situs mereka (Telegram/Mega/...), tidak
 * lewat /api/download — route itu cuma tahu berkas video di PC backup sendiri.
 * Karena alamatnya milik pihak luar: `target="_blank"` + `rel="noopener
 * noreferrer"` (tanpa `noopener`, halaman tujuan bisa menyetir tab kita lewat
 * `window.opener`), dan TANPA atribut `download` — browser mengabaikannya
 * untuk alamat beda domain, jadi memasangnya cuma menjanjikan yang tak ditepati.
 */
export default function DownloadModal({
  open,
  onClose,
  providers,
  title,
}: {
  open: boolean;
  onClose: () => void;
  /** Sudah disaring di lib/types.ts `parseDownloadProviders` sebelum sampai sini. */
  providers: DownloadProvider[];
  /** Judul drama, dipakai sebagai keterangan kecil di kepala modal. */
  title?: string;
}) {
  // Escape menutup modal. Penonton HP menutup lewat tombol X / ketuk latar,
  // tapi di desktop Escape adalah kebiasaan yang sudah terbentuk.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Daftar kosong seharusnya tak pernah sampai ke sini (DownloadButton jatuh ke
  // perilaku unduh lama sebelum membuka modal). Dijaga juga di sini supaya tak
  // ada keadaan "modal terbuka tapi isinya nol".
  if (!open || providers.length === 0) return null;

  const catatan = providers.filter((p) => p.note);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pilihan unduhan"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900"
        // Klik DI DALAM kotak tidak boleh ikut menutup modal — tanpa ini, klik
        // tombol provider pun menutupnya sebelum tautannya sempat terbuka.
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Pilih sumber unduhan</p>
            {title && (
              <p className="truncate text-xs text-zinc-400">{title}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Tutup"
            className="size-8 shrink-0 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="p-4">
          {catatan.map((p) => (
            <div
              key={p.name}
              className="mb-3 rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 text-xs leading-5 text-sky-950"
            >
              {p.note}
              {p.tutorialUrl && (
                <>
                  {" "}
                  <a
                    href={p.tutorialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-sky-700 underline underline-offset-2 hover:text-sky-900"
                  >
                    Klik disini untuk lihat video tutorial
                  </a>
                </>
              )}
            </div>
          ))}

          <table className="w-full border-collapse overflow-hidden rounded-lg">
            <thead>
              <tr className={KELAS_KEPALA_TABEL}>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">
                  Provider
                </th>
                <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wide">
                  Download
                </th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.name + p.url} className="border-b border-zinc-800 last:border-0">
                  {/* Nama menyerap sisa lebar & boleh turun baris; kolom tombol
                      dipaksa selebar isinya (w-px + nowrap) supaya di layar HP
                      tombolnya tak pernah terpotong — nama yang mengalah. */}
                  <td className="break-words px-3 py-2.5 align-middle text-sm font-medium text-zinc-200">
                    {p.name}
                  </td>
                  <td className="w-px whitespace-nowrap px-3 py-2.5 text-right align-middle">
                    <Button
                      asChild
                      size="sm"
                      className={cn(
                        "h-8 rounded-md px-3 text-xs font-bold text-white",
                        KELAS_WARNA_TOMBOL[p.buttonColor ?? "blue"],
                      )}
                    >
                      <a href={p.url} target="_blank" rel="noopener noreferrer">
                        <Download className="size-3.5" />
                        {labelTombolProvider(p.quality)}
                      </a>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-3 text-[11px] leading-4 text-zinc-500">
            Link di atas menuju situs provider masing-masing, bukan server
            DramaKu. Kecepatan & ketersediaannya di luar kendali kami.
          </p>
        </div>
      </div>
    </div>
  );
}
