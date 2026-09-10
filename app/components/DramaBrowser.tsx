"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CATEGORIES, type Category, type Drama } from "@/lib/types";
import {
  SORT_OPTIONS,
  RATING_OPTIONS,
  FILTER_KOSONG,
  bacaFilter,
  filterAndSortDramas,
  filterOptions,
  getYearOptions,
  tulisFilter,
  type CatalogFilter,
  type RatingKey,
  type SortBy,
} from "@/lib/discover";
import { buildNavMenus, catalogShortcuts } from "@/lib/nav-katalog";
import CatalogCard from "./beranda/CatalogCard";
import GenreStrip from "./beranda/GenreStrip";
import NavMenus from "./beranda/NavMenus";
import SearchBar from "./beranda/SearchBar";
import { GRID_CLASS, SHELL, TRIGGER_CLASS } from "./beranda/shell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

/**
 * Bentuk penyaring, pembacaan & penulisan alamat semuanya ada di
 * lib/discover.ts — SATU tempat yang dipakai bersama penyusun menu
 * (lib/nav-katalog.ts). Kalau nama parameternya ditulis ulang di sini, menu
 * bisa mengirim "?negara=" sementara halaman ini membaca nama lain, dan
 * tautannya mati tanpa pesan error.
 */

/** Alamat halaman ini beserta penyaringnya, siap diberikan ke router. */
function alamatDenganFilter(f: CatalogFilter): string {
  const query = tulisFilter(f);
  const path = window.location.pathname;
  return query ? `${path}?${query}` : path;
}

/**
 * Label pendek untuk judul halaman, mis. " — serial, sudah tamat".
 * Tanpa ini penonton yang datang dari menu melihat jumlah judul menyusut tanpa
 * tahu penyaring mana yang sedang bekerja.
 */
function keteranganFilter(f: CatalogFilter): string {
  const bagian: string[] = [];
  if (f.cat !== "Semua") bagian.push(`genre ${f.cat}`);
  if (f.kind !== "all") bagian.push(f.kind === "movie" ? "film" : "serial");
  if (f.status !== "all")
    bagian.push(f.status === "completed" ? "sudah tamat" : "masih tayang");
  if (f.akses !== "all") bagian.push(f.akses === "koin" ? "pakai koin" : "gratis");
  if (f.sub !== "all") bagian.push("sub Indo");
  if (f.negara !== "all") bagian.push(f.negara);
  if (f.year !== "all") bagian.push(`tahun ${f.year}`);
  return bagian.length ? ` — ${bagian.join(", ")}` : "";
}

