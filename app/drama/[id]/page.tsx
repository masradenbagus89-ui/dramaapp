import Link from "next/link";
import { notFound } from "next/navigation";
import { getDrama, getAllDramas } from "@/lib/dramas";
import Poster from "@/app/components/Poster";
import SaveButton from "@/app/components/SaveButton";
import LikeButton from "@/app/components/LikeButton";
import Comments from "@/app/components/Comments";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getAllDramas().map((d) => ({ id: d.id }));
}

export default async function DramaDetailPage(props: PageProps<"/drama/[id]">) {
  const { id } = await props.params;
  const drama = getDrama(id);
  if (!drama) notFound();

  const episodes = Array.from({ length: drama.episodes }, (_, i) => i + 1);

  return (
    <div className="mx-auto max-w-7xl pb-10 md:px-6">
      <div className="relative">
        <div className={`relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br md:rounded-2xl ${drama.gradient}`}>
          {(drama.heroImage || drama.posterImage) && (
            <>
              {/* Latar blur dari gambar yang sama -> mengisi ruang kosong tanpa memotong gambar */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={drama.heroImage || drama.posterImage}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
              />
              {/* Gambar utama tampil UTUH (tidak terpotong) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={drama.heroImage || drama.posterImage}
                alt={drama.title}
                className="absolute inset-0 h-full w-full object-contain"
              />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
        </div>
        <Link
          href="/"
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white md:hidden"
          aria-label="Kembali"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </Link>

        <div className="absolute -bottom-16 left-4 right-4 flex gap-3 md:left-8 md:right-8 md:-bottom-20 md:gap-6">
          <div className="w-28 shrink-0 md:w-44">
            <Poster drama={drama} showBadge={false} />
          </div>
          <div className="flex flex-col justify-end pb-2 md:pb-4">
            <h1 className="text-xl font-bold text-white md:text-3xl">{drama.title}</h1>
            <p className="mt-1 text-xs text-zinc-400 md:text-sm">
              {drama.category}
              {drama.episodes > 1 && ` · ${drama.episodes} episode`} · {drama.views} ditonton
            </p>
          </div>
        </div>
      </div>

      <div className="mt-20 px-4 md:mt-24 md:px-8 md:max-w-3xl">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/feed/${drama.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-amber-400 py-3 text-sm font-semibold text-black"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-black">
              <path d="M8 5v14l11-7z" />
            </svg>
            Tonton Eps 1
          </Link>
          <div className="flex flex-1 gap-2">
            <SaveButton id={drama.id} />
            <LikeButton dramaId={drama.id} />
          </div>
        </div>

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-300">
          Sinopsis
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-300">{drama.synopsis}</p>

        {drama.episodes > 1 && (
          <>
            <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-300">
              Episode
            </h2>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {episodes.map((ep) => (
                <Link
                  key={ep}
                  href={`/feed/${drama.id}?ep=${ep}`}
                  className="flex h-10 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-sm text-zinc-200 hover:border-amber-400 hover:text-amber-400"
                >
                  {ep}
                </Link>
              ))}
            </div>
          </>
        )}

        <Comments dramaId={drama.id} />
      </div>
    </div>
  );
}
