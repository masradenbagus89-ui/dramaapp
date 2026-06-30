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
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "#dashboard", label: "Dashboard", icon: Home },
  { href: "#tambah", label: "Tambah Drama", icon: Plus },
  { href: "#daftar", label: "Daftar Drama", icon: List },
  { href: "#kelola-admin", label: "Kelola Admin", icon: Users },
  { href: "#keamanan", label: "Keamanan (2FA)", icon: ShieldCheck },
  { href: "#iklan", label: "Iklan Sponsor", icon: Megaphone },
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
