// Menu samping panel admin (navigasi loncat antar-bagian halaman).
// Statis & presentasional — tanpa state/handler. Dipisah dari
// app/admin/page.tsx agar halaman lebih ringkas. Tampilan sama persis.
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Home,
  Plus,
  List,
  Users,
  ShieldCheck,
  Megaphone,
  Film,
  KeyRound,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";

// Tautan ditulis ABSOLUT ("/admin#dashboard", bukan "#dashboard") supaya menu
// ini tetap berfungsi saat dipakai di halaman admin lain — mis. setelan Playly
// yang punya alamatnya sendiri. Dari halaman /admin sendiri, browser tetap
// memperlakukannya sebagai loncat-ke-bagian biasa (tanpa memuat ulang halaman).
const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin#dashboard", label: "Dashboard", icon: Home },
  { href: "/admin#tambah", label: "Tambah Drama", icon: Plus },
  { href: "/admin#daftar", label: "Daftar Drama", icon: List },
  { href: "/admin/videos/playly", label: "Video Playly", icon: Film },
  { href: "/admin/settings/playly", label: "Kunci Playly", icon: KeyRound },
  { href: "/admin#kelola-admin", label: "Kelola Admin", icon: Users },
  { href: "/admin#keamanan", label: "Keamanan (2FA)", icon: ShieldCheck },
  { href: "/admin#iklan", label: "Iklan Sponsor", icon: Megaphone },
  { href: "/", label: "← Kembali ke web", icon: ArrowLeft },
];

export default function AdminSidebar() {
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
          return (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className={cn(
                "h-auto justify-start gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white",
              )}
            >
              <a href={item.href}>
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
