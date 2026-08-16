import { getAllDramas } from "@/lib/dramas";
import { featuredHeroSlides } from "@/lib/hero-teaser";
import BerandaRows from "../components/BerandaRows";
import AdBanner from "../components/AdBanner";
import HomeHero from "../components/HomeHero";

export const dynamic = "force-dynamic";

export default async function BerandaPage() {
  const dramas = await getAllDramas();
  const slides = featuredHeroSlides(dramas);

  if (slides.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-sm text-zinc-500">
        Belum ada drama. Tambahkan dari panel admin.
      </div>
    );
  }

  return (
    <div className="pb-10">
      <HomeHero
        dramas={slides}
        baseUrl={process.env.NEXT_PUBLIC_VIDEO_BASE_URL ?? ""}
      />

      <div className="mx-auto max-w-7xl px-4 pt-6 md:px-6">
        <AdBanner />
      </div>

      <div className="mx-auto max-w-7xl md:px-6">
        <BerandaRows dramas={dramas} />
      </div>
    </div>
  );
}
