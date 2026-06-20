import Link from "next/link";
import { getAllDramas } from "@/lib/dramas";
import BerandaRows from "../components/BerandaRows";
import AdBanner from "../components/AdBanner";

export const dynamic = "force-dynamic";

function parseViews(s: string): number {
  const m = s.trim().match(/^([0-9.]+)\s*([kKmMbB]?)$/);
  if (!m) return Number(s) || 0;
  const num = parseFloat(m[1]);
  const u = m[2].toLowerCase();
  const mult = u === "b" ? 1e9 : u === "m" ? 1e6 : u === "k" ? 1e3 : 1;
  return num * mult;
}

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
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/40">
              🔥 Trending
            </span>
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
              <Link
                href={`/feed/${hero.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-300"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-black">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Tonton
              </Link>
              <Link
                href={`/drama/${hero.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-600 bg-black/40 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur hover:border-amber-400 hover:text-amber-400"
              >
                Detail
              </Link>
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
