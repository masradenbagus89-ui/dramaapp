"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Category, Drama } from "@/lib/types";
import {
  filterAndSortDramas,
  getYearOptions,
  RATING_OPTIONS,
  type RatingKey,
} from "@/lib/discover";
import {
  CATALOG_PER_PAGE,
  CATALOG_SORTS,
  PAGE_GAP,
  availableGenres,
  countWithRating,
  countWithYear,
  pageNumbers,
  pageOfCatalog,
  sortCatalog,
  type CatalogSort,
} from "@/lib/beranda-catalog";
import CatalogCard from "./CatalogCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

const SEMUA = "Semua";

/** Kelas pembatas isi — sama dengan navbar & sisa beranda (lihat globals.css). */
const SHELL = "shell-wide mx-auto px-4 md:px-6";

/** Bentuk seragam untuk dropdown penyaring di bar magenta. */
const TRIGGER_CLASS =
  "h-9 w-full rounded-sm border-black/20 bg-black/25 text-xs font-semibold text-white focus:ring-0 md:w-auto [&>span]:text-white";

type Props = {
  dramas: Drama[];
  /**
   * Banner unggulan, digambar tepat di bawah strip genre. Isinya ditentukan
   * halaman supaya komponen ini tidak ikut mengurus teaser video.
   */
  heroSlot?: React.ReactNode;
  /** Blok bebas di antara banner dan hitungan halaman (iklan + baris personal). */
  beforeGridSlot?: React.ReactNode;
  /**
   * Slot iklan tepat di atas grid. Isinya tetap ditentukan halaman
   * (app/beranda/page.tsx) — urusan pendapatan tidak menyusup ke logika katalog.
   */
  adSlot?: React.ReactNode;
};

/**
 * Katalog beranda gaya situs streaming: bar cari mencolok di paling atas, strip
 * genre, lalu GRID POSTER PADAT ber-paginasi.
 *
 * Bar cari & strip genre sengaja selebar penuh layar (bukan dibatasi shell)
 * supaya terbaca sebagai "kepala situs", sama seperti contoh yang diminta owner.
 * Isi lainnya tetap dibatasi `shell-wide` agar sejajar dengan navbar.
 *
 * Penyaringnya dipakai ulang dari `lib/discover.ts` (yang sama dengan
 * /discover) supaya "cari Romance" berarti hal yang sama di dua halaman —
 * kalau ditulis ulang di sini, dua halaman akan pelan-pelan menyimpang.
 * Pengurutan & paginasinya khas beranda, ada di `lib/beranda-catalog.ts`.
 */
