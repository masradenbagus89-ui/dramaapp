import type { Metadata } from "next";
import Link from "next/link";
import { getAllDramasCachedSafe } from "@/lib/dramas";
import { featuredHeroSlides } from "@/lib/hero-teaser";
import RedirectIfAuthed from "@/app/components/RedirectIfAuthed";
import LandingHero from "@/app/components/LandingHero";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Check, Lock } from "lucide-react";

// Disimpan & dipakai ulang, disegarkan tiap 60 detik (menggantikan force-dynamic
// yang membangun ulang halaman untuk tiap pengunjung).
export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const FITUR = [
  {
    icon: "M3 12l9-9 9 9M5 10v10h14V10",
    title: "Beranda Dashboard",
    desc: "Statistik drama, distribusi kategori, dan update terbaru — semua dalam satu layar.",
    color: "bg-amber-500/15 text-amber-400",
  },
  {
    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    title: "Discover & Pencarian",
    desc: "Filter berdasarkan kategori (Romance, Time Travel, Fantasy, dll) atau cari judul langsung.",
    color: "bg-rose-500/15 text-rose-400",
  },
  {
    icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Player Otomatis",
    desc: "Player video yang otomatis menyesuaikan layar HP atau laptop. Mendukung skip & seek.",
    color: "bg-violet-500/15 text-violet-400",
  },
  {
    icon: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z",
    title: "Daftar Saya",
    desc: "Bookmark drama favorit untuk ditonton nanti. Tersimpan otomatis di browser.",
    color: "bg-emerald-500/15 text-emerald-400",
  },
  {
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    title: "Shorts Trending",
    desc: "Cuplikan singkat dari drama paling populer minggu ini, langsung tonton.",
    color: "bg-yellow-500/15 text-yellow-400",
  },
  {
    icon: "M12 4v16m8-8H4",
    title: "Admin Panel",
    desc: "Tambah drama baru lengkap dengan video, poster, dan metadata. Otomatis rapi.",
    color: "bg-blue-500/15 text-blue-400",
  },
] as const;

