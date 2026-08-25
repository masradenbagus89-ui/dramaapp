import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllDramasCached } from "@/lib/dramas";
import { featuredHeroSlides } from "@/lib/hero-teaser";
import { getPlaylyEmbedsCached } from "@/lib/store";
import DramaBrowser from "../components/DramaBrowser";
import HomeHero from "../components/HomeHero";
import DashboardVideoGrid from "../components/DashboardVideoGrid";
import PlaylyRow from "../components/PlaylyRow";

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

  // Video Playly yang sudah dipasang admin. Alamat playernya sudah tersimpan,
  // jadi halaman ini tidak perlu memanggil Playly (dan tidak menyentuh kunci
  // API sama sekali). Kaitan yang dramanya sudah dihapus ikut dibuang supaya
  // tidak ada video tanpa induk yang nyangkut di halaman publik.
  //
  // Versi ber-cache yang dipakai — sama seperti katalog di atas. Satu saja
  // pembacaan tanpa cache di sini akan membuat SELURUH halaman ini dibangun
  // ulang untuk tiap pengunjung, sehingga `revalidate = 60` di atas jadi
  // percuma (lihat catatan di lib/supabase.ts).
  const dramaTitles = Object.fromEntries(dramas.map((d) => [d.id, d.title]));
  const playlyEmbeds = (await getPlaylyEmbedsCached()).filter(
    (e) => e.dramaId in dramaTitles,
  );

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

        <PlaylyRow embeds={playlyEmbeds} dramaTitles={dramaTitles} />

        {dashboardAktif && <DashboardVideoGrid />}
      </div>
    </div>
  );
}
