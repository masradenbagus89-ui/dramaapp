import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllDramasCachedSafe } from "@/lib/dramas";
import { TAB_BAWAAN } from "@/lib/tab-katalog";
import TabKatalog from "@/app/components/beranda/TabKatalog";
import TabKatalogTampilan from "@/app/components/beranda/TabKatalogTampilan";

// HALAMAN KATALOG PER-TAB (owner 2026-09-26).
//
// KENAPA ADA: di /beranda, baris tab dulu mengganti isinya DI TEMPAT lalu
// menggulir turun. Owner memintanya berbeda — "aku maunya pindah halaman (jadi
// halaman baru hanya berisi, contohnya klik film terbaru satu halaman film
// terbaru semua)". Halaman inilah tujuannya.
//
// Isinya SENGAJA cuma dua: baris tab (supaya bisa pindah antar-tab tanpa balik
// ke beranda) dan GRID PENUH judul tab itu. Tidak ada banner, tidak ada baris
// personal, tidak ada baris kategori — apa pun yang ditambahkan di sini
// mengingkari "halaman baru hanya berisi" yang jadi alasan halaman ini dibuat.
//
// Navigasinya memakai navbar hitam (`TopNav`), sama seperti /film dan /profile;
// `/katalog` didaftarkan di `AKAR_BERNAVBAR_ATAS` (lib/navigasi-halaman.ts).

// Disimpan & dipakai ulang, disegarkan tiap 60 detik — sama dengan /beranda.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Katalog — Semua Judul per Kategori",
  description:
    "Daftar lengkap judul DramaKu per kategori: terbaru, series unggulan, series update, terpopuler, dan rekomendasi.",
  alternates: { canonical: "/katalog" },
};

export default async function KatalogPage() {
  const dramas = await getAllDramasCachedSafe();

  return (
    <main className="min-h-screen bg-black pb-12">
      {/* `paksaSemua` membuat halaman ini SELALU menampilkan grid penuh — bukan
          baris geser yang cuma memuat sebagian. Itu inti permintaan owner:
          "satu halaman film terbaru SEMUA".

          <Suspense> WAJIB: isinya membaca `?tab=` lewat `useSearchParams()`,
          dan tanpa pembungkus ini `next build` GAGAL. Fallback-nya bentuk yang
          SAMA supaya halaman tidak melompat saat bagian browsernya menyusul. */}
      <Suspense
        fallback={
          <TabKatalogTampilan
            dramas={dramas}
            tab={TAB_BAWAAN}
            semua
            basePath="/katalog"
          />
        }
      >
        <TabKatalog dramas={dramas} basePath="/katalog" paksaSemua />
      </Suspense>
    </main>
  );
}
