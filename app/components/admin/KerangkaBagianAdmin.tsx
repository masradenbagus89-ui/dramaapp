// Kotak "sedang diambil" yang sama di setiap bagian admin.
//
// Dipasang HANYA sesudah sesi admin sah. Jangan dipakai di loading.tsx:
// berkas itu terkirim sebelum cookie diperiksa, jadi judul bagian di sini
// tidak boleh ikut ke pengunjung yang belum login.
export default function KerangkaBagianAdmin({
  kategori,
  judul,
  keterangan,
  status,
}: {
  kategori?: string;
  judul: string;
  keterangan?: string;
  status: string;
}) {
  return (
    <div className="space-y-6" aria-busy="true">
      <div>
        {kategori ? (
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            {kategori}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-bold text-white">{judul}</h1>
        {keterangan ? (
          <p className="mt-1 text-sm text-zinc-400">{keterangan}</p>
        ) : null}
        <p role="status" aria-live="polite" className="mt-3 text-sm text-zinc-300">
          {status}
        </p>
      </div>
      <div
        className="animate-pulse space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        aria-hidden="true"
      >
        <div className="h-8 w-48 rounded-lg bg-white/10" />
        <div className="h-10 rounded-lg bg-white/10" />
        <div className="h-10 rounded-lg bg-white/10" />
        <div className="h-10 rounded-lg bg-white/10" />
      </div>
    </div>
  );
}
