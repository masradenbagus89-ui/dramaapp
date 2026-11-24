"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STRIP_KATALOG, alamatCari, type NavMenu, TUJUAN_CARI } from "@/lib/nav-katalog";
import StripKatalog from "./StripKatalog";
import { LogoSitus } from "./KepalaKatalog";
import MenuKatalogHp from "./MenuKatalogHp";
import NavMenus from "./NavMenus";
import type { SaranCari } from "@/lib/saran-cari";
import SearchBar, { KELAS_MENEMPEL_KEPALA } from "./SearchBar";

type Props = {
  /** Indeks judul untuk saran-saat-mengetik; kosong = fitur itu mati. */
  indeksSaran?: SaranCari[];
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
export default function PublicTopBars({ menus, indeksSaran }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  // Alamatnya dari `alamatCari()` — dipakai bersama kerangka /discover supaya
  // pencarian dari halaman mana pun mendarat di tempat yang sama.
  const cari = () => router.push(alamatCari(query));

  return (
    <>
      {/* top-0: header halaman depan TIDAK menempel (posisinya `relative`),
          jadi bar ini yang jadi elemen menempel paling atas — beda dari
          /beranda yang harus memberi ruang h-14 untuk navbar. */}
      <SearchBar
        value={query}
        onValueChange={setQuery}
        onSubmit={cari}
        className={KELAS_MENEMPEL_KEPALA}
        /* Sama dengan /beranda & halaman film — lihat alasannya di
           KepalaBeranda.tsx. Halaman depan WAJIB ikut: ia justru halaman yang
           paling sering dilihat, dan kepala yang berbeda di sini akan
           mengembalikan persis keluhan "beda dengan Home". */
        modeTombol
        /* Seragam dengan KepalaBeranda & KerangkaKepalaKatalog.

           ⚠️ BATAS JUJUR (diukur 2026-11-07): di `modeTombol`, formnya BELUM
           tergambar sampai kotaknya dibuka — jadi ini BUKAN penyelamat untuk
           jendela sebelum JavaScript aktif, seperti yang berlaku di kotak cari
           biasa. Gunanya di sini dua: (a) begitu kotak terbuka, Enter tetap
           mencari walau JS belakangan gagal, dan (b) keempat pemakai SearchBar
           memakai prop yang sama — sebelumnya hanya KERANGKA pemuatan yang
           punya, sementara bar sungguhannya telanjang, dan perbedaan diam-diam
           seperti itulah yang membuat dua bar "sama" berperilaku beda. */
        action={TUJUAN_CARI}
        namaKolom="q"
        indeksSaran={indeksSaran}
        chrome={{
          /* Logo dirapikan 2026-09-21: kotak kuning berisi huruf "D" diganti
             lambang situs yang sesungguhnya. Komponennya SAMA dengan kepala
             /beranda (KepalaKatalog.tsx) — bukan salinan — supaya ukuran &
             bentuknya tak pernah lagi menyimpang antar halaman. */
          brand: <LogoSitus href="/" />,
          /* Logo jadi tombol pembuka menu katalog di HP (owner 2026-11-21).
             Halaman depan WAJIB ikut: `/` dan `/beranda` sudah sengaja
             disamakan sejak 2026-10-28, dan kepala yang berbeda di antara
             keduanya persis keluhan "beda dengan Home" yang pernah ada. */
          brandHp: <LogoSitus href="/" tanpaTautan />,
          /* Panel pop up menu katalog di HP (owner 2026-11-21). Dikosongkan
             saat katalog kosong — alasannya ditulis sekali di
             `chromeKatalog()` (KepalaKatalog.tsx). */
          menusHp: menus.length > 0 ? <MenuKatalogHp menus={menus} /> : undefined,
          /* `undefined` saat katalog kosong — alasannya ditulis sekali di
             `chromeKatalog()` (KepalaKatalog.tsx). */
          menus: menus.length > 0 ? <NavMenus menus={menus} /> : undefined,
          /* Tombol Masuk & Daftar SENGAJA tidak dipasang di sini (owner
             2026-09-21: "dobel"). Halaman ini sudah menawarkannya dua kali di
             badan halaman — strip ajakan di bawah baris poster pertama, dan
             blok penutup "Siap memulai marathon drama?" — plus footer. */
        }}
      />
      {/* ⚠️ Strip kuning sempat disembunyikan di HP pada 2026-11-21;
          dikembalikan pada hari yang sama atas permintaan owner (*"cuma bagian
          atas yang diubah, sisanya kembalikan ke dramaku"*). */}
      <StripKatalog items={STRIP_KATALOG} />
    </>
  );
}
