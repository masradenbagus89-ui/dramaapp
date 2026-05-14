"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CATEGORIES, type Category, type Drama } from "@/lib/types";
import DramaCard from "./DramaCard";

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
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-zinc-500"
          >
            <path d="M10 2a8 8 0 105.29 14.04l4.33 4.34 1.42-1.42-4.34-4.33A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari drama..."
            className="w-full rounded-full border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-amber-400"
          />
        </div>
      </div>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        {CATEGORIES.map((cat) => {
          const active = cat === category;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-amber-400 font-semibold text-black"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-12 text-center text-sm text-zinc-500">
          Tidak ada drama yang cocok.
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
