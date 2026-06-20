"use client";

import { useEffect, useState } from "react";
import { REWARD_PER_AD } from "@/lib/coins";
import AdCreative from "./AdCreative";

type SponsorAd = {
  id: string;
  title?: string;
  imageUrl: string;
  linkUrl: string;
  views: number;
  clicks: number;
  addedAt: string;
};

export default function SponsorAdsManager() {
  const [ads, setAds] = useState<SponsorAd[]>([]);
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(
    null,
  );

  const refresh = () => {
    fetch("/api/ads", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ads?: SponsorAd[] } | null) => setAds(d?.ads ?? []))
      .catch(() => setAds([]));
  };
  useEffect(refresh, []);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, imageUrl, linkUrl }),
    });
    const d = await res.json();
    if (res.ok && d.ok) {
      setMsg({ type: "ok", text: "Iklan ditambahkan." });
      setTitle("");
      setImageUrl("");
      setLinkUrl("");
      refresh();
    } else {
      setMsg({ type: "error", text: d.error ?? "Gagal tambah iklan." });
    }
    setBusy(false);
  };

  const onDelete = async (id: string) => {
    if (!confirm("Hapus iklan ini?")) return;
    const res = await fetch("/api/admin/ads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) refresh();
  };

  const totalViews = ads.reduce((a, x) => a + (x.views || 0), 0);
  const totalClicks = ads.reduce((a, x) => a + (x.clicks || 0), 0);

  return (
    <section id="iklan">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Iklan Sponsor</h2>
        <span className="text-xs text-zinc-500">
          {ads.length} iklan · {totalViews} view · {totalClicks} klik
        </span>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <p className="text-sm text-zinc-400">
          Iklan yang kamu kelola sendiri (bukan network). Tampil di modal &quot;nonton iklan&quot;
          (penonton tetap dapat {REWARD_PER_AD} koin). Pendapatan dari deal langsung /
          affiliate yang kamu pasang di <strong className="text-zinc-300">Link tujuan</strong>.
          Angka view &amp; klik bisa kamu tunjukkan ke calon pengiklan.
        </p>

        <form onSubmit={onAdd} className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-sm text-zinc-300">URL gambar iklan *</span>
              <span className="block text-xs text-zinc-500">Bentuk apa pun bisa — gambar tampil utuh di kartu dengan latar blur. Landscape (mis. 1200×300) paling rapi. Lihat pratinjau di bawah.</span>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://i.imgur.com/iklan.png"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400 font-mono"
              />
            </label>
            <label className="block">
              <span className="text-sm text-zinc-300">Link tujuan *</span>
              <span className="block text-xs text-zinc-500">Ke mana penonton diarahkan saat klik iklan</span>
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://tokopedia.link/..."
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400 font-mono"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm text-zinc-300">Judul / teks iklan (opsional)</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Diskon 50% di Toko Sebelah!"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
            />
          </label>
          {imageUrl.trim() && (
            <div>
              <p className="text-xs text-zinc-500">
                Pratinjau banner (persis seperti di beranda):
              </p>
              <div className="mt-1 overflow-hidden rounded-2xl border border-zinc-800">
                <AdCreative src={imageUrl} />
              </div>
              <p className="mt-1 text-[11px] text-zinc-600">
                Tampil persis seperti ini di beranda. Gambar landscape (mis. 1200×300) jadi banner penuh; gambar tegak jadi kartu sinematik.
              </p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-black hover:bg-amber-300 disabled:opacity-50"
            >
              {busy ? "Menyimpan…" : "+ Tambah Iklan"}
            </button>
          </div>
        </form>

        {msg && (
          <div
            className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
              msg.type === "ok"
                ? "border-emerald-700 bg-emerald-900/30 text-emerald-300"
                : "border-red-700 bg-red-900/30 text-red-300"
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="mt-5 space-y-2">
          {ads.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Belum ada iklan. Modal akan menampilkan promo DramaKu default.
            </p>
          ) : (
            ads.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.imageUrl}
                  alt=""
                  className="h-12 w-20 shrink-0 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">
                    {a.title || "(tanpa judul)"}
                  </div>
                  <div className="truncate text-xs text-zinc-500">{a.linkUrl}</div>
                  <div className="mt-0.5 text-[11px] text-zinc-400">
                    👁 {a.views} view · 🖱 {a.clicks} klik
                  </div>
                </div>
                <button
                  onClick={() => onDelete(a.id)}
                  className="shrink-0 rounded-md border border-red-900 px-3 py-1 text-xs text-red-400 hover:border-red-500 hover:bg-red-950"
                >
                  Hapus
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
