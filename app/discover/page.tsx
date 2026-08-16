import { Suspense } from "react";
import { getAllDramas } from "@/lib/dramas";
import { featuredHeroSlides } from "@/lib/hero-teaser";
import DramaBrowser from "../components/DramaBrowser";
import HomeHero from "../components/HomeHero";
import DashboardVideoGrid from "../components/DashboardVideoGrid";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const dramas = await getAllDramas();
  const slides = featuredHeroSlides(dramas);

  // Bagian "Video terbaru" hanya muncul kalau sambungan ke dashboard sudah
  // dikonfigurasi. Tanpa penjaga ini, halaman publik akan menampilkan pesan
  // error hanya karena env belum diisi.
  const dashboardAktif = Boolean(process.env.DASHBOARD_API_URL?.trim());

  return (
    <div className="pb-10">
      {slides.length > 0 && (
        <HomeHero
          dramas={slides}
          baseUrl={process.env.NEXT_PUBLIC_VIDEO_BASE_URL ?? ""}
        />
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

        {dashboardAktif && <DashboardVideoGrid />}
      </div>
    </div>
  );
}
