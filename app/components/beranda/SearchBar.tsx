"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal } from "lucide-react";
import { SHELL } from "./shell";

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  /** Dipanggil saat tombol cari ditekan / Enter. Halaman yang menyaring
   *  langsung di tempat (beranda) boleh mengabaikannya. */
  onSubmit?: () => void;
  placeholder?: string;
  /** Dropdown penyaring di kanan bar. Kosong = tombol "Filter" ikut disembunyikan. */
  filters?: ReactNode;
  /** Untuk posisi menempel (`sticky top-…`) yang berbeda tiap halaman. */
  className?: string;
};

/**
 * Bar pencarian utama — kepala situs gaya katalog streaming.
 *
 * Dipakai DUA halaman dengan perilaku berbeda: di /beranda ia menyaring grid
 * langsung di tempat, di halaman depan ia melempar ke /discover. Karena itu
 * komponen ini sengaja tidak tahu apa-apa soal katalog — pemanggil yang
 * menentukan artinya lewat `onValueChange`/`onSubmit`.
 */
export default function SearchBar({
  value,
  onValueChange,
  onSubmit,
  placeholder = "Cari judul drama atau film di DramaKu",
  filters,
  className,
}: Props) {
  const [filterTerbuka, setFilterTerbuka] = useState(false);

  return (
    <div
      className={cn(
        "z-30 bg-gradient-to-r from-fuchsia-700 via-rose-600 to-red-600 shadow-lg shadow-black/50",
        className,
      )}
    >
      <div className={cn(SHELL, "flex items-center gap-2 py-2.5")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit?.();
          }}
          className="flex min-w-0 flex-1 items-stretch md:max-w-xl"
          role="search"
        >
          <Input
            type="search"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={placeholder}
            aria-label="Cari drama"
            className="h-9 rounded-l-sm rounded-r-none border-transparent bg-white text-sm text-zinc-900 placeholder:text-zinc-500 focus-visible:border-amber-400 focus-visible:ring-0"
          />
          <button
            type="submit"
            aria-label="Cari"
            className="flex h-9 w-11 shrink-0 items-center justify-center rounded-r-sm bg-red-700 text-white transition-colors hover:bg-red-600"
          >
            <Search className="size-4" />
          </button>
        </form>

        {filters && (
          <>
            {/* Penyaring berjajar di kanan bar — layar lebar. */}
            <div className="ml-auto hidden items-center gap-1.5 md:flex">
              {filters}
            </div>
            {/* Di HP disembunyikan di balik tombol supaya bar tetap satu baris. */}
            <Button
              type="button"
              size="sm"
              onClick={() => setFilterTerbuka((v) => !v)}
              aria-expanded={filterTerbuka}
              className="h-9 shrink-0 gap-1.5 rounded-sm bg-black/30 text-xs font-bold uppercase tracking-wide text-white hover:bg-black/50 md:hidden"
            >
              <SlidersHorizontal className="size-3.5" />
              Filter
            </Button>
          </>
        )}
      </div>

      {filters && filterTerbuka && (
        <div className={cn(SHELL, "grid grid-cols-2 gap-1.5 pb-2.5 md:hidden")}>
          {filters}
        </div>
      )}
    </div>
  );
}
