"use client";

// Atur LINK UNDUHAN tiap video Playly: 4 provider × 2 kualitas. Ini CADANGAN
// MANUAL — jalur utamanya skrip impor CSV (scripts/impor-link-unduhan.ts) dan
// webhook Playly (field `downloads`). Ketiganya memakai validasi yang SAMA
// (lib/playly-unduhan.ts `validasiLinkUnduhan`).
//
// SATU VIDEO TERBUKA PADA SATU WAKTU. Bukan pembatasan gaya: isian yang belum
// disimpan disimpan di satu state `draft`, dan membuka video kedua sementara
// yang pertama masih tergarap akan membuat dua isian saling tertukar tanpa
// peringatan apa pun. Membukanya bergantian membuat keadaan itu mustahil.
//
// Daftar video & link datang dari server sebagai props (halaman ini
// force-dynamic) — satu-satunya panggilan jaringan terjadi saat Simpan ditekan.
import { useState } from "react";
import { Download, Loader2, PencilLine } from "lucide-react";
import type { PlaylyVideo } from "@/lib/playly";
import {
  KUALITAS_UNDUHAN,
  LABEL_PROVIDER,
  PROVIDER_UNDUHAN,
  type DomainUnduhan,
  type KualitasUnduhan,
  type LinkUnduhan,
  type ProviderUnduhan,
} from "@/lib/playly-unduhan";
import { Button } from "@/components/ui/button";

type Pesan = { jenis: "ok" | "gagal"; teks: string };

/** Kunci satu kotak isian: "google|1080p". */
type KunciKotak = `${ProviderUnduhan}|${KualitasUnduhan}`;
type Draft = Partial<Record<KunciKotak, string>>;

const SEMUA_KOTAK = PROVIDER_UNDUHAN.flatMap((provider) =>
  KUALITAS_UNDUHAN.map((quality) => ({ provider, quality, kunci: `${provider}|${quality}` as KunciKotak })),
);

function draftDari(links: LinkUnduhan[], videoId: string): Draft {
  const d: Draft = {};
  for (const l of links) if (l.videoId === videoId) d[`${l.provider}|${l.quality}`] = l.url;
  return d;
}

