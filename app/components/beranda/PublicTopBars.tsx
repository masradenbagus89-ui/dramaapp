"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STRIP_KATALOG, type NavMenu } from "@/lib/nav-katalog";
import StripKatalog from "./StripKatalog";
import { LogoDramaKu } from "./KepalaKatalog";
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
             lambang situs yang sesungguhnya. Komponennya SAMA dengan kepala
             /beranda (KepalaKatalog.tsx) — bukan salinan — supaya ukuran &
             bentuknya tak pernah lagi menyimpang antar halaman. */
          brand: <LogoDramaKu href="/" />,
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
