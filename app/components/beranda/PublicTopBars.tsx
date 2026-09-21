"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STRIP_KATALOG, type NavMenu } from "@/lib/nav-katalog";
import StripKatalog from "./StripKatalog";
import NavMenus from "./NavMenus";
import SearchBar from "./SearchBar";

type Props = {
  /** Isi menu dropdown, dihitung di server oleh `buildNavMenus`. */
  menus: NavMenu[];
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
export default function PublicTopBars({ menus }: Props) {
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
          /* Logo dirapikan 2026-09-21: kotak kuning berisi huruf "D" diganti
             lambang situs yang sesungguhnya + teks putih, sejajar dengan situs
             katalog pembanding DAN dengan kepala /beranda (KepalaKatalog.tsx),
             supaya penonton tidak merasa berpindah situs. */
          brand: (
            <Link href="/" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-mark.png"
                alt="DramaKu"
                width={28}
                height={28}
                className="size-7 shrink-0 object-contain"
              />
              <span className="text-base font-bold text-white">DramaKu</span>
            </Link>
          ),
          menus: <NavMenus menus={menus} />,
          /* Tombol Masuk & Daftar SENGAJA tidak dipasang di sini (owner
             2026-09-21: "dobel"). Halaman ini sudah menawarkannya dua kali di
             badan halaman — strip ajakan di bawah baris poster pertama, dan
             blok penutup "Siap memulai marathon drama?" — plus footer. */
        }}
      />
      <StripKatalog items={STRIP_KATALOG} />
    </>
  );
}
