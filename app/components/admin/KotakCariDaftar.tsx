"use client";

// Kotak cari seragam untuk daftar panjang di panel admin (owner 2026-11-09).
//
// Dipisah jadi komponen sendiri, bukan disalin ke tiap daftar, karena tiga
// detail kecilnya mudah terlewat saat disalin — dan tiap kelalaian terbaca
// sebagai "fitur carinya setengah jadi":
//   • tombol × untuk mengosongkan (tanpa itu admin harus blok lalu hapus)
//   • jumlah hasil di sebelahnya (tanpa itu "kenapa cuma 3?" jadi tebakan)
//   • Escape mengosongkan (kebiasaan baku kotak cari di mana pun)
//
// Hanya tampilan: nilai & penyaringannya milik useDaftarAdmin.
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function KotakCariDaftar({
  nilai,
  onNilai,
  jumlah,
  total,
  placeholder = "Cari…",
  className,
}: {
  nilai: string;
  onNilai: (teks: string) => void;
  /** Baris yang lolos saringan. */
  jumlah: number;
  /** Seluruh baris sebelum disaring. */
  total: number;
  placeholder?: string;
  className?: string;
}) {
  const sedangMencari = nilai.trim() !== "";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500" />
        <Input
          type="search"
          value={nilai}
          onChange={(e) => onNilai(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onNilai("");
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-8 rounded-lg border-zinc-700 bg-zinc-900 pl-8 pr-7 text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0"
        />
        {sedangMencari && (
          <button
            type="button"
            onClick={() => onNilai("")}
            aria-label="Kosongkan pencarian"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-500 transition hover:text-zinc-200"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Angka di kanan kotak, bukan di bawah daftar: saat hasilnya nol,
          daftarnya kosong dan tak ada tempat lain yang bisa menjelaskan
          kenapa. */}
      <span className="shrink-0 text-xs text-zinc-500">
        {sedangMencari ? `${jumlah} dari ${total}` : `${total} total`}
      </span>
    </div>
  );
}
