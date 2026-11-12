"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Volume2, VolumeX } from "lucide-react";

// Tombol volume pemutar drama — duduk SEBARIS dengan angka durasi di panel
// bawah. Diketuk, ia membuka panel TEGAK berisi tombol + / − tepat di atasnya.
//
// 🪤 KENAPA TOMBOL, BUKAN GARIS GESER (owner 2026-11-12, putaran kedua: "kenapa
// itu jadi terpisah kamu satukan saja tombol menaikan volume nya karena di
// persi HP tidak terlihat tombol menaikan nya").
//
// Versi pertama memakai <input type="range"> yang DIPUTAR `-rotate-90` supaya
// berdiri tegak. Itu rusak di HP, dan rusaknya SENYAP — tak ada error, garisnya
// cuma tidak ada di tempat yang seharusnya. Diukur di Chrome headless pada
// layar 393px (iPhone 14 Pro), situs produksi:
//
//     garis volume berada di x=391, lebar 16px  ->  layar cuma 393px
//     = praktis SELURUHNYA di luar layar, tersisa ~2px
//
// Sebabnya: `transform` tidak mengubah ruang yang DIPESAN elemen. Kotak asli
// input selebar 96px, wadahnya 24px, jadi kotak itu meluber ~48px ke kanan
// LALU diputar — pusat hasil putarannya ikut terlempar sejauh itu. Di layar
// lebar gejalanya cuma "garisnya agak misah dari kotaknya"; di HP ia hilang
// dari layar. Satu-satunya perbaikan yang menutup kelas kesalahan ini untuk
// selamanya adalah TIDAK memutar elemen apa pun di sini.
//
// Sekalian dibereskan: ikon bisu kedua di dalam panel DIBUANG. Dua ikon
// speaker di satu layar (satu di baris durasi, satu di panel) terbaca sebagai
// dua kontrol yang berbeda — keluhan "kenapa itu jadi terpisah" yang sama.
// Bisu kini dicapai dengan menekan − sampai 0, dan ikon di baris durasi
// berubah jadi speaker-dicoret saat itu terjadi.
//
// Catatan lama yang masih berlaku: Safari iPhone mengabaikan `video.volume`
// (hanya tombol fisik HP yang bisa), jadi di sana yang efektif cuma bisu/tidak
// — turun sampai 0 = bisu.

/** Seberapa banyak satu ketukan mengubah volume. 10% = 10 ketukan dari bisu ke
 *  penuh; cukup halus untuk mengatur, cukup cepat untuk tidak melelahkan. */
const LANGKAH = 0.1;

export default function VolumeControl({
  volume,
  muted,
  hidden,
  onChange,
}: {
  volume: number;
  muted: boolean;
  /** Kontrol sedang memudar → tutup panelnya supaya tidak tertinggal terbuka. */
  hidden: boolean;
  onChange: (next: { volume: number; muted: boolean }) => void;
}) {
  const [open, setOpen] = useState(false);
  const silent = muted || volume === 0;
  const nilai = silent ? 0 : volume;

  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

  /** Geser volume sejauh `arah` langkah, dijepit di 0..1.
   *  Pembulatan 2 desimal mencegah 0.30000000000000004 muncul di layar. */
  const geser = (arah: 1 | -1) => {
    const baru = Math.min(1, Math.max(0, Math.round((nilai + arah * LANGKAH) * 100) / 100));
    // `muted` ikut dimatikan saat volume dinaikkan dari keadaan bisu — kalau
    // tidak, angka naik di layar tapi suaranya tetap diam, dan tak ada yang
    // memberi tahu kenapa.
    onChange({ volume: baru, muted: baru === 0 });
  };

  return (
    <div className="relative shrink-0">
      {/* 🪤 `pointer-events-auto` WAJIB. Panel bawah pemutar memasang
          `pointer-events-none` permanen di pembungkus terluarnya supaya ketukan
          di area kosong tetap tembus ke video; anak yang tidak menyalakannya
          sendiri jadi tombol yang terlihat normal tapi TIDAK BISA DIKLIK —
          nol error, dan satu-satunya gejalanya "kok tidak ngapa-ngapain". */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Volume"
        /* 36px, bukan 44px: ia duduk sebaris dengan garis geser yang tingginya
           24px, dan memaksakan 44px di sini menebalkan seluruh baris bawah. */
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] transition-transform hover:bg-white/10 active:scale-95"
      >
        {silent ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>

      {open && (
        <div
          /* `bottom-full` = berdiri tepat DI ATAS ikonnya; `right-0` (BUKAN
             `left-1/2 -translate-x-1/2`) karena tombol ini elemen paling kanan
             di barisnya — merapatkan panel ke tepi kanan tombol membuatnya
             mustahil meluber keluar layar di HP. */
          /* 🪤 LATAR PEKAT (bukan /85) + blur. Panel ini berdiri tepat di jalur
             rail ikon kanan — tak terhindarkan, keduanya menempel di sisi yang
             sama. Dengan latar tembus, tulisan "Simpan"/"Bagikan" di belakang
             menembus ke tengah tombol + dan −, dan hasilnya terbaca seperti
             tampilan rusak. Terlihat di potret layar 393px, TIDAK terlihat dari
             angka pengukuran mana pun. */
          className="pointer-events-auto absolute bottom-full right-0 z-10 mb-1 flex flex-col items-center gap-1 rounded-2xl bg-black/95 p-1 ring-1 ring-white/15 backdrop-blur-sm"
        >
          <TombolGeser
            label="Naikkan volume"
            onClick={() => geser(1)}
            nonaktif={nilai >= 1}
          >
            <Plus className="size-5" />
          </TombolGeser>

          {/* Angka ini yang memberi tahu ketukan tadi berhasil atau tidak.
              Tanpa umpan balik, menaikkan volume di HP (yang suaranya diatur
              tombol fisik) terasa seperti tombol mati. */}
          <span className="min-w-10 text-center text-[11px] font-semibold tabular-nums text-white">
            {silent ? "Bisu" : `${Math.round(nilai * 100)}%`}
          </span>

          <TombolGeser
            label="Turunkan volume"
            onClick={() => geser(-1)}
            nonaktif={nilai <= 0}
          >
            <Minus className="size-5" />
          </TombolGeser>
        </div>
      )}
    </div>
  );
}

/**
 * Satu tombol naik/turun. Dipisah supaya kedua tombol mustahil menyimpang
 * ukuran atau perilaku nonaktifnya.
 *
 * 40px — lebih besar dari ikon pemanggilnya (36px) karena inilah yang ditekan
 * berulang kali. Jangan dikecilkan: tombol yang ditekan beruntun adalah tempat
 * paling mahal untuk menghemat piksel.
 */
function TombolGeser({
  children,
  label,
  onClick,
  nonaktif,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  nonaktif: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={nonaktif}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/15 active:scale-95 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
