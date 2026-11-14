"use client";

import Link from "next/link";
import CoinChip from "../CoinChip";
import MenuAkun from "../MenuAkun";
import { usePenonton } from "../usePenonton";
import type { NavMenu } from "@/lib/nav-katalog";
import NavMenus from "./NavMenus";
import type { SearchBarChrome } from "./SearchBar";

/**
 * KEPALA SITUS untuk halaman berkatalog (/beranda & /discover).
 *
 * Kenapa ada: sampai 2026-09-21 kedua halaman itu memakai DUA baris kepala —
 * navbar hitam (TopNav) di atas bar cari merah. Owner meminta bentuk situs
 * katalog pembanding: cukup DUA baris (bar cari + strip kuning). Navbar hitam
 * karena itu disembunyikan di kedua halaman, dan isinya pindah ke sini.
 *
 * ⚠️ TOMBOL GARIS-TIGA (`MenuAplikasi`) DIHAPUS 2026-11-14 atas permintaan
 * owner ("sembunyikan menu masuk sebagai pengelola, dan hilangkan garis 3").
 * Ia satu-satunya hamburger di seluruh aplikasi, dipakai /beranda, /discover,
 * dan halaman 404.
 *
 * Komentar lama di sini berbunyi "TIDAK boleh sekadar dibuang — inilah
 * satu-satunya jalan menuju Playly, Admin, dan tombol Keluar". Itu benar pada
 * 2026-09-21 dan sudah TIDAK benar lagi; diperiksa satu per satu sebelum
 * dihapus, bukan diasumsikan:
 *   • Admin & Keluar  → pindah ke `MenuAkun` (avatar) sejak 2026-09-26, dan
 *     `TombolAkun` di bawah memasangnya di kedua halaman ini.
 *   • Beranda         → logo di `LogoDramaKu` menuju ke sana.
 *   • Playly          → sudah dilepas dari daftarnya sejak 2026-09-26.
 *   • Masuk/Daftar    → dijeda `AKUN_PENONTON_ENABLED` sejak 2026-10-29.
 *
 * ⚠️ YANG BENAR-BENAR HILANG, dicatat supaya tidak dikira kelalaian:
 *   1. Tautan "Masuk sebagai pengelola" di /beranda & /discover. Kaki situs
 *      masih memuatnya (`FooterSitus.tsx`), tapi kaki itu TIDAK digambar di
 *      /beranda — jadi di halaman itu satu-satunya jalan ke panel admin kini
 *      mengetik alamat `/login` sendiri. Itu memang yang diminta owner.
 *      Menyembunyikan tautan BUKAN kontrol izin (`skills/auth/SKILL.md`):
 *      penjagaannya tetap di server — password, rate-limit, cookie sesi
 *      bertanda tangan. Jadi keamanan tidak naik maupun turun karena ini.
 *   2. Peringatan "Masuk ulang dengan password admin" (`perluMasukUlang`) di
 *      kedua halaman ini. Ia masih tergambar sebagai pita di `TopNav`, yang
 *      hidup di /admin · /profile · /history · /my-list · /shorts.
 */

/**
 * Lambang + nama situs di ujung kiri bar cari.
 *
 * SATU komponen yang dipakai halaman depan (`PublicTopBars`) DAN halaman
 * berkatalog — sebelumnya markup-nya disalin di dua tempat dan sempat
 * menyimpang (halaman depan memakai kotak kuning berisi huruf "D", yang lain
 * memakai lambang). Ukurannya dinaikkan 2026-09-21 atas permintaan owner:
 * lambang 28px → 36px dan nama situs 16px → 20px, sejajar dengan situs katalog
 * pembanding. 36px sengaja dipilih karena sama dengan tinggi kotak cari
 * (`h-9`), jadi barnya TIDAK ikut meninggi.
 *
 * Nama situs disembunyikan di layar paling sempit: di bawah ±640px ia memakan
 * ruang yang dibutuhkan kotak cari, dan lambangnya sendiri sudah mengenalkan
 * situs.
 */
