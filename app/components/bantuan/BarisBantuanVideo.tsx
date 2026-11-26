"use client";

// Baris tombol Report Video + Live Chat tepat di bawah pemutar Playly
// (/tonton/[id]). Pemutar drama memakai rail ikon (ActionRail) — keduanya
// berbagi status & jendela lewat useBantuanVideo. Gaya terang: halaman
// /tonton berlatar kartu putih (jendelanya sendiri tetap gelap).
import { Flag, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBantuanVideo } from "./useBantuanVideo";

/** Pemutar Playly tak punya pilihan server; sumbernya selalu Playly. */
const SERVER_PLAYLY = "Playly";

export default function BarisBantuanVideo({ videoId, judul }: { videoId: string; judul: string }) {
  const bantuan = useBantuanVideo({
    jenisKonten: "playly",
    kontenId: videoId,
    judul,
    episode: null,
    server: SERVER_PLAYLY,
  });

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={bantuan.bukaLaporan}
          className="gap-1.5 rounded-full border-zinc-300 bg-white text-zinc-700 hover:border-rose-400 hover:bg-white hover:text-rose-700"
        >
          <Flag className="size-4" />
          Report Video
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={bantuan.bukaChat}
          aria-label={bantuan.adaBalasanBaru ? "Live Chat (ada pesan baru)" : "Live Chat"}
          className="relative gap-1.5 rounded-full border-zinc-300 bg-white text-zinc-700 hover:border-rose-400 hover:bg-white hover:text-rose-700"
        >
          <MessagesSquare className="size-4" />
          Live Chat
          {bantuan.adaBalasanBaru && (
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-rose-500" aria-hidden="true" />
          )}
        </Button>
      </div>
      {bantuan.jendela}
    </>
  );
}
