"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { NavItem, NavMenu } from "@/lib/nav-katalog";
import GenreStrip from "./GenreStrip";
import NavMenus from "./NavMenus";
import SearchBar from "./SearchBar";

type Props = {
  genres: string[];
  /** Isi menu dropdown, dihitung di server oleh `buildNavMenus`. */
  menus: NavMenu[];
  /** Pintasan di ujung strip kuning, dari `catalogShortcuts`. */
  shortcuts: NavItem[];
};

/**
 * Kepala halaman DEPAN (sebelum login): SATU baris berisi logo + bar cari +
 * menu katalog + tombol Masuk/Daftar, lalu strip genre di bawahnya.
 *
 * Barisnya digabung 2026-09-10 atas permintaan owner (contoh: situs katalog
 * pembanding): sebelumnya logo & tombol akun berdiri sendiri di baris hitam
 * terpisah, jadi kepala situs memakan dua baris penuh sebelum poster pertama
 * terlihat.
 *
 * Halaman ini belum punya grid untuk disaring, jadi pencarian, genre, dan menu
 * MELEMPAR ke /discover. Halaman itu memang publik (bisa dibuka tanpa login),
 * jadi tautan ini tidak membuka apa pun yang tadinya tertutup.
 */
export default function PublicTopBars({ genres, menus, shortcuts }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const cari = () => {
    const q = query.trim();
    router.push(q ? `/discover?q=${encodeURIComponent(q)}` : "/discover");
  };

  return (
    <>
      {/* top-0: header halaman depan TIDAK menempel (posisinya `relative`),
          jadi bar ini yang jadi elemen menempel paling atas — beda dari
          /beranda yang harus memberi ruang h-14 untuk navbar. */}
      <SearchBar
        value={query}
        onValueChange={setQuery}
        onSubmit={cari}
        className="sticky top-0"
        chrome={{
          brand: (
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-amber-400 font-serif text-base font-bold text-black">
                D
              </div>
              <span className="text-base font-bold text-white">DramaKu</span>
            </Link>
          ),
          menus: <NavMenus menus={menus} />,
          trailing: (
            <>
              <Link
                href="/login"
                className="rounded-full border border-white/40 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:border-amber-400 hover:text-amber-400"
              >
                Masuk
              </Link>
              <Link
                href="/daftar"
                className="rounded-full bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-black transition-colors hover:bg-amber-300"
              >
                Daftar
              </Link>
            </>
          ),
        }}
      />
      <GenreStrip
        genres={["Semua", ...genres]}
        hrefFor={(g) =>
          g === "Semua" ? "/discover" : `/discover?cat=${encodeURIComponent(g)}`
        }
        shortcuts={shortcuts}
        moreHref="/discover"
      />
    </>
  );
}
