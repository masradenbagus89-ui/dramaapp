"use client";

// Atur LINK UNDUHAN tiap video Playly: 5 provider × 2 kualitas. Ini CADANGAN
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
// force-dynamic) — panggilan jaringan hanya terjadi saat Simpan atau tombol
// "Isi dari ..." (Google Drive / Mega) ditekan.
import { useState } from "react";
import { Download, HardDriveDownload, Loader2, PencilLine } from "lucide-react";
import type { PlaylyVideo } from "@/lib/playly";
import KotakCariDaftar from "./KotakCariDaftar";
import PaginasiDaftar from "./PaginasiDaftar";
import { useDaftarAdmin } from "./useDaftarAdmin";
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
import PlaylyUnduhanTabel from "./PlaylyUnduhanTabel";

type Pesan = { jenis: "ok" | "gagal"; teks: string };

/**
 * Sumber isi otomatis. Tiap route membalas bentuk yang sama ({ saran, ganda })
 * dan hanya mengisi kotak milik provider-nya sendiri.
 */
const SUMBER_OTOMATIS = {
  drive: { provider: "google", label: "Google Drive", endpoint: "/api/admin/playly/unduhan/drive" },
  mega: { provider: "mega", label: "Mega", endpoint: "/api/admin/playly/unduhan/mega" },
} as const satisfies Record<string, { provider: ProviderUnduhan; label: string; endpoint: string }>;
type SumberOtomatis = keyof typeof SUMBER_OTOMATIS;

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
  /** Sumber yang sedang dibaca; null = tidak ada. Satu per satu supaya isian tak saling timpa. */
  const [mencari, setMencari] = useState<SumberOtomatis | null>(null);
  const [pesan, setPesan] = useState<Pesan | null>(null);
  /** "tabel" = semua video sekaligus (PlaylyUnduhanTabel); "per-video" = panel lama + isi otomatis Drive/Mega. */
  const [tampilan, setTampilan] = useState<"tabel" | "per-video">("tabel");

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

  /**
   * Isi kotak satu provider dari folder sumbernya (Drive: lib/playly-unduhan-drive.ts,
   * Mega: lib/playly-unduhan-mega.ts). Hanya MENGISI draft — tidak menyimpan.
   * Admin tetap memeriksa lalu menekan Simpan, jadi link salah tak pernah
   * langsung tampil ke penonton.
   */
  const isiOtomatis = async (sumber: SumberOtomatis, videoId: string) => {
    const { provider, label, endpoint } = SUMBER_OTOMATIS[sumber];
    setMencari(sumber);
    setPesan(null);
    setSalah({});
    try {
      const res = await fetch(`${endpoint}?videoId=${encodeURIComponent(videoId)}`);
      const data = (await res.json()) as {
        saran?: { quality: KualitasUnduhan; url: string }[];
        ganda?: { quality: KualitasUnduhan; nama: string[] }[];
        error?: string;
      };
      if (!res.ok) {
        setPesan({ jenis: "gagal", teks: data.error ?? `Gagal membaca ${label}.` });
        return;
      }
      const saran = data.saran ?? [];
      const ganda = data.ganda ?? [];
      setDraft((d) => {
        const baru = { ...d };
        for (const s of saran) baru[`${provider}|${s.quality}`] = s.url;
        return baru;
      });
      const catatanGanda = ganda
        .map((g) => `${g.quality}: ada ${g.nama.length} file cocok (${g.nama.join(", ")}), pilih manual`)
        .join(". ");
      if (saran.length === 0) {
        setPesan({
          jenis: "gagal",
          teks: catatanGanda || `Tidak ada file di folder ${label} yang namanya memuat ID ${videoId} dan 1080p/480p.`,
        });
        return;
      }
      setPesan({
        jenis: "ok",
        teks: `${saran.length} link ${label} terisi (${saran.map((s) => s.quality).join(", ")}). Periksa, lalu tekan Simpan link.${catatanGanda ? " " + catatanGanda + "." : ""}`,
      });
    } catch {
      setPesan({
        jenis: "gagal",
        teks: "Tidak bisa menghubungi server. Cek koneksi internet lalu coba lagi.",
      });
    } finally {
      setMencari(null);
    }
  };

  const jumlahPer = (videoId: string) => links.filter((l) => l.videoId === videoId).length;
  const jumlahTerisi = videos.filter((v) => jumlahPer(v.id) > 0).length;

  // Judul video saja yang dicari — daftar ini tidak memajang kolom lain yang
  // bisa dicocokkan mata admin, jadi mencari di field tersembunyi justru
  // membuat hasilnya terasa acak ("kenapa video ini muncul?").
  const daftar = useDaftarAdmin(videos, (v) => [v.title]);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-base font-semibold text-white">Link download per video</h2>
      <p className="mt-1 text-sm text-zinc-400">
        {videos.length === 0
          ? "Belum ada video di akun Playly kita, jadi belum ada yang bisa diisi."
          : `${jumlahTerisi} dari ${videos.length} video sudah punya link.`}
      </p>

      {videos.length > 0 && (
        <div className="mt-3 inline-flex rounded-full border border-zinc-700 p-0.5 text-xs font-semibold" role="group" aria-label="Cara mengisi link">
          {([
            ["tabel", "Tabel cepat (semua film)"],
            ["per-video", "Per film + isi dari Drive/Mega"],
          ] as const).map(([nilai, label]) => (
            <button
              key={nilai}
              type="button"
              onClick={() => {
                setTampilan(nilai);
                setPesan(null);
                setDibuka(null);
              }}
              aria-pressed={tampilan === nilai}
              className={`rounded-full px-3 py-1.5 transition ${
                tampilan === nilai ? "bg-zinc-100 text-zinc-900" : "text-zinc-300 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {videos.length > 0 && tampilan === "tabel" && (
        <PlaylyUnduhanTabel videos={videos} links={links} domain={domain} onTersimpan={setLinks} />
      )}

      {pesan && tampilan === "per-video" && (
        <p
          role="status"
          className={`mt-3 text-sm ${pesan.jenis === "ok" ? "text-emerald-400" : "text-rose-400"}`}
        >
          {pesan.teks}
        </p>
      )}

      {videos.length > 0 && tampilan === "per-video" && (
        <KotakCariDaftar
          className="mt-4"
          nilai={daftar.ketikan}
          onNilai={daftar.setKetikan}
          jumlah={daftar.tersaring.length}
          total={videos.length}
          placeholder="Cari judul video…"
        />
      )}

      {tampilan === "per-video" && daftar.kosongKarenaCari && (
        <p className="mt-4 text-sm text-zinc-500">
          Tidak ada video yang cocok dengan “{daftar.ketikan}”.{" "}
          <button
            type="button"
            onClick={() => daftar.setKetikan("")}
            className="text-amber-400 underline-offset-2 hover:underline"
          >
            Kosongkan pencarian
          </button>
        </p>
      )}

      {tampilan === "per-video" && daftar.tampil.length > 0 && (
        <ul className="mt-4 divide-y divide-zinc-800">
          {daftar.tampil.map((v) => {
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
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => simpan(v.id)}
                        disabled={menyimpan || mencari !== null}
                        className="h-9 rounded-full bg-pink-600 px-5 text-xs font-bold text-white hover:bg-pink-500"
                      >
                        {menyimpan && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                        Simpan link
                      </Button>
                      {(Object.keys(SUMBER_OTOMATIS) as SumberOtomatis[]).map((sumber) => (
                        <Button
                          key={sumber}
                          type="button"
                          variant="outline"
                          onClick={() => isiOtomatis(sumber, v.id)}
                          disabled={menyimpan || mencari !== null}
                          className="h-9 rounded-full border-zinc-700 bg-transparent px-4 text-xs font-semibold text-zinc-300 hover:border-zinc-500"
                        >
                          {mencari === sumber ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <HardDriveDownload className="size-3.5" aria-hidden="true" />
                          )}
                          Isi dari {SUMBER_OTOMATIS[sumber].label}
                        </Button>
                      ))}
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

      {daftar.tersaring.length > 0 && (
        <PaginasiDaftar
          className="mt-4 border-t border-zinc-800 pt-3"
          total={daftar.tersaring.length}
          halaman={daftar.halaman}
          ukuran={daftar.ukuran}
          onHalaman={daftar.setHalaman}
          onUkuran={daftar.setUkuran}
        />
      )}
    </section>
  );
}
