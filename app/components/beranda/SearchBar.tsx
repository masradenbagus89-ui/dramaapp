"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal } from "lucide-react";
import { SHELL } from "./shell";

/**
 * Slot "kepala situs" — hanya diisi halaman yang memakai bar ini sebagai
 * navigasi utama, bukan sekadar kotak cari.
 *
 * Dibungkus jadi SATU objek (bukan 3 prop terpisah) karena ketiganya selalu
 * datang bersama sebagai satu keputusan tata letak: "bar ini jadi navbar".
 */
export type SearchBarChrome = {
  /** Logo/identitas di ujung kiri. Halaman yang sudah punya TopNav mengosongkannya. */
  brand?: ReactNode;
  /** Deretan menu dropdown katalog (lihat NavMenus.tsx). */
  menus?: ReactNode;
  /** Tombol di ujung kanan, mis. Masuk/Daftar. */
  trailing?: ReactNode;
};

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  /** Dipanggil saat tombol cari ditekan / Enter. Halaman yang menyaring
   *  langsung di tempat (beranda) boleh mengabaikannya. */
  onSubmit?: () => void;
  placeholder?: string;
  /** Dropdown penyaring di kanan bar. Kosong = tombol "Filter" ikut disembunyikan. */
  filters?: ReactNode;
  /** Logo + menu + tombol kanan; lihat SearchBarChrome. */
  chrome?: SearchBarChrome;
  /** Untuk posisi menempel (`sticky top-…`) yang berbeda tiap halaman. */
  className?: string;
};

/**
 * Bar pencarian utama — kepala situs gaya katalog streaming.
 *
 * Dipakai TIGA halaman dengan perilaku berbeda: di /beranda ia menyaring grid
 * langsung di tempat, di halaman depan & /discover ia melempar/menyaring lewat
 * alamat URL. Karena itu komponen ini sengaja tidak tahu apa-apa soal katalog —
 * pemanggil yang menentukan artinya lewat `onValueChange`/`onSubmit`.
 *
 * TATA LETAK: satu baris di layar lebar (logo · cari · menu · penyaring ·
 * tombol), menumpuk sendiri di layar sempit lewat `flex-wrap`. Urutan di layar
 * sempit diatur `order-*` supaya tombol Masuk/Daftar naik menemani logo di
 * baris pertama, bukan terdampar di bawah.
 */
export default function SearchBar({
  value,
  onValueChange,
  onSubmit,
  placeholder = "Cari judul drama atau film di DramaKu",
  filters,
  chrome,
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
      <div
        className={cn(SHELL, "flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5")}
      >
        {chrome?.brand && (
          <div className="order-1 shrink-0 md:order-none">{chrome.brand}</div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit?.();
          }}
          className="order-3 flex w-full min-w-0 items-stretch md:order-none md:w-auto md:max-w-md md:flex-1"
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

        {chrome?.menus && (
          <div className="order-4 w-full min-w-0 md:order-none md:w-auto">
            {chrome.menus}
          </div>
        )}

        {filters && (
          <>
            {/* Penyaring berjajar di kanan bar — layar lebar. */}
            <div className="order-5 ml-auto hidden items-center gap-1.5 md:order-none md:flex">
              {filters}
            </div>
            {/* Di HP disembunyikan di balik tombol supaya bar tetap ringkas. */}
            <Button
              type="button"
              size="sm"
              onClick={() => setFilterTerbuka((v) => !v)}
              aria-expanded={filterTerbuka}
              className="order-2 ml-auto h-9 shrink-0 gap-1.5 rounded-sm bg-black/30 text-xs font-bold uppercase tracking-wide text-white hover:bg-black/50 md:hidden"
            >
              <SlidersHorizontal className="size-3.5" />
              Filter
            </Button>
          </>
        )}

        {chrome?.trailing && (
          <div className="order-2 ml-auto flex shrink-0 items-center gap-2 md:order-none">
            {chrome.trailing}
          </div>
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
