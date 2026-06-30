"use client";

import { useEffect, useState } from "react";
import { REWARD_PER_AD } from "@/lib/coins";
import AdCreative from "./AdCreative";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-white">Iklan Sponsor</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-zinc-400">
            {ads.length} iklan
          </Badge>
          <Badge variant="secondary" className="text-zinc-400">
            {totalViews} view
          </Badge>
          <Badge variant="secondary" className="text-zinc-400">
            {totalClicks} klik
          </Badge>
        </div>
      </div>

      <Card className="rounded-2xl border-zinc-800 bg-zinc-900/40 py-0">
        <CardContent className="p-5">
          <p className="text-sm text-zinc-400">
            Iklan yang kamu kelola sendiri (bukan network). Tampil di modal &quot;nonton iklan&quot;
            (penonton tetap dapat {REWARD_PER_AD} koin). Pendapatan dari deal langsung /
            affiliate yang kamu pasang di <strong className="text-zinc-300">Link tujuan</strong>.
            Angka view &amp; klik bisa kamu tunjukkan ke calon pengiklan.
          </p>

          <form onSubmit={onAdd} className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="ad-image-url" className="text-sm text-zinc-300">
                  URL gambar iklan *
                </Label>
                <span className="block text-xs text-zinc-500">Bentuk apa pun bisa — gambar tampil utuh di kartu dengan latar blur. Landscape (mis. 1200×300) paling rapi. Lihat pratinjau di bawah.</span>
                <Input
                  id="ad-image-url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://i.imgur.com/iklan.png"
                  className="rounded-lg border-zinc-700 bg-zinc-900 font-mono text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ad-link-url" className="text-sm text-zinc-300">
                  Link tujuan *
                </Label>
                <span className="block text-xs text-zinc-500">Ke mana penonton diarahkan saat klik iklan</span>
                <Input
                  id="ad-link-url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://tokopedia.link/..."
                  className="rounded-lg border-zinc-700 bg-zinc-900 font-mono text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ad-title" className="text-sm text-zinc-300">
                Judul / teks iklan (opsional)
              </Label>
              <Input
                id="ad-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Diskon 50% di Toko Sebelah!"
                className="rounded-lg border-zinc-700 bg-zinc-900 text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0"
              />
            </div>
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
              <Button
                type="submit"
                disabled={busy}
                className="rounded-full bg-amber-400 px-5 font-bold text-black hover:bg-amber-300"
              >
                {busy ? "Menyimpan…" : "+ Tambah Iklan"}
              </Button>
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
                <Card
                  key={a.id}
                  className="flex-row items-center gap-3 rounded-xl border-zinc-800 bg-zinc-900/40 p-2"
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
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-[11px] text-zinc-400">
                        👁 {a.views} view
                      </Badge>
                      <Badge variant="secondary" className="text-[11px] text-zinc-400">
                        🖱 {a.clicks} klik
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(a.id)}
                    className="shrink-0 rounded-md border-red-900 text-xs text-red-400 hover:border-red-500 hover:bg-red-950 hover:text-red-400"
                  >
                    Hapus
                  </Button>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
