"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CATEGORIES, type Category, type Drama } from "@/lib/types";
import {
  SORT_OPTIONS,
  RATING_OPTIONS,
  filterAndSortDramas,
  getYearOptions,
  parseSort,
  type RatingKey,
  type SortBy,
} from "@/lib/discover";
import CatalogCard from "./beranda/CatalogCard";
import GenreStrip from "./beranda/GenreStrip";
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

function parseCategory(value: string | null): Category {
  if (!value) return "Semua";
  return CATEGORIES.includes(value as Category) ? (value as Category) : "Semua";
}

function parseRating(value: string | null): RatingKey {
  if (value === "7" || value === "8" || value === "9") return value;
  return "all";
}

export default function DramaBrowser({ dramas }: { dramas: Drama[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQ = searchParams?.get("q") ?? "";
  const initialCat = parseCategory(searchParams?.get("cat"));
  const initialYear = searchParams?.get("year") ?? "all";
  const initialRating = parseRating(searchParams?.get("rating"));
  const initialSort = parseSort(searchParams?.get("sort"));

  const [query, setQuery] = useState(initialQ);
  const [category, setCategory] = useState<Category>(initialCat);
  const [year, setYear] = useState<string>(initialYear);
  const [minRating, setMinRating] = useState<RatingKey>(initialRating);
  const [sortBy, setSortBy] = useState<SortBy>(initialSort);

  // Sinkronkan state kalau URL berubah dari luar (mis. browser back).
  useEffect(() => {
    const q = searchParams?.get("q") ?? "";
    setQuery(q);
    setCategory(parseCategory(searchParams?.get("cat")));
    setYear(searchParams?.get("year") ?? "all");
    setMinRating(parseRating(searchParams?.get("rating")));
    setSortBy(parseSort(searchParams?.get("sort")));
  }, [searchParams]);

  const years = useMemo(() => getYearOptions(dramas), [dramas]);

  const hasActiveFilters =
    category !== "Semua" || year !== "all" || minRating !== "all";

  const updateParams = (
    next: Partial<{
      q: string;
      cat: Category;
      year: string;
      rating: RatingKey;
      sort: SortBy;
    }>,
  ) => {
    const params = new URLSearchParams(searchParams?.toString());
    const merged = {
      q: next.q !== undefined ? next.q : query,
      cat: next.cat !== undefined ? next.cat : category,
      year: next.year !== undefined ? next.year : year,
      rating: next.rating !== undefined ? next.rating : minRating,
      sort: next.sort !== undefined ? next.sort : sortBy,
    };

    if (merged.q) params.set("q", merged.q);
    else params.delete("q");
    if (merged.cat && merged.cat !== "Semua") params.set("cat", merged.cat);
    else params.delete("cat");
    if (merged.year && merged.year !== "all") params.set("year", merged.year);
    else params.delete("year");
    if (merged.rating && merged.rating !== "all")
      params.set("rating", merged.rating);
    else params.delete("rating");
    if (merged.sort && merged.sort !== "relevance")
      params.set("sort", merged.sort);
    else params.delete("sort");

    const url = `${window.location.pathname}?${params.toString()}`;
    router.replace(url, { scroll: false });
  };

  // Update URL saat query berubah, tapi dengan debounce sederhana.
  useEffect(() => {
    const t = setTimeout(() => updateParams({ q: query }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const filtered = useMemo(
    () =>
      filterAndSortDramas(dramas, {
        query,
        category,
        year,
        minRating,
        sortBy,
      }),
    [dramas, query, category, year, minRating, sortBy],
  );

  const resetFilters = () => {
    setCategory("Semua");
    setYear("all");
    setMinRating("all");
    setSortBy("relevance");
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    router.replace(`${window.location.pathname}?${params.toString()}`, {
      scroll: false,
    });
  };

  /** Dropdown penyaring — dititipkan ke bar cari, sama seperti /beranda. */
  const dropdownPenyaring = (
    <>
      <Select
        value={year}
        onValueChange={(v) => {
          setYear(v);
          updateParams({ year: v });
        }}
      >
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
        value={minRating}
        onValueChange={(v) => {
          setMinRating(v as RatingKey);
          updateParams({ rating: v as RatingKey });
        }}
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
        value={sortBy}
        onValueChange={(v) => {
          setSortBy(v as SortBy);
          updateParams({ sort: v as SortBy });
        }}
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
          ikut ditulis ke alamat URL (?cat=) supaya hasilnya bisa dibagikan.
          Logika filter/URL di atas TIDAK diubah; yang diganti hanya bentuknya. */}
      <SearchBar
        value={query}
        onValueChange={setQuery}
        filters={dropdownPenyaring}
        className="sticky top-14"
      />
      <GenreStrip
        genres={CATEGORIES}
        active={category}
        onSelect={(g) => {
          const cat = g as Category;
          setCategory(cat);
          updateParams({ cat });
        }}
      />

      <div className={SHELL}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 py-3">
          <h1 className="text-sm text-zinc-400">
            <span className="font-bold text-white">Jelajah Drama</span> &mdash;{" "}
            {filtered.length} judul
            {category !== "Semua" ? ` genre ${category}` : ""}
            {query ? ` untuk "${query}"` : ""}
          </h1>
          {(hasActiveFilters || query) && (
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
            {hasActiveFilters && (
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
