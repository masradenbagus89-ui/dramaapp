import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Izinkan dev server diakses dari PC lain di jaringan lokal yang sama.
  // Tambahkan IP/hostname laptop Anda di sini supaya HMR (auto-reload) jalan
  // saat dibuka dari PC kedua.
  allowedDevOrigins: [
    "192.168.1.4",
    "192.168.1.7",
    "192.168.1.10",
    "192.168.1.11",
    "*.local",
  ],

  images: {
    // Domain gambar yang boleh dioptimalkan next/image. Host di luar daftar ini
    // akan DITOLAK (gambar gagal tampil), jadi tiap sumber poster baru wajib
    // ditambahkan di sini.
    remotePatterns: [
      // Poster/hero katalog yang sudah ada di data.
      { protocol: "https", hostname: "i.imgur.com" },
      // Poster dari OMDb — lihat lib/imdb-tool.ts:153.
      { protocol: "https", hostname: "m.media-amazon.com" },
      // Banner dari TMDB — lihat lib/imdb-tool.ts:327.
      { protocol: "https", hostname: "image.tmdb.org" },
    ],
    // Format modern: ukuran berkas jauh lebih kecil pada mutu yang sama.
    formats: ["image/avif", "image/webp"],
  },

  /**
   * Alamat lama yang sudah tersebar, diarahkan ke alamat barunya.
   *
   * KENAPA WAJIB ADA (owner 2026-09-26): halaman daftar video pindah dari
   * `/playly` ke `/film` supaya nama penyedia tidak lagi terlihat penonton —
   * termasuk di kotak alamat browser. Tanpa pengalihan ini, SEMUA tautan yang
   * terlanjur tersebar (dikirim di chat, di-bookmark, dan yang sudah terindeks
   * Google) berubah jadi 404 seketika. Itu kerusakan yang tak bisa ditarik
   * kembali: kita tidak tahu siapa saja yang menyimpannya.
   *
   * `permanent: true` = HTTP 308. Bukan sekadar teknis: kode itulah yang
   * memberi tahu Google "halaman ini PINDAH, bukan sedang mampir" sehingga
   * nilai pencarian yang sudah dikumpulkan `/playly` ikut berpindah ke `/film`.
   * Dengan 307 (sementara), Google menahan nilainya di alamat lama.
   *
   * ⚠️ Hanya halaman PENONTON yang pindah. Alamat panel admin
   * (`/admin/videos/playly`, `/admin/webhooks/playly`) dan seluruh endpoint API
   * (`/api/playly/*`, `/api/admin/playly/*`) SENGAJA dibiarkan: admin memang
   * perlu tahu nama penyedianya, dan mengubah alamat API berarti menyentuh
   * pemanggil di banyak berkas tanpa manfaat apa pun bagi penonton.
   */
  async redirects() {
    return [
      {
        source: "/playly",
        destination: "/film",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
