"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_GAP, pageNumbers } from "@/lib/beranda-catalog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Deretan nomor halaman: « 4 5 [6] 7 8 ».
 *
 * KENAPA KOMPONEN SENDIRI (2026-10-10): bentuk ini sebelumnya ditanam langsung
 * di CatalogBrowser, dan halaman /film sekarang membutuhkan yang sama. Disalin,
 * keduanya pasti menyimpang pelan-pelan — satu diperbaiki, satu tertinggal, dan
 * tak ada error yang memberi tahu (§3.3).
 *
 * Yang MEMUTUSKAN halaman tetap pemanggilnya; komponen ini murni menggambar dan
 * melapor "nomor berapa yang diklik". Itu yang membuatnya bisa dipakai halaman
 * yang menyimpan nomor halaman di state maupun di alamat URL.
 *
 * Tidak digambar sama sekali kalau isinya cuma muat satu halaman — deret nomor
 * berisi angka "1" sendirian memberi kesan ada halaman lain yang sebenarnya
 * tidak ada.
 */
export default function NomorHalaman({
  halaman,
  totalHalaman,
  onPindah,
  label = "Nomor halaman",
}: {
  halaman: number;
  totalHalaman: number;
  onPindah: (nomor: number) => void;
  /** Nama daftar ini untuk pembaca layar, mis. "Halaman katalog". */
  label?: string;
}) {
  if (totalHalaman <= 1) return null;

  return (
    <nav
      aria-label={label}
      className="mt-6 flex flex-wrap items-center justify-center gap-1"
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={halaman <= 1}
        onClick={() => onPindah(halaman - 1)}
        aria-label="Halaman sebelumnya"
        className="size-8 rounded-sm border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-400 hover:text-amber-400 disabled:opacity-30"
      >
        <ChevronLeft className="size-4" />
      </Button>

      {pageNumbers(halaman, totalHalaman).map((n, i) =>
        n === PAGE_GAP ? (
          <span key={`gap-${i}`} className="px-1.5 text-xs text-zinc-600">
            {PAGE_GAP}
          </span>
        ) : (
          <Button
            key={n}
            type="button"
            size="sm"
            variant={n === halaman ? "default" : "outline"}
            onClick={() => onPindah(n)}
            aria-current={n === halaman ? "page" : undefined}
            className={cn(
              "size-8 rounded-sm p-0 text-xs",
              n === halaman
                ? "font-bold"
                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-400 hover:text-amber-400",
            )}
          >
            {n}
          </Button>
        ),
      )}

      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={halaman >= totalHalaman}
        onClick={() => onPindah(halaman + 1)}
        aria-label="Halaman berikutnya"
        className="size-8 rounded-sm border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-400 hover:text-amber-400 disabled:opacity-30"
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}
