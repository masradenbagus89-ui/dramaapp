import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getPlaylyVideosGabunganCached } from "@/lib/playly-gabungan";
import { cariVideoDariSegmen } from "@/lib/tonton";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import PlaylyPlayer from "@/app/components/player/PlaylyPlayer";
import InfoVideoPlayly from "@/app/components/player/InfoVideoPlayly";

// HALAMAN TONTON SATU VIDEO (owner 2026-09-26).
//
// KENAPA ADA: sampai hari ini video hanya bisa diputar sebagai pemutar yang
// muncul DI DALAM halaman daftar. Akibatnya tak satu pun video punya alamat
// sendiri — tidak bisa dikirim ke WhatsApp, tidak bisa di-bookmark, dan tidak
// bisa ditemukan Google. Owner meminta video terasa seperti film biasa, dan
// "film biasa" di situs ini berarti punya halamannya sendiri.
//
// BEDANYA dengan /watch/[id]/[ep] dan /feed/[id]: keduanya pemutar EPISODE
// drama — ada daftar episode, koin, paywall, komentar. Halaman ini sengaja
// tidak punya satu pun dari itu; video di sini berdiri sendiri tanpa episode.

// Disimpan & dipakai ulang, disegarkan tiap 300 detik — angka yang sama dengan
// /playly dan PLAYLY_PUBLIK_TTL_SECONDS di lib/playly.ts. Ditulis sebagai angka
// literal karena Next mensyaratkannya bisa dibaca saat build.
export const revalidate = 300;

// Daftar prerender sengaja KOSONG — pola yang sama persis dengan
// app/drama/[id]/page.tsx, dan alasannya sama: membuat halaman di muka saat
// build adalah jalur yang membekukan rilis EMPAT HARI pada 2026-09-19 (tiap
// halaman memanggil pembacaan ber-cache, dan pembacaan itu tersendat di dalam
// proses build walau sumbernya sehat). Dengan daftar kosong, tiap halaman
// dibuat saat pengunjung pertama membukanya lalu disimpan ISR 300 detik.
//
// ⚠️ Fungsinya TETAP ADA walau memulangkan daftar kosong, dan itu bukan sisa
// yang lupa dihapus: tanpa `generateStaticParams`, Next menandai route ini
// `ƒ (Dynamic)` — dirender ulang untuk TIAP permintaan, sehingga tiap
// pembukaan halaman menembak API video dan halamannya ikut mati saat API itu
// lambat. Terukur di build 2026-09-26: tanpa fungsi ini `ƒ`, dengan fungsi ini
// `● (SSG)` ber-ISR. Penjaganya tests/tonton-halaman.test.ts.
//
// `dynamicParams` WAJIB true. Dengan daftar kosong, nilai `false` membuat
// SETIAP halaman tonton membalas 404 tanpa satu pun error di build —
// kerusakan senyap yang sudah pernah nyaris terjadi di halaman drama.
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return [];
}

/**
 * Cari video yang alamatnya menunjuk ke sini.
 *
 * Dipakai bersama `generateMetadata` dan komponen halaman — keduanya butuh
 * video yang SAMA, dan Next memang memanggil keduanya. Pembacaannya ber-cache,
 * jadi panggilan kedua tidak menambah beban.
 *
 * ⚠️ GERBANG (rak owasp — IDOR): daftarnya sengaja daftar yang SAMA dengan
 * halaman penonton, bukan pencarian bebas ke Playly. Video yang disembunyikan
 * admin atau milik kreator lain tidak ada di daftar ini, jadi alamat yang
 * ditebak-tebak berakhir 404 — bukan membuka video yang tak boleh dilihat.
 * Aturan yang sama sudah menjaga app/api/playly/video/route.ts:51.
 */
async function cariVideo(segmen: string) {
  const { videos } = await getPlaylyVideosGabunganCached();
  return cariVideoDariSegmen(videos, decodeURIComponent(segmen));
}

export async function generateMetadata(
  props: PageProps<"/tonton/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const video = await cariVideo(id);
  if (!video) return { title: "Video tidak ditemukan" };

  const title = `Nonton ${video.title}`;
  const description = `Nonton ${video.title} gratis di DramaKu — langsung diputar tanpa unduh.`;
  const path = `/tonton/${id}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "video.other",
      title,
      description,
      url: `${SITE_URL}${path}`,
      // Sampul dipakai apa adanya sebagai gambar preview share. Kosong =
      // field-nya TIDAK ditulis, bukan diisi gambar cadangan yang tidak ada
      // hubungannya — preview yang salah lebih menyesatkan daripada tanpa
      // preview.
      ...(video.thumbnail
        ? { images: [{ url: absoluteUrl(video.thumbnail), alt: video.title }] }
        : {}),
    },
  };
}

export default async function TontonPage(props: PageProps<"/tonton/[id]">) {
  const { id } = await props.params;
  const video = await cariVideo(id);
  if (!video) notFound();

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      <div className="mx-auto max-w-5xl px-4 pt-6 md:px-6">
        <Link
          href="/beranda"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-amber-400"
        >
          <ChevronLeft className="size-4" />
          Kembali ke beranda
        </Link>

        <div className="mt-4">
          <PlaylyPlayer
            videoId={video.id}
            title={video.title}
            poster={video.thumbnail}
          />
        </div>

        <h1 className="mt-5 text-xl font-bold text-white md:text-2xl">
          {video.title}
        </h1>

        {/* Kotak keterangan + tombol (unduh, bagikan, simpan) — komponen yang
            SAMA dengan yang dipakai daftar video, bukan salinan. Aturannya
            ikut: keterangan yang datanya kosong tidak digambar sama sekali,
            bukan diisi tebakan. */}
        <div className="mt-3 max-w-sm">
          <InfoVideoPlayly
            title={video.title}
            contentRating={video.contentRating}
            quality={video.quality}
            durationLabel={video.durationLabel}
            genre={video.kategori ?? video.genre}
          />
          {video.dramaHref && video.dramaTitle && (
            <p className="mt-2 text-xs text-zinc-400">
              <Link href={video.dramaHref} className="text-amber-400 underline">
                {video.dramaTitle}
                {video.episode ? ` · Episode ${video.episode}` : ""}
              </Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
