import Link from "next/link";
import type { Drama } from "@/lib/types";
import { availableGenres } from "@/lib/beranda-catalog";
import { getYearOptions } from "@/lib/discover";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

/**
 * Tombol FILTER hijau + isinya — bentuk yang diminta owner dari situs katalog
 * pembanding (tombol hijau di ujung kanan baris pintasan).
 *
 * ⚠️ BERKAS SENDIRI SEJAK 2026-09-26, dan itu WAJIB. Sebelumnya komponen ini
 * tinggal di dalam `TabKatalogTampilan.tsx` dan hanya dipakai halaman depan.
 * Owner tidak pernah melihatnya: `RedirectIfAuthed` melempar siapa pun yang
 * SUDAH LOGIN dari `/` ke `/beranda`, dan `/beranda` tak punya tombol ini —
 * jadi owner menyimpulkan fiturnya belum dibuat. Sekarang dipakai DUA tempat
 * (baris tab halaman depan + strip kuning beranda); menyalin markup-nya ke
 * tempat kedua berarti dua tombol yang isinya pelan-pelan berbeda.
 *
 * SENGAJA tanpa penanda "use client": isinya cuma tautan + dropdown Radix
 * (yang sudah membawa penanda itu sendiri), tanpa state maupun hook. Berkas
 * tanpa penanda mengikuti konteks pemanggilnya, jadi komponen ini sah dirender
 * dari komponen SERVER (baris tab halaman depan) MAUPUN dari komponen CLIENT
 * (`CatalogBrowser` di /beranda) — tanpa perlu dua versi.
 *
 * ATURAN ISI — hanya pilihan yang BENAR-BENAR ada di katalog: genre & tahun
 * dihitung dari data, bukan daftar tetap. Aturan project sejak 2026-09-21:
 * tombol yang diklik lalu menampilkan seluruh katalog seolah bekerja LEBIH
 * menyesatkan daripada tombol yang tidak ada.
 *
 * Semua tujuan bermuara ke /discover — satu-satunya halaman yang membaca
 * penyaring dari alamat URL.
 */
export default function FilterKatalog({ dramas }: { dramas: Drama[] }) {
  const genre = availableGenres(dramas);
  const tahun = getYearOptions(dramas);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          // Bayangan hijau senada tombolnya — sepadan dengan tab aktif di
          // sebelahnya, supaya keduanya terbaca sebagai satu baris kontrol
          // yang terangkat (owner 2026-09-26: "kasih shadow biar nampak pro").
          className="h-9 shrink-0 gap-1.5 rounded-sm bg-emerald-600 px-3 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-lg shadow-emerald-600/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-xl md:text-xs"
        >
          <SlidersHorizontal className="size-3.5" />
          Filter
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[70vh] w-56 overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-200"
      >
        <DropdownMenuLabel className="text-amber-400">Urutkan</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/discover?sort=populer">Paling banyak ditonton</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/discover?sort=rating">Rating tertinggi</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/discover?sort=judul">Judul A-Z</Link>
        </DropdownMenuItem>

        {genre.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuLabel className="text-amber-400">Genre</DropdownMenuLabel>
            {genre.map((g) => (
              <DropdownMenuItem key={g} asChild>
                <Link href={`/discover?cat=${encodeURIComponent(g)}`}>{g}</Link>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {tahun.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuLabel className="text-amber-400">Tahun</DropdownMenuLabel>
            {tahun.map((t) => (
              <DropdownMenuItem key={t} asChild>
                <Link href={`/discover?year=${encodeURIComponent(t)}`}>{t}</Link>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem asChild>
          <Link href="/discover" className="font-bold text-amber-400">
            Buka katalog lengkap →
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
