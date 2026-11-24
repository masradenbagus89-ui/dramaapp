"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Users } from "lucide-react";
import { readUser } from "@/lib/auth";
import { MAKS_PANJANG_NAMA, rapikanNama } from "@/nobar-server/src/kontrak";

/**
 * Tombol "Nonton Bareng" di halaman /tonton/[id]. Klik → isi nama → Room dibuat,
 * pembuatnya jadi Host, lalu pindah ke halaman Room. Formnya membuka di tempat
 * (bukan dialog) supaya tata letak halaman film yang sudah ada tidak bergeser.
 */
export default function TombolNobar({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [terbuka, setTerbuka] = useState(false);
  const [nama, setNama] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, setProses] = useState(false);
  useEffect(() => setNama((n) => n || (readUser()?.name ?? "").slice(0, MAKS_PANJANG_NAMA)), []);

  const buat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rapikanNama(nama)) return setGalat(`Isi nama 1-${MAKS_PANJANG_NAMA} huruf.`);
    setProses(true);
    setGalat(null);
    try {
      const res = await fetch("/api/watch-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, nama }),
      });
      const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setGalat(data.error ?? "Room gagal dibuat.");
        setProses(false);
        return;
      }
      router.push(`/watch-room/${data.token}`);
    } catch {
      setGalat("Gagal menghubungi server. Cek koneksi lalu coba lagi.");
      setProses(false);
    }
  };

  if (!terbuka) {
    return (
      <button
        type="button"
        onClick={() => setTerbuka(true)}
        className="inline-flex items-center gap-2 rounded-full border border-rose-600 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        <Users className="size-4" aria-hidden="true" />
        Nonton Bareng
      </button>
    );
  }

  return (
    <form onSubmit={buat} className="max-w-sm rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-semibold text-zinc-900">Buat Room Nonton Bareng</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        Kamu jadi Host: video teman-temanmu mengikuti play, jeda, dan geser yang kamu lakukan.
      </p>
      <label className="mt-3 block text-xs font-medium text-zinc-700">
        Nama kamu
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          maxLength={MAKS_PANJANG_NAMA}
          autoFocus
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-rose-500 focus:outline-none"
        />
      </label>
      {galat && <p role="alert" className="mt-2 text-xs text-rose-700">{galat}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={proses}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-600 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
        >
          {proses && <LoaderCircle className="size-4 animate-spin" />}
          Buat Room
        </button>
        <button
          type="button"
          onClick={() => setTerbuka(false)}
          className="rounded-full px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-200"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
