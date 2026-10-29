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
import Link from "next/link";
import { Bookmark, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareButton from "@/app/components/ShareButton";
import ModalProviderPlayly from "./ModalProviderPlayly";
import { cn } from "@/lib/utils";
import type { LinkUnduhanPublik } from "@/lib/playly-unduhan";

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
   * Link unduhan video INI per provider × kualitas (lib/playly-unduhan.ts).
   * Tombol DOWNLOAD SELALU membuka popup: ada link -> tabel provider; belum
   * ada -> popup menyebut "Link unduhan belum tersedia" (permintaan owner
   * 2026-10-05, menggantikan kotak peringatan browser yang dulu dipakai).
   */
  linkUnduhan?: LinkUnduhanPublik[];
  /**
   * Alamat halaman tonton video ini. Diisi HANYA saat kotak ini dipakai di
   * halaman DAFTAR — di halaman tonton itu sendiri tombolnya tak digambar,
   * karena menunjuk ke halaman yang sedang dibuka cuma membingungkan.
   *
   * Dipakai sejak 2026-10-08: sinopsis, pemain, dan sutradara tidak muat di
   * kotak sempit ini (lebarnya pilihan owner), jadi isi lengkapnya tinggal di
   * halaman tonton — dan sebelum ini TIDAK ADA satu pun tautan ke sana dari
   * daftar, sehingga penonton praktis tak pernah sampai.
   */
  detailHref?: string | null;
  className?: string;
  /**
   * Bentuk tata letaknya.
   *
   *   "kartu"   (bawaan) — kotak putih berbingkai selebar `max-w-sm`. Bentuk
   *                        yang dipakai grid daftar film, tempat kotak ini
   *                        berdiri sendiri di samping poster.
   *   "halaman"          — mengalir tanpa bingkai, selebar kolom isinya.
   *
   * Dibuat prop, BUKAN mengubah satu-satunya bentuk, karena kotak ini dipakai
   * DUA tempat: `PlaylyVideoGrid` (butuh kartu) dan halaman `/tonton/[id]`
   * (butuh mengalir). Owner 2026-10-29: di halaman detail bentuk kartu terasa
   * *"kaku"* — ia kotak sempit berbingkai yang terjepit di tengah kolom lebar,
   * dan judulnya mengulang judul halaman tepat di atasnya.
   */
  tataLetak?: "kartu" | "halaman";
};

