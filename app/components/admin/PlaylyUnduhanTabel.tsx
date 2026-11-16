"use client";

// TABEL CEPAT link unduhan: semua video × (Google Drive, Telegram, Mega) ×
// (1080p, 480p) di satu layar. Admin menempel link ke kolomnya lalu menekan
// "Simpan semua" SEKALI. Logika murninya di lib/playly-unduhan-tabel.ts.
//
// Kenapa simpan per video (bukan satu kiriman raksasa): memakai ulang
// POST /api/admin/playly/unduhan yang sudah teruji — satu video yang salah
// tak menggagalkan video lain, dan gerbang validasi server tetap satu.
import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, Wand2 } from "lucide-react";
import type { PlaylyVideo } from "@/lib/playly";
import { LABEL_PROVIDER, type DomainUnduhan, type LinkUnduhan } from "@/lib/playly-unduhan";
import type { SaranVideo, StatusSumber } from "@/lib/playly-unduhan-otomatis";
import {
  KOLOM_TABEL,
  PROVIDER_TABEL,
  barisBerubah,
  barisTersimpan,
  cekSel,
  kirimanBaris,
  type BarisTabel,
  type KunciSel,
} from "@/lib/playly-unduhan-tabel";
import { Button } from "@/components/ui/button";

type Pesan = { jenis: "ok" | "gagal"; teks: string };

