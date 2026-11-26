"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Send } from "lucide-react";
import { SITE_NAME } from "@/lib/site";

/** Kotak link undangan: salin + bagikan ke WhatsApp / Telegram. */
export default function UndanganNobar({ token, judul }: { token: string; judul: string }) {
  // Origin dibaca SESUDAH tampil di browser — saat render di server belum ada window.
  const [link, setLink] = useState("");
  const [tersalin, setTersalin] = useState(false);
  useEffect(() => setLink(`${window.location.origin}/watch-room/${token}`), [token]);

  // Nama situs dari SITE_NAME, BUKAN ditulis tangan. Sampai 2026-11-26 baris ini
  // berbunyi "DramaKu" — nama lama yang tertinggal saat penggantian nama
  // 2026-11-24. Ini teks yang DISALIN penonton lalu dikirim ke temannya, jadi
  // nama lama ikut tersebar ke luar situs setiap kali ada yang mengajak nobar.
  const ajakan = `Yuk nonton "${judul}" bareng aku di ${SITE_NAME}:`;

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      // Clipboard ditolak (HTTP biasa / izin browser) → pilih teksnya supaya bisa disalin manual.
      document.getElementById("link-undangan")?.focus();
    }
  };

  return (
    <section aria-labelledby="judul-undangan" className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 id="judul-undangan" className="text-sm font-semibold text-zinc-100">Ajak teman</h2>
      <p className="mt-1 text-xs text-zinc-400">
        Hanya yang memegang link ini yang bisa masuk. Bagikan ke orang yang kamu kenal saja.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          id="link-undangan"
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Link undangan"
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300"
        />
        <button
          type="button"
          onClick={salin}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
        >
          {tersalin ? <Check className="size-4" /> : <Copy className="size-4" />}
          {tersalin ? "Tersalin" : "Salin"}
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${ajakan} ${link}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
        >
          WhatsApp
        </a>
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(ajakan)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-500"
        >
          <Send className="size-3.5" />
          Telegram
        </a>
      </div>
    </section>
  );
}
