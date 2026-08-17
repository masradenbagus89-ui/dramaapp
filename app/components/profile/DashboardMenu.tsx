"use client";

import Link from "next/link";
import {
  History,
  Bookmark,
  Download,
  Settings,
  Crown,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MenuItem = {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
};

type Props = {
  onOpenSettings?: () => void;
};

export default function DashboardMenu({ onOpenSettings }: Props) {
  const items: MenuItem[] = [
    {
      key: "history",
      label: "Riwayat Tontonan",
      description: "Lihat semua yang sudah kamu tonton",
      icon: History,
      href: "/history",
    },
    {
      key: "favorites",
      label: "Favorit",
      description: "Daftar drama yang kamu simpan",
      icon: Bookmark,
      href: "/my-list",
    },
    {
      key: "downloads",
      label: "Download",
      description: "Episode yang sudah diunduh",
      icon: Download,
      href: "/history?tab=downloads",
    },
    {
      key: "settings",
      label: "Pengaturan",
      description: "Ubah nama dan warna avatar",
      icon: Settings,
      onClick: onOpenSettings,
    },
    {
      key: "premium",
      label: "Premium / Koin",
      description: "Top-up koin dan lihat saldo",
      icon: Crown,
      href: "#premium",
    },
    {
      key: "help",
      label: "Bantuan",
      description: "Pusat bantuan dan informasi",
      icon: HelpCircle,
      href: "/login",
    },
  ];

  const content = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        const body = (
          <>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-amber-400">
                <Icon className="size-4.5" />
              </div>
              <span className="text-sm font-semibold text-zinc-100">
                {item.label}
              </span>
            </div>
            <p className="mt-2 text-xs leading-snug text-zinc-500">
              {item.description}
            </p>
          </>
        );

        const className =
          "group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-left transition-colors hover:border-amber-400/50 hover:bg-zinc-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400";

        return item.href ? (
          <Link
            key={item.key}
            href={item.href}
            onClick={item.onClick}
            className={className}
          >
            {body}
          </Link>
        ) : (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className={className}
          >
            {body}
          </button>
        );
      })}
    </div>
  );

  return (
    <section>
      <h2 className="text-lg font-bold text-white">Menu Cepat</h2>
      <div className="mt-3">{content}</div>
    </section>
  );
}