export default function PlaylyUnduhanManager({
  videos,
  initialLinks,
  domain,
}: {
  /** Seluruh video milik akun kita, termasuk yang sedang disembunyikan. */
  videos: PlaylyVideo[];
  /** Seluruh baris link yang sudah tersimpan. */
  initialLinks: LinkUnduhan[];
  /** Domain yang diizinkan per provider — ditampilkan sebagai petunjuk. */
  domain: DomainUnduhan;
}) {
  const [links, setLinks] = useState<LinkUnduhan[]>(initialLinks);
  const [dibuka, setDibuka] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  /** Alasan penolakan per kotak, dari balasan server. */
  const [salah, setSalah] = useState<Partial<Record<KunciKotak, string>>>({});
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState<Pesan | null>(null);

  const buka = (videoId: string) => {
    setPesan(null);
    setSalah({});
    if (dibuka === videoId) {
      setDibuka(null);
      return;
    }
    setDibuka(videoId);
    setDraft(draftDari(links, videoId));
  };

  const simpan = async (videoId: string) => {
    // Kotak kosong = tidak ada link untuk kombinasi itu (ikut terhapus kalau
    // sebelumnya ada). Urutan kiriman = urutan SEMUA_KOTAK yang terisi, supaya
    // `index` di balasan server bisa dipetakan balik ke kotaknya.
    const terisi = SEMUA_KOTAK.filter((k) => draft[k.kunci]?.trim());
    setMenyimpan(true);
    setPesan(null);
    setSalah({});
    try {
      const res = await fetch("/api/admin/playly/unduhan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          links: terisi.map((k) => ({
            provider: k.provider,
            quality: k.quality,
            url: draft[k.kunci]!.trim(),
          })),
        }),
      });
      const data = (await res.json()) as {
        links?: LinkUnduhan[];
        disimpan?: number;
        ditolak?: { index: number; alasan: string }[];
        error?: string;
      };
      if (!res.ok) {
        const perKotak: Partial<Record<KunciKotak, string>> = {};
        for (const d of data.ditolak ?? []) {
          const k = terisi[d.index];
          if (k) perKotak[k.kunci] = d.alasan;
        }
        setSalah(perKotak);
        setPesan({ jenis: "gagal", teks: data.error ?? "Gagal menyimpan perubahan." });
        return;
      }
      // Daftar terbaru dari server dipakai apa adanya — layar tak menebak hasil.
      setLinks(data.links ?? []);
      setDibuka(null);
      setPesan({
        jenis: "ok",
        teks:
          (data.disimpan ?? 0) > 0
            ? `${data.disimpan} link tersimpan untuk video ini.`
            : "Semua link video ini dihapus. Popup DOWNLOAD-nya kini menyebut \"Link unduhan belum tersedia\".",
      });
    } catch {
      setPesan({
        jenis: "gagal",
        teks: "Tidak bisa menghubungi server. Cek koneksi internet lalu coba lagi.",
      });
    } finally {
      setMenyimpan(false);
    }
  };

  const jumlahPer = (videoId: string) => links.filter((l) => l.videoId === videoId).length;
  const jumlahTerisi = videos.filter((v) => jumlahPer(v.id) > 0).length;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-base font-semibold text-white">Link download per video</h2>
      <p className="mt-1 text-sm text-zinc-400">
        {videos.length === 0
          ? "Belum ada video di akun Playly kita, jadi belum ada yang bisa diisi."
          : `${jumlahTerisi} dari ${videos.length} video sudah punya link. Untuk banyak video sekaligus, pakai skrip impor CSV (npm run impor:unduhan).`}
      </p>

      {pesan && (
        <p
          role="status"
          className={`mt-3 text-sm ${pesan.jenis === "ok" ? "text-emerald-400" : "text-rose-400"}`}
        >
          {pesan.teks}
        </p>
      )}

      {videos.length > 0 && (
        <ul className="mt-4 divide-y divide-zinc-800">
          {videos.map((v) => {
            const jumlah = jumlahPer(v.id);
            const terbuka = dibuka === v.id;
            return (
              <li key={v.id} className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">{v.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                      {jumlah > 0 ? (
                        <>
                          <Download className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                          {jumlah} link
                        </>
                      ) : (
                        "belum ada link"
                      )}
                      <span className="text-zinc-600">· ID {v.id}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => buka(v.id)}
                    aria-expanded={terbuka}
                    className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition ${
                      terbuka
                        ? "border-amber-500/50 text-amber-300"
                        : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                    {terbuka ? "Tutup" : "Atur link"}
                  </button>
                </div>

                {terbuka && (
                  <div className="mt-3 space-y-3">
                    {PROVIDER_UNDUHAN.map((provider) => (
                      <fieldset key={provider} className="rounded-xl border border-zinc-800 p-3">
                        <legend className="px-1 text-xs font-semibold text-zinc-300">
                          {LABEL_PROVIDER[provider]}
                          <span className="ml-2 font-normal text-zinc-500">
                            {domain[provider].length
                              ? domain[provider].join(", ")
                              : `domain belum diatur (env PLAYLY_UNDUHAN_DOMAIN_${provider.toUpperCase()})`}
                          </span>
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {KUALITAS_UNDUHAN.map((quality) => {
                            const kunci: KunciKotak = `${provider}|${quality}`;
                            return (
                              <label key={quality} className="block text-xs text-zinc-400">
                                {quality}
                                <input
                                  type="url"
                                  inputMode="url"
                                  placeholder="https://..."
                                  value={draft[kunci] ?? ""}
                                  onChange={(e) =>
                                    setDraft((d) => ({ ...d, [kunci]: e.target.value }))
                                  }
                                  aria-invalid={Boolean(salah[kunci])}
                                  className={`mt-1 w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 ${
                                    salah[kunci] ? "border-rose-500" : "border-zinc-700"
                                  }`}
                                />
                                {salah[kunci] && (
                                  <span className="mt-1 block text-rose-400">{salah[kunci]}</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    ))}
                    <p className="text-xs text-zinc-500">
                      Kotak dikosongkan = link kombinasi itu dihapus. Link wajib https dan
                      domainnya milik provider yang sama.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => simpan(v.id)}
                        disabled={menyimpan}
                        className="h-9 rounded-full bg-pink-600 px-5 text-xs font-bold text-white hover:bg-pink-500"
                      >
                        {menyimpan && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                        Simpan link
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDibuka(null)}
                        disabled={menyimpan}
                        className="h-9 rounded-full border-zinc-700 bg-transparent px-4 text-xs font-semibold text-zinc-300 hover:border-zinc-500"
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
