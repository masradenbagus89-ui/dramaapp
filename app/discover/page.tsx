import { Suspense } from "react";
import { getAllDramas } from "@/lib/dramas";
import { featuredHeroSlides } from "@/lib/hero-teaser";
import DramaBrowser from "../components/DramaBrowser";
import HomeHero from "../components/HomeHero";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const dramas = await getAllDramas();
  const slides = featuredHeroSlides(dramas);

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
      </div>
    </div>
  );
}
