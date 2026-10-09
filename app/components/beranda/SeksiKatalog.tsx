import Link from "next/link";
import type { KartuKatalog } from "@/lib/beranda-video";
import CatalogCard from "./CatalogCard";
import KartuVideo from "./KartuVideo";
import { GRID_CLASS, SHELL } from "./shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * SATU seksi katalog di halaman depan: judul + keterangan + tombol SEMUA, lalu
 * GRID poster di bawahnya.
 *
 * Bentuk ini diminta owner 2026-10-09 ("buat sama persis seperti LK21"): di
 * situs pembanding, bagian sesudah hero bukan baris yang digeser ke samping
 * melainkan beberapa seksi bertumpuk yang masing-masing memamerkan banyak
 * poster sekaligus. Bedanya nyata bagi penonton — di baris geser, poster ke-8
 * dan seterusnya TIDAK TERLIHAT sampai seseorang menekan panah.
 *
 * Isinya `KartuKatalog`, BUKAN `Drama[]`: seksi "Film Terbaru" berisi video
 * Playly, sedangkan seksi tab berisi drama. Memakai bentuk campuran yang sudah
 * dipakai baris beranda (lib/beranda-video.ts) membuat keduanya dirender oleh
 * kartu yang SAMA — tak ada versi kedua yang bisa menyimpang diam-diam.
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
      className="scroll-mt-28 pb-6"
    >
      <div className={cn(SHELL, "flex items-end justify-between gap-3 pt-4")}>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-white terang:text-zinc-900 md:text-lg">
            {judul}
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-zinc-500 terang:text-zinc-600">
            {keterangan}
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="h-8 shrink-0 rounded-sm bg-gradient-to-r from-fuchsia-600 to-rose-600 px-4 text-[11px] font-bold uppercase tracking-wide text-white hover:from-fuchsia-500 hover:to-rose-500"
        >
          <Link href={hrefSemua}>Semua</Link>
        </Button>
      </div>

      <div className={cn(SHELL)}>
        <div className={GRID_CLASS}>
          {kartu.map((k) =>
            k.jenis === "drama" ? (
              <CatalogCard key={`d-${k.drama.id}`} drama={k.drama} />
            ) : (
              <KartuVideo key={`v-${k.video.id}`} video={k.video} />
            ),
          )}
        </div>
      </div>
    </section>
  );
}
