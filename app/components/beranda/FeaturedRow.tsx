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
  title,
}: {
  dramas: Drama[];
  /** Tujuan tautan/tombol "lihat semua". */
  href?: string;
  /**
   * Judul baris (mis. "Drama Action"). Ada judul = baris kategori biasa:
   * judul di kiri + tautan kecil di kanan. Tanpa judul = baris UNGGULAN di
   * kepala halaman, yang pakai tombol besar di tengah supaya menonjol.
   */
  title?: string;
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
      aria-label={title ?? "Film unggulan"}
      className="group/unggulan relative border-b border-zinc-900 bg-black py-4"
    >
      <div className="shell-wide relative mx-auto px-4 md:px-6">
        {title && (
          <div className="mb-2 flex items-end justify-between gap-3">
            <h2 className="text-sm font-bold text-white md:text-base">{title}</h2>
            <Link
              href={href}
              className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-amber-400 hover:underline"
            >
              Lihat semua
            </Link>
          </div>
        )}
        {/* Panah geser. Sengaja hanya di layar lebar: di HP menggeser dengan
            jari sudah lebih enak daripada menekan tombol kecil. */}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => geser(-1)}
          aria-label="Geser ke kiri"
          className="absolute left-1 top-[45%] z-20 hidden size-9 -translate-y-1/2 rounded-full border border-white/25 bg-black/80 text-white opacity-0 shadow-lg transition-opacity hover:bg-black md:flex md:group-hover/unggulan:opacity-100"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => geser(1)}
          aria-label="Geser ke kanan"
          className="absolute right-1 top-[45%] z-20 hidden size-9 -translate-y-1/2 rounded-full border border-white/25 bg-rose-600 text-white opacity-0 shadow-lg transition-opacity hover:bg-rose-500 md:flex md:group-hover/unggulan:opacity-100"
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
            <div key={d.id} className="w-24 shrink-0 sm:w-28 md:w-32">
              <CatalogCard drama={d} />
            </div>
          ))}
        </div>

        {!title && (
          <div className="mt-4 flex justify-center">
            <Button
              asChild
              className="h-10 rounded-sm bg-gradient-to-r from-fuchsia-600 to-rose-600 px-6 text-xs font-bold uppercase tracking-wide text-white shadow-lg hover:from-fuchsia-500 hover:to-rose-500"
            >
              <Link href={href}>Lihat semua film unggulan</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
