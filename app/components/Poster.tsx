"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Drama, DramaQuality } from "@/lib/types";
import { CARD_PREVIEW_SEC, teaserShouldLoop } from "@/lib/hero-teaser";
import { lencanaKartu } from "@/lib/lencana-kartu";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

type Props = {
  drama: Drama;
  className?: string;
  /**
   * false = jangan gambar chip EXCLUSIVE di kanan-atas.
   *
   * Dipakai halaman detail drama, yang sudah memajang lencananya sendiri di
   * sebelah judul — dua lencana yang sama di satu layar cuma mengulang.
   * Lencana lain (rating/kualitas/tahun/durasi) TIDAK ikut dimatikan.
   */
  showBadge?: boolean;
  /** Cuplikan episode 1 — hanya dimuat saat hover di desktop. */
  previewSrc?: string;
};

// --- Bentuk lencana (dipakai berulang; ditulis sekali supaya seragam) -------
// Kecil & gelap-transparan supaya menempel di poster tanpa menutupi wajah
// pemainnya — permintaan owner: "jangan membuat poster menjadi penuh".
const CHIP =
  "pointer-events-none flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[10px] font-bold leading-tight shadow md:text-[11px]";
const CHIP_GELAP = "bg-black/75 text-white ring-1 ring-white/15 backdrop-blur-[2px]";

/**
 * Warna chip kualitas — dua warna saja, sesuai contoh yang diberikan owner
 * 2026-09-22 sore (dua poster pembanding: CAM merah, HD hijau).
 *
 * MERAH = CAM/HDCAM, rekaman bioskop (buram, sering miring). Warnanya bukan
 * hiasan: itu peringatan yang dicari penonton SEBELUM memutuskan menonton.
 * HIJAU = sisanya (HD, WEB-DL, BluRay, 4K) = sumber bersih, aman ditonton.
 *
 * Sengaja cuma dua warna, bukan satu warna per nilai: penonton perlu menjawab
 * satu pertanyaan saja ("jernih atau tidak?"), dan lima warna berbeda di pojok
 * poster justru memperlambat jawabannya.
 */
function warnaKualitas(q: DramaQuality): string {
  return q === "CAM" || q === "HDCAM"
    ? "bg-red-600 text-white ring-1 ring-red-300/40"
    : "bg-green-600 text-white ring-1 ring-green-300/40";
}