export default function CatalogBrowser({
  dramas,
  heroSlot,
  beforeGridSlot,
  adSlot,
}: Props) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string>(SEMUA);
  const [year, setYear] = useState("all");
  const [minRating, setMinRating] = useState<RatingKey>("all");
  const [sort, setSort] = useState<CatalogSort>("terbaru");
  const [page, setPage] = useState(1);
  const [filterTerbuka, setFilterTerbuka] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const genres = useMemo(() => availableGenres(dramas), [dramas]);
  const years = useMemo(() => getYearOptions(dramas), [dramas]);
  const adaTahun = useMemo(() => countWithYear(dramas) > 0, [dramas]);
  const adaRating = useMemo(() => countWithRating(dramas) > 0, [dramas]);

  const hasil = useMemo(() => {
    const tersaring = filterAndSortDramas(dramas, {
      query,
      category: genre as Category,
      year,
      minRating,
      // Pengurutan diserahkan ke sortCatalog di bawah — di sini murni menyaring.
      sortBy: "relevance",
    });
    return sortCatalog(tersaring, sort);
  }, [dramas, query, genre, year, minRating, sort]);

  const halaman = useMemo(
    () => pageOfCatalog(hasil, page, CATALOG_PER_PAGE),
    [hasil, page],
  );

  const filterAktif =
    genre !== SEMUA || year !== "all" || minRating !== "all" || Boolean(query);

  /**
   * Tiap penyaring berubah, balik ke halaman 1 — kalau tidak, hasil 2 drama
   * yang dilihat dari "halaman 5" akan tampil kosong tanpa penjelasan.
   */
  const ubahFilter = (aksi: () => void) => {
    aksi();
    setPage(1);
  };

  const gantiHalaman = (n: number) => {
    setPage(n);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resetFilter = () => {
    setQuery("");
    setGenre(SEMUA);
    setYear("all");
    setMinRating("all");
    setPage(1);
  };

  /** Dipakai dua kali: berjajar di bar magenta (desktop) & menumpuk (HP). */
  const dropdownPenyaring = (
    <>
      <Select
        value={genre}
        onValueChange={(v) => ubahFilter(() => setGenre(v))}
      >
        <SelectTrigger className={TRIGGER_CLASS} aria-label="Genre">
          <SelectValue placeholder="Genre" />
        </SelectTrigger>
        <SelectContent className="border-zinc-700 bg-zinc-900 text-zinc-200">
          <SelectItem value={SEMUA}>Semua genre</SelectItem>
          {genres.map((g) => (
            <SelectItem key={g} value={g}>
              {g}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={sort}
        onValueChange={(v) => ubahFilter(() => setSort(v as CatalogSort))}
      >
        <SelectTrigger className={TRIGGER_CLASS} aria-label="Urutkan">
          <SelectValue placeholder="Urutkan" />
        </SelectTrigger>
        <SelectContent className="border-zinc-700 bg-zinc-900 text-zinc-200">
          {CATALOG_SORTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Dropdown Tahun & Rating SENGAJA disembunyikan kalau tak ada satu pun
          drama yang punya datanya — penyaring yang selalu memulangkan nol hasil
          membuat situs terasa rusak. */}
      {adaTahun && (
        <Select value={year} onValueChange={(v) => ubahFilter(() => setYear(v))}>
          <SelectTrigger className={TRIGGER_CLASS} aria-label="Tahun">
            <SelectValue placeholder="Tahun" />
          </SelectTrigger>
          <SelectContent className="border-zinc-700 bg-zinc-900 text-zinc-200">
            <SelectItem value="all">Semua tahun</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {adaRating && (
        <Select
          value={minRating}
          onValueChange={(v) => ubahFilter(() => setMinRating(v as RatingKey))}
        >
          <SelectTrigger className={TRIGGER_CLASS} aria-label="Rating IMDb">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent className="border-zinc-700 bg-zinc-900 text-zinc-200">
            {RATING_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  );

  return (
    <section aria-labelledby="judul-katalog">
      {/* ============ 1. BAR CARI — kepala situs, menempel saat digulir ======
          top-14 = tepat di bawah navbar (tingginya h-14). */}
      <div className="sticky top-14 z-30 bg-gradient-to-r from-fuchsia-700 via-rose-600 to-red-600 shadow-lg shadow-black/50">
        <div className={cn(SHELL, "flex items-center gap-2 py-2.5")}>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex min-w-0 flex-1 items-stretch md:max-w-xl"
            role="search"
          >
            <Input
              type="search"
              value={query}
              onChange={(e) => ubahFilter(() => setQuery(e.target.value))}
              placeholder="Cari judul drama atau film di DramaKu"
              aria-label="Cari drama"
              className="h-9 rounded-l-sm rounded-r-none border-transparent bg-white text-sm text-zinc-900 placeholder:text-zinc-500 focus-visible:border-amber-400 focus-visible:ring-0"
            />
            <span className="flex h-9 w-11 shrink-0 items-center justify-center rounded-r-sm bg-red-700 text-white">
              <Search className="size-4" />
            </span>
          </form>

          {/* Penyaring berjajar di kanan bar — desktop. */}
          <div className="ml-auto hidden items-center gap-1.5 md:flex">
            {dropdownPenyaring}
          </div>

          {/* Di HP penyaring disembunyikan di balik tombol supaya bar tetap
              muat satu baris. */}
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
        </div>

        {filterTerbuka && (
          <div className={cn(SHELL, "grid grid-cols-2 gap-1.5 pb-2.5 md:hidden")}>
            {dropdownPenyaring}
          </div>
        )}
      </div>

      {/* ============ 2. STRIP GENRE ========================================
          Hanya genre yang benar-benar berisi (availableGenres) — genre kosong
          yang diklik memulangkan halaman hampa. */}
      <div className="border-b-2 border-amber-600 bg-gradient-to-r from-amber-400 to-yellow-400">
        <div className={cn(SHELL, "no-scrollbar flex items-center overflow-x-auto px-2 md:px-4")}>
          {[SEMUA, ...genres].map((g) => {
            const aktif = g === genre;
            return (
              <button
                key={g}
                type="button"
                onClick={() => ubahFilter(() => setGenre(g))}
                aria-pressed={aktif}
                className={cn(
                  "shrink-0 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide transition-colors",
                  aktif
                    ? "bg-zinc-950 text-amber-400"
                    : "text-zinc-900 hover:bg-amber-300",
                )}
              >
                {g}
              </button>
            );
          })}
          <Link
            href="/discover"
            className="ml-auto shrink-0 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-red-800 hover:bg-amber-300"
          >
            Jelajah
          </Link>
        </div>
      </div>

      {/* ============ 3. BANNER UNGGULAN (ramping) ========================== */}
      {heroSlot}

      {/* ============ 4. ISI HALAMAN ======================================= */}
      <div className={SHELL}>
        {beforeGridSlot}

        {/* Remah jejak: penonton tahu sedang berada di mana. */}
        <nav
          aria-label="Remah jejak"
          className="flex items-center gap-1.5 pt-5 text-[11px] text-zinc-500"
        >
          <Home className="size-3" />
          <Link href="/beranda" className="hover:text-amber-400">
            Beranda
          </Link>
          <span>/</span>
          <span className="text-zinc-300">Drama</span>
          {genre !== SEMUA && (
            <>
              <span>/</span>
              <span className="font-semibold text-amber-400">{genre}</span>
            </>
          )}
        </nav>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <h2 id="judul-katalog" className="text-sm text-zinc-400">
            <span className="font-bold text-white">
              Halaman {halaman.page} dari {halaman.totalPages}
            </span>{" "}
            &mdash; {halaman.total} judul
            {genre !== SEMUA ? ` genre ${genre}` : ""}
            {query ? ` untuk "${query}"` : ""}
          </h2>

          {filterAktif && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilter}
              className="h-8 gap-1 rounded-sm text-xs text-zinc-400 hover:text-white"
            >
              <X className="size-3.5" />
              Hapus filter
            </Button>
          )}
        </div>

        {adSlot && <div className="pt-4">{adSlot}</div>}

        {/* Grid poster padat. scroll-mt-32 = saat pindah halaman, judul grid
            tidak tersembunyi di balik navbar + bar cari yang menempel. */}
        <div ref={gridRef} className="scroll-mt-32">
          {halaman.items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Search className="size-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">
                Tidak ada judul yang cocok dengan pencarian ini.
              </p>
              {filterAktif && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetFilter}
                  className="rounded-sm border-zinc-700 bg-transparent text-xs text-zinc-300 hover:border-amber-400 hover:text-amber-400"
                >
                  Hapus semua filter
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-2.5 gap-y-4 pt-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
              {halaman.items.map((d) => (
                <CatalogCard key={d.id} drama={d} />
              ))}
            </div>
          )}
        </div>

        {halaman.totalPages > 1 && (
          <nav
            aria-label="Halaman katalog"
            className="mt-6 flex flex-wrap items-center justify-center gap-1"
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={halaman.page <= 1}
              onClick={() => gantiHalaman(halaman.page - 1)}
              aria-label="Halaman sebelumnya"
              className="size-8 rounded-sm border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-400 hover:text-amber-400 disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </Button>

            {pageNumbers(halaman.page, halaman.totalPages).map((n, i) =>
              n === PAGE_GAP ? (
                <span key={`gap-${i}`} className="px-1.5 text-xs text-zinc-600">
                  {PAGE_GAP}
                </span>
              ) : (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={n === halaman.page ? "default" : "outline"}
                  onClick={() => gantiHalaman(n)}
                  aria-current={n === halaman.page ? "page" : undefined}
                  className={cn(
                    "size-8 rounded-sm p-0 text-xs",
                    n === halaman.page
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
              disabled={halaman.page >= halaman.totalPages}
              onClick={() => gantiHalaman(halaman.page + 1)}
              aria-label="Halaman berikutnya"
              className="size-8 rounded-sm border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-400 hover:text-amber-400 disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </Button>
          </nav>
        )}
      </div>
    </section>
  );
}