export default function InfoVideoPlayly({
  title,
  contentRating,
  quality,
  durationLabel,
  genre,
  linkUnduhan = [],
  detailHref,
  className,
  tataLetak = "kartu",
}: InfoVideoPlaylyProps) {
  const halaman = tataLetak === "halaman";
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
          "w-full",
          halaman
            ? // Mengalir: tanpa bingkai, tanpa batas lebar, tanpa jarak dalam.
              // Kotak sempit berbingkai di tengah kolom lebar itulah yang
              // membuat blok ini terasa "kaku" — ia terbaca seperti potongan
              // yang tertinggal dari halaman lain.
              ""
            : "max-w-sm rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm",
          className,
        )}
      >
        {/* Judul SENGAJA tidak digambar di mode halaman: <h1> halaman tepat di
            atasnya sudah memuat judul yang sama persis, dan judul kembar
            berturut-turut adalah salah satu hal yang paling cepat membuat
            sebuah halaman terasa belum dirapikan. Ini membuang DUPLIKAT, bukan
            membuang informasi. */}
        {!halaman && (
          <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900">
            {title}
          </h3>
        )}

        {keterangan.length > 0 && (
          // Satu baris mengalir dipisah garis tegak ("17+ | BluRay | 1h 39m"),
          // bentuk yang dipilih owner 2026-09-25. Pemisahnya dibuat lebih pucat
          // dari teksnya supaya yang dibaca duluan isinya, bukan garisnya.
          <p
            className={cn(
              "flex flex-wrap items-center gap-x-2 font-medium text-zinc-600",
              halaman ? "mt-0 text-sm" : "mt-1.5 text-xs",
            )}
          >
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
          <ul
            className={cn(
              "flex flex-wrap items-center gap-1.5",
              halaman ? "mt-2.5" : "mt-2",
            )}
          >
            {genres.map((g) => (
              <li
                key={g}
                className={cn(
                  "rounded-md bg-pink-50 font-medium text-pink-600",
                  halaman ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]",
                )}
              >
                {g}
              </li>
            ))}
          </ul>
        )}

        {/* Deretan tombol. Di mode halaman ketiganya disamakan tingginya dan
            diberi jarak sedikit lebih lega — di contoh yang owner tunjuk,
            DOWNLOAD/Share/Save berdiri sejajar sebagai satu baris aksi, bukan
            satu tombol besar diikuti dua tombol kecil yang tingginya beda. */}
        <div
          className={cn(
            "flex flex-wrap items-center gap-2",
            halaman ? "mt-4" : "mt-3",
          )}
        >
          {/* SATU perilaku untuk semua video: membuka/menutup popup. Isinya
              yang berbeda — tabel provider, atau "Link unduhan belum tersedia"
              (popup memutuskannya sendiri dari `links`). */}
          <Button
            type="button"
            onClick={() => setPopupTerbuka((t) => !t)}
            // `aria-haspopup="dialog"` memberi tahu pembaca layar bahwa tombol
            // ini membuka jendela, bukan menyisipkan isi di halaman. `aria-controls`
            // DILEPAS: popupnya bukan anak kotak ini, dan menunjuk id yang
            // hidup-mati berpindah tempat justru menyesatkan.
            aria-haspopup="dialog"
            aria-expanded={popupTerbuka}
            className={cn(
              "rounded-full bg-pink-600 font-bold tracking-wide text-white hover:bg-pink-500",
              halaman ? "h-10 px-5 text-sm" : "h-9 px-4 text-xs",
            )}
          >
            <Download className="size-4" />
            DOWNLOAD
          </Button>

          {/* Kedua tombol sekunder menimpa warna bawaan ShareButton, yang memang
              dibuat untuk latar gelap. Aman ditimpa: `cn()` memakai tailwind-merge,
              jadi kelas yang bertabrakan (bg/border/text) diambil yang terakhir. */}
          <ShareButton
            title={title}
            className={cn(
              "w-auto rounded-full border-zinc-300 bg-white py-0 font-semibold text-zinc-700 hover:border-pink-400 hover:text-pink-600",
              halaman ? "h-10 px-4 text-sm" : "h-8 px-3 text-xs",
            )}
          />

          <Button
            type="button"
            variant="outline"
            onClick={() => setTersimpan((t) => !t)}
            aria-pressed={tersimpan}
            className={cn(
              "w-auto rounded-full border border-zinc-300 bg-white py-0 font-semibold transition-colors",
              halaman ? "h-10 px-4 text-sm" : "h-8 px-3 text-xs",
              tersimpan
                ? "border-pink-400 text-pink-600"
                : "text-zinc-700 hover:border-pink-400 hover:text-pink-600",
            )}
          >
            <Bookmark className="size-4" fill={tersimpan ? "currentColor" : "none"} />
            {tersimpan ? "Tersimpan" : "Simpan"}
          </Button>
        </div>

        {detailHref && (
          // Baris sendiri di bawah tombol, bukan tombol keempat yang berdesakan:
          // tiga tombol di atas adalah AKSI pada video ini, sedangkan ini
          // perpindahan halaman — beda jenis, jadi tidak disejajarkan.
          <Link
            href={detailHref}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-pink-600 underline-offset-2 hover:underline"
          >
            Detail film
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </section>

      {/* DI LUAR kotak (alasannya di komentar fragment di atas). Popup sendiri
          yang memutuskan menggambar atau tidak lewat prop `open`. */}
      <ModalProviderPlayly
        open={popupTerbuka}
        links={linkUnduhan}
        title={title}
        onClose={() => setPopupTerbuka(false)}
      />
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
