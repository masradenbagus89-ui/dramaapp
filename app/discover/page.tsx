import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllDramasCachedSafe } from "@/lib/dramas";
import { getPlaylyVideosGabunganCached } from "@/lib/playly-gabungan";
import DramaBrowser from "../components/DramaBrowser";
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
      {/* Seksi "Video terbaru" (DashboardVideoGrid) DILEPAS 2026-10-02 atas
          keputusan owner. Ia memanggil jalur DASHBOARD UPLOAD Playly, dan jalur
          itu menolak SELURUH daftar: terukur di produksi 20 dari 20 video gagal
          dengan alasan "tidak ada alamat video" — Playly tidak menyertakan
          alamat berkas di daftarnya, hanya saat video diputar.

          Yang membuat seksi ini layak DIBUANG, bukan diperbaiki: ke-20 video itu
          TERBUKTI video yang SAMA dengan yang sudah tampil sehat di /film dan
          /beranda lewat jalur katalog (dicocokkan per judul: Furiosa, Despicable
          Me 4, Deadpool & Wolverine, Badland Hunters, Bad Boys Ride or Die).
          Jadi memperbaikinya cuma akan menampilkan ulang video yang sudah ada,
          sementara membiarkannya berarti penonton terus melihat kotak kosong
          bertulisan "Belum ada video yang di-upload dari dashboard" — kalimat
          yang keliru, karena videonya ada dan cuma ditolak.

          Jalur dashboard-nya SENDIRI tidak ikut dibuang: /api/videos masih
          dipakai kartu status Playly di /admin (PlaylyStatusCard), jadi owner
          tetap bisa memantau sambungannya. Yang hilang hanya penampilnya di
          halaman penonton. Riwayat lengkap: HANDOFF.md 2026-10-01/02. */}
      <Suspense fallback={<KerangkaKepalaKatalog menus={menus} />}>
        <DramaBrowser dramas={dramas} playlyVideos={playlyVideos} />
      </Suspense>
    </div>
  );
}
