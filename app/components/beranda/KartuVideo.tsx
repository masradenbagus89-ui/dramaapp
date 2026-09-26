"use client";

import Link from "next/link";
import { Film, Play } from "lucide-react";
import type { PlaylyVideoPublik } from "@/lib/playly-publik";
import { alamatTonton } from "@/lib/tonton";

/**
 * Kartu poster untuk satu VIDEO, sebaris dengan kartu drama di beranda.
 *
 * KENAPA ADA (owner 2026-09-26): "viewer tidak perlu tahu darimana asal video
 * di upload — intinya dramaku ini isinya film/video yang bisa ditonton". Sampai
 * hari ini video hanya digambar `PlaylyVideoGrid` dalam bentuk kartu MELINTANG
 * 16:9 di blok terpisah berjudul "Video dari Playly". Kartu ini membuatnya
 * tampil seperti film biasa: bingkai TEGAK 2:3 yang sama dengan poster drama.
 *
 * ⚠️ Sampulnya dipotong, dan itu disengaja. Sampul Playly berbentuk melintang
 * 16:9; dipasang di bingkai tegak dengan `object-cover`, sisi kiri-kanannya
 * terpotong. Pilihan lain (`object-contain`) menyisakan pita hitam atas-bawah
 * yang membuat baris terlihat bolong di antara poster drama. Owner memilih
 * barisan yang rapi.
 *
 * ⚠️ Memakai `<img>` biasa, BUKAN `next/image`, dan itu bukan kelalaian: host
 * sampul Playly tidak terdaftar di `next.config.ts` `images.remotePatterns`,
 * dan host di luar daftar itu DITOLAK — gambarnya hilang tanpa error. Mendaftar
 * host Playly berarti tiap kali mereka pindah CDN semua sampul mati diam-diam.
 * Pola yang sama sudah dipakai `app/components/PlaylyVideoGrid.tsx:112`.
 *
 * Berbeda dari `PlaylyVideoGrid`, kartu ini adalah TAUTAN ke halaman tonton —
 * bukan tombol yang memasang pemutar di tempat. Itu yang membuat tiap video
 * punya alamat sendiri untuk dibagikan.
 */
export default function KartuVideo({ video }: { video: PlaylyVideoPublik }) {
  // Baris kecil di bawah judul. Kategori pilihan admin didahulukan karena
  // itulah yang menempatkan video ini di baris genre; `genre` teks bebas dari
  // katalog jadi cadangan. Keduanya kosong = barisnya tidak digambar sama
  // sekali, bukan diisi tanda hubung (lihat aturan lencana di lib/types.ts).
  const label = video.kategori ?? video.genre;

  return (
    <Link
      href={alamatTonton(video)}
      className="group/kartu block focus-visible:outline-none"
    >
      <div className="relative overflow-hidden rounded-sm ring-1 ring-white/10 transition duration-200 group-hover/kartu:ring-2 group-hover/kartu:ring-amber-400 group-focus-visible/kartu:ring-2 group-focus-visible/kartu:ring-amber-400">
        <div className="relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden bg-zinc-900">
          {video.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnail}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover/kartu:scale-105"
            />
          ) : (
            // Sampul gagal/tidak ada: kotak berikon, BUKAN gambar rusak.
            // Judulnya tetap terbaca di bawah kartu, jadi videonya tidak
            // berubah jadi kartu tanpa identitas.
            <Film className="size-8 text-zinc-700" aria-hidden="true" />
          )}

          {/* Durasi di pojok kanan-bawah — posisi yang sama dengan lencana
              durasi poster drama (app/components/Poster.tsx). "-" berarti
              Playly tidak mengirim panjang videonya; jangan digambar. */}
          {video.durationLabel !== "-" && (
            <span className="pointer-events-none absolute bottom-1 right-1 z-10 rounded-sm bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white shadow md:text-[11px]">
              {video.durationLabel}
            </span>
          )}
        </div>

        <span className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover/kartu:bg-black/40">
          <Play className="size-9 fill-white text-white opacity-0 drop-shadow-lg transition-opacity duration-200 group-hover/kartu:opacity-100 md:size-12" />
        </span>
      </div>

      <h3 className="mt-1.5 line-clamp-2 text-[13px] font-bold leading-snug text-white transition-colors group-hover/kartu:text-amber-400 md:text-sm">
        {video.title}
      </h3>
      {label && (
        <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500 md:text-xs">
          {label}
        </p>
      )}
    </Link>
  );
}