export function LogoDramaKu({ href = "/beranda" }: { href?: string }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-mark.png"
        alt="DramaKu"
        width={36}
        height={36}
        className="size-9 shrink-0 object-contain"
      />
      <span className="hidden text-xl font-bold tracking-tight text-white sm:inline">
        DramaKu
      </span>
    </Link>
  );
}

/**
 * Ujung KANAN bar cari (`SearchBarChrome.trailing`): saldo koin + avatar akun.
 *
 * Tombol Masuk · Daftar tetap TIDAK di sini. Owner 2026-09-21: keduanya dobel
 * dengan ajakan yang sudah ada di badan halaman, dan bar ini harus seringkas
 * situs katalog pembanding. Dulu keduanya pindah ke menu garis-tiga; sejak
 * tombol itu dilepas (2026-11-14) mereka memang tidak tergambar di mana pun —
 * dan itu tidak menghilangkan apa-apa, karena `AKUN_PENONTON_ENABLED` sudah
 * menjedanya sejak 2026-10-29. Saldo koin
 * tetap di luar menu karena ia ANGKA yang perlu dilihat sekilas —
 * menyembunyikannya di balik satu klik membuat penonton tidak tahu sisa
 * koinnya sebelum membuka episode berbayar.
 *
 * Avatar ditambahkan 2026-09-26 dan itu WAJIB, bukan hiasan: "Profile" dilepas
 * dari daftar menu pada hari yang sama, jadi tanpa avatar di sini halaman
 * berkatalog kehilangan satu-satunya jalan ke halaman Profil di layar komputer
 * (`BottomNav` cuma muncul di HP). `MenuAkun` diam sendiri saat belum login,
 * jadi bar tetap seringkas sebelumnya untuk pengunjung baru.
 *
 * Sejak tombol garis-tiga dilepas (2026-11-14) perannya BERTAMBAH: avatar ini
 * kini juga satu-satunya jalan ke **Admin** dan tombol **Keluar** di /beranda
 * & /discover. Dijaga tests/kepala-situs.test.ts.
 */
export function TombolAkun() {
  const { user, mounted } = usePenonton();

  if (!mounted || !user) return null;
  return (
    <div className="flex items-center gap-2">
      <CoinChip />
      <MenuAkun />
    </div>
  );
}

/**
 * Susunan kepala situs untuk halaman BERKATALOG: logo di kiri, deretan menu
 * dropdown di tengah, tombol akun di kanan.
 *
 * Tombol garis-tiga dulu berdiri di kiri logo; dilepas 2026-11-14 atas
 * permintaan owner — alasan + daftar jalan yang tersisa ada di komentar
 * kepala berkas ini.
 *
 * ⚠️ Kenapa jadi fungsi bersama dan bukan ditulis di tiap pemakainya
 * (owner 2026-09-22): susunan ini dipakai TIGA kali — kepala `/beranda`
 * (`CatalogBrowser`), kepala `/discover` (`DramaBrowser`), dan kerangka
 * pemuatan `/discover` (`KerangkaKepalaKatalog`). Kalau ditulis berulang,
 * salah satu pasti tertinggal saat yang lain diubah, dan akibatnya kepala
 * situs "melompat" tepat di depan mata penonton begitu halaman aktif — atau
 * dua halaman terasa seperti dua situs. Berkas ini sudah tiga kali kena
 * masalah menyimpang seperti itu (logo, lalu tulisan kotak cari dua kali),
 * jadi sumbernya sengaja dikunci satu.
 *
 * KOREKSI: versi pertama komentar ini menulis "dipakai DUA kali" dan
 * mengaku sumbernya sudah dikunci, padahal `CatalogBrowser` masih menyalin
 * susunannya dengan tangan — salinan ketiga yang tak terlihat siapa pun.
 * Ditemukan lewat tinjauan hari yang sama dan sudah disatukan.
 */
export function chromeKatalog(menus: NavMenu[]): SearchBarChrome {
  return {
    brand: <LogoDramaKu />,
    menus: <NavMenus menus={menus} />,
    trailing: <TombolAkun />,
  };
}
