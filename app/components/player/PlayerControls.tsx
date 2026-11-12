"use client";

import { fmtTime } from "@/lib/format";
import { LayoutGrid, ChevronRight } from "lucide-react";
import VolumeControl from "./VolumeControl";

// Panel bawah pemutar feed: judul + episode + subtitle + garis geser + timer.
// Tombol putar ada di TENGAH video & gerigi di kanan atas (FeedPlayer) —
// panel ini sengaja hanya menampilkan waktu (permintaan 2026-11-07).
export default function PlayerControls({
  title,
  currentEp,
  episodes,
  isMovie = false,
  cueText,
  lockedActive,
  controlsVisible,
  curTime,
  dur,
  seekBarRef,
  onSeekDown,
  onSeekMove,
  onSeekUp,
  onOpenEpisodes,
  sound,
}: {
  title: string;
  currentEp: number;
  episodes: number;
  /** Film = 1 video utuh: semua tombol berbau episode disembunyikan. */
  isMovie?: boolean;
  cueText: string;
  lockedActive: boolean;
  controlsVisible: boolean;
  curTime: number;
  dur: number;
  seekBarRef: React.RefObject<HTMLDivElement | null>;
  onSeekDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onSeekMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onSeekUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onOpenEpisodes: () => void;
  /**
   * Ada = tombol volume digambar DI SAMPING angka durasi (owner 2026-11-12).
   * Tidak ada = tanpa tombol volume, pemanggil lama tetap aman.
   *
   * ⚠️ Sampai 2026-11-11 tombol ini milik ActionRail (rail ikon kanan). Kalau
   * suatu saat dipasang kembali di sana, BUANG yang di sini — dua tombol
   * volume di satu layar membuat penonton mengira keduanya mengatur hal yang
   * berbeda. Penjaganya: tests/action-rail-tampil.test.ts.
   */
  sound?: {
    volume: number;
    muted: boolean;
    onChange: (next: { volume: number; muted: boolean }) => void;
  };
}) {
  /* `pb-6` di HP (bukan `pb-7`): 4px terakhir yang ikut menurunkan seluruh isi
     panel. JANGAN turun lagi di bawah ini — garis geser kini baris paling
     bawah, dan di HP tepi bawah layar milik gesture "kembali" sistem;
     merapatkannya lagi membuat jari yang menggeser video sesekali menarik
     gesture sistem. */
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col bg-gradient-to-t from-black/85 via-black/35 to-transparent pb-6 pt-10 sm:pb-7">
      {/* JUDUL + "Eps n / N" — ikut memudar bersama kontrol.
          Keputusan owner 2026-11-02 (putaran ketiga), dipilih dari tiga opsi.

          KENAPA: banyak video di katalog ini punya terjemahan yang **terbakar
          ke dalam gambarnya** (hardsub) — teks yang bukan milik aplikasi dan
          posisinya mustahil digeser. Ia selalu mendarat persis di area panel
          ini. Menurunkan judul sudah mentok di rilis-rilis sebelumnya
          (`3d57145`), jadi satu-satunya cara memberi hardsub ruang yang benar
          adalah MENGOSONGKAN area itu saat film berjalan.

          Judul TIDAK hilang saat penonton menjeda, membuka menu, atau saat
          episode terkunci — `controlsVisible` dipaksa true di semua keadaan itu
          (FeedPlayer.tsx:541). Jadi ia hanya menyingkir ketika film benar-benar
          berjalan dan layar tidak disentuh; satu sentuhan memunculkannya lagi.

          `opacity-0` saja TIDAK cukup: elemen yang tak terlihat tapi masih bisa
          ditekan membuat penonton yang mengetuk layar untuk memunculkan kontrol
          justru membuka daftar episode. Karena itu tombol di dalamnya ikut
          dimatikan — lihat `pointer-events` pada tombol Eps di bawah. */}
      <div
        className={`px-3 pr-20 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <h1 className="line-clamp-2 text-[13px] font-semibold leading-tight text-white/95 drop-shadow-md">
          {title}
        </h1>
        {/* Tombol "Eps n / N" DIPINDAH ke bawah garis geser (owner 2026-11-12:
            "episode pindahkan ke bawah"). Yang tertinggal di sini cuma
            penanda FILM — ia keterangan, bukan tombol, jadi tempatnya memang
            menempel pada judul. */}
        {isMovie && (
          <p className="mt-1 text-[11px] font-medium text-white/70">Film</p>
        )}
      </div>

      {/* SUBTITLE (teks terjemahan).

          Jaraknya dari blok judul dilebarkan di HP (owner 2026-11-02: *"posisi
          tulisannya agak di tengah, buat turun sedikit"*). Teks "Eps 1 / 43" di
          atasnya duduk di tengah tombol setinggi 44px (`min-h-11`, target
          sentuh — jangan dikecilkan), jadi dengan `mt-2` subtitle berhenti
          hanya ±20px di bawahnya dan terbaca menyatu dengan blok judul, bukan
          sebagai terjemahan film.

          ⚠️ SUBTITLE TIDAK BOLEH DIPINDAH KE DALAM BLOK KONTROL di bawah demi
          menurunkannya lebih jauh. Blok itu memudar jadi `opacity-0` saat
          kontrol disembunyikan, dan subtitle akan ikut lenyap padahal filmnya
          masih berjalan — hilang tanpa satu pun error. Karena itu seberapa
          rendah subtitle bisa turun dibatasi oleh tinggi blok kontrol
          (seek bar + baris tombol + baris waktu), dan sisa ruangnya dipanen
          lewat dua `mt`/`mb` di bawah, bukan dengan memindahkannya.

          Semua penyesuaian berawalan HP-dulu + `sm:` kembali ke nilai semula:
          layar lebar punya ruang berlebih dan tidak pernah dikeluhkan. */}
      {cueText && (
        <div className="mt-6 flex justify-center px-3 pr-20 sm:mt-2">
          {/* ⚠️ `inline-block` WAJIB — jangan dilepas.

              `<span>` tanpa ini adalah elemen INLINE, dan pada elemen inline
              padding atas-bawah TIDAK menambah tinggi baris: kotak latarnya
              meluber keluar menimpa apa pun di atas & di bawahnya. Subtitle
              dua baris karena itu menghasilkan dua kotak latar yang saling
              tumpang tindih DAN menimpa judul di atasnya — persis keluhan
              owner 2026-11-02: *"ada tulisannya bertumpuk, buat rapi dan bisa
              terbaca."* Dengan `inline-block` padding memakan ruang yang
              sebenarnya, jadi berapa baris pun subtitle tetap satu kotak rapi.

              `leading-relaxed` (bukan `leading-snug`): jarak antar baris di
              dalam kotak harus lebih lega daripada tinggi hurufnya, kalau
              tidak baris kedua terasa menempel ke baris pertama.

              `bg-black/75` (bukan `/60`): subtitle duduk di atas gambar film
              yang warnanya tak bisa ditebak. Latar yang terlalu tipis membuat
              huruf putih hilang di adegan terang. */}
          <span className="inline-block whitespace-pre-line rounded bg-black/75 px-2 py-1 text-center text-[13px] font-medium leading-relaxed text-white sm:text-sm">
            {cueText}
          </span>
        </div>
      )}

      {!lockedActive && (
        <div
          /* `mt-0` di HP (bukan `mt-3`): 12px yang dilepas di sini ikut
             menurunkan SEMUA yang ada di atasnya — blok judul dan subtitle.
             Lihat catatan di blok subtitle: inilah ruang yang bisa dipanen
             tanpa memindahkan apa pun ke dalam blok yang memudar ini. */
          className={`mt-0 px-3 transition-opacity duration-300 sm:mt-3 ${
            controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
        {/* SATU BARIS: garis geser + angka durasi di sampingnya.

            Angka durasi dulu punya barisnya sendiri DI BAWAH tombol, dan baris
            itu memakan ~18px yang mendorong seluruh blok judul ke atas (owner
            2026-11-02, putaran kedua: *"tulisannya masih agak ke atas"*).
            Dipindah ke samping garis geser, tingginya menumpang baris yang
            sudah ada — ruangnya kembali TANPA penonton kehilangan angkanya.

            ⚠️ `seekBarRef` WAJIB tetap menempel pada kotak garis gesernya,
            BUKAN pada pembungkus baris ini. Posisi lompatan video dihitung dari
            `getBoundingClientRect()` elemen ber-ref (FeedPlayer.tsx:577): kalau
            ref naik ke pembungkus, lebarnya ikut menghitung angka durasi, dan
            setiap ketukan mendarat di detik yang salah — makin ke kanan makin
            meleset, tanpa error apa pun. */}
        <div className="mb-2 flex items-center gap-2 sm:mb-3">
        <div
          ref={seekBarRef}
          onPointerDown={onSeekDown}
          onPointerMove={onSeekMove}
          onPointerUp={onSeekUp}
          onPointerCancel={onSeekUp}
          role="slider"
          aria-label="Posisi video"
          aria-valuenow={Math.round(curTime)}
          /* `h-6` = area sentuh garis geser. Sudah di bawah ambang target
             sentuh 44px dan sengaja dibiarkan (garis tipis khas pemutar) —
             JANGAN dikecilkan lagi demi memanen piksel. */
          className="pointer-events-auto flex h-6 flex-1 cursor-pointer touch-none select-none items-center"
        >
          <div className="relative h-1.5 w-full rounded-full bg-white/25">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-amber-400"
              style={{ width: dur ? `${(curTime / dur) * 100}%` : "0%" }}
            />
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 shadow"
              style={{ left: dur ? `${(curTime / dur) * 100}%` : "0%" }}
            />
          </div>
        </div>
          {/* Satu-satunya angka waktu di pemutar — tampil di semua ukuran layar. */}
          <span className="shrink-0 text-[11px] tabular-nums text-white/80">
            {fmtTime(curTime)} / {fmtTime(dur)}
          </span>

          {/* VOLUME — tepat di samping angka durasi (owner 2026-11-12).
              Pindahan dari rail ikon kanan; garis pengaturnya naik ke ATAS
              supaya tidak menimpa angka durasi & garis geser di baris ini. */}
          {sound && (
            <VolumeControl
              volume={sound.volume}
              muted={sound.muted}
              hidden={!controlsVisible}
              onChange={sound.onChange}
            />
          )}
        </div>

        {/* "Eps n / N" — BARIS PALING BAWAH (owner 2026-11-12: "episode
            pindahkan ke bawah"). Sebelumnya menempel di bawah judul.

            ⚠️ `pointer-events` WAJIB ikut `controlsVisible`, tidak boleh
            `pointer-events-auto` permanen. `pointer-events-none` di induk yang
            memudar TIDAK mematikan anak yang menyalakannya sendiri — tombol
            ini akan tetap bisa ditekan walau tak terlihat, sehingga ketukan
            untuk memunculkan kontrol malah membuka daftar episode. */}
        {!isMovie && (
          <button
            onClick={onOpenEpisodes}
            className={`flex min-h-11 items-center gap-1 text-[11px] font-medium text-white/70 active:text-white ${
              controlsVisible ? "pointer-events-auto" : "pointer-events-none"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Eps {currentEp} / {episodes}
            <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
          </button>
        )}
        </div>
      )}
    </div>
  );
}
