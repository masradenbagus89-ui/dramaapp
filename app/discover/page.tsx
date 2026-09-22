import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllDramasCachedSafe } from "@/lib/dramas";
import { getPlaylyVideosGabunganCached } from "@/lib/playly-gabungan";
import DramaBrowser from "../components/DramaBrowser";
import DashboardVideoGrid from "../components/DashboardVideoGrid";
import KerangkaKepalaKatalog from "../components/beranda/KerangkaKepalaKatalog";
import { buildNavMenus } from "@/lib/nav-katalog";

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
  // ke drama dulu). Sejak 2026-09-18 sumbernya GABUNGAN katalog + webhook,
  // seragam dengan /playly dan /beranda.
  //
  // WAJIB varian Cached. Semua pembacaannya harus ber-cache: satu saja pembacaan
  // tanpa cache di sini akan membuat SELURUH halaman ini dibangun ulang untuk
  // tiap pengunjung, sehingga `revalidate = 60` di atas jadi percuma (lihat
  // catatan di lib/supabase.ts:204).
  //
  // Bagiannya digambar DI DALAM DramaBrowser sejak 2026-09-12 supaya ikut
  // tersaring kotak cari (ketikannya cuma ada di komponen itu). Batas 8 kartu
  // saat menjelajah ada di HasilPlayly.tsx.
  const { videos: playlyVideos } = await getPlaylyVideosGabunganCached();

  // Bagian "Video terbaru" hanya muncul kalau sambungan ke dashboard sudah
  // dikonfigurasi. Tanpa penjaga ini, halaman publik akan menampilkan pesan
  // error hanya karena env belum diisi.
  const dashboardAktif = Boolean(process.env.DASHBOARD_API_URL?.trim());

  // Isi menu dihitung DI SERVER supaya kerangka kepala di bawah sudah membawa
  // menunya sejak HTML pertama. Hasilnya cuma label + alamat — jauh lebih
  // ringan dikirim ke browser daripada seluruh katalog. Pola yang sama dipakai
  // halaman depan (app/page.tsx).
  const menus = buildNavMenus(dramas);

  return (
    <div className="pb-10">
      {/* Hero berjalan DIBUANG (owner 2026-09-09) — halaman ini kini seragam
          dengan / dan /beranda: langsung bar cari + strip genre + grid poster
          padat, tanpa banner setinggi layar yang berganti sendiri.

          DramaBrowser sengaja di LUAR pembungkus ber-padding: bar cari & strip
          genre-nya melebar penuh sampai tepi layar, sedangkan isinya membatasi
          diri sendiri lewat SHELL. */}
      {/* Kerangka kepala situs, BUKAN tulisan "Memuat..." (owner 2026-09-22).
          Halaman ini tak merender apa pun di server — `DramaBrowser` memakai
          `useSearchParams()` sehingga wajib dibungkus `<Suspense>` — jadi
          isi `fallback` inilah SATU-SATUNYA yang dilihat penonton sebelum
          JavaScript aktif. Tulisan polos di layar hitam membuat halaman
          katalog utama terbaca seperti situs rusak. */}
      <Suspense fallback={<KerangkaKepalaKatalog menus={menus} />}>
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
