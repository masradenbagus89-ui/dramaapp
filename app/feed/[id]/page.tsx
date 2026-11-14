import { notFound } from "next/navigation";
import { getDramaCached } from "@/lib/dramas";
import { isMovie } from "@/lib/types";
import FeedPlayer from "@/app/components/FeedPlayer";

// Halaman tetap dibangun per permintaan (nomor episode dibaca dari ?ep=), tapi
// DATA dramanya diambil dari cache yang sama dengan /drama/[id]. Sebelumnya tiap
// penonton yang menekan Tonton = 3 query Supabase; kini paling banyak 3 per 60
// detik. Simpan di panel admin membuang cache ini seketika (lib/cache-publik.ts).
export const dynamic = "force-dynamic";

export default async function FeedPage(props: PageProps<"/feed/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const drama = await getDramaCached(id);
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
      startEp={startEp}
      posterImage={drama.posterImage}
      subtitles={drama.subtitles ?? []}
      premium={drama.premium ?? false}
      resumeFromHistory={!hasEpQuery}
      isMovie={isMovie(drama)}
      // Daftar sumber unduhan sudah ditempelkan getDrama lewat gabungUnduhan
      // (lib/dramas.ts) — di sini tinggal diteruskan supaya ikon Unduh muncul
      // di rail pemutar, bukan cuma di halaman detail.
      providers={drama.downloadProviders ?? []}
    />
  );
}
