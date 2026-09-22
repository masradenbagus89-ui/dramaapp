"use client";

import Link from "next/link";
import type { Drama } from "@/lib/types";
import { teaserSrc } from "@/lib/hero-teaser";
import Poster from "../Poster";
import { Play } from "lucide-react";

/**
 * Kartu poster PADAT untuk grid katalog — poster 2:3 rapat berlencana, pola
 * yang dipakai situs streaming katalog (beda dari `DramaCard` yang lega 3:4
 * untuk /my-list & baris favorit).
 *
 * Lencananya TIDAK lagi digambar di sini (2026-09-22). Sampai kemarin komponen
 * ini menyusun lencananya sendiri karena posisinya beda dari kartu lain;
 * sekarang keempat pojok itu jadi bentuk baku SELURUH situs, jadi gambarnya
 * pindah ke `Poster` — satu-satunya komponen yang dipakai semua kartu. Menyalin
 * aturannya di dua tempat berarti halaman lain tertinggal setiap kali aturannya
 * berubah, dan itu persis yang terjadi pada badge tahun/rating sebelumnya.
 */
export default function CatalogCard({
  drama,
  href,
}: {
  drama: Drama;
  /**
   * Tujuan klik. Default `/drama/<id>` (halaman detail).
   *
   * Ada karena halaman Shorts memakai kartu yang SAMA tapi harus menuju
   * pemutar cuplikan `/feed/<id>`. Opsional supaya pemanggil lama
   * (baris katalog, grid) tidak berubah sama sekali.
   */
  href?: string;
}) {
  return (
    <Link
      href={href ?? `/drama/${drama.id}`}
      className="group/kartu block focus-visible:outline-none"
    >
      <div className="relative overflow-hidden rounded-sm ring-1 ring-white/10 transition duration-200 group-hover/kartu:ring-2 group-hover/kartu:ring-amber-400 group-focus-visible/kartu:ring-2 group-focus-visible/kartu:ring-amber-400">
        <Poster
          drama={drama}
          previewSrc={teaserSrc(drama.id)}
          className="aspect-[2/3] rounded-sm"
        />

        {/* Tombol putar muncul saat mouse di atas kartu (desktop). z-20 = di
            atas lapisan lencana (z-10), supaya ikon putarnya tidak tertindih. */}
        <span className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover/kartu:bg-black/40">
          <Play className="size-9 fill-white text-white opacity-0 drop-shadow-lg transition-opacity duration-200 group-hover/kartu:opacity-100 md:size-12" />
        </span>
      </div>

      <h3 className="mt-1.5 line-clamp-2 text-[13px] font-bold leading-snug text-white transition-colors group-hover/kartu:text-amber-400 md:text-sm">
        {drama.title}
      </h3>
      <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500 md:text-xs">
        {drama.category}
      </p>
    </Link>
  );
}
