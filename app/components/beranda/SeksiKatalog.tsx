import Link from "next/link";
import type { KartuKatalog } from "@/lib/beranda-video";
import BarisGeser from "./BarisGeser";
import { SHELL } from "./shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * SATU seksi katalog di halaman depan: judul + tombol "Semua" sejajar di satu
 * baris, lalu SATU BARIS poster yang bisa digeser ke kiri/kanan lewat panah di
 * kedua ujungnya.
 *
 * ⚠️ BENTUKNYA SUDAH BERGANTI EMPAT KALI dalam dua hari — baca ini sebelum
 * mengubahnya lagi, supaya tidak memutar balik ke bentuk yang sudah ditolak:
 *   - 2026-10-09 baris geser diganti GRID bertumpuk (owner: "sama persis
 *     seperti LK21"), supaya poster ke-8 dan seterusnya ikut terlihat.
 *   - 2026-10-10 pagi grid itu dipotong jadi satu baris penuh: jumlah kolomnya
 *     mengikuti lebar layar sedangkan isinya tetap 20, jadi baris terakhir
 *     selalu tersisa separuh (17 poster lalu 3) dan owner membacanya sebagai
 *     "tidak rapi".
 *   - 2026-10-10 sore owner meminta panah geser di ujungnya. Itu MENGEMBALIKAN
 *     bentuk baris geser — dan sekaligus menutup utang teknis potongan tadi:
 *     poster yang tidak muat dulu tetap ada di HTML dan masih bisa dijangkau
 *     tombol Tab walau tak terlihat. Sekarang tidak ada lagi yang disembunyikan.
 *   - 2026-10-10 sore (lagi) tombol "Semua" dikembalikan SEJAJAR judul. Ia
 *     sempat turun ke bawah barisan mencontoh situs pembanding; dengan baris
 *     yang bisa digeser, tombol di bawah justru terseret jauh dari judulnya.
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
      className="scroll-mt-28 pb-6"
    >
      {/* ===== Kepala seksi: judul di kiri, tombol "Semua" SEJAJAR di kanan
             (owner 2026-10-10, putaran keempat). Tombol sempat dipindah ke
             bawah barisan mencontoh situs pembanding; owner mengembalikannya
             ke sini. Sejajar judul juga berarti tombolnya tidak lagi terseret
             jauh ke bawah saat barisan posternya panjang. ===== */}
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
          /* min-h-11 (~44px) hanya di HP: batas target sentuh yang masih
             nyaman ditekan jari (skills/a11y). Di layar lebar dirapatkan ke
             36px supaya tingginya pas dengan baris judul di sebelahnya. */
          className="min-h-11 shrink-0 rounded-sm bg-gradient-to-r from-fuchsia-600 to-rose-600 px-6 text-[11px] font-bold uppercase tracking-wide text-white shadow-md hover:from-fuchsia-500 hover:to-rose-500 md:min-h-9"
        >
          <Link href={hrefSemua}>Semua</Link>
        </Button>
      </div>

      {/* `panahSelalu` (owner 2026-10-10: "diujung kasih tanda panah agar bisa
          geser ke kanan/kiri"): di seksi yang padat poster, panah yang baru
          muncul saat kursor lewat sama saja dengan tidak ada — penonton tidak
          punya petunjuk bahwa masih ada judul di sebelah kanan. Baris unggulan
          di puncak halaman tetap memakai panah yang muncul saat hover, supaya
          poster besarnya tidak tertutup begitu halaman dibuka. */}
      <div className={cn(SHELL, "mt-2")}>
        <BarisGeser kartu={kartu} panahSelalu />
      </div>
    </section>
  );
}
