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
 * Judul bagian ini. SENGAJA tidak menyebut "Playly" (owner 2026-09-26: "viewer
 * tidak perlu tahu darimana asal video di upload") — itu nama penyedia video,
 * bukan sesuatu yang berarti bagi penonton. Judul lamanya "Video dari Playly".
 *
 * Diekspor supaya penjaga tes bisa mengadu HTML yang benar-benar dirender
 * dengan nilai ini, bukan dengan teks tulis-tangan yang bisa basi sendiri.
 */
export const JUDUL_BAGIAN = "Film & Video Lainnya";

/**
 * Video Playly mana yang cocok dengan ketikan penonton.
 *
 * TIGA field yang dicari dipilih dengan satu aturan: semuanya TERGAMBAR di
 * kartu hasil — judul video, nama kreator, dan judul drama tempat video itu
 * dipakai. Jadi penonton selalu bisa melihat SENDIRI kenapa sebuah kartu
 * muncul, tanpa menebak. Sinopsis tidak ada di data Playly (lihat PlaylyVideo
 * di lib/playly.ts), jadi tak ada yang hilang dengan tidak menyebutnya.
 *
 * Dipisah jadi fungsi sendiri supaya pemanggil bisa menghitung jumlah yang
 * cocok TANPA merender apa pun — dipakai pesan "tidak ada judul yang cocok" di
 * katalog drama untuk menunjuk ke bagian ini.
 */
export function cariVideoPlayly(
  videos: PlaylyVideoPublik[],
  ketikan: string,
): PlaylyVideoPublik[] {
  // ⚠️ DIPERSEMPIT — owner 2026-11-13, alasan lengkap di lib/discover.ts.
  // Dulu ikut mencari `genre` + label Indonesianya; keduanya tidak tampil di
  // kartu hasil, jadi penonton melihat judul yang tak terlihat nyambung
  // dengan ketikannya. `dramaTitle` DIPERTAHANKAN karena ia memang tergambar
  // di kartu ("dari: <judul drama>"), jadi hasilnya tetap bisa dijelaskan
  // hanya dengan melihat layar.
  return saringDenganKetikan(videos, ketikan, (v) => [
    v.title,
    v.creator,
    v.dramaTitle,
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
          <h2 id="judul-video-playly" className="text-lg font-bold text-white terang:text-zinc-900">
            {JUDUL_BAGIAN}
          </h2>
          <p className="mt-1 text-sm text-zinc-400 terang:text-zinc-600">
            {mencari
              ? `${videos.length} video cocok dengan "${ketikan}".`
              : "Bisa langsung diputar di sini."}
          </p>
        </div>
        {/* Tautan "Lihat semua" hanya masuk akal di mode jelajah. Saat mencari,
            batas sudah dilepas — semua yang cocok sudah tampil di sini. */}
        {!mencari && videos.length > BATAS_JELAJAH && (
          <Link
            href="/film"
            className="shrink-0 text-sm font-semibold text-amber-400 terang:text-amber-700 underline"
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
