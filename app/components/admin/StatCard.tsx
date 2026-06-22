// Kartu statistik kecil di Dashboard admin (1 angka + label + ikon).
// Komponen presentasional MURNI — tanpa state sendiri; dipisah dari
// app/admin/page.tsx agar halaman lebih ringkas. Tampilan sama persis.
export default function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
