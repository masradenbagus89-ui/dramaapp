import type { Metadata } from "next";
import Link from "next/link";
import { getAllDramasCachedSafe } from "@/lib/dramas";
import { featuredHeroSlides } from "@/lib/hero-teaser";
import RedirectIfAuthed from "@/app/components/RedirectIfAuthed";
import FeaturedRow from "@/app/components/beranda/FeaturedRow";
import PublicTopBars from "@/app/components/beranda/PublicTopBars";
import {
  availableGenres,
  FEATURED_ROW_COUNT,
  homeCatalogRows,
} from "@/lib/beranda-catalog";
import { Button } from "@/components/ui/button";

// Disimpan & dipakai ulang, disegarkan tiap 60 detik (menggantikan force-dynamic
// yang membangun ulang halaman untuk tiap pengunjung).
export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function LandingPage() {
  const dramas = await getAllDramasCachedSafe();
  const heroSlides = featuredHeroSlides(dramas, FEATURED_ROW_COUNT);
  // Hanya genre yang benar-benar berisi — genre kosong yang diklik memulangkan
  // halaman hampa, dan itu terbaca seperti situs rusak.
  const genres = availableGenres(dramas);
  // Baris poster per kategori — isi utama halaman ini.
  const rows = homeCatalogRows(dramas);

  return (
    <div className="min-h-screen bg-black">
      <RedirectIfAuthed />
      {/* Header — sengaja TANPA max-w/mx-auto: padding px-4 md:px-6 disamakan
          dengan blok sambutan di bawahnya supaya logo & judul jatuh di SATU
          garis kiri yang sama di semua ukuran layar. */}
      <header className="relative z-20 border-b border-zinc-900">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-400 font-serif text-base font-bold text-black">
              D
            </div>
            <span className="text-lg font-bold text-white">DramaKu</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-zinc-700 px-4 py-1.5 text-sm font-semibold text-white hover:border-amber-400 hover:text-amber-400"
            >
              <Link href="/login">Masuk</Link>
            </Button>
            <Button
              asChild
              className="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-bold text-black hover:bg-amber-300"
            >
              <Link href="/daftar">Daftar</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ===== Kepala situs: bar cari + strip genre, LANGSUNG di bawah header.
             Struktur ini mengikuti situs katalog streaming (permintaan owner
             2026-09-08): pengunjung yang belum login pun langsung melihat
             pencarian, genre, dan poster — bukan blok sambutan sehalaman penuh.
             Cari & genre melempar ke /discover, yang memang publik. ===== */}
      <PublicTopBars genres={genres} />

      {/* ===== Baris FILM UNGGULAN — komponen yang SAMA dengan /beranda, jadi
             tampilan & perilakunya persis: poster hanya bergeser kalau digeser
             penonton, tidak ada yang berjalan sendiri.

             Kartunya menuju /drama/<id> (halaman itu PUBLIK — terbukti HTTP 200
             tanpa cookie login), jadi pengunjung bisa mengintip dulu sebelum
             diminta mendaftar. ===== */}
      <FeaturedRow dramas={heroSlides} href="/discover" />

      {/* ===== Ajakan daftar — STRIP TIPIS, bukan blok tinggi.
             Dirampingkan 2026-09-08: sebelumnya memakai judul serif besar +
             lencana + 3 kotak statistik, sehingga menguasai layar tepat sesudah
             baris poster dan memutus alur "lihat poster -> gulir lagi". Di situs
             katalog pembandingnya bagian ini cuma satu baris teks + satu tombol.

             Judul h1 DIPERTAHANKAN (dikecilkan, bukan dibuang): ini satu-satunya
             h1 di halaman depan, dipakai mesin pencari untuk mengenali isi
             situs. Angka katalog dipindah ke dalam kalimat supaya tetap
             tersampaikan tanpa perlu 3 kotak terpisah. ===== */}
      <section className="border-y border-zinc-900 bg-zinc-950/70">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-2.5 px-4 py-6 text-center md:px-6">
          <h1 className="text-base font-bold text-amber-400 md:text-lg">
            Nonton drama China pendek sub Indo — gratis
          </h1>
          <p className="text-xs leading-relaxed text-zinc-400 md:text-sm">
            {dramas.length} judul dalam {genres.length} kategori, tanpa langganan.
            Daftar gratis untuk menyimpan drama favorit dan melanjutkan tontonan
            dari episode terakhir.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-0.5">
            <Button
              asChild
              className="rounded-full bg-amber-400 px-5 text-sm font-bold text-black hover:bg-amber-300"
            >
              <Link href="/daftar">Daftar Gratis</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-zinc-700 bg-black/40 px-5 text-sm font-semibold text-white hover:border-amber-400 hover:text-amber-400"
            >
              <Link href="/login">Sudah punya akun? Masuk</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ===== ISI UTAMA: BARIS-BARIS KATALOG =============================
             Permintaan owner 2026-09-08: halaman depan jadi halaman KATALOG —
             banyak poster dalam satu halaman, bukan halaman promosi. Empat seksi
             promosi lama (kartu fitur, "sekilas drama" 6 poster, "cara mulai 3
             langkah", "kenapa pilih kami") DIBUANG dan diganti baris poster per
             kategori, pola yang dipakai situs katalog streaming.

             Barisnya disusun `homeCatalogRows` dari data NYATA. Kategori yang
             isinya di bawah ROW_MIN_ITEMS sengaja TIDAK dijadikan baris: katalog
             ini timpang (ada kategori berisi 1 judul), dan baris berisi 1 poster
             meninggalkan ruang kosong selebar layar — terbaca seperti halaman
             rusak, bukan kategori yang memang masih sepi. ===== */}
      {rows.map((row) => (
        <FeaturedRow
          key={row.key}
          title={row.title}
          dramas={row.items}
          href={row.href}
        />
      ))}

      {/* CTA bottom */}
      <section className="relative overflow-hidden border-t border-zinc-900 bg-gradient-to-br from-amber-900/30 via-rose-900/20 to-zinc-950">
        <FilmStripPattern />
        <div className="relative mx-auto max-w-4xl px-4 py-14 text-center md:px-6 md:py-20">
          <h2 className="text-2xl font-bold text-white md:text-4xl">
            Siap memulai marathon drama?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-zinc-300">
            Daftar gratis sekarang dan dapatkan akses penuh ke semua drama.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-amber-400 px-8 py-3 text-sm font-bold text-black hover:bg-amber-300"
            >
              <Link href="/daftar">Daftar Gratis</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-zinc-600 bg-black/40 px-8 py-3 text-sm font-semibold text-white hover:border-amber-400 hover:text-amber-400"
            >
              <Link href="/login">Masuk</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 px-4 py-8 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs text-zinc-500 md:flex-row">
          <p>© 2026 DramaKu · Prototype</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-white">Masuk</Link>
            <Link href="/daftar" className="hover:text-white">Daftar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FilmStripPattern() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
      <svg className="absolute -left-10 top-10 h-32 w-32 rotate-12 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2zM6 7h2v2H6V7zm0 4h2v2H6v-2zm0 4h2v2H6v-2zm10 2h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
      </svg>
      <svg className="absolute -right-10 bottom-10 h-40 w-40 -rotate-12 text-rose-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2zM6 7h2v2H6V7zm0 4h2v2H6v-2zm0 4h2v2H6v-2zm10 2h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
      </svg>
      <svg className="absolute right-1/4 top-1/3 h-20 w-20 rotate-45 text-amber-400/50" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
        <path d="M10 8l6 4-6 4V8z" fill="black" />
      </svg>
    </div>
  );
}
