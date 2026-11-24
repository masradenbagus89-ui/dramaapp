"use client";

import { Crown } from "lucide-react";
import type { PesertaPublik } from "@/nobar-server/src/kontrak";

/** Daftar penonton: online di atas offline (urutan dari server), label HOST, aksi serah Host. */
export default function DaftarPenonton({
  peserta,
  sayaId,
  sayaHost,
  onSerahkan,
}: {
  peserta: PesertaPublik[];
  sayaId: string | null;
  sayaHost: boolean;
  onSerahkan: (pesertaId: string) => void;
}) {
  const online = peserta.filter((p) => p.online).length;
  return (
    <section aria-labelledby="judul-penonton" className="flex min-h-0 flex-col">
      <h2 id="judul-penonton" className="px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Penonton · <span className="text-emerald-400">{online} online</span>
        <span className="text-zinc-500"> / {peserta.length}</span>
      </h2>
      <ul className="max-h-48 space-y-0.5 overflow-y-auto px-2 pb-2">
        {peserta.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5">
            <span
              aria-hidden="true"
              className={`size-2 shrink-0 rounded-full ${p.online ? "bg-emerald-400" : "bg-zinc-600"}`}
            />
            {/* Nama SELALU teks biasa (React meng-escape) — tak pernah HTML. */}
            <span className={`min-w-0 flex-1 truncate text-sm ${p.online ? "text-zinc-100" : "text-zinc-500"}`}>
              {p.nama}
              {p.id === sayaId && <span className="text-zinc-500"> (kamu)</span>}
              <span className="sr-only">{p.online ? ", online" : ", offline"}</span>
            </span>
            {p.peran === "host" && (
              <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                <Crown className="size-3" aria-hidden="true" />
                HOST
              </span>
            )}
            {sayaHost && p.peran !== "host" && p.online && (
              <button
                type="button"
                onClick={() => onSerahkan(p.id)}
                className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 transition hover:border-amber-400 hover:text-amber-300"
              >
                Jadikan Host
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
