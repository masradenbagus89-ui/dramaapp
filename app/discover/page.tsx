import { Suspense } from "react";
import { getAllDramas } from "@/lib/dramas";
import DramaBrowser from "../components/DramaBrowser";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const dramas = getAllDramas();
  const featured = dramas[0];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-4 md:px-6">
      {featured && (
        <section className="mb-6 hidden overflow-hidden rounded-2xl border border-zinc-800 md:block">
          <div className={`relative aspect-[21/9] w-full bg-gradient-to-br ${featured.gradient}`}>
            {featured.posterImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={featured.posterImage}
                alt={featured.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 max-w-xl p-8">
              <span className="rounded bg-amber-400 px-2 py-0.5 text-xs font-bold uppercase text-black">
                Sedang Trending
              </span>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-white">
                {featured.title}
              </h2>
              <p className="mt-2 line-clamp-3 text-sm text-zinc-300">
                {featured.synopsis}
              </p>
              <a
                href={`/drama/${featured.id}`}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-black"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-black">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Tonton sekarang
              </a>
            </div>
          </div>
        </section>
      )}

      <Suspense fallback={<div className="mt-8 text-center text-sm text-zinc-500">Memuat...</div>}>
        <DramaBrowser dramas={dramas} />
      </Suspense>
    </div>
  );
}
