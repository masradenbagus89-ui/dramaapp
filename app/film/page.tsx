import type { Metadata } from "next";
import Link from "next/link";
import { Film } from "lucide-react";
import { getPlaylyVideosGabunganCached } from "@/lib/playly-gabungan";
import PlaylyVideoGrid from "@/app/components/PlaylyVideoGrid";

// Halaman disimpan & dipakai ulang, disegarkan tiap 300 detik — sama dengan
// PLAYLY_PUBLIK_TTL_SECONDS di lib/playly.ts. Ditulis sebagai angka, bukan
// konstanta impor, karena Next.js mensyaratkan nilai revalidate berupa angka
// literal yang bisa dibaca saat build. Ubah keduanya bersamaan.
export const revalidate = 300;

// Sebutan "Playly" sengaja DIBUANG dari seluruh tulisan yang dilihat penonton
// (owner 2026-09-26): itu nama penyedia video, bukan sesuatu yang berarti bagi
// mereka.
//
// ALAMATNYA ikut pindah /playly -> /film pada hari yang sama. Alasannya:
// membuang kata itu dari layar saja belum cukup — penonton yang mengklik
// "Lihat semua" tetap melihatnya di kotak alamat browser. Tautan lama TIDAK
// mati: `next.config.ts` memasang redirect PERMANEN /playly -> /film, jadi
// tautan yang sudah tersebar dan hasil Google yang sudah terindeks tetap
// mendarat di sini, dan Google memindahkan nilai halamannya ke alamat baru.
export const metadata: Metadata = {
  title: "Film & Video — Bisa Langsung Diputar",
  description:
    "Kumpulan film dan video di DramaKu yang bisa langsung diputar tanpa unduh.",
  alternates: { canonical: "/film" },
};

export default async function PlaylyPage() {
  // DUA sumber, satu daftar: katalog yang kita jemput dari API Playly + video
  // yang didorong Playly lewat webhook. Aturan gabungnya (siapa menang saat
  // videoId sama, urutannya, dan apa yang terjadi kalau satu sumber mati) ada
  // di lib/playly-gabungan.ts — halaman ini cukup menggambar hasilnya.
  const { videos, error } = await getPlaylyVideosGabunganCached();

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      <div className="mx-auto max-w-7xl px-4 pt-8 md:px-6">
        <header>
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Katalog
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">
            Film &amp; Video
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Semua judul di halaman ini bisa langsung diputar. Klik salah satu
            untuk mulai menonton.
          </p>
        </header>

        <div className="mt-8">
          {videos.length > 0 ? (
            <PlaylyVideoGrid videos={videos} />
          ) : (
            // Sengaja SELALU ada yang tampil saat daftarnya kosong. Versi
            // sebelumnya menghilangkan seluruh bagian ini tanpa jejak, dan itu
            // membuat "belum ada video" tak bisa dibedakan dari "fiturnya rusak".
            //
            // Sebabnya TIDAK dirinci ke pengunjung: pesan seperti "kunci API
            // belum dipasang" adalah keterangan kondisi dalam server, dan itu
            // urusan admin — halaman admin yang menampilkan detailnya.
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-6 py-12 text-center">
              <Film className="mx-auto h-10 w-10 text-zinc-700" aria-hidden="true" />
              <p className="mt-4 text-sm font-medium text-zinc-300">
                {error
                  ? "Daftar video sedang tidak bisa dimuat."
                  : "Belum ada video di sini."}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {error
                  ? "Ini gangguan sementara di sisi penyedia video. Coba buka lagi beberapa saat lagi."
                  : "Video akan muncul di sini begitu tersedia."}
              </p>
              <Link
                href="/discover"
                className="mt-6 inline-block rounded-full border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500"
              >
                Jelajahi drama lain
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
