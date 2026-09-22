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
export default function TabKatalog({ dramas }: { dramas: Drama[] }) {
  const sp = useSearchParams();
  return (
    <TabKatalogTampilan
      dramas={dramas}
      tab={parseTab(sp.get("tab"))}
      semua={sp.get("semua") === "1"}
    />
  );
}
