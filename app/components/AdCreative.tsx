"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Penyaji creative iklan dengan kotak "PAS-BADAN": kotaknya dibentuk mengikuti
// rasio gambar, jadi gambar mengisi 100% kotaknya — tanpa area kosong, tanpa
// latar blur, dan tanpa pernah terpotong. Iklan biasanya penuh teks & tombol,
// jadi object-cover/crop sengaja TIDAK dipakai: memotongnya merusak pesan
// pengiklan.
//   • Gambar LANDSCAPE (rasio >= WIDE_THRESHOLD, mis. 1200x300) → melebar
//     mengisi lebar slot.
//   • Bentuk lain (mis. 2:1, persegi, potret) → kotak menyusut: lebar =
//     MAX_CARD_H x rasio, lalu bingkainya (AdBanner/pratinjau admin) ikut
//     memeluk lewat `w-fit`.
//
// Dipakai bareng oleh banner beranda (AdBanner) dan pratinjau admin
// (SponsorAdsManager) supaya tampilannya selalu identik (WYSIWYG).

const WIDE_THRESHOLD = 2.4;

/**
 * Tinggi maksimum kartu di layar lebar (px). Lebar kotak = tinggi x rasio,
 * jadi INI satu-satunya tombol untuk memperbesar/memperkecil iklan non-landscape.
 * Contoh: iklan yang sedang terpasang 1774x887 (rasio 2,0) → kotak 320x160.
 *
 * Nilai 160 dipilih owner 2026-09-02: sama persis dengan tinggi kartu sebelum
 * banner ini diubah (`sm:h-40`), jadi ukuran gambarnya kembali familiar —
 * bedanya kini mengisi penuh, tanpa latar blur.
 */
const MAX_CARD_H = 160;

/**
 * Bentuk cadangan selama rasio gambar belum terukur (rasio baru diketahui
 * browser setelah gambar selesai diunduh). Disamakan dengan ukuran yang
 * disarankan panel admin (1200x300) supaya kasus paling umum tidak bergeser.
 */
const FALLBACK_RATIO = 4;

/**
 * Batas bawah rasio. Tanpa ini, gambar potret ekstrem (mis. 1:5) jadi sliver
 * tipis yang tak terbaca di dalam slot yang lebar.
 */
const MIN_RATIO = 0.6;

export default function AdCreative({
  src,
  alt = "",
  hover = false,
  maxHeight,
}: {
  src: string;
  alt?: string;
  hover?: boolean;
  /**
   * Timpa MAX_CARD_H untuk penempatan tertentu. Dipakai kolom iklan di samping
   * carousel (RowWithAd) yang butuh kartu setinggi satu baris poster.
   * Dibiarkan kosong = pakai MAX_CARD_H, jadi 5 pemakai lain tidak berubah.
   */
  maxHeight?: number;
}) {
  // Rasio disimpan bersama src-nya supaya saat src berganti (admin mengetik URL
  // baru di pratinjau) bentuk lama tidak sempat terpakai untuk gambar baru.
  const [measured, setMeasured] = useState<{ src: string; ratio: number } | null>(
    null,
  );
  const ratio = measured?.src === src ? measured.ratio : null;

  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setMeasured({ src, ratio: img.naturalWidth / img.naturalHeight });
    }
  };

  if (ratio !== null && ratio >= WIDE_THRESHOLD) {
    // Landscape → mengisi lebar slot. Kalau gambar aslinya lebih sempit dari
    // slot, ia berhenti di lebar aslinya (bingkai `w-fit` ikut menyusut) —
    // sengaja, supaya gambar tidak di-upscale jadi buram.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        onLoad={onLoad}
        className={cn(
          "block h-auto w-full",
          hover && "transition-transform duration-300 group-hover:scale-[1.01]",
        )}
      />
    );
  }

  const shape = Math.max(ratio ?? FALLBACK_RATIO, MIN_RATIO);
  const cap = maxHeight ?? MAX_CARD_H;

  return (
    // Lebar sengaja definit (px), bukan `w-full`: bingkai pembungkusnya memakai
    // `w-fit`, dan ukuran persen di dalam parent fit-content tidak punya acuan
    // untuk dihitung. `maxWidth: 100%` yang menjaga kotak tak melebihi slot di
    // layar sempit; `aspectRatio` menjaga tingginya tetap proporsional.
    <div
      className="relative"
      style={{
        width: `${(cap * shape).toFixed(2)}px`,
        maxWidth: "100%",
        aspectRatio: shape,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={onLoad}
        className={cn(
          "h-full w-full object-contain transition duration-300",
          // Sembunyikan sampai bentuk aslinya diketahui — bentuk cadangan belum
          // tentu benar, dan pergantiannya akan terlihat sebagai kedipan.
          ratio === null && "opacity-0",
          hover && "group-hover:scale-[1.02]",
        )}
      />
    </div>
  );
}