export default function Poster({
  drama,
  className,
  showBadge = true,
  previewSrc,
}: Props) {
  const [preview, setPreview] = useState(false);
  const delayRef = useRef(0);

  // SATU sumber untuk seluruh label kartu (lib/lencana-kartu.ts) — bukan
  // dibaca langsung dari `drama` di sini. Aturan "field kosong = lencana tidak
  // digambar" jadi bisa diuji tanpa browser, dan semua kartu di situs memakai
  // aturan yang sama persis.
  const lencana = lencanaKartu(drama);

  const stopPreview = () => {
    window.clearTimeout(delayRef.current);
    setPreview(false);
  };

  const onEnter = () => {
    if (!previewSrc) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    delayRef.current = window.setTimeout(() => setPreview(true), 400);
  };

  useEffect(() => () => window.clearTimeout(delayRef.current), []);

  return (
    <div
      className={cn(
        "relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-gradient-to-br",
        drama.gradient,
        className,
      )}
      onMouseEnter={onEnter}
      onMouseLeave={stopPreview}
    >
      {drama.posterImage ? (
        <Image
          src={drama.posterImage}
          alt={drama.title}
          fill
          sizes="(max-width: 768px) 45vw, 220px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
          {/* pb-7: menyisakan ruang untuk baris lencana bawah, supaya judul
              cadangan ini tidak tertindih tahun & durasi. */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-7 pt-10">
            <div className="title-gold line-clamp-4 text-sm leading-snug">
              {drama.title}
            </div>
          </div>
        </>
      )}

      {preview && previewSrc && (
        <video
          src={previewSrc}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          onTimeUpdate={(e) => {
            // Ulang dari awal di detik ke-CARD_PREVIEW_SEC. Tanpa ini, mouse yang
            // diam di atas kartu membuat browser mengunduh SELURUH episode dari
            // PC backup. Mengulang potongan yang sama = diputar dari buffer,
            // bukan diunduh lagi.
            const v = e.currentTarget;
            if (teaserShouldLoop(v.currentTime, v.duration, 0, CARD_PREVIEW_SEC)) {
              v.currentTime = 0;
            }
          }}
          onError={stopPreview}
        />
      )}

      {/* ===== LAPISAN LENCANA — empat pojok, pola situs streaming katalog.
             Digambar di SINI (bukan di tiap kartu) karena semua kartu situs ini
             memakai komponen Poster: halaman depan, hasil cari, kategori,
             halaman detail, baris rekomendasi, riwayat, my-list. Satu tempat =
             tidak ada halaman yang tertinggal saat aturannya berubah.

             Ditulis PALING AKHIR supaya berada di atas gambar & cuplikan video.
             `pointer-events-none` = tak menghalangi klik menuju halaman drama. */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between">
        <div className="flex items-start gap-1 p-1 md:p-1.5">
          {/* Kiri-atas: rating IMDb. Hilang sendiri kalau judul ini belum punya
              rating — jangan diganti "—", itu terbaca seperti nilai nol. */}
          {lencana.rating && (
            <span className={cn(CHIP, CHIP_GELAP)}>
              <Star className="size-2.5 fill-amber-400 text-amber-400 md:size-3" />
              {lencana.rating}
            </span>
          )}

          {/* Kanan-atas: kualitas video, lalu penanda eksklusif di bawahnya.
              `ml-auto` (bukan justify-between) supaya kelompok ini tetap menempel
              ke kanan walau lencana rating di kiri tidak digambar.

              Chip "🪙 Premium" DIHAPUS dari poster atas permintaan owner
              2026-09-23 — poster jadi terlalu penuh saat puluhan kartu berjajar.
              Paywall-nya sendiri TIDAK ikut dimatikan (lihat PAYWALL_ENABLED di
              lib/coins.ts): episode berbayar tetap terkunci, cuma penandanya
              yang tidak lagi dipajang di kartu. Keterangan PREMIUM masih ada di
              halaman detail drama, di sebelah judul. */}
          <span className="ml-auto flex flex-col items-end gap-1">
            {lencana.kualitas && (
              <span className={cn(CHIP, warnaKualitas(lencana.kualitas))}>
                {lencana.kualitas}
              </span>
            )}
            {showBadge && !lencana.premium && lencana.exclusive && (
              <span className={cn(CHIP, CHIP_GELAP, "uppercase tracking-wider")}>
                Exclusive
              </span>
            )}
          </span>
        </div>

        {/* Baris bawah: tahun di kiri, durasi/jumlah episode di kanan. Gradien
            hitam tipis di belakangnya supaya teks putih tetap terbaca di atas
            poster berwarna terang. */}
        <div className="flex items-end justify-between gap-1 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-1.5 pb-1.5 pt-7">
          <span className="flex min-w-0 items-center gap-1">
            {lencana.kiriBawah && (
              <span className="truncate text-[10px] font-bold text-white/90 md:text-[11px]">
                {lencana.kiriBawah}
              </span>
            )}
            {lencana.status && (
              <span
                className={cn(
                  "shrink-0 text-[10px] font-bold md:text-[11px]",
                  lencana.status === "ONGOING" ? "text-rose-400" : "text-sky-400",
                )}
              >
                {lencana.status}
              </span>
            )}
          </span>
          <span className="shrink-0 text-[10px] font-bold text-white md:text-[11px]">
            {lencana.kananBawah}
          </span>
        </div>
      </div>
    </div>
  );
}
