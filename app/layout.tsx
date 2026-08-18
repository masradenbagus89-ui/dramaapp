import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import BottomNav from "./components/BottomNav";
import TopNav from "./components/TopNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Cetakan metadata untuk SELURUH halaman. Tiap halaman cukup set `title` sendiri —
// `template` di bawah otomatis menambahkan "| DramaKu" di belakangnya.
export const metadata: Metadata = {
  // metadataBase wajib: tanpa ini URL gambar preview share tetap relatif dan
  // diabaikan WhatsApp/Facebook, jadi preview-nya kosong.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DramaKu — Nonton Drama China Sub Indo Gratis",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Nonton drama China pendek sub Indo gratis di HP maupun web. Ratusan episode, update tiap hari, bisa lanjut dari episode terakhir yang kamu tonton.",
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "id_ID",
    url: SITE_URL,
    title: "DramaKu — Nonton Drama China Sub Indo Gratis",
    description:
      "Nonton drama China pendek sub Indo gratis di HP maupun web. Ratusan episode, update tiap hari, bisa lanjut dari episode terakhir yang kamu tonton.",
  },
  // Gambar preview diambil otomatis dari app/opengraph-image.tsx (konvensi Next.js).
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-black flex flex-col">
        <TopNav />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
