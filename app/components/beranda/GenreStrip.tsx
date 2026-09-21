"use client";

import { Fragment } from "react";
import Link from "next/link";
import type { NavItem } from "@/lib/nav-katalog";
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
  /**
   * Chip sesudah daftar genre (genre sinema · negara · tahun · urutan), datang
   * dari `catalogShortcuts`. SELALU berupa tautan, apa pun mode genre di atas:
   * isinya bukan kategori, jadi tidak bisa dijawab oleh penyaring genre milik
   * halaman — kecuali /discover, yang memang membaca penyaring dari alamat URL.
   */
  shortcuts?: NavItem[];
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
  shortcuts,
  moreHref,
  moreLabel = "Jelajah",
}: Props) {
  return (
    <div className="border-b-2 border-amber-600 bg-gradient-to-r from-amber-400 to-yellow-400">
      {/* Digeser di HP, MEMBUNGKUS di layar lebar.
          Kenapa dibedakan: sejak strip ikut memuat negara & tahun (owner
          2026-09-21) chip-nya bisa lewat 20 buah. Digeser di layar lebar
          berarti chip yang diminta owner (mis. Cina, 2025) jatuh di luar layar
          dan terbaca seperti tidak dikerjakan. Sebaliknya membungkus di HP
          membuat strip setinggi lima baris dan mendorong poster pertama keluar
          layar pertama. */}
      <div
        className={cn(
          SHELL,
          "no-scrollbar flex flex-nowrap items-center overflow-x-auto px-2",
          "md:flex-wrap md:overflow-x-visible md:px-4",
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

        {shortcuts?.map((s, i) => (
          <Fragment key={s.href}>
            {/* Garis tipis tiap KELOMPOK berganti (genre -> negara -> tahun ->
                urutan), bukan jarak kosong: di strip yang bisa digeser, jarak
                kosong terbaca seperti daftarnya sudah habis. Chip pertama juga
                dapat garis, memisahkannya dari daftar genre kategori. */}
            {(i === 0 || s.grup !== shortcuts[i - 1].grup) && (
              <span
                aria-hidden
                className="mx-1 h-4 w-px shrink-0 bg-amber-700/50"
              />
            )}
            <Link
              href={s.href}
              className={cn(
                ITEM_CLASS,
                // Merah hanya untuk pintasan URUTAN — itu yang mengubah cara
                // daftar disusun, bukan memotong daftarnya. Chip penyaring
                // (genre/negara/tahun) sewarna dengan genre kategori di kiri
                // karena kerjanya memang sama.
                s.grup === "urutan" ? "text-red-900" : "text-zinc-900",
                "hover:bg-amber-300",
              )}
            >
              {s.label}
            </Link>
          </Fragment>
        ))}

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
