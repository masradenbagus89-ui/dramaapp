"use client";

import Link from "next/link";
import type { NavItem } from "@/lib/nav-katalog";
import { cn } from "@/lib/utils";
import { SHELL } from "./shell";

type Props = {
  /** Isi strip. Biasanya `STRIP_KATALOG` — daftar tetap milik owner. */
  items: NavItem[];
  /**
   * Alamat penyaring yang sedang berlaku. Chip yang alamatnya sama persis
   * disorot, supaya penonton tahu chip mana yang sedang bekerja. Halaman yang
   * tidak menyaring di tempat (mis. halaman depan) cukup mengosongkannya.
   */
  activeHref?: string;
};

const ITEM_CLASS =
  "shrink-0 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide transition-colors";

/**
 * Strip kuning di bawah bar cari — deretan pintasan katalog gaya situs
 * streaming.
 *
 * Bentuknya SATU BARIS pintasan yang semuanya tautan ke /discover. Sampai
 * 2026-09-21 komponen ini punya dua mode (genre sebagai tombol saring-di-tempat
 * DI SINI, sisanya tautan ke halaman lain) — dua chip bersebelahan berperilaku
 * beda tanpa ada tandanya. Sejak isinya jadi daftar tetap milik owner yang
 * mencampur kategori, genre sinema, negara, dan tahun, mode saring-di-tempat
 * tak bisa dipakai lagi: /beranda hanya menyimpan genre kategori di state
 * lokalnya, jadi chip seperti CINA atau SCI-FI akan diam saja kalau diklik.
 * Satu perilaku untuk semua chip = tidak ada tombol yang diam-diam mati.
 *
 * Penyaringan genre di tempat pada /beranda TIDAK hilang — masih ada di
 * dropdown "Semua genre" pada bar cari halaman itu.
 */
export default function StripKatalog({ items, activeHref }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="border-b-2 border-amber-600 bg-gradient-to-r from-amber-400 to-yellow-400">
      {/* Digeser ke samping kalau tak muat (layar sempit), bukan membungkus:
          daftar ini sengaja dijaga pendek oleh owner supaya muat satu baris di
          layar lebar, dan strip yang berbaris-baris akan mendorong poster
          pertama turun keluar layar pertama. */}
      <div
        className={cn(
          SHELL,
          "no-scrollbar flex items-center overflow-x-auto px-2 md:px-4",
        )}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.href === activeHref ? "page" : undefined}
            className={cn(
              ITEM_CLASS,
              item.href === activeHref
                ? "bg-zinc-950 text-amber-400"
                : "text-zinc-900 hover:bg-amber-300",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
