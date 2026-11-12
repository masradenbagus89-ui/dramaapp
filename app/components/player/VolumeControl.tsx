"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

// Tombol volume pemutar drama — duduk SEBARIS dengan angka durasi di panel
// bawah, dan garis pengaturnya muncul TEGAK KE ATAS saat ikonnya diketuk
// (owner 2026-11-12: "volume pindahkan ke samping durasi dan ketika di klik
// volumenya ke atas").
//
// ⚠️ PINDAH DARI RAIL KANAN. Sampai 2026-11-11 tombol ini berdiri di rail ikon
// kanan (ActionRail) dengan garis pengatur yang membuka ke KIRI. Jangan
// dipasang kembali di sana tanpa membuang yang di panel bawah: dua tombol
// volume di satu layar membuat penonton mengira keduanya mengatur hal yang
// berbeda.
//
// KENAPA GARISNYA TEGAK, bukan mendatar seperti versi rail: di panel bawah,
// garis mendatar akan membentang menimpa angka durasi dan garis geser video —
// dua kontrol yang justru paling sering dipakai. Ke atas, ia berdiri di ruang
// kosong di atas panel.
//
// Catatan lama yang masih berlaku: Safari iPhone mengabaikan `video.volume`
// (hanya tombol fisik HP yang bisa), jadi di sana yang efektif cuma bisu/tidak
// — geser ke 0 = bisu.
export default function VolumeControl({
  volume,
  muted,
  hidden,
  onChange,
}: {
  volume: number;
  muted: boolean;
  /** Kontrol sedang memudar → tutup garisnya supaya tidak tertinggal terbuka. */
  hidden: boolean;
  onChange: (next: { volume: number; muted: boolean }) => void;
}) {
  const [open, setOpen] = useState(false);
  const silent = muted || volume === 0;

  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

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
           24px, dan memaksakan 44px di sini menebalkan seluruh baris bawah.
           Preseden yang sama sudah dipakai garis gesernya sendiri. */
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] transition-transform hover:bg-white/10 active:scale-95"
      >
        {silent ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>

      {open && (
        <div
          /* `bottom-full` = berdiri tepat DI ATAS ikonnya; `left-1/2` +
             `-translate-x-1/2` membuatnya segaris tengah dengan ikon, jadi
             posisinya tetap benar walau ikonnya bergeser saat angka durasi
             berubah lebar (mis. "9:59" jadi "1:00:01"). */
          className="pointer-events-auto absolute bottom-full left-1/2 z-10 mb-1 flex -translate-x-1/2 flex-col items-center gap-1 rounded-2xl bg-black/85 px-1 py-2 ring-1 ring-white/10"
        >
          <span className="text-[10px] font-medium tabular-nums text-white/80">
            {silent ? "Bisu" : `${Math.round(volume * 100)}%`}
          </span>

          {/* 🪤 GARIS TEGAK DIBUAT DENGAN `-rotate-90`, dan pembungkus
              berukuran TETAP ini wajib ada. Elemen yang diputar tetap memakan
              ruang kotak ASLINYA (96px × 4px), jadi tanpa pembungkus
              ber-tinggi-tetap panelnya menyusut jadi setipis garis dan
              slidernya meluber keluar kotak hitam.

              Dipakai `-rotate-90`, bukan `appearance: slider-vertical`: yang
              terakhir sudah tidak didukung browser modern dan gagal DIAM —
              slidernya cuma kembali mendatar tanpa satu pun error. */}
          <div className="grid h-24 w-6 place-items-center">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={silent ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange({ volume: v, muted: v === 0 });
              }}
              aria-label="Atur volume"
              className="w-24 -rotate-90 cursor-pointer accent-amber-400"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              onChange({ volume: volume === 0 ? 1 : volume, muted: !silent })
            }
            aria-label={silent ? "Nyalakan suara" : "Bisukan"}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white hover:bg-white/10"
          >
            {silent ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
