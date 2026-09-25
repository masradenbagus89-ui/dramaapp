"use client";

// Kotak keterangan + aksi di bawah pemutar video Playly.
//
// KENAPA ADA: sebelum ini, di bawah player cuma ada satu baris teks abu-abu
// berisi nama kreator ("coklat") + durasi — tidak ada yang bisa DILAKUKAN
// penonton di situ. Kotak ini menggantikannya dengan keterangan yang terbaca
// plus tiga aksi (unduh, bagikan, simpan).
//
// SENGAJA SEMPIT (max-w-sm ≈ 384px), bukan selebar player: permintaan owner
// 2026-09-25. Di layar kecil `w-full` membuatnya mengikuti lebar layar, jadi
// tidak ada yang terpotong.
//
// SENGAJA BERLATAR PUTIH di tengah halaman yang gelap (permintaan owner
// 2026-09-25, sesudah ditawari pilihan "kotak saja" vs "seluruh halaman" —
// owner memilih kotak saja). Itulah sebabnya SELURUH warna di berkas ini
// dipilih untuk latar TERANG (`text-zinc-900`, `border-zinc-200`) dan sengaja
// tidak mengikuti pola gelap komponen tetangganya. Kalau suatu saat kotak ini
// dikembalikan ke tema gelap, warnanya harus diganti BERSAMA-SAMA — bukan
// sebagian; teks gelap di atas latar gelap hilang tanpa error apa pun.
//
// ATURAN ISI — tiap keterangan yang datanya KOSONG tidak digambar sama sekali.
// Ini bukan kemalasan, melainkan aturan yang sama dengan lencana poster
// (lib/types.ts:214-221): menuliskan "HD" atau "17+" yang tidak berasal dari
// data = menjanjikan sesuatu yang belum pernah dinilai siapa pun. Per
// 2026-09-25, NOL dari 46 video Playly dikaitkan admin ke drama, jadi dalam
// praktiknya kotak ini memang baru berisi judul + durasi + tombol. Itu keadaan
// DATA, bukan kerusakan kode — barisnya terisi sendiri begitu admin mengaitkan
// video ke drama lewat /admin/videos/playly.
import { useState } from "react";
import { Bookmark, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareButton from "@/app/components/ShareButton";
import { cn } from "@/lib/utils";

/**
 * Genre yang dipajang paling banyak segini. Kotaknya sempit, dan daftar OMDb
 * bisa berisi 5-6 genre — dibiarkan penuh, chip-nya turun 3 baris dan justru
 * mendorong tombol keluar dari pandangan.
 */
const GENRE_MAKS = 4;

/** Nilai durasi dari Playly saat panjang videonya tidak diketahui. */
const DURASI_KOSONG = "-";

export type InfoVideoPlaylyProps = {
  title: string;
  /** Rating usia ("PG-13"); null = tidak ikut digambar. */
  contentRating?: string | null;
  /** Mutu sumber ("BluRay", "WEB-DL"); null = tidak digambar, JANGAN ditebak. */
  quality?: string | null;
  /** Durasi siap tampil ("18:08"). "-" diperlakukan sama dengan kosong. */
  durationLabel?: string | null;
  /** Genre mentah dari katalog, mis. "Action, Sci-Fi". */
  genre?: string | null;
  /**
   * Aksi tombol DOWNLOAD. Belum dikirim siapa pun — jalur unduh untuk video
   * Playly memang BELUM ADA, dan itu keputusan sadar: berkasnya beda domain
   * dengan alamat bertanda tangan yang kedaluwarsa ~6 jam, sehingga atribut
   * `download` milik browser diabaikan (keputusan owner 2026-09-21, lihat
   * app/components/DownloadButton.tsx:44-47). Sampai jalurnya dibangun,
   * tombolnya mengaku belum siap, bukan diam-diam tidak melakukan apa pun.
   */
  onDownload?: () => void;
  className?: string;
};

export default function InfoVideoPlayly({
  title,
  contentRating,
  quality,
  durationLabel,
  genre,
  onDownload,
  className,
}: InfoVideoPlaylyProps) {
  // Sengaja HANYA di memori halaman (useState), tidak ditulis ke mana pun.
  // lib/myList.ts yang sudah ada TIDAK dipakai: isinya dibaca halaman /my-list
  // sebagai daftar dramaId, jadi memasukkan videoId Playly ke sana melahirkan
  // baris yang dramanya tak pernah ketemu. Menyimpan permanen menunggu tempat
  // simpannya sendiri (permintaan owner 2026-09-25: cukup tanda di layar).
  const [tersimpan, setTersimpan] = useState(false);

  const durasi = durationLabel && durationLabel !== DURASI_KOSONG ? durationLabel : null;
  const keterangan = [contentRating, quality, durasi].filter(
    (t): t is string => typeof t === "string" && t.trim() !== "",
  );
  const genres = pecahGenre(genre);

  return (
    <section
      className={cn(
        "w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm",
        className,
      )}
    >
      <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900">{title}</h3>

      {keterangan.length > 0 && (
        // Satu baris mengalir dipisah garis tegak ("17+ | BluRay | 1h 39m"),
        // bentuk yang dipilih owner 2026-09-25. Pemisahnya dibuat lebih pucat
        // dari teksnya supaya yang dibaca duluan isinya, bukan garisnya.
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-zinc-600">
          {keterangan.map((teks, i) => (
            <span key={teks} className="flex items-center gap-x-1.5">
              {i > 0 && (
                <span className="text-zinc-300" aria-hidden="true">
                  |
                </span>
              )}
              {teks}
            </span>
          ))}
        </p>
      )}

      {genres.length > 0 && (
        // Warnanya seragam merah muda, BUKAN warna per-genre seperti kartu
        // katalog: peta warna di lib/genre-accent.ts seluruhnya dirancang untuk
        // latar GELAP (`bg-*-950`), dan dipakai di kotak putih ini hasilnya chip
        // gelap yang tidak menyatu. Seragam juga yang diminta owner (contoh
        // gambar 2026-09-25), dan senada dengan tombol DOWNLOAD.
        <ul className="mt-2 flex flex-wrap items-center gap-1.5">
          {genres.map((g) => (
            <li
              key={g}
              className="rounded-md bg-pink-50 px-2 py-0.5 text-[11px] font-medium text-pink-600"
            >
              {g}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={onDownload ?? unduhBelumSiap}
          className="h-9 rounded-full bg-pink-600 px-4 text-xs font-bold tracking-wide text-white hover:bg-pink-500"
        >
          <Download className="size-4" />
          DOWNLOAD
        </Button>

        {/* Kedua tombol sekunder menimpa warna bawaan ShareButton, yang memang
            dibuat untuk latar gelap. Aman ditimpa: `cn()` memakai tailwind-merge,
            jadi kelas yang bertabrakan (bg/border/text) diambil yang terakhir. */}
        <ShareButton
          title={title}
          className="h-8 w-auto rounded-full border-zinc-300 bg-white px-3 py-0 text-xs font-semibold text-zinc-700 hover:border-pink-400 hover:text-pink-600"
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => setTersimpan((t) => !t)}
          aria-pressed={tersimpan}
          className={cn(
            "h-8 w-auto rounded-full border border-zinc-300 bg-white px-3 py-0 text-xs font-semibold transition-colors",
            tersimpan
              ? "border-pink-400 text-pink-600"
              : "text-zinc-700 hover:border-pink-400 hover:text-pink-600",
          )}
        >
          <Bookmark className="size-4" fill={tersimpan ? "currentColor" : "none"} />
          {tersimpan ? "Tersimpan" : "Simpan"}
        </Button>
      </div>
    </section>
  );
}

/**
 * "Action, Sci-Fi" -> ["Action", "Sci-Fi"].
 *
 * Dipisah jadi fungsi tersendiri supaya bisa diuji langsung: sumbernya teks
 * bebas dari OMDb, yang kadang datang dengan spasi ganda atau koma menggantung
 * di ujung — keduanya menghasilkan chip kosong kalau tidak disaring.
 */
export function pecahGenre(genre: string | null | undefined): string[] {
  if (!genre) return [];
  return genre
    .split(",")
    .map((g) => g.trim())
    .filter((g) => g !== "")
    .slice(0, GENRE_MAKS);
}

/**
 * Perilaku bawaan tombol DOWNLOAD selama jalur unduhnya belum dibangun.
 * TODO(unduh-playly): ganti dengan pilihan sumber/kualitas sungguhan.
 */
function unduhBelumSiap() {
  alert("Unduhan untuk video ini belum tersedia. Fiturnya sedang disiapkan.");
}
