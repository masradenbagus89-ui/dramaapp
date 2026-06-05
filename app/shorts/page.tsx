import Link from "next/link";
import { getAllDramas } from "@/lib/dramas";
import Poster from "@/app/components/Poster";

export const dynamic = "force-dynamic";

export default function ShortsPage() {
  const trending = getAllDramas().slice(0, 6);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-6 md:px-6">
      <h1 className="text-xl font-bold text-white md:text-2xl">Shorts Trending</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Cuplikan singkat drama paling populer minggu ini.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {trending.map((drama, idx) => (
          <Link
            key={drama.id}
            href={`/feed/${drama.id}`}
            className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-2"
          >
            <div className="w-20 shrink-0">
              <Poster drama={drama} showBadge={false} />
            </div>
            <div className="flex flex-1 flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-amber-400">
                  #{idx + 1}
                </span>
                <h3 className="line-clamp-1 text-sm font-semibold text-white">
                  {drama.title}
                </h3>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                {drama.synopsis}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                {drama.views} ditonton · {drama.episodes} eps.
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
