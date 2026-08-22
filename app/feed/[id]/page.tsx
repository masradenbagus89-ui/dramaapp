import { notFound } from "next/navigation";
import { getDrama } from "@/lib/dramas";
import { getVideoBaseUrl } from "@/lib/video-base";
import FeedPlayer from "@/app/components/FeedPlayer";

export const dynamic = "force-dynamic";

export default async function FeedPage(props: PageProps<"/feed/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const drama = await getDrama(id);
  if (!drama) notFound();

  const rawEp = Array.isArray(sp?.ep) ? sp.ep[0] : sp?.ep;
  const epNum = Number(rawEp);
  const hasEpQuery =
    Number.isFinite(epNum) && epNum >= 1 && epNum <= drama.episodes;
  const startEp = hasEpQuery ? epNum : 1;

  return (
    <FeedPlayer
      dramaId={drama.id}
      title={drama.title}
      episodes={drama.episodes}
      baseUrl={await getVideoBaseUrl()}
      startEp={startEp}
      posterImage={drama.posterImage}
      subtitles={drama.subtitles ?? []}
      premium={drama.premium ?? false}
      resumeFromHistory={!hasEpQuery}
    />
  );
}
