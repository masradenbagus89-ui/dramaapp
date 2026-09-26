"use client";

import { useSearchParams } from "next/navigation";
import type { Drama } from "@/lib/types";
import { parseTab } from "@/lib/tab-katalog";
import TabKatalogTampilan from "./TabKatalogTampilan";

/**
 * Pembaca alamat untuk deret tab halaman depan.
 *
 * Tugasnya CUMA satu: menerjemahkan `?tab=` & `?semua=` jadi dua nilai, lalu
 * menyerahkan penggambarannya ke `TabKatalogTampilan`. Bentuknya tidak ditulis
 * di sini supaya versi SERVER (yang dipakai sebagai isi `<Suspense fallback>` di
 * app/page.tsx) dan versi browser memakai markup yang SAMA PERSIS — dua salinan
 * markup pasti menyimpang sebelah, dan bedanya baru terlihat sebagai halaman
 * yang "melompat" saat dimuat.
 *
 * KENAPA halaman depan tidak membaca `searchParams` miliknya sendiri: begitu
 * sebuah halaman menyentuh `searchParams`, Next membangunnya ulang untuk TIAP
 * pengunjung dan `revalidate = 60` di app/page.tsx jadi percuma. Membacanya di
 * komponen browser seperti ini membuat halamannya tetap statis.
 *
 * WAJIB dibungkus `<Suspense>` oleh pemanggil — syarat Next untuk
 * `useSearchParams()`. Tanpa itu `next build` GAGAL.
 */
export default function TabKatalog({
  dramas,
  basePath,
  hanyaMenu,
  paksaSemua,
}: {
  dramas: Drama[];
  /**
   * Halaman tempat deret tab ini dipasang. Diteruskan apa adanya ke tampilan —
   * alasan kenapa ini WAJIB diisi di /beranda ada di sana (RedirectIfAuthed
   * memantulkan penonton yang sudah login dari `/`).
   */
  basePath?: string;
  /** Gambar baris tabnya saja (dipakai /beranda sebagai menu). */
  hanyaMenu?: boolean;
  /**
   * true = selalu tampilkan grid penuh, apa pun isi `?semua=`.
   *
   * Dipakai halaman /katalog, yang memang ada supaya satu tab terbuka PENUH
   * dalam satu halaman. Tanpa ini, membuka /katalog tanpa `?semua=1` cuma
   * memberi sebaris poster — persis yang TIDAK diminta owner.
   */
  paksaSemua?: boolean;
}) {
  const sp = useSearchParams();
  return (
    <TabKatalogTampilan
      dramas={dramas}
      tab={parseTab(sp.get("tab"))}
      semua={paksaSemua || sp.get("semua") === "1"}
      basePath={basePath}
      hanyaMenu={hanyaMenu}
    />
  );
}
