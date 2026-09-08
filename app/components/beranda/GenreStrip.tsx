"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { SHELL } from "./shell";

type Props = {
  /** Daftar genre siap tampil (pemanggil yang menaruh "Semua" di depan). */
  genres: string[];
  /** Genre yang sedang aktif — hanya berarti pada mode saring-di-tempat. */
  active?: string;
  /**
   * Mode TAUTAN (halaman depan): tiap genre jadi tautan ke alamat ini.
   * Isi salah satu saja — `hrefFor` ATAU `onSelect`.
   */
  hrefFor?: (genre: string) => string;
  /** Mode SARING-DI-TEMPAT (beranda): tiap genre jadi tombol. */
  onSelect?: (genre: string) => void;
  /** Tautan di ujung kanan strip. */
  moreHref?: string;
  moreLabel?: string;
};

const ITEM_CLASS =
  "shrink-0 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide transition-colors";

/**
 * Strip genre kuning di bawah bar cari.
 *
 * Dua mode karena dua halaman butuh arti berbeda: di /beranda genre menyaring
 * grid yang ada di halaman yang sama (tanpa memuat ulang), di halaman depan
 * belum ada grid untuk disaring sehingga genre harus melempar ke /discover.
 * Tampilannya sengaja identik supaya penonton tak merasa pindah situs.
 */
export default function GenreStrip({
  genres,
  active,
  hrefFor,
  onSelect,
  moreHref,
  moreLabel = "Jelajah",
}: Props) {
  return (
    <div className="border-b-2 border-amber-600 bg-gradient-to-r from-amber-400 to-yellow-400">
      <div
        className={cn(
          SHELL,
          "no-scrollbar flex items-center overflow-x-auto px-2 md:px-4",
        )}
      >
        {genres.map((g) => {
          const aktif = g === active;
          const kelas = cn(
            ITEM_CLASS,
            aktif ? "bg-zinc-950 text-amber-400" : "text-zinc-900 hover:bg-amber-300",
          );
          return hrefFor ? (
            <Link key={g} href={hrefFor(g)} className={kelas}>
              {g}
            </Link>
          ) : (
            <button
              key={g}
              type="button"
              onClick={() => onSelect?.(g)}
              aria-pressed={aktif}
              className={kelas}
            >
              {g}
            </button>
          );
        })}

        {moreHref && (
          <Link
            href={moreHref}
            className={cn(ITEM_CLASS, "ml-auto text-red-800 hover:bg-amber-300")}
          >
            {moreLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
