"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STRIP_KATALOG, alamatCari, type NavMenu } from "@/lib/nav-katalog";
import SearchBar, { KELAS_MENEMPEL_KEPALA } from "./SearchBar";
import StripKatalog from "./StripKatalog";
import { chromeKatalog } from "./KepalaKatalog";

/** Alamat hasil pencarian — dipakai `action` form supaya jalan tanpa JavaScript. */
const TUJUAN_CARI = "/discover";

/**
 * Kepala situs halaman `/beranda`: bar cari merah (logo/menu-aplikasi + menu
 * katalog + tombol akun) lalu strip genre kuning di bawahnya.
 *
 * KENAPA ADA (2026-10-28). Sampai hari ini bar ini TIDAK punya rumah sendiri —
 * ia lahir di dalam `CatalogBrowser`, komponen yang tugas utamanya menggambar
 * GRID katalog. Begitu /beranda disamakan dengan landing page dan grid itu
 * dilepas, kepala situsnya ikut hilang tanpa satu pun error: halaman tetap 200,
 * `next build` tetap hijau, dan yang lenyap cuma logo, kotak cari, dan seluruh
 * menu — baru ketahuan saat tampilannya benar-benar dilihat. Dipisah ke sini
 * supaya kepala situs tidak lagi bergantung pada hidup-matinya grid.
 *
 * Bedanya dengan `PublicTopBars` (kepala landing `/`) HANYA isi kanan-kirinya:
 * di sini `chromeKatalog()` membawa tombol garis-tiga + tombol akun, karena
 * penonton halaman ini SUDAH login. Bar, strip, dan kelas posisinya komponen
 * yang SAMA — bukan salinan — jadi bentuknya tak bisa menyimpang antar halaman.
 *
 * ❓ Utang yang diketahui: `KerangkaKepalaKatalog` (kerangka pemuatan
 * /discover) merakit bar yang nyaris identik. Keduanya layak digabung, tapi itu
 * pekerjaan terpisah — menggabungkannya sekarang berarti menyentuh /discover
 * dalam perubahan yang owner minta hanya untuk /beranda.
 *
 * ⚠️ Pencarian di sini MELEMPAR ke /discover, tidak lagi menyaring di tempat.
 * Dulu ia menyaring grid tepat di bawahnya; grid itu sudah tidak ada. Perilaku
 * ini sama dengan kotak cari di landing page.
 */
export default function KepalaBeranda({ menus }: { menus: NavMenu[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <>
      <SearchBar
        value={query}
        onValueChange={setQuery}
        onSubmit={() => router.push(alamatCari(query))}
        className={KELAS_MENEMPEL_KEPALA}
        chrome={chromeKatalog(menus)}
        /* Kotak cari diganti TOMBOL yang membuka lapisan (owner 2026-10-29:
           "tombol search seperti pop up gitu"). Ini jawaban akhir atas keluhan
           "searchnya kelebaran" yang ukurannya sudah dua kali diputar
           (448px dilepas 2026-09-21, 576px ditolak 2026-10-29): selama kotaknya
           duduk di bar, lebar berapa pun selalu salah bagi sebagian layar.
           Sebagai tombol, ia tidak memakan ruang sama sekali. */
        modeTombol
        /* `action` + `namaKolom` membuat Enter tetap mencari walau JavaScript
           belum aktif — pelajaran dari KerangkaKepalaKatalog, di mana tanpa
           keduanya menekan Enter justru memuat ulang halaman dan MENGHAPUS
           ketikan penonton. */
        action={TUJUAN_CARI}
        namaKolom="q"
      />
      <StripKatalog items={STRIP_KATALOG} />
    </>
  );
}
