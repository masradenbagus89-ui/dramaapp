import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Halaman 404 milik DramaKu, menggantikan bawaan Next.js yang memaksa latar
// PUTIH + teks Inggris — asing di situs bertema gelap berbahasa Indonesia, dan
// tanpa jalan pulang penonton yang nyasar cenderung langsung menutup tab.
//
// Muncul untuk SEMUA alamat tanpa halaman: salah ketik, tautan lama dari
// WhatsApp/Google, bookmark basi, atau drama yang sudah dihapus (notFound()).
//
// Navbar & bottom nav TIDAK dipasang ulang di sini — keduanya sudah dirender
// root layout (app/layout.tsx), dan halaman ini berada di dalam <main>-nya.

export const metadata: Metadata = {
  title: "Halaman tidak ditemukan",
  // Halaman error jangan diindeks: kalau terindeks, orang bisa mendarat di 404
  // langsung dari hasil pencarian Google. `follow` tetap true supaya tautan
  // menuju Beranda/Discover di bawah tetap ditelusuri.
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
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
  );
}