export default function DramaBrowser({ dramas }: { dramas: Drama[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filter, setFilter] = useState<CatalogFilter>(() => bacaFilter(searchParams));

  /**
   * Sinkronkan penyaring tiap alamat berubah dari LUAR komponen ini: tombol
   * Back browser, dan tautan menu/pintasan yang menunjuk halaman ini juga.
   * Next.js tidak memasang ulang komponen untuk perpindahan di rute yang sama,
   * jadi tanpa ini menu akan mengubah alamat tapi grid-nya diam — persis
   * kegagalan senyap yang paling mungkin terjadi di fitur ini.
   */
  useEffect(() => {
    setFilter(bacaFilter(searchParams));
  }, [searchParams]);

  const years = useMemo(() => getYearOptions(dramas), [dramas]);
  const menus = useMemo(() => buildNavMenus(dramas), [dramas]);
  const shortcuts = useMemo(() => catalogShortcuts(dramas), [dramas]);

  /**
   * Ketikan pencarian & urutan sengaja TIDAK dihitung sebagai "filter aktif":
   * kotak cari punya tombol hapus sendiri, dan tombol "Hapus filter" yang ikut
   * mengosongkan ketikan terasa seperti kehilangan yang baru saja diketik.
   */
  const adaFilterAktif = useMemo(
    () =>
      (Object.keys(FILTER_KOSONG) as (keyof CatalogFilter)[]).some(
        (k) => k !== "q" && k !== "sort" && filter[k] !== FILTER_KOSONG[k],
      ),
    [filter],
  );

  const terapkan = useCallback(
    (ubahan: Partial<CatalogFilter>) => {
      const berikutnya = { ...filter, ...ubahan };
      setFilter(berikutnya);
      router.replace(alamatDenganFilter(berikutnya), { scroll: false });
    },
    [filter, router],
  );

  // Ketikan ditulis ke alamat setelah jeda singkat — kalau tiap huruf langsung
  // menulis alamat, riwayat browser penuh dan halaman tersendat.
  useEffect(() => {
    const t = setTimeout(() => {
      const dariUrl = bacaFilter(searchParams);
      if (dariUrl.q === filter.q) return;
      router.replace(alamatDenganFilter({ ...dariUrl, q: filter.q }), {
        scroll: false,
      });
    }, 250);
    return () => clearTimeout(t);
  }, [filter.q, searchParams, router]);

  const filtered = useMemo(
    () => filterAndSortDramas(dramas, filterOptions(filter)),
    [dramas, filter],
  );

  // Ketikan pencarian DIPERTAHANKAN — alasannya sama dengan `adaFilterAktif`.
  const resetFilters = () => terapkan({ ...FILTER_KOSONG, q: filter.q });

  /** Dropdown penyaring — dititipkan ke bar cari, sama seperti /beranda. */
  const dropdownPenyaring = (
    <>
      <Select value={filter.year} onValueChange={(v) => terapkan({ year: v })}>
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

      <Select
        value={filter.rating}
        onValueChange={(v) => terapkan({ rating: v as RatingKey })}
      >
        <SelectTrigger className={TRIGGER_CLASS} aria-label="Rating IMDb">
          <SelectValue placeholder="Rating" />
        </SelectTrigger>
        <SelectContent className="border-zinc-700 bg-zinc-900 text-zinc-200">
          {RATING_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filter.sort}
        onValueChange={(v) => terapkan({ sort: v as SortBy })}
      >
        <SelectTrigger className={TRIGGER_CLASS} aria-label="Urutkan">
          <SelectValue placeholder="Urutkan" />
        </SelectTrigger>
        <SelectContent className="border-zinc-700 bg-zinc-900 text-zinc-200">
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <>
      {/* Bar cari + strip genre: komponen yang SAMA dengan halaman depan &
          /beranda, supaya penonton tak merasa pindah situs. Yang beda cuma
          artinya — di sini genre menyaring grid di halaman ini juga, DAN
          ikut ditulis ke alamat URL (?cat=) supaya hasilnya bisa dibagikan. */}
      <SearchBar
        value={filter.q}
        onValueChange={(v) => setFilter((f) => ({ ...f, q: v }))}
        filters={dropdownPenyaring}
        chrome={{ menus: <NavMenus menus={menus} /> }}
        className="sticky top-14"
      />
      <GenreStrip
        genres={CATEGORIES}
        active={filter.cat}
        onSelect={(g) => terapkan({ cat: g as Category })}
        shortcuts={shortcuts}
      />

      <div className={SHELL}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 py-3">
          <h1 className="text-sm text-zinc-400">
            <span className="font-bold text-white">Jelajah Drama</span> &mdash;{" "}
            {filtered.length} judul
            {keteranganFilter(filter)}
            {filter.q ? ` untuk "${filter.q}"` : ""}
          </h1>
          {(adaFilterAktif || filter.q) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 gap-1 rounded-sm text-xs text-zinc-400 hover:text-white"
            >
              <X className="size-3.5" />
              Hapus filter
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Search className="size-8 text-zinc-700" />
            <p className="text-sm text-zinc-500">Tidak ada drama yang cocok.</p>
            {adaFilterAktif && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="rounded-sm border-zinc-700 bg-transparent text-xs text-zinc-300 hover:border-amber-400 hover:text-amber-400"
              >
                Hapus filter
              </Button>
            )}
          </div>
        ) : (
          <div className={GRID_CLASS}>
            {filtered.map((drama) => (
              <CatalogCard key={drama.id} drama={drama} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
