import Link from "next/link";
import type { KartuKatalog } from "@/lib/beranda-video";
import BarisGeser from "./BarisGeser";
import { SHELL, TOMBOL_UTAMA } from "./shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * SATU seksi katalog di halaman depan: judul + tombol "Semua" sejajar di satu
 * baris, lalu SATU baris poster yang digeser ke samping.
 *
 * Owner 2026-11-17: jangan dua baris. Tetap satu baris, panah di kanan
 * (dan kiri untuk kembali) supaya film dan dramanya bisa digeser.
 * Tombol "Semua" tetap sejajar judul.
 *
 * Isinya `KartuKatalog`, BUKAN `Drama[]`: seksi "Film Terbaru" berisi video
 * sedangkan seksi tab berisi drama. Memakai bentuk campuran yang sudah dipakai
 * baris beranda (lib/beranda-video.ts) membuat keduanya dirender oleh kartu
 * yang SAMA — tak ada versi kedua yang bisa menyimpang diam-diam.
 */
export default function SeksiKatalog({
  judul,
  keterangan,
  kartu,
  hrefSemua,
  /** Sasaran lompatan sekaligus penanda yang dipatok tes. */
  idSeksi,
}: {
  judul: string;
  keterangan: string;
  kartu: KartuKatalog[];
  hrefSemua: string;
  idSeksi: string;
}) {
  // Seksi kosong TIDAK digambar: judul tanpa poster di bawahnya terbaca seperti
  // bagian yang gagal dimuat, bukan kategori yang memang masih sepi. Ini juga
  // yang menjaga halaman depan tetap rapi saat sumber video luar sedang mati.
  if (kartu.length === 0) return null;

  return (
    <section
      id={idSeksi}
      aria-label={judul}
      /* scroll-mt menahan judul dari balik bar cari yang menempel di atas —
         tanpa ini lompatan mendarat tepat di bawah bar dan judulnya tertutup. */
      className="scroll-mt-28 pb-2"
    >
      {/* ===== Kepala seksi: judul di kiri, tombol "Semua" SEJAJAR di kanan
             (owner 2026-10-10, putaran keempat). Tombol sempat dipindah ke
             bawah barisan mencontoh situs pembanding; owner mengembalikannya
             ke sini. Sejajar judul juga berarti tombolnya tidak lagi terseret
             jauh ke bawah saat barisan posternya panjang. ===== */}
      <div className={cn(SHELL, "flex items-end justify-between gap-3 pt-4")}>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-extrabold uppercase tracking-wide text-white terang:text-zinc-900 md:text-base">
            {judul}
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-zinc-500 terang:text-zinc-600">
            {keterangan}
          </p>
        </div>
        <Button
          asChild
          /* min-h-11 (~44px) hanya di HP: batas target sentuh yang masih
             nyaman ditekan jari (skills/a11y). Di layar lebar dirapatkan ke
             36px supaya tingginya pas dengan baris judul di sebelahnya.

             ⚠️ Sempat ditelanjangi jadi tautan teks "Lihat Semua ›" khusus HP
             pada 2026-11-21; dikembalikan pada hari yang sama atas permintaan
             owner (*"cuma bagian atas yang diubah, sisanya kembalikan ke
             dramaku"*). Bentuk tombol gradasi ini berlaku di semua layar. */
          className={cn(
            TOMBOL_UTAMA,
            "min-h-11 shrink-0 rounded-sm px-6 text-[11px] font-bold uppercase tracking-wide shadow-md md:min-h-9",
          )}
        >
          <Link href={hrefSemua}>Semua</Link>
        </Button>
      </div>

      <div className={cn(SHELL, "mt-3")}>
        <BarisGeser kartu={kartu} panahSelalu />
      </div>
    </section>
  );
}
