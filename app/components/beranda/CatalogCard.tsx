"use client";

import Link from "next/link";
import type { Drama } from "@/lib/types";
import { cardBadges } from "@/lib/beranda-catalog";
import { teaserSrc } from "@/lib/hero-teaser";
import { PAYWALL_ENABLED } from "@/lib/coins";
import Poster from "../Poster";
import { Play, Star } from "lucide-react";

/**
 * Kartu poster PADAT untuk grid beranda — poster 2:3 rapat berlencana, pola
 * yang dipakai situs streaming katalog (beda dari `DramaCard` yang lega 3:4
 * untuk /my-list & /discover).
 *
 * Tata letak lencananya mengikuti contoh yang diminta owner: rating di
 * kiri-atas, format (jumlah episode / film) di kanan-atas, lalu baris bawah
 * berisi tahun & status. Lencana digambar di sini, bukan di `Poster`, karena
 * posisinya beda dari kartu lain. `Poster` tetap dipakai untuk gambar +
 * cuplikan-saat-hover supaya logika unduh teaser (yang menjaga kuota) tidak
 * ditulis dua kali.
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
  const badge = cardBadges(drama);
  const tampilkanKoin = PAYWALL_ENABLED && badge.premium;

  return (
    <Link
      href={href ?? `/drama/${drama.id}`}
      className="group/kartu block focus-visible:outline-none"
    >
      <div className="relative overflow-hidden rounded-sm ring-1 ring-white/10 transition duration-200 group-hover/kartu:ring-2 group-hover/kartu:ring-amber-400 group-focus-visible/kartu:ring-2 group-focus-visible/kartu:ring-amber-400">
        <Poster
          drama={drama}
          previewSrc={teaserSrc(drama.id)}
          showBadge={false}
          showRating={false}
          className="aspect-[2/3] rounded-sm"
        />

        {/* Kiri-atas: rating IMDb — hanya kalau drama ini memang punya. */}
        {badge.rating && (
          <span className="pointer-events-none absolute left-1 top-1 z-10 flex items-center gap-0.5 rounded-sm bg-black/85 px-1.5 py-0.5 text-[10px] font-bold leading-tight text-white shadow md:left-1.5 md:top-1.5 md:text-[11px]">
            <Star className="size-2.5 fill-amber-400 text-amber-400 md:size-3" />
            {badge.rating}
          </span>
        )}

        {/* Kanan-atas: jumlah episode / penanda film. */}
        <span className="pointer-events-none absolute right-1 top-1 z-10 rounded-sm bg-fuchsia-600 px-1.5 py-0.5 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-white shadow md:right-1.5 md:top-1.5 md:text-[11px]">
          {badge.format}
        </span>

        {/* Baris bawah: tahun di kiri, status di kanan. Keduanya menghilang
            sendiri kalau katalog belum punya datanya — kartu tidak mengarang. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-1 bg-gradient-to-t from-black/95 via-black/50 to-transparent px-1.5 pb-1 pt-8">
          <span className="text-[10px] font-bold text-white/90 md:text-[11px]">
            {drama.year ?? (badge.subIndo ? "SUB INDO" : "")}
          </span>
          <span className="flex items-center gap-1">
            {tampilkanKoin && (
              <span className="rounded-sm bg-amber-400 px-1 py-px text-[9px] font-bold text-black">
                KOIN
              </span>
            )}
            {badge.status && (
              <span
                className={
                  badge.status === "ONGOING"
                    ? "text-[10px] font-bold text-rose-400 md:text-[11px]"
                    : "text-[10px] font-bold text-sky-400 md:text-[11px]"
                }
              >
                {badge.status}
              </span>
            )}
          </span>
        </div>

        {/* Tombol putar muncul saat mouse di atas kartu (desktop). */}
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
