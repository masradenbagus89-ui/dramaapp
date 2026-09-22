import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  LogoDramaKu,
  MenuAplikasi,
} from "@/app/components/beranda/KepalaKatalog";

// Halaman 404 milik DramaKu, menggantikan bawaan Next.js yang memaksa latar
// PUTIH + teks Inggris — asing di situs bertema gelap berbahasa Indonesia, dan
// tanpa jalan pulang penonton yang nyasar cenderung langsung menutup tab.
//
// Muncul untuk SEMUA alamat tanpa halaman: salah ketik, tautan lama dari
// WhatsApp/Google, bookmark basi, atau drama yang sudah dihapus (notFound()).
//
// ⚠️ KOREKSI 2026-09-22 — komentar di sini DULU berbunyi "Navbar & bottom nav
// TIDAK dipasang ulang di sini, keduanya sudah dirender root layout". Itu
// berhenti benar begitu penyaring navigasi dibalik dari denylist jadi
// ALLOWLIST (lib/navigasi-halaman.ts): halaman ini muncul di alamat yang
// TIDAK ADA, dan alamat asing tidak cocok dengan akar mana pun di daftar itu,
// jadi `TopNav` maupun `BottomNav` memulangkan `null` di sini. Terukur di
// produksi 2026-09-22: /tautan-basi-uji balas 404 dengan NOL navbar dan NOL
// bar bawah. Penonton nyasar jadi cuma punya dua tombol di badan halaman —
// kotak cari, Shorts, Playly, My List, dan Profile tak bisa dicapai.
//
// Jadi navigasinya DIPASANG SENDIRI di sini, bukan dengan melonggarkan
// allowlist-nya (melonggarkan = mengembalikan bug kedipan halaman depan).
// `MenuAplikasi` dipilih karena ia memuat SELURUH tujuan situs dalam satu
// tombol, dan tidak butuh data katalog sama sekali — halaman error tidak boleh
// bergantung pada database yang mungkin justru sedang bermasalah.
// Penjaganya: tests/kepala-situs.test.ts.

export const metadata: Metadata = {
  title: "Halaman tidak ditemukan",
  // Halaman error jangan diindeks: kalau terindeks, orang bisa mendarat di 404
  // langsung dari hasil pencarian Google. `follow` tetap true supaya tautan
  // menuju Beranda/Discover di bawah tetap ditelusuri.
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      {/* Kepala situs ringkas: logo + satu tombol menu berisi seluruh tujuan.
          Sengaja TIDAK memakai bar cari merah — bar itu butuh daftar menu yang
          dihitung dari katalog (buildNavMenus), dan halaman error tidak boleh
          bergantung pada pembacaan database. */}
      <div className="border-b border-zinc-800 bg-black/95">
        <div className="shell-wide mx-auto flex h-14 items-center gap-3 px-4 md:px-6">
          <LogoDramaKu />
          <MenuAplikasi />
        </div>
      </div>

      <div className="mx-auto flex min-h-[70svh] max-w-2xl flex-col items-center justify-center gap-5 px-4 py-16 text-center md:px-6">
      <p className="title-gold text-7xl leading-none sm:text-8xl">404</p>

      <h1 className="text-2xl font-bold text-white sm:text-3xl">
        Halaman tidak ditemukan
      </h1>

      <p className="max-w-md text-sm text-zinc-400 sm:text-base">
        Alamat yang kamu buka tidak ada di DramaKu. Mungkin salah ketik, atau
        tautannya sudah lama dan halamannya sudah pindah.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          asChild
          size="lg"
          className="rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-black hover:bg-amber-300"
        >
          <Link href="/beranda">Kembali ke Beranda</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="rounded-full border-zinc-600 bg-black/40 px-6 py-3 text-sm font-semibold text-white hover:border-amber-400 hover:text-amber-400"
        >
          <Link href="/discover">Jelajahi Drama</Link>
        </Button>
      </div>
      </div>
    </>
  );
}
