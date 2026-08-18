import type { Metadata } from "next";

/**
 * Halaman admin tak boleh muncul di hasil pencarian. robots.txt sudah melarang
 * penelusuran, tapi itu tidak menghapus halaman yang terlanjur ter-index —
 * penanda noindex di bawah yang melakukannya.
 *
 * Layout ini sengaja hanya membawa metadata (halaman admin sendiri adalah
 * client component, jadi tak bisa mengekspor metadata sendiri).
 */
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