export default function PlaylyUnduhanTabel({
  videos,
  links,
  domain,
  onTersimpan,
}: {
  videos: PlaylyVideo[];
  links: LinkUnduhan[];
  domain: DomainUnduhan;
  /** Daftar link terbaru dari server sesudah satu video tersimpan. */
  onTersimpan: (links: LinkUnduhan[]) => void;
}) {
  /** Hanya baris yang sedang diubah; baris lain dibaca dari `links`. */
  const [ubahan, setUbahan] = useState<Record<string, BarisTabel>>({});
  /** Alasan gagal simpan per video, dari server. */
  const [gagal, setGagal] = useState<Record<string, string>>({});
  const [cari, setCari] = useState("");
  const [belumLengkap, setBelumLengkap] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState<Pesan | null>(null);
  const [mencocokkan, setMencocokkan] = useState(false);
  /** Catatan "Cocokkan semua" per video (file ganda yang sengaja tak dipilih). */
  const [catatan, setCatatan] = useState<Record<string, string>>({});

  const tersimpan = useMemo(() => {
    const peta: Record<string, BarisTabel> = {};
    for (const v of videos) peta[v.id] = barisTersimpan(links, v.id);
    return peta;
  }, [videos, links]);

  const barisDari = (id: string) => ubahan[id] ?? tersimpan[id] ?? {};
  const berubahIds = videos
    .map((v) => v.id)
    .filter((id) => ubahan[id] && barisBerubah(tersimpan[id] ?? {}, ubahan[id]));

  // Peringatan bawaan browser kalau halaman ditutup sementara ada isian belum disimpan.
  const adaBelumDisimpan = berubahIds.length > 0;
  useEffect(() => {
    if (!adaBelumDisimpan) return;
    const tahan = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", tahan);
    return () => window.removeEventListener("beforeunload", tahan);
  }, [adaBelumDisimpan]);

  const ubahSel = (id: string, kunci: KunciSel, isi: string) => {
    setUbahan((u) => ({ ...u, [id]: { ...(u[id] ?? tersimpan[id] ?? {}), [kunci]: isi } }));
    setGagal(({ [id]: _, ...sisa }) => sisa);
  };

  const kataCari = cari.trim().toLowerCase();
  const tampil = videos.filter((v) => {
    if (kataCari && !v.title.toLowerCase().includes(kataCari) && !v.id.includes(kataCari)) return false;
    if (belumLengkap) return KOLOM_TABEL.some(({ kunci }) => !barisDari(v.id)[kunci]?.trim());
    return true;
  });

  const adaSelSalah = (id: string) =>
    KOLOM_TABEL.some(({ provider, kunci }) => cekSel(provider, barisDari(id)[kunci], domain) !== null);

  const simpanSemua = async () => {
    setMenyimpan(true);
    setPesan(null);
    let berhasil = 0;
    let terbaru = links;
    const gagalBaru: Record<string, string> = {};
    // Berurutan, bukan serentak: route dibatasi 60 simpanan/menit per admin.
    for (const id of berubahIds) {
      if (adaSelSalah(id)) {
        gagalBaru[id] = "Ada link yang salah (kotak merah). Betulkan dulu.";
        continue;
      }
      try {
        const res = await fetch("/api/admin/playly/unduhan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: id, links: kirimanBaris(terbaru, id, ubahan[id]) }),
        });
        const data = (await res.json()) as { links?: LinkUnduhan[]; error?: string };
        if (res.status === 429) {
          gagalBaru[id] = "Terlalu banyak simpanan dalam 1 menit. Tunggu sebentar, lalu klik Simpan semua lagi.";
          break;
        }
        if (!res.ok) {
          gagalBaru[id] = data.error ?? "Gagal menyimpan.";
          continue;
        }
        terbaru = data.links ?? terbaru;
        onTersimpan(terbaru);
        setUbahan(({ [id]: _, ...sisa }) => sisa);
        berhasil++;
      } catch {
        gagalBaru[id] = "Tidak bisa menghubungi server. Cek internet lalu coba lagi.";
        break;
      }
    }
    setGagal(gagalBaru);
    const jumlahGagal = Object.keys(gagalBaru).length;
    setPesan(
      jumlahGagal === 0
        ? { jenis: "ok", teks: `Beres: link ${berhasil} film tersimpan.` }
        : {
            jenis: "gagal",
            teks: `${berhasil} film tersimpan, ${jumlahGagal} film belum (lihat tulisan merah di barisnya).`,
          },
    );
    setMenyimpan(false);
  };

  /**
   * Baca folder Drive + Mega sekali, lalu isi kotak KOSONG semua film.
   * Kotak yang sudah berisi (tersimpan atau sedang diketik) tidak ditimpa.
   * Tidak menyimpan apa pun — admin memeriksa lalu menekan "Simpan semua".
   */
  const cocokkanSemua = async () => {
    setMencocokkan(true);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/playly/unduhan/cocokkan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos: videos.map(({ id, title }) => ({ id, title })) }),
      });
      const data = (await res.json()) as {
        hasil?: Record<string, SaranVideo>;
        sumber?: StatusSumber[];
        error?: string;
      };
      if (!res.ok) {
        setPesan({ jenis: "gagal", teks: data.error ?? "Gagal mencocokkan link." });
        return;
      }
      const baru = { ...ubahan };
      const catatanBaru: Record<string, string> = {};
      let jumlahLink = 0;
      const filmTerisi = new Set<string>();
      for (const [id, cocok] of Object.entries(data.hasil ?? {})) {
        if (!tersimpan[id]) continue; // video yang tak ada di layar ini
        const baris = { ...(baru[id] ?? tersimpan[id]) };
        for (const sr of cocok.saran) {
          if (!(PROVIDER_TABEL as readonly string[]).includes(sr.provider)) continue;
          const kunci = `${sr.provider}|${sr.quality}` as KunciSel;
          if (baris[kunci]?.trim()) continue;
          baris[kunci] = sr.url;
          jumlahLink++;
          filmTerisi.add(id);
        }
        if (filmTerisi.has(id)) baru[id] = baris;
        if (cocok.ganda.length) {
          catatanBaru[id] = cocok.ganda
            .map((g) => `${LABEL_PROVIDER[g.provider]} ${g.quality}: ${g.nama.length} file cocok (${g.nama.join(", ")}), isi manual`)
            .join(" · ");
        }
      }
      setUbahan(baru);
      setCatatan(catatanBaru);
      const masalahSumber = (data.sumber ?? [])
        .filter((x) => x.status !== "ok")
        .map((x) => ("alasan" in x ? x.alasan : ""))
        .join(" ");
      setPesan(
        jumlahLink > 0
          ? {
              jenis: "ok",
              teks: `${jumlahLink} link terisi untuk ${filmTerisi.size} film (kotak kuning). Periksa dulu, lalu klik Simpan semua.${masalahSumber ? " Catatan: " + masalahSumber : ""}`,
            }
          : {
              jenis: "gagal",
              teks: `Tidak ada link baru yang cocok. Pastikan nama file diawali judul film lalu 1080p/480p, mis. "Americana (2025) 1080p.mp4".${masalahSumber ? " " + masalahSumber : ""}`,
            },
      );
    } catch {
      setPesan({ jenis: "gagal", teks: "Tidak bisa menghubungi server. Cek internet lalu coba lagi." });
    } finally {
      setMencocokkan(false);
    }
  };

  const belumLengkapJumlah = videos.filter((v) => KOLOM_TABEL.some(({ kunci }) => !barisDari(v.id)[kunci]?.trim())).length;

  return (
    <div className="mt-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          <Wand2 className="size-4 text-amber-300" aria-hidden="true" />
          Cocokkan semua link sekaligus
        </p>
        <p className="mt-0.5 text-xs text-zinc-400">
          <span className="font-semibold text-amber-300">{belumLengkapJumlah}</span> film belum lengkap
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-400">
          <li>
            Mencari otomatis di folder <b className="text-zinc-200">Google Drive</b> dan <b className="text-zinc-200">Mega</b>,
            lalu <b className="text-zinc-200">mengisi kotak yang masih kosong</b>. Belum disimpan — kamu periksa dulu.
          </li>
          <li>
            Nama file harus diawali <b className="text-zinc-200">judul film</b> lalu <b className="text-zinc-200">1080p</b> atau{" "}
            <b className="text-zinc-200">480p</b>, mis. <code className="text-zinc-300">Americana (2025) 1080p.mp4</code>.
          </li>
          <li>Kotak yang sudah berisi tidak ditimpa. Link Telegram tetap ditempel sendiri.</li>
        </ul>
        <Button
          type="button"
          onClick={cocokkanSemua}
          disabled={mencocokkan || menyimpan}
          className="mt-3 h-9 rounded-full bg-amber-400 px-5 text-xs font-bold text-zinc-900 hover:bg-amber-300"
        >
          {mencocokkan ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Search className="size-3.5" aria-hidden="true" />}
          {mencocokkan ? "Mencari di Drive & Mega…" : "Cocokkan semua"}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="relative min-w-48 flex-1">
          <span className="sr-only">Cari judul film</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari judul film…"
            className="h-9 w-full rounded-full border border-zinc-700 bg-zinc-950 pl-8 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input type="checkbox" checked={belumLengkap} onChange={(e) => setBelumLengkap(e.target.checked)} />
          Hanya yang belum lengkap
        </label>
        <Button
          type="button"
          onClick={simpanSemua}
          disabled={menyimpan || berubahIds.length === 0}
          className="h-9 rounded-full bg-pink-600 px-5 text-xs font-bold text-white hover:bg-pink-500"
        >
          {menyimpan && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
          {berubahIds.length > 0 ? `Simpan semua (${berubahIds.length} film)` : "Simpan semua"}
        </Button>
      </div>

      {pesan && (
        <p role="status" className={`mt-3 text-sm ${pesan.jenis === "ok" ? "text-emerald-400" : "text-rose-400"}`}>
          {pesan.teks}
        </p>
      )}

      <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[960px] text-left text-xs">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-3 py-2 font-semibold">Film</th>
              {KOLOM_TABEL.map(({ provider, quality, kunci }) => (
                <th key={kunci} className="px-2 py-2 font-semibold">
                  {LABEL_PROVIDER[provider]} {quality}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {tampil.map((v) => {
              const baris = barisDari(v.id);
              const berubah = berubahIds.includes(v.id);
              return (
                <tr key={v.id} className={berubah ? "bg-amber-500/5" : undefined}>
                  <td className="max-w-56 px-3 py-2 align-top">
                    <p className="truncate font-medium text-zinc-100" title={v.title}>{v.title}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      {berubah ? <span className="text-amber-300">belum disimpan</span> : `ID ${v.id}`}
                    </p>
                    {gagal[v.id] && <p className="mt-1 text-[11px] text-rose-400">{gagal[v.id]}</p>}
                    {catatan[v.id] && <p className="mt-1 text-[11px] text-amber-300">{catatan[v.id]}</p>}
                  </td>
                  {KOLOM_TABEL.map(({ provider, quality, kunci }) => {
                    const isi = baris[kunci] ?? "";
                    const salah = cekSel(provider, isi, domain);
                    return (
                      <td key={kunci} className="px-2 py-2 align-top">
                        <div className="relative">
                          <input
                            type="url"
                            value={isi}
                            onChange={(e) => ubahSel(v.id, kunci, e.target.value)}
                            placeholder="tempel link"
                            aria-label={`${v.title} — ${LABEL_PROVIDER[provider]} ${quality}`}
                            aria-invalid={salah !== null}
                            title={salah ?? isi}
                            className={`h-8 w-full rounded-md border bg-zinc-950 px-2 pr-6 text-[11px] text-zinc-100 placeholder:text-zinc-700 ${
                              salah ? "border-rose-500" : "border-zinc-700"
                            }`}
                          />
                          {isi.trim() && !salah && (
                            <Check className="absolute right-1.5 top-1/2 size-3.5 -translate-y-1/2 text-emerald-400" aria-hidden="true" />
                          )}
                        </div>
                        {salah && <p className="mt-1 text-[10px] leading-tight text-rose-400">{salah}</p>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {tampil.length === 0 && <p className="p-4 text-sm text-zinc-500">Tidak ada film yang cocok.</p>}
      </div>
    </div>
  );
}
