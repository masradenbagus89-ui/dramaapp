import Link from "next/link";
import { notFound } from "next/navigation";
import { getDrama, getAllDramas } from "@/lib/dramas";
import VideoPlayer from "@/app/components/VideoPlayer";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getAllDramas().flatMap((d) =>
    Array.from({ length: Math.min(d.episodes, 3) }, (_, i) => ({
      id: d.id,
      ep: String(i + 1),
    })),
  );
}

export default async function WatchPage(props: PageProps<"/watch/[id]/[ep]">) {
  const { id, ep } = await props.params;
  const drama = getDrama(id);
  if (!drama) notFound();

  const epNum = Number(ep);
  if (!Number.isFinite(epNum) || epNum < 1 || epNum > drama.episodes) notFound();

  const prevEp = epNum > 1 ? epNum - 1 : null;
  const nextEp = epNum < drama.episodes ? epNum + 1 : null;

  return (
    <div className="relative flex h-[100dvh] w-full flex-col bg-black">
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <VideoPlayer src={`/videos/${id}/${epNum}.mp4`} />

        <Link
          href={`/drama/${drama.id}`}
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white"
          aria-label="Kembali"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </Link>

        <div className="pointer-events-none absolute bottom-20 left-3 right-3">
          <h1 className="text-base font-semibold text-white drop-shadow-lg">
            {drama.title}
          </h1>
          <p className="text-xs text-zinc-300 drop-shadow-lg">
            Episode {epNum} dari {drama.episodes}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-zinc-900 bg-black p-3">
        {prevEp ? (
          <Link
            href={`/watch/${drama.id}/${prevEp}`}
            className="flex-1 rounded-full border border-zinc-700 py-2 text-center text-sm text-zinc-200"
          >
            ← Eps {prevEp}
          </Link>
        ) : (
          <div className="flex-1 rounded-full border border-zinc-900 py-2 text-center text-sm text-zinc-600">
            ← Awal
          </div>
        )}

        <Link
          href={`/drama/${drama.id}`}
          className="flex-1 rounded-full border border-zinc-700 py-2 text-center text-sm text-zinc-200"
        >
          Daftar Eps
        </Link>

        {nextEp ? (
          <Link
            href={`/watch/${drama.id}/${nextEp}`}
            className="flex-1 rounded-full bg-amber-400 py-2 text-center text-sm font-semibold text-black"
          >
            Eps {nextEp} →
          </Link>
        ) : (
          <div className="flex-1 rounded-full border border-zinc-900 py-2 text-center text-sm text-zinc-600">
            Akhir
          </div>
        )}
      </div>
    </div>
  );
}
