// Menu samping panel admin (navigasi loncat antar-bagian halaman).
// Statis & presentasional — tanpa state/handler. Dipisah dari
// app/admin/page.tsx agar halaman lebih ringkas. Tampilan sama persis.
const NAV_ITEMS = [
  { href: "#dashboard", label: "Dashboard", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  { href: "#tambah", label: "Tambah Drama", icon: "M12 4v16m-8-8h16" },
  { href: "#daftar", label: "Daftar Drama", icon: "M4 6h16M4 12h16M4 18h16" },
  { href: "#kelola-admin", label: "Kelola Admin", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { href: "#keamanan", label: "Keamanan (2FA)", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
  { href: "#iklan", label: "Iklan Sponsor", icon: "M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 11-5.8-1.6" },
  { href: "/", label: "← Kembali ke web", icon: "M10 19l-7-7m0 0l7-7m-7 7h18" },
];

export default function AdminSidebar() {
  return (
    <aside className="hidden self-start rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 md:sticky md:top-20 md:block">
      <div className="mb-4 px-2">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Admin Panel</p>
        <p className="mt-1 text-base font-bold text-white">DramaKu</p>
      </div>
      <nav className="flex flex-col gap-1 text-sm">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={item.icon} />
            </svg>
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
