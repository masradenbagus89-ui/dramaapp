import Link from "next/link";
import { notFound } from "next/navigation";
import { getDrama, getAllDramas } from "@/lib/dramas";
import { subtitleLabel } from "@/lib/types";
import Poster from "@/app/components/Poster";
import SaveButton from "@/app/components/SaveButton";
import LikeButton from "@/app/components/LikeButton";
import Comments from "@/app/components/Comments";
import WatchCta from "@/app/components/WatchCta";
import EpisodeList from "@/app/components/EpisodeList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Captions } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return (await getAllDramas()).map((d) => ({ id: d.id }));
}

export default async function DramaDetailPage(props: PageProps<"/drama/[id]">) {
  const { id } = await props.params;
  const drama = await getDrama(id);
  if (!drama) notFound();

  return (
    <div className="mx-auto max-w-7xl pb-10 md:px-6">
      <div className="relative">
        <div className={`relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br md:rounded-2xl ${drama.gradient}`}>
          {(drama.heroImage || drama.posterImage) && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={drama.heroImage || drama.posterImage}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={drama.heroImage || drama.posterImage}
                alt={drama.title}
                className={`absolute inset-0 h-full w-full object-cover ${drama.heroDim ? "brightness-90" : "brightness-100"}`}
              />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
        </div>
        <Button
          asChild
          size="icon"
          className="absolute left-3 top-3 rounded-full bg-black/60 text-white hover:bg-black/60 md:hidden"
          aria-label="Kembali"
        >
          <Link href="/beranda">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div className="absolute -bottom-16 left-4 right-4 flex gap-3 md:left-8 md:right-8 md:-bottom-20 md:gap-6">
          <div className="w-28 shrink-0 md:w-44">
            <Poster drama={drama} showBadge={false} />
          </div>
          <div className="flex flex-col justify-end pb-2 md:pb-4">
            <div className="flex items-center gap-2">
              <h1 className="title-gold text-2xl leading-tight md:text-4xl">{drama.title}</h1>
              {drama.premium && (
                <Badge className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold">
                  🪙 PREMIUM
                </Badge>
              )}
            </div>
            {drama.genre && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {drama.genre.split(",").map((g) => (
                  <span
                    key={g.trim()}
                    className="rounded-full border border-white/40 px-2.5 py-0.5 text-[11px] text-white"
                  >
                    {g.trim()}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-xs text-zinc-300 md:text-sm">
              {[
                drama.year,
                drama.runtime,
                drama.episodes > 1 ? `${drama.episodes} episode` : "",
                drama.imdbRating ? `IMDb ${drama.imdbRating}/10` : "",
                drama.country,
              ]
                .filter(Boolean)
                .join(" · ")}
              {drama.year || drama.runtime || drama.imdbRating || drama.country
                ? " · "
                : ""}
              {drama.views} ditonton
            </p>
          </div>
        </div>
      </div>

      <div className="mt-20 px-4 md:mt-24 md:px-8 md:max-w-3xl">
        <div className="flex flex-col gap-2 sm:flex-row">
          <WatchCta dramaId={drama.id} className="flex-1" />
          <div className="flex flex-1 gap-2">
            <SaveButton id={drama.id} />
            <LikeButton dramaId={drama.id} />
          </div>
        </div>

        {drama.subtitles && drama.subtitles.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge className="gap-1 rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-300">
              <Captions className="h-3.5 w-3.5" />
              Subtitle
            </Badge>
            {drama.subtitles.map((code) => (
              <Badge
                key={code}
                variant="outline"
                className="rounded-full border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300"
              >
                {subtitleLabel(code)}
              </Badge>
            ))}
          </div>
        )}

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-300">
          Sinopsis
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-300">{drama.synopsis}</p>

        {(drama.director ||
          drama.writer ||
          drama.stars ||
          drama.genre ||
          drama.country ||
          drama.language) && (
          <dl className="mt-5 space-y-2 border-t border-zinc-800 pt-5 text-sm">
            {(drama.country || drama.language) && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-semibold text-zinc-200">Asal</dt>
                <dd className="text-zinc-400">
                  {[drama.country, drama.language].filter(Boolean).join(" · ")}
                </dd>
              </div>
            )}
            {drama.director && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-semibold text-zinc-200">Director</dt>
                <dd className="text-indigo-300">{drama.director}</dd>
              </div>
            )}
            {drama.writer && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-semibold text-zinc-200">Writers</dt>
                <dd className="text-indigo-300">{drama.writer}</dd>
              </div>
            )}
            {drama.stars && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-semibold text-zinc-200">Stars</dt>
                <dd className="text-indigo-300">{drama.stars}</dd>
              </div>
            )}
            {drama.imdbId && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-semibold text-zinc-200">IMDb</dt>
                <dd>
                  <a
                    href={`https://www.imdb.com/title/${drama.imdbId}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-300 underline-offset-2 hover:underline"
                  >
                    {drama.imdbId}
                    {drama.imdbVotes ? ` · ${drama.imdbVotes} votes` : ""}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        )}

        {drama.episodes > 0 && (
          <>
            <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-300">
              Episode
            </h2>
            <EpisodeList
              dramaId={drama.id}
              episodes={drama.episodes}
              posterImage={drama.posterImage || drama.heroImage}
              title={drama.title}
            />
          </>
        )}

        <Comments dramaId={drama.id} />
      </div>
    </div>
  );
}
