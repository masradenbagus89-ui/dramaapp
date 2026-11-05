"use client";

// Menu samping panel admin.
//
// JADI CLIENT COMPONENT sejak 2026-11-05 (owner: "kamu rapikan"): menu yang
// sedang dibuka kini DITANDAI. Sebelumnya seluruh menu tampil seragam, jadi
// admin tak punya petunjuk sedang berada di bagian mana — keluhan yang sama
// akarnya dengan "di-scroll sudah jadi satu".
//
// Penandaannya dihitung dari ALAMAT (pathname + hash), bukan dari prop yang
// dioper pemanggil: sidebar ini dipakai EMPAT halaman, dan menitipkan
// penandaan ke tiap pemanggil berarti halaman yang lupa mengirimnya diam-diam
// kehilangan penanda — tanpa error.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ADS_ENABLED } from "@/lib/saklar-fitur";
import { BAGIAN_BAWAAN, parseBagianAdmin } from "@/lib/bagian-admin";
import {
  Home,
  Plus,
  List,
  Users,
  ShieldCheck,
  Megaphone,
  Film,
  KeyRound,
  Webhook,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";

// Tautan ditulis ABSOLUT ("/admin#dashboard", bukan "#dashboard") supaya menu
// ini tetap berfungsi saat dipakai di halaman admin lain — mis. setelan Playly
// yang punya alamatnya sendiri. Dari halaman /admin sendiri, hash-nya yang
// menentukan bagian mana yang ditampilkan (lib/bagian-admin.ts).
const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin#dashboard", label: "Dashboard", icon: Home },
  { href: "/admin#tambah", label: "Tambah Drama", icon: Plus },
  { href: "/admin#daftar", label: "Daftar Drama", icon: List },
  { href: "/admin/videos/playly", label: "Video Playly", icon: Film },
  // Ditaruh tepat di bawah "Video Playly" karena keduanya menjawab pertanyaan
  // yang sama ("video Playly mana yang tampil?") lewat dua jalur berbeda:
  // yang atas untuk video yang KITA jemput, yang ini untuk video yang PLAYLY
  // kirim sendiri. Berjauhan di menu = admin mencari di tempat yang salah saat
  // sebuah video tidak muncul.
  { href: "/admin/webhooks/playly", label: "Webhook Playly", icon: Webhook },
  { href: "/admin/settings/playly", label: "Kunci Playly", icon: KeyRound },
  { href: "/admin#kelola-admin", label: "Kelola Admin", icon: Users },
  { href: "/admin#keamanan", label: "Keamanan (2FA)", icon: ShieldCheck },
  // Menu iklan hanya ada saat saklarnya menyala (lib/saklar-fitur.ts) — kalau
  // tidak, menunya menuju bagian halaman yang sudah tidak digambar.
  ...(ADS_ENABLED
    ? [{ href: "/admin#iklan", label: "Iklan Sponsor", icon: Megaphone }]
    : []),
  { href: "/", label: "← Kembali ke web", icon: ArrowLeft },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  // Hash dibaca lewat efek, BUKAN saat render: `window` tidak ada saat HTML
  // dibuat di server, dan membacanya langsung membuat render pertama di browser
  // berbeda dari HTML server (hydration mismatch). Pembacaan awal "" lalu
  // disusul nilai sebenarnya adalah urutan yang aman.
  useEffect(() => {
    const baca = () => setHash(window.location.hash);
    baca();
    // `hashchange` saja tidak cukup: mengklik menu yang hash-nya SAMA dengan
    // yang sedang dibuka tidak memicu event itu. `click` menangkapnya supaya
    // penandaan tidak pernah tertinggal.
    window.addEventListener("hashchange", baca);
    window.addEventListener("click", baca);
    return () => {
      window.removeEventListener("hashchange", baca);
      window.removeEventListener("click", baca);
    };
  }, []);

  /**
   * Apakah sebuah menu sedang dibuka.
   *
   * Dua jenis menu diperlakukan berbeda, dan itu disengaja:
   * - menu ber-hash (`/admin#tambah`) aktif saat kita BERADA di `/admin` DAN
   *   bagiannya cocok;
   * - menu halaman lain (`/admin/videos/playly`) aktif saat pathname-nya cocok.
   * Menyamakan keduanya membuat "Dashboard" ikut menyala di halaman Video
   * Playly — penanda yang berbohong, lebih menyesatkan daripada tanpa penanda.
   */
  const sedangDibuka = (href: string) => {
    if (href === "/") return false;
    if (href.includes("#")) {
      if (pathname !== "/admin") return false;
      return parseBagianAdmin(href) === parseBagianAdmin(hash || BAGIAN_BAWAAN);
    }
    return pathname === href;
  };

  return (
    <Card className="hidden gap-0 self-start rounded-2xl border-zinc-800 bg-zinc-900/40 p-4 py-4 md:sticky md:top-20 md:block">
      <div className="mb-4 px-2">
        <p className="text-xs uppercase tracking-wider text-zinc-500">
          Admin Panel
        </p>
        <p className="mt-1 text-base font-bold text-white">DramaKu</p>
      </div>
      <nav className="flex flex-col gap-1 text-sm">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const aktif = sedangDibuka(item.href);
          return (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className={cn(
                "h-auto justify-start gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white",
                // Menu aktif: latar kuning lembut + garis tegas di tepi kiri.
                // Dua penanda sekaligus, bukan warna teks saja — warna tipis
                // mudah luput di daftar 10 baris, dan garis tepi tetap terbaca
                // walau latarnya ikut berubah tema.
                aktif &&
                  "border-l-2 border-amber-500 bg-amber-500/15 font-semibold text-amber-700 hover:bg-amber-500/20 hover:text-amber-800",
              )}
            >
              <a href={item.href} aria-current={aktif ? "page" : undefined}>
                <Icon className="size-4" />
                {item.label}
              </a>
            </Button>
          );
        })}
      </nav>
    </Card>
  );
}
