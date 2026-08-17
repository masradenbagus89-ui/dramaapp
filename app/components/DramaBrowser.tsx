"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CATEGORIES, type Category, type Drama } from "@/lib/types";
import { genreChipClass } from "@/lib/genre-accent";
import {
  SORT_OPTIONS,
  RATING_OPTIONS,
  filterAndSortDramas,
  getYearOptions,
  parseSort,
  type RatingKey,
  type SortBy,
} from "@/lib/discover";
import DramaCard from "./DramaCard";
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
import { Search, SlidersHorizontal, X } from "lucide-react";

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

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <h1 className="hidden text-2xl font-bold text-white md:block">
          Jelajah Drama
        </h1>
        <div className="relative md:ml-auto md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari drama..."
            className="rounded-full border-zinc-800 bg-zinc-900 pl-9 text-sm text-white placeholder:text-zinc-500 focus-visible:border-amber-400 focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {CATEGORIES.map((cat) => {
            const active = cat === category;
            return (
              <Button
                key={cat}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                onClick={() => {
                  setCategory(cat);
                  updateParams({ cat });
                }}
                className={cn(
                  "shrink-0 rounded-full",
                  active ? "font-semibold" : genreChipClass(cat),
                )}
              >
                {cat}
              </Button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <SlidersHorizontal className="size-4" />
            <span className="sr-only md:not-sr-only md:text-xs">Filter</span>
          </div>

          <Select
            value={year}
            onValueChange={(v) => {
              setYear(v);
              updateParams({ year: v });
            }}
          >
            <SelectTrigger
              className="h-8 rounded-full border-zinc-700 bg-zinc-900 text-xs text-white focus:ring-0 focus-visible:border-amber-400 [&>span]:text-zinc-300"
              aria-label="Tahun"
            >
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
            <SelectTrigger
              className="h-8 rounded-full border-zinc-700 bg-zinc-900 text-xs text-white focus:ring-0 focus-visible:border-amber-400 [&>span]:text-zinc-300"
              aria-label="Rating IMDb"
            >
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
            <SelectTrigger
              className="h-8 rounded-full border-zinc-700 bg-zinc-900 text-xs text-white focus:ring-0 focus-visible:border-amber-400 [&>span]:text-zinc-300"
              aria-label="Urutkan"
            >
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

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 gap-1 rounded-full text-xs text-zinc-400 hover:text-white"
            >
              <X className="size-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        Menampilkan {filtered.length} drama
        {query && ` untuk "${query}"`}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <Search className="size-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">Tidak ada drama yang cocok.</p>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="mt-2 rounded-full border-zinc-700 bg-transparent text-xs text-zinc-300 hover:border-amber-400 hover:text-amber-400"
            >
              Hapus filter
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-5 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((drama) => (
            <DramaCard key={drama.id} drama={drama} />
          ))}
        </div>
      )}
    </>
  );
}
