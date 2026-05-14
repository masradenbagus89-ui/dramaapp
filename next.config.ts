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
};

export default nextConfig;
