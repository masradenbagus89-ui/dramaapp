import { Suspense } from "react";
import Link from "next/link";
import { getAllDramas } from "@/lib/dramas";
import DramaBrowser from "../components/DramaBrowser";
import DashboardVideoGrid from "../components/DashboardVideoGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const dramas = await getAllDramas();
  const featured = dramas[0];

  // Bagian "Video terbaru" hanya muncul kalau sambungan ke dashboard sudah
  // dikonfigurasi. Tanpa penjaga ini, halaman publik akan menampilkan pesan
  // error hanya karena env belum diisi.
  const dashboardAktif = Boolean(process.env.DASHBOARD_API_URL?.trim());

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
              <Badge className="rounded px-2 py-0.5 text-xs font-bold uppercase">
                Sedang Trending
              </Badge>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-white">
                {featured.title}
              </h2>
              <p className="mt-2 line-clamp-3 text-sm text-zinc-300">
                {featured.synopsis}
              </p>
              <Button
                asChild
                className="mt-4 rounded-full px-5 font-semibold"
              >
                <Link href={`/drama/${featured.id}`}>
                  <Play className="size-4 fill-current" />
                  Tonton sekarang
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <Suspense fallback={<div className="mt-8 text-center text-sm text-zinc-500">Memuat...</div>}>
        <DramaBrowser dramas={dramas} />
      </Suspense>

      {dashboardAktif && <DashboardVideoGrid />}
    </div>
  );
}
