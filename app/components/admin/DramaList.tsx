"use client";

// Bagian "Daftar Drama" di halaman admin: daftar semua drama + tombol
// Lihat/Edit/Hapus. Dipisah dari app/admin/page.tsx. Datanya + aksi tombol
// disuplai induk lewat prop (dramas, onEdit, onDelete) supaya komponen ini
// murni menampilkan. Tampilan & perilaku sama persis.
import Link from "next/link";
import type { Drama } from "@/lib/types";
import { CATEGORY_COLORS } from "@/app/admin/constants";

export default function DramaList({
  dramas,
  onEdit,
  onDelete,
}: {
  dramas: Drama[];
  onEdit: (drama: Drama) => void;
  onDelete: (id: string, title: string) => void;
}) {
  return (
    <section id="daftar">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Daftar Drama</h2>
        <span className="text-xs text-zinc-500">{dramas.length} total</span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <div className="divide-y divide-zinc-800">
          {dramas.map((d) => (
            <div key={d.id} className="flex items-center gap-3 bg-zinc-900/40 p-3 hover:bg-zinc-900/70">
              <div className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gradient-to-br ${d.gradient}`}>
                {d.posterImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.posterImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{d.title}</div>
                <div className="text-xs text-zinc-500">
                  <span className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${CATEGORY_COLORS[d.category] ?? "bg-zinc-500"}`} />
                  {d.category} · {d.episodes} eps · {d.views}
                </div>
              </div>
              <Link
                href={`/drama/${d.id}`}
                className="hidden rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-amber-400 hover:text-amber-400 sm:inline-block"
              >
                Lihat
              </Link>
              <button
                onClick={() => onEdit(d)}
                className="rounded-md border border-amber-700 px-3 py-1 text-xs text-amber-300 hover:border-amber-400 hover:bg-amber-950/40 hover:text-amber-200"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(d.id, d.title)}
                className="rounded-md border border-red-900 px-3 py-1 text-xs text-red-400 hover:border-red-500 hover:bg-red-950 hover:text-red-300"
              >
                Hapus
              </button>
            </div>
          ))}
          {dramas.length === 0 && (
            <div className="p-6 text-center text-sm text-zinc-500">
              Belum ada drama. Tambahkan dari form di atas.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