export default async function LandingPage() {
  const dramas = await getAllDramasCachedSafe();
  const heroDramas = dramas.slice(0, 6);
  const heroSlides = featuredHeroSlides(dramas);

  return (
    <div className="min-h-screen bg-black">
      <RedirectIfAuthed />
      {/* Header */}
      <header className="relative z-20 border-b border-zinc-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
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

      {/* Hero dengan latar cuplikan video berputar (pola sama seperti beranda) */}
      <section className="relative overflow-hidden">
        {/* Latar video: byte mengalir direct dari PC backup via /api/teaser
            (307 redirect), BUKAN lewat server Vercel. */}
        <LandingHero dramas={heroSlides} />

        {/* Lapisan gelap SENGAJA TIPIS: teks tetap terbaca, tapi video tetap
            cerah & gerakannya jelas terlihat (gelap berat = hero terasa mati).
            Gelap dipusatkan di belakang teks (tengah & bawah), tepi dibiarkan
            terang supaya cuplikannya jadi bintang. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/30" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.45),transparent_68%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.15),transparent_60%)]" />

        {/* Decorative film strip pattern */}
        <FilmStripPattern />

        <div className="relative mx-auto flex min-h-[70svh] max-w-3xl flex-col items-center justify-center gap-6 px-4 py-16 text-center md:px-6 md:py-20">
          <Badge className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
            Drama China Pendek · Bahasa Indonesia
          </Badge>
          <h1 className="title-gold text-4xl leading-[1.05] drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)] sm:text-5xl md:text-6xl">
            Cerita pendek, <br />
            <span className="text-white not-italic">emosi panjang.</span>
          </h1>
          <p className="max-w-xl text-base text-zinc-100 drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)] md:text-lg">
            DramaKu adalah platform menonton drama China pendek. Daftar gratis, login, lalu nikmati ratusan judul drama tanpa langganan.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-black hover:bg-amber-300"
            >
              <Link href="/daftar">Daftar Gratis</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-zinc-600 bg-black/40 px-6 py-3 text-sm font-semibold text-white hover:border-amber-400 hover:text-amber-400"
            >
              <Link href="/login">Sudah punya akun? Masuk</Link>
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <Stat label="Drama tersedia" value={String(dramas.length)} />
            <Stat label="Kategori" value="7" />
            <Stat label="Biaya" value="Gratis" />
          </div>
        </div>
      </section>

      {/* Mobile poster strip */}
      <section className="md:hidden">
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 pt-4">
          {heroDramas.slice(0, 8).map((d) => (
            <Link
              key={d.id}
              href="/login"
              className={`relative aspect-[3/4] w-32 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br ${d.gradient}`}
            >
              {d.posterImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.posterImage} alt={d.title} className="absolute inset-0 h-full w-full object-cover" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="line-clamp-2 text-[11px] font-semibold text-white">{d.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Fitur grid */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Apa saja yang bisa kamu lakukan di DramaKu?
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            6 fitur utama untuk pengalaman menonton yang seru.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FITUR.map((f) => (
            <Card
              key={f.title}
              className="gap-0 rounded-2xl border-zinc-800 bg-zinc-900/40 p-5 py-5 shadow-none transition-colors hover:border-zinc-700"
            >
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${f.color}`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-1 text-sm text-zinc-400">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Drama populer preview */}
      <section className="border-y border-zinc-900 bg-gradient-to-b from-zinc-950 via-zinc-900/30 to-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white md:text-3xl">
                Sekilas drama yang bisa kamu tonton
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Daftar gratis untuk mengakses semua judul.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {heroDramas.map((d) => (
              <Link
                key={d.id}
                href="/daftar"
                className="group block"
              >
                <div className={`relative aspect-[3/4] overflow-hidden rounded-xl bg-gradient-to-br ${d.gradient}`}>
                  {d.posterImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.posterImage}
                      alt={d.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90 transition-opacity group-hover:opacity-100" />
                  <div className="absolute inset-x-0 bottom-0 p-2">
                    <p className="line-clamp-2 text-xs font-semibold text-white">{d.title}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-400">{d.category}</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="absolute right-2 top-2 gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300"
                  >
                    <Lock className="size-2.5" />
                    Login
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Cara mulai */}
      <section className="relative overflow-hidden bg-zinc-950/50">
        <FilmStripPattern />
        <div className="relative mx-auto max-w-5xl px-4 py-14 md:px-6 md:py-20">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              Cara mulai dalam 3 langkah
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { n: "1", title: "Daftar Akun", desc: "Cukup isi nama, email, dan password. Tidak perlu kartu kredit." },
              { n: "2", title: "Login", desc: "Masuk dengan akun yang baru kamu buat. Hanya hitungan detik." },
              { n: "3", title: "Nonton Drama", desc: "Pilih drama favoritmu di halaman beranda dan langsung tonton." },
            ].map((s) => (
              <Card key={s.n} className="gap-0 rounded-2xl border-zinc-800 bg-zinc-900/60 p-5 py-5 text-center shadow-none backdrop-blur">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-base font-bold text-black">
                  {s.n}
                </div>
                <h3 className="mt-3 text-base font-semibold text-white">{s.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{s.desc}</p>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-amber-400 px-8 py-3 text-sm font-bold text-black hover:bg-amber-300"
            >
              <Link href="/daftar">Daftar Sekarang →</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Kenapa kami */}
      <section className="mx-auto max-w-5xl px-4 py-14 md:px-6 md:py-20">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-zinc-800">
            <div className="grid h-full grid-cols-2 gap-1 p-1">
              {heroDramas.slice(0, 4).map((d) => (
                <div
                  key={d.id}
                  className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${d.gradient}`}
                >
                  {d.posterImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.posterImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                </div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <p className="text-xs font-semibold text-white">Koleksi terus bertambah</p>
              <p className="text-[10px] text-zinc-300">{dramas.length} judul · 7 kategori</p>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              Kenapa pilih DramaKu?
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Platform yang dirancang sederhana, fokus pada konten drama pendek
              berbahasa Indonesia. Tidak ada iklan ganggu, tidak ada langganan
              tersembunyi.
            </p>
            <div className="mt-5 space-y-3">
              {[
                "Gratis tanpa biaya tersembunyi",
                "Tampilan optimal di HP & laptop",
                "Update drama baru terus menerus",
                "Bookmark untuk ditonton nanti",
              ].map((p) => (
                <div key={p} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <Check className="size-3" strokeWidth={3} />
                  </div>
                  <p className="text-sm text-zinc-300">{p}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <p className="text-xl font-bold text-white md:text-2xl">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
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
