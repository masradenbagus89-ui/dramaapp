import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllDramasCachedSafe } from "@/lib/dramas";
import { getPlaylyVideosPublik } from "@/lib/playly-publik";
import DramaBrowser from "../components/DramaBrowser";
import DashboardVideoGrid from "../components/DashboardVideoGrid";

// Disimpan & dipakai ulang, disegarkan tiap 60 detik (menggantikan force-dynamic
// yang membangun ulang halaman untuk tiap pengunjung).
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Jelajahi Drama China — Genre, Tahun & Rating",
  description:
    "Jelajahi katalog drama China DramaKu. Saring berdasarkan genre, tahun rilis, dan rating IMDb, lalu urutkan sesuai yang kamu cari — gratis.",
  alternates: { canonical: "/discover" },
};

export default async function DiscoverPage() {
  const dramas = await getAllDramasCachedSafe();

  // Video Playly milik akun mitra kita, tampil OTOMATIS (tak perlu dikaitkan
  // ke drama dulu). Semua pembacaannya ber-cache: satu saja pembacaan tanpa
  // cache di sini akan membuat SELURUH halaman ini dibangun ulang untuk tiap
  // pengunjung, sehingga `revalidate = 60` di atas jadi percuma (lihat catatan
  // di lib/supabase.ts).
  //
  // Bagiannya digambar DI DALAM DramaBrowser sejak 2026-09-12 supaya ikut
  // tersaring kotak cari (ketikannya cuma ada di komponen itu). Batas 8 kartu
  // saat menjelajah ada di HasilPlayly.tsx.
  const { videos: playlyVideos } = await getPlaylyVideosPublik();

  // Bagian "Video terbaru" hanya muncul kalau sambungan ke dashboard sudah
  // dikonfigurasi. Tanpa penjaga ini, halaman publik akan menampilkan pesan
  // error hanya karena env belum diisi.
  const dashboardAktif = Boolean(process.env.DASHBOARD_API_URL?.trim());

  return (
    <div className="pb-10">
      {/* Hero berjalan DIBUANG (owner 2026-09-09) — halaman ini kini seragam
          dengan / dan /beranda: langsung bar cari + strip genre + grid poster
          padat, tanpa banner setinggi layar yang berganti sendiri.

          DramaBrowser sengaja di LUAR pembungkus ber-padding: bar cari & strip
          genre-nya melebar penuh sampai tepi layar, sedangkan isinya membatasi
          diri sendiri lewat SHELL. */}
      <Suspense
        fallback={
          <div className="py-16 text-center text-sm text-zinc-500">Memuat...</div>
        }
      >
        <DramaBrowser dramas={dramas} playlyVideos={playlyVideos} />
      </Suspense>

      {/* shell-wide — WAJIB sama dengan pembatas isi DramaBrowser & navbar,
          kalau tidak tepi kiri seksi di bawah ini meleset dari grid di atasnya. */}
      <div className="shell-wide mx-auto px-4 md:px-6">
        {dashboardAktif && <DashboardVideoGrid />}
      </div>
    </div>
  );
}
