import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getAllDramasCached } from "@/lib/dramas";
import { featuredHeroSlides } from "@/lib/hero-teaser";
import { getPlaylyVideosPublik } from "@/lib/playly-publik";
import DramaBrowser from "../components/DramaBrowser";
import HomeHero from "../components/HomeHero";
import DashboardVideoGrid from "../components/DashboardVideoGrid";
import PlaylyVideoGrid from "../components/PlaylyVideoGrid";

// Disimpan & dipakai ulang, disegarkan tiap 60 detik (menggantikan force-dynamic
// yang membangun ulang halaman untuk tiap pengunjung).
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Jelajahi Drama China — Genre, Tahun & Rating",
  description:
    "Jelajahi katalog drama China DramaKu. Saring berdasarkan genre, tahun rilis, dan rating IMDb, lalu urutkan sesuai yang kamu cari — gratis.",
  alternates: { canonical: "/discover" },
};

export default async function DiscoverPage() {
  const dramas = await getAllDramasCached();
  const slides = featuredHeroSlides(dramas);

  // Video Playly milik akun mitra kita, tampil OTOMATIS (tak perlu dikaitkan
  // ke drama dulu). Semua pembacaannya ber-cache: satu saja pembacaan tanpa
  // cache di sini akan membuat SELURUH halaman ini dibangun ulang untuk tiap
  // pengunjung, sehingga `revalidate = 60` di atas jadi percuma (lihat catatan
  // di lib/supabase.ts).
  //
  // Di sini hanya 8 kartu; selebihnya di halaman /playly supaya baris ini tidak
  // menenggelamkan katalog drama yang jadi isi utama situs.
  const { videos: playlyVideos } = await getPlaylyVideosPublik();

  // Bagian "Video terbaru" hanya muncul kalau sambungan ke dashboard sudah
  // dikonfigurasi. Tanpa penjaga ini, halaman publik akan menampilkan pesan
  // error hanya karena env belum diisi.
  const dashboardAktif = Boolean(process.env.DASHBOARD_API_URL?.trim());

  return (
    <div className="pb-10">
      {slides.length > 0 && (
        <HomeHero dramas={slides} />
      )}

      <div className="mx-auto max-w-7xl px-4 pt-6 md:px-6">
        <Suspense
          fallback={
            <div className="mt-8 text-center text-sm text-zinc-500">
              Memuat...
            </div>
          }
        >
          <DramaBrowser dramas={dramas} />
        </Suspense>

        {playlyVideos.length > 0 && (
          <section className="mt-10" aria-labelledby="judul-video-playly">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="judul-video-playly" className="text-lg font-bold text-white">
                  Video dari Playly
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Diputar langsung dari pemutar milik Playly.
                </p>
              </div>
              {playlyVideos.length > 8 && (
                <Link
                  href="/playly"
                  className="shrink-0 text-sm font-semibold text-amber-400 underline"
                >
                  Lihat semua
                </Link>
              )}
            </div>
            <div className="mt-4">
              <PlaylyVideoGrid videos={playlyVideos} limit={8} />
            </div>
          </section>
        )}

        {dashboardAktif && <DashboardVideoGrid />}
      </div>
    </div>
  );
}
