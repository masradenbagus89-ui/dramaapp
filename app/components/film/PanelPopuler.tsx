import { getAllDramasCachedSafe } from "@/lib/dramas";
import { sortCatalog } from "@/lib/beranda-catalog";
import PanelFilm, { type BarisFilm } from "./PanelFilm";

/**
 * Kolom "TERPOPULER" di bawah bingkai pemutar.
 *
 * Dipisah dari "Film Terkait" pada 2026-10-29 (owner: *"film yang diputar jadi
 * satu bingkai dengan film terkait"*): sejak itu kedua daftar tidak lagi
 * bertumpuk di satu kolom — Film Terkait naik ke dalam bingkai pemutar,
 * Terpopuler tinggal di kolom kanan bawah bersama isi halaman.
 *
 * Urutannya `sortCatalog(..., "populer")` — fungsi yang SUDAH dipakai penyaring
 * katalog, bukan logika urut baru. Kalau definisi "populer" berubah, kolom ini
 * ikut berubah sendiri dan tidak menyimpang dari sisa situs.
 */

/**
 * Berapa judul yang dipajang.
 *
 * 10 dipilih supaya kolom kanan terisi sampai bawah pada halaman biasa
 * (permintaan owner 2026-10-29) tanpa jadi daftar tak berujung di HP, tempat
 * kolom ini turun ke BAWAH isi sehingga tiap baris berarti gulungan tambahan.
 */
const JUMLAH = 10;

export default async function PanelPopuler({
  kecualiId,
  sudahTampil = [],
}: {
  /** Judul yang sedang dibuka — dikeluarkan supaya kolomnya tidak menawarkan
   *  halaman yang sedang dilihat penonton (terbaca seperti tautan rusak). */
  kecualiId?: string;
  /**
   * Id yang sudah tampil di panel "Film Terkait" di dalam bingkai pemutar.
   *
   * Dibuang dari daftar ini supaya satu judul tidak muncul dua kali di satu
   * halaman — keluhan "dobel" yang owner sampaikan 2026-09-21.
   */
  sudahTampil?: string[];
}) {
  /**
   * `...CachedSafe` wajib, alasan yang sama dengan `KepalaFilm`: halaman
   * pemakainya ber-`revalidate`, dan satu pembacaan `no-store` membuatnya
   * dibangun ulang untuk tiap pengunjung. `Safe` = tidak pernah melempar, jadi
   * kolom pelengkap ini tak bisa menjatuhkan halaman utamanya.
   */
  const semua = await getAllDramasCachedSafe();
  const dibuang = new Set(sudahTampil);

  const items: BarisFilm[] = sortCatalog(semua, "populer")
    .filter((d) => d.id !== kecualiId && !dibuang.has(d.id))
    .slice(0, JUMLAH)
    .map((d) => ({
      id: d.id,
      judul: d.title,
      href: `/drama/${encodeURIComponent(d.id)}`,
      gambar: d.posterImage || d.heroImage || null,
      keterangan: [d.genre, d.country].filter(Boolean).join(", "),
      jejak: `${d.views} ditonton`,
    }));

  return <PanelFilm judul="Terpopuler" items={items} />;
}
