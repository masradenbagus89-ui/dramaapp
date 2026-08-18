import type { Metadata } from "next";
import Link from "next/link";
import { getAllDramasCached } from "@/lib/dramas";
import Poster from "@/app/components/Poster";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clapperboard } from "lucide-react";

// Disimpan & dipakai ulang, disegarkan tiap 60 detik (menggantikan force-dynamic
// yang membangun ulang halaman untuk tiap pengunjung).
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shorts — Cuplikan Drama China Pendek",
  description:
    "Kumpulan cuplikan drama China pendek di DramaKu. Tonton sekilas sebelum lanjut ke episode penuh — gratis dan tanpa perlu daftar.",
  alternates: { canonical: "/shorts" },
};

export default async function ShortsPage() {
  const trending = (await getAllDramasCached()).slice(0, 6);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-6 md:px-6">
      <h1 className="text-xl font-bold text-white md:text-2xl">Shorts Trending</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Cuplikan singkat drama paling populer minggu ini.
      </p>

      {trending.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <Clapperboard className="size-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">Belum ada shorts trending.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {trending.map((drama, idx) => (
            <Link key={drama.id} href={`/feed/${drama.id}`} className="block">
              <Card className="flex-row gap-3 border-zinc-800 bg-zinc-900/50 p-2 shadow-none transition-colors hover:border-zinc-700">
                <div className="w-20 shrink-0">
                  <Poster drama={drama} showBadge={false} />
                </div>
                <div className="flex flex-1 flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-400/20 text-sm font-bold text-amber-400">
                      #{idx + 1}
                    </Badge>
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
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
