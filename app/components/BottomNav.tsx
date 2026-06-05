"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
  match: (path: string) => boolean;
  icon: (active: boolean) => React.ReactElement;
};

const TABS: Tab[] = [
  {
    href: "/shorts",
    label: "Shorts",
    match: (p) => p.startsWith("/shorts"),
    icon: (active) => (
      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${active ? "fill-amber-400" : "fill-zinc-400"}`}>
        <path d="M4 4h12l4 4v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm5 5v6l5-3-5-3z" />
      </svg>
    ),
  },
  {
    href: "/beranda",
    label: "Beranda",
    match: (p) => p === "/beranda" || p.startsWith("/discover") || p.startsWith("/drama") || p.startsWith("/watch"),
    icon: (active) => (
      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${active ? "fill-amber-400" : "fill-zinc-400"}`}>
        <path d="M12 2l9 4.5v11L12 22l-9-4.5v-11L12 2zm0 2.236L5 7.618v8.764l7 3.382 7-3.382V7.618L12 4.236zM12 8l3 5h-2v3h-2v-3H9l3-5z" />
      </svg>
    ),
  },
  {
    href: "/my-list",
    label: "My List",
    match: (p) => p.startsWith("/my-list"),
    icon: (active) => (
      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${active ? "fill-amber-400" : "fill-zinc-400"}`}>
        <path d="M6 2h12a2 2 0 012 2v18l-8-4-8 4V4a2 2 0 012-2z" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    match: (p) => p.startsWith("/profile"),
    icon: (active) => (
      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${active ? "fill-amber-400" : "fill-zinc-400"}`}>
        <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.42 0-8 2.69-8 6v2h16v-2c0-3.31-3.58-6-8-6z" />
      </svg>
    ),
  },
];

const PUBLIC_PATHS = ["/", "/login", "/daftar"];

export default function BottomNav() {
  const pathname = usePathname() ?? "/";
  if (pathname.startsWith("/watch") || pathname.startsWith("/feed")) return null;
  if (PUBLIC_PATHS.includes(pathname)) return null;

  const activeIndex = TABS.findIndex((t) => t.match(pathname));
  const tabWidth = 100 / TABS.length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800 bg-black/95 backdrop-blur md:hidden">
      <div className="relative mx-auto max-w-md">
        {/* Bulatan/garis menyala yang meluncur mengikuti menu aktif */}
        {activeIndex >= 0 && (
          <div
            className="pointer-events-none absolute top-0 transition-transform duration-300 ease-out"
            style={{ width: `${tabWidth}%`, transform: `translateX(${activeIndex * 100}%)` }}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-amber-400 shadow-[0_0_14px_3px_rgba(251,191,36,0.65)] animate-[nav-glow_1.8s_ease-in-out_infinite]" />
          </div>
        )}

        <div className="grid grid-cols-4">
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex select-none flex-col items-center gap-1 py-2.5 transition-transform duration-150 active:scale-90"
              >
                {/* Lingkaran cahaya lembut di belakang ikon aktif */}
                <span
                  className={`pointer-events-none absolute top-1 h-9 w-9 rounded-full bg-amber-400/20 blur-[6px] transition-opacity duration-300 ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
                <span
                  key={active ? "on" : "off"}
                  className={
                    active
                      ? "relative animate-[nav-pop_0.35s_ease-out_forwards]"
                      : "relative transition-transform duration-300"
                  }
                >
                  {tab.icon(active)}
                </span>
                <span
                  className={`text-[11px] transition-all duration-300 ${
                    active ? "font-semibold text-amber-400" : "text-zinc-400"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
