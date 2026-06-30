import Link from "next/link";
import { getAllDramas } from "@/lib/dramas";
import { parseViews } from "@/lib/format";
import BerandaRows from "../components/BerandaRows";
import AdBanner from "../components/AdBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BerandaPage() {
  const dramas = await getAllDramas();
  // Hero diurut dari paling banyak ditonton, diutamakan yang punya heroImage
  // (gambar lebar khusus banner) — paling pas jadi sampul hero.
  const ranked = [...dramas].sort(
    (a, b) => parseViews(b.views) - parseViews(a.views),
  );
  const hero =
    ranked.find((d) => d.heroImage) ??
    ranked.find((d) => d.posterImage) ??
    dramas[0];

  if (!hero) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-sm text-zinc-500">
        Belum ada drama. Tambahkan dari panel admin.
      </div>
    );
  }

  const heroImg = hero.heroImage || hero.posterImage;

  return (
    <div className="mx-auto max-w-7xl pb-10">
      {/* HERO — sampul gambar (poster lebar) + teks. Tanpa video: andal, tidak
          tergantung tunnel, dan bebas masalah rasio potret/landscape. */}
      <section className="relative overflow-hidden border-b border-zinc-800 md:mx-6 md:mt-4 md:rounded-2xl md:border">
        <div
          className={`relative aspect-[4/3] w-full bg-gradient-to-br sm:aspect-[16/9] lg:aspect-[21/9] ${hero.gradient}`}
        >
          {heroImg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImg}
              alt={hero.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          {/* Scrim: dari bawah (HP) / dari kiri (desktop) supaya teks terbaca. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent md:bg-gradient-to-r md:from-black md:via-black/55 md:to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent md:from-black/40" />

          {/* Teks: dasar (HP) / kiri-bawah dibatasi lebar (desktop). */}
          <div className="absolute inset-x-0 bottom-0 p-4 md:inset-y-0 md:right-auto md:flex md:max-w-[60%] md:flex-col md:justify-end md:p-8 lg:max-w-xl">
            <Badge className="w-fit gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/40">
              🔥 Trending
            </Badge>
            <h1 className="title-gold mt-2 text-2xl leading-tight md:mt-3 md:text-4xl">
              {hero.title}
            </h1>
            <p className="mt-1.5 text-xs text-zinc-300/90 md:text-sm">
              {hero.category}
              {hero.episodes > 1 && ` · ${hero.episodes} episode`} ·{" "}
              {hero.views} ditonton
            </p>
            <p className="mt-1 line-clamp-2 max-w-md text-xs text-zinc-300 md:line-clamp-3 md:text-sm">
              {hero.synopsis}
            </p>
            <div className="mt-3 flex gap-2 md:mt-4">
              <Button
                asChild
                className="rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-300"
              >
                <Link href={`/feed/${hero.id}`}>
                  <Play className="size-4 fill-black text-black" />
                  Tonton
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-zinc-600 bg-black/40 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur hover:border-amber-400 hover:text-amber-400"
              >
                <Link href={`/drama/${hero.id}`}>Detail</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* SLOT IKLAN OTOMATIS — passive income; fallback ke iklan manual/promo. */}
      <div className="px-4 pt-5 md:px-6">
        <AdBanner />
      </div>

      {/* BARIS KONTEN */}
      <div className="md:px-6">
        <BerandaRows dramas={dramas} />
      </div>
    </div>
  );
}
