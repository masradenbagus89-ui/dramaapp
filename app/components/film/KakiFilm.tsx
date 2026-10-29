import { getAllDramasCachedSafe } from "@/lib/dramas";
import { availableGenres } from "@/lib/beranda-catalog";
import FooterSitus from "@/app/components/beranda/FooterSitus";

/**
 * KAKI SITUS untuk halaman FILM — `/drama/[id]` dan `/tonton/[id]`.
 *
 * KENAPA ADA (owner 2026-10-29): blok keterangan sebelumnya
 * (`TentangSitus`, kini dihapus) berlatar sama dengan isi halaman sehingga
 * *"menyatu dengan yang di atas"*. Owner menunjuk kaki situs pembanding —
 * empat kolom berlatar GELAP yang jelas terpisah dari badan halaman.
 *
 * Yang dipakai di sini BUKAN footer baru: `FooterSitus` sudah hidup sejak
 * 2026-10-10 di landing `/`, dan bentuknya memang sudah persis yang diminta
 * (empat kolom, latar `bg-zinc-950`, judul bergaris bawah, disclaimer).
 * Membuat footer kedua berarti dua kaki situs yang pasti menyimpang —
 * kesalahan yang sudah tiga kali terjadi di repo ini pada kepala situs.
 *
 * Tugas berkas ini karena itu cuma dua: menyediakan daftar genre (harus
 * dihitung dari katalog di server), dan meneruskan keterangan judul yang
 * sedang dibuka ke kolom pertama.
 *
 * Sepola dengan `KepalaFilm` — keduanya pembungkus tipis supaya halaman cukup
 * menulis satu tag tanpa mengulang pembacaan katalog.
 */
export default async function KakiFilm({
  tentang,
}: {
  /** Keterangan judul yang sedang dibuka, untuk kolom pertama. */
  tentang?: { judul: string; teks: string };
}) {
  /**
   * `...CachedSafe` wajib, alasan yang sama dengan `KepalaFilm`: halaman
   * pemakainya ber-`revalidate`, dan satu pembacaan `no-store` membuatnya
   * dibangun ulang untuk tiap pengunjung. `Safe` = tidak pernah melempar —
   * kaki situs tak boleh menjatuhkan halaman filmnya.
   *
   * Katalog kosong/gagal dibaca = kolom "Genre Populer" tidak digambar
   * (`FooterSitus` sudah menanganinya), tiga kolom lain tetap tampil.
   */
  const dramas = await getAllDramasCachedSafe();
  return <FooterSitus genres={availableGenres(dramas)} tentang={tentang} />;
}
