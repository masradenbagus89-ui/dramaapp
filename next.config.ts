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
};

export default nextConfig;
