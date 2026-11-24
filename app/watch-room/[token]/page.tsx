import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { alamatGambarVideo } from "@/lib/tonton";
import { namaCookieNobar, nobarAktif, panggilNobar } from "@/lib/nobar";
import { bentukRahasiaSah } from "@/nobar-server/src/tiket";
import RuangNobar from "@/app/components/nobar/RuangNobar";

// Tiap Room privat & berubah tiap detik → tak pernah disimpan cache.
export const dynamic = "force-dynamic";

// Link undangan = kunci masuk. Tidak boleh muncul di Google.
export const metadata: Metadata = {
  title: "Nonton Bareng",
  robots: { index: false, follow: false },
};

export default async function WatchRoomPage(props: PageProps<"/watch-room/[token]">) {
  const { token } = await props.params;
  if (!nobarAktif() || !bentukRahasiaSah(token)) notFound();

  const kunci = (await cookies()).get(namaCookieNobar(token))?.value ?? null;
  const { kode, isi } = await panggilNobar("/internal/info", { token, kunci });

  if (kode !== 200) {
    // 404 & "salah ketik" dibalas sama — tak membocorkan Room mana yang pernah ada.
    const pesan =
      kode === 410
        ? { judul: "Room sudah berakhir", teks: "Host sudah menutup Room ini, atau Room lama tidak dipakai." }
        : kode === 404
          ? { judul: "Undangan tidak valid", teks: "Link ini salah atau tidak lengkap. Minta link baru ke yang mengundang." }
          : { judul: "Sedang ada gangguan", teks: "Server Nonton Bareng belum bisa dihubungi. Coba muat ulang sebentar lagi." };
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
        <div className="max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
          <h1 className="text-lg font-bold">{pesan.judul}</h1>
          <p className="mt-2 text-sm text-zinc-400">{pesan.teks}</p>
          <Link href="/film" className="mt-5 inline-block rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-500">
            Lihat film lain
          </Link>
        </div>
      </main>
    );
  }

  const videoId = String(isi.videoId);
  const saya = isi.saya as { nama: string } | null;
  return (
    <RuangNobar
      token={token}
      judul={String(isi.judul)}
      videoId={videoId}
      poster={alamatGambarVideo(videoId)}
      namaAwal={saya?.nama ?? null}
    />
  );
}
