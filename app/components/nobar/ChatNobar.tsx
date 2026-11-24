"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { MAKS_PANJANG_PESAN, rapikanTeks, type PesanPublik } from "@/nobar-server/src/kontrak";

const formatJam = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });

/**
 * Live chat Room. Batas panjang & anti-flood DITEGAKKAN server; di sini cuma
 * cerminannya supaya penonton tahu batasnya sebelum ditolak.
 */
export default function ChatNobar({
  pesan,
  sayaId,
  bisaKirim,
  peringatan,
  onKirim,
}: {
  pesan: PesanPublik[];
  sayaId: string | null;
  bisaKirim: boolean;
  peringatan: string | null;
  onKirim: (isi: string) => void;
}) {
  const [draf, setDraf] = useState("");
  const daftarRef = useRef<HTMLOListElement | null>(null);
  const nempelBawah = useRef(true);

  // Gulir otomatis HANYA kalau penonton memang sedang di bawah — yang sedang
  // membaca pesan lama tidak boleh ditarik paksa ke bawah tiap ada pesan baru.
  useEffect(() => {
    const el = daftarRef.current;
    if (el && nempelBawah.current) el.scrollTop = el.scrollHeight;
  }, [pesan]);

  const sisa = MAKS_PANJANG_PESAN - Array.from(draf).length;
  const sah = rapikanTeks(draf, MAKS_PANJANG_PESAN) !== null;

  const kirim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sah || !bisaKirim) return;
    onKirim(draf);
    setDraf("");
  };

  return (
    <section aria-labelledby="judul-chat" className="flex min-h-0 flex-1 flex-col border-t border-zinc-800">
      <h2 id="judul-chat" className="px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Live Chat
      </h2>
      <ol
        ref={daftarRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          nempelBawah.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        aria-live="polite"
        className="min-h-40 flex-1 space-y-2 overflow-y-auto px-4"
      >
        {pesan.length === 0 && (
          <li className="py-6 text-center text-sm text-zinc-500">Belum ada pesan. Sapa yang lain!</li>
        )}
        {pesan.map((m) => (
          <li key={m.id} className="text-sm leading-snug">
            <span className={`font-semibold ${m.pesertaId === sayaId ? "text-rose-300" : "text-sky-300"}`}>
              {m.nama}
            </span>
            <time dateTime={m.dikirim} className="ml-1.5 text-[10px] text-zinc-500">
              {formatJam.format(new Date(m.dikirim))}
            </time>
            {/* Teks biasa — React meng-escape, jadi "<script>" tampil sebagai huruf, tak pernah jalan. */}
            <p className="break-words text-zinc-200">{m.isi}</p>
          </li>
        ))}
      </ol>

      {peringatan && <p role="status" className="px-4 pt-2 text-xs text-amber-300">{peringatan}</p>}

      <form onSubmit={kirim} className="flex items-end gap-2 p-3">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Tulis pesan</span>
          <input
            value={draf}
            onChange={(e) => setDraf(e.target.value)}
            maxLength={MAKS_PANJANG_PESAN * 2 /* emoji = 2 unit UTF-16; batas sungguhan dihitung `sisa` */}
            placeholder={bisaKirim ? "Tulis pesan…" : "Menyambung…"}
            disabled={!bisaKirim}
            className="w-full rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-rose-400 focus:outline-none disabled:opacity-50"
          />
        </label>
        <button
          type="submit"
          disabled={!sah || !bisaKirim || sisa < 0}
          aria-label="Kirim pesan"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white transition hover:bg-rose-500 disabled:opacity-40"
        >
          <SendHorizontal className="size-4" />
        </button>
      </form>
      {sisa < 30 && (
        <p className={`-mt-2 px-4 pb-2 text-right text-[10px] ${sisa < 0 ? "text-rose-400" : "text-zinc-500"}`}>
          {sisa < 0 ? `Kelebihan ${-sisa} huruf` : `Sisa ${sisa} huruf`}
        </p>
      )}
    </section>
  );
}
