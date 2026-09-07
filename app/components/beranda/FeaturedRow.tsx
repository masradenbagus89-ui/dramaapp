"use client";

import { useRef } from "react";
import Link from "next/link";
import type { Drama } from "@/lib/types";
import CatalogCard from "./CatalogCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Baris FILM UNGGULAN di kepala beranda — deretan poster yang bisa digeser
 * ke samping, lalu satu tombol "lihat semua" di bawahnya.
 *
 * Menggantikan banner hero yang berganti sendiri (permintaan owner 2026-09-07:
 * "jangan berjalan lagi"). Di sini TIDAK ADA yang bergerak otomatis: tak ada
 * timer ganti-slide, tak ada video yang diputar sendiri. Poster hanya bergeser
 * kalau penonton menekan panah atau menggeser dengan jari.
 *
 * `HomeHero` yang lama TIDAK dihapus — masih dipakai /discover.
 */
export default function FeaturedRow({
  dramas,
  href = "/discover",
}: {
  dramas: Drama[];
  /** Tujuan tombol "lihat semua". */
  href?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  if (dramas.length === 0) return null;

  const geser = (arah: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: arah * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section
      aria-label="Film unggulan"
      className="group/unggulan relative border-b border-zinc-900 bg-black py-4"
    >
      <div className="shell-wide relative mx-auto px-4 md:px-6">
        {/* Panah geser. Sengaja hanya di layar lebar: di HP menggeser dengan
            jari sudah lebih enak daripada menekan tombol kecil. */}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => geser(-1)}
          aria-label="Geser ke kiri"
          className="absolute left-1 top-1/2 z-20 hidden size-9 -translate-y-1/2 rounded-full border border-white/25 bg-black/80 text-white opacity-0 shadow-lg transition-opacity hover:bg-black md:flex md:group-hover/unggulan:opacity-100"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => geser(1)}
          aria-label="Geser ke kanan"
          className="absolute right-1 top-1/2 z-20 hidden size-9 -translate-y-1/2 rounded-full border border-white/25 bg-rose-600 text-white opacity-0 shadow-lg transition-opacity hover:bg-rose-500 md:flex md:group-hover/unggulan:opacity-100"
        >
          <ChevronRight className="size-5" />
        </Button>

        <div
          ref={scroller}
          className="no-scrollbar flex gap-2.5 overflow-x-auto scroll-smooth"
        >
          {dramas.map((d) => (
            // Lebar dikunci di sini (bukan di CatalogCard) supaya kartunya tetap
            // kartu yang SAMA dengan yang dipakai grid di bawah — lencana, hover,
            // dan cuplikannya tidak perlu dibuat versi kedua.
            <div key={d.id} className="w-28 shrink-0 sm:w-32 md:w-36 lg:w-40">
              <CatalogCard drama={d} />
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          <Button
            asChild
            className="h-10 rounded-sm bg-gradient-to-r from-fuchsia-600 to-rose-600 px-6 text-xs font-bold uppercase tracking-wide text-white shadow-lg hover:from-fuchsia-500 hover:to-rose-500"
          >
            <Link href={href}>Lihat semua film unggulan</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
