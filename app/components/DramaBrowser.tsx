"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CATEGORIES, type Category, type Drama } from "@/lib/types";
import DramaCard from "./DramaCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export default function DramaBrowser({ dramas }: { dramas: Drama[] }) {
  const searchParams = useSearchParams();
  const initialQ = searchParams?.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [category, setCategory] = useState<Category>("Semua");

  useEffect(() => {
    const q = searchParams?.get("q") ?? "";
    setQuery(q);
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return dramas.filter((d) => {
      const matchCat = category === "Semua" ? true : d.category === category;
      const matchQ =
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.synopsis.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [dramas, query, category]);

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

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        {CATEGORIES.map((cat) => {
          const active = cat === category;
          return (
            <Button
              key={cat}
              type="button"
              size="sm"
              variant={active ? "default" : "secondary"}
              onClick={() => setCategory(cat)}
              className={cn("shrink-0", active && "font-semibold")}
            >
              {cat}
            </Button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <Search className="size-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">Tidak ada drama yang cocok.</p>
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
