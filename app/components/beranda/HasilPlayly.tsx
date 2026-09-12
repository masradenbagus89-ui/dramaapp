"use client";

import Link from "next/link";
import { saringDenganKetikan } from "@/lib/pencarian";
import type { PlaylyVideoPublik } from "@/lib/playly-publik";
import PlaylyVideoGrid from "../PlaylyVideoGrid";

/**
 * Batas kartu saat penonton TIDAK sedang mencari (mode jelajah) — selebihnya
 * ada di /playly, supaya baris ini tidak menenggelamkan katalog drama yang jadi
 * isi utama situs.
 *
 * Saat penonton MENCARI, batas ini sengaja DILEPAS: video yang dicari bisa
 * berada di urutan ke-12, dan memotongnya di 8 membuat pencarian terasa gagal
 * padahal videonya ada.
 */
export const BATAS_JELAJAH = 8;

/**
 * Video Playly mana yang cocok dengan ketikan penonton.
 *
 * Empat field yang dicari dipilih dari sudut pandang penonton: dia mengingat
 * JUDUL video, nama KREATOR, judul DRAMA tempat video itu dipakai, atau
 * GENRE-nya. Sinopsis tidak ada di data Playly (lihat PlaylyVideo di
 * lib/playly.ts), jadi tidak ada yang hilang dengan tidak menyebutnya.
 *
 * Dipisah jadi fungsi sendiri supaya pemanggil bisa menghitung jumlah yang
 * cocok TANPA merender apa pun — dipakai pesan "tidak ada judul yang cocok" di
 * katalog drama untuk menunjuk ke bagian ini.
 */
export function cariVideoPlayly(
  videos: PlaylyVideoPublik[],
  ketikan: string,
): PlaylyVideoPublik[] {
  return saringDenganKetikan(videos, ketikan, (v) => [
    v.title,
    v.creator,
    v.dramaTitle,
    v.genre,
  ]);
}

type Props = {
  /** Video yang SUDAH tersaring oleh `cariVideoPlayly` di pemanggil. */
  videos: PlaylyVideoPublik[];
  /** Ketikan di kotak cari halaman ini; kosong = mode jelajah. */
  ketikan: string;
};

/**
 * Bagian "Video dari Playly" di bawah grid poster drama.
 *
 * Dipisah jadi bagian sendiri (bukan dicampur ke grid poster) atas keputusan
 * owner 2026-09-12: poster drama berbentuk TEGAK 2:3 sedangkan kartu video
 * MELINTANG 16:9 — dicampur dalam satu grid, barisannya jadi jomplang.
 *
 * Video Playly datang dari gudang data yang TERPISAH dari katalog Supabase
 * (lib/playly-publik.ts), jadi tanpa bagian ini judul seperti "Beyond The Last
 * Signal" dibalas "tidak ada yang cocok" padahal videonya tayang di situs.
 */
export default function HasilPlayly({ videos, ketikan }: Props) {
  if (videos.length === 0) return null;

  const mencari = ketikan.trim().length > 0;

  return (
    <section className="mt-10" aria-labelledby="judul-video-playly">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="judul-video-playly" className="text-lg font-bold text-white">
            Video dari Playly
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {mencari
              ? `${videos.length} video cocok dengan "${ketikan}".`
              : "Diputar langsung dari pemutar milik Playly."}
          </p>
        </div>
        {/* Tautan "Lihat semua" hanya masuk akal di mode jelajah. Saat mencari,
            batas sudah dilepas — semua yang cocok sudah tampil di sini. */}
        {!mencari && videos.length > BATAS_JELAJAH && (
          <Link
            href="/playly"
            className="shrink-0 text-sm font-semibold text-amber-400 underline"
          >
            Lihat semua
          </Link>
        )}
      </div>
      <div className="mt-4">
        <PlaylyVideoGrid
          videos={videos}
          limit={mencari ? undefined : BATAS_JELAJAH}
        />
      </div>
    </section>
  );
}
