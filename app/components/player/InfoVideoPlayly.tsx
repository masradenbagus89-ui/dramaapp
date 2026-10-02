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
import ModalProviderPlayly from "./ModalProviderPlayly";
import { cn } from "@/lib/utils";
import type { DownloadProvider } from "@/lib/types";

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
   * Pilihan unduhan lewat provider luar untuk video INI (diisi admin di
   * /admin/videos/playly). Terisi = tombol DOWNLOAD membuka/menutup POPUP
   * pilihan provider yang mengambang di tengah layar.
   *
   * Default array kosong, BUKAN wajib: mayoritas video belum diisi providernya,
   * dan di keadaan itu tombolnya harus tetap berperilaku seperti sebelumnya.
   */
  providers?: DownloadProvider[];
  /**
   * Aksi tombol DOWNLOAD saat video ini BELUM punya provider.
   *
   * Jalur unduh langsung untuk video Playly memang tidak ada: berkasnya beda
   * domain dengan alamat bertanda tangan yang kedaluwarsa ~6 jam, sehingga
   * atribut `download` milik browser diabaikan (keputusan owner 2026-09-21,
   * lihat app/components/DownloadButton.tsx:44-47). Selama providernya belum
   * diisi, tombolnya mengaku belum siap — bukan diam-diam tidak melakukan apa
   * pun. Sengaja DIPERTAHANKAN, bukan dihapus: menghilangkan tombol untuk
   * video yang belum diisi = kemunduran yang tak ada yang minta.
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
  providers = [],
  onDownload,
  className,
}: InfoVideoPlaylyProps) {
  // Sengaja HANYA di memori halaman (useState), tidak ditulis ke mana pun.
  // lib/myList.ts yang sudah ada TIDAK dipakai: isinya dibaca halaman /my-list
  // sebagai daftar dramaId, jadi memasukkan videoId Playly ke sana melahirkan
  // baris yang dramanya tak pernah ketemu. Menyimpan permanen menunggu tempat
  // simpannya sendiri (permintaan owner 2026-09-25: cukup tanda di layar).
  const [tersimpan, setTersimpan] = useState(false);

  // TERTUTUP saat halaman pertama dibuka (permintaan owner): penonton datang
  // untuk MENONTON, jadi popup yang langsung terbuka cuma menutupi videonya
  // sebelum ada yang memintanya.
  const [popupTerbuka, setPopupTerbuka] = useState(false);

  const punyaProvider = providers.length > 0;

  const durasi = durationLabel && durationLabel !== DURASI_KOSONG ? durationLabel : null;
  const keterangan = [contentRating, quality, durasi].filter(
    (t): t is string => typeof t === "string" && t.trim() !== "",
  );
  const genres = pecahGenre(genre);

  return (
    // Fragment, BUKAN satu <section> pembungkus: popup provider harus jadi
    // saudara kotak ini, bukan anaknya. Kotak putih ini punya `shadow-sm` dan
    // dipasang di dalam pembungkus ber-`max-w-sm` di PlaylyVideoGrid — popup
    // `position: fixed` yang bersarang di situ berisiko terkurung stacking
    // context induknya lalu tergambar DI BELAKANG pemutar (jebakan yang sudah
    // tercatat di app/drama/[id]/page.tsx:219 soal `position: sticky`).
    <>
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
          {/* DUA PERILAKU, ditentukan ada-tidaknya provider — pola yang sama
              dengan DownloadButton.tsx di halaman detail drama:
              1. ADA provider  -> membuka/menutup popup pilihan provider.
              2. BELUM diisi   -> perilaku lama (mengaku belum siap). */}
          <Button
            type="button"
            onClick={
              punyaProvider
                ? () => setPopupTerbuka((t) => !t)
                : (onDownload ?? unduhBelumSiap)
            }
            // `aria-haspopup="dialog"` memberi tahu pembaca layar bahwa tombol
            // ini membuka jendela, bukan menyisipkan isi di halaman. `aria-controls`
            // DILEPAS: popupnya bukan lagi anak kotak ini, dan menunjuk id yang
            // hidup-mati berpindah tempat justru menyesatkan.
            aria-haspopup={punyaProvider ? "dialog" : undefined}
            aria-expanded={punyaProvider ? popupTerbuka : undefined}
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

      {/* DI LUAR kotak (alasannya di komentar fragment di atas). Popup sendiri
          yang memutuskan menggambar atau tidak lewat prop `open` — penjagaan
          `punyaProvider` tetap di sini supaya video tanpa provider tak pernah
          memasang penangkap tombol Escape yang tak ada gunanya. */}
      {punyaProvider && (
        <ModalProviderPlayly
          open={popupTerbuka}
          providers={providers}
          title={title}
          onClose={() => setPopupTerbuka(false)}
        />
      )}
    </>
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
 * Perilaku bawaan tombol DOWNLOAD untuk video yang providernya BELUM diisi
 * admin (/admin/videos/playly). Bukan sisa pekerjaan yang terlupa: selama tidak
 * ada satu pun alamat yang sah untuk video itu, mengaku belum tersedia lebih
 * jujur daripada membuka panel kosong.
 */
function unduhBelumSiap() {
  alert("Unduhan untuk video ini belum tersedia. Fiturnya sedang disiapkan.");
}
