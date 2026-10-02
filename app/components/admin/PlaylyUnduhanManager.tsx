"use client";

// Atur PROVIDER UNDUHAN tiap video Playly (Google Share / Telegram / Cast /
// Mega / Sendcm / ...). Inilah satu-satunya tempat link unduhan video Playly
// bisa diisi: akses DDL & dashboard database masih tertutup sejak 2026-09-22
// (lib/unduhan.ts:13-17), jadi jalur tulis yang hidup cuma panel ini.
//
// SATU VIDEO TERBUKA PADA SATU WAKTU. Bukan pembatasan gaya: isian yang belum
// disimpan disimpan di satu state `draft`, dan membuka video kedua sementara
// yang pertama masih tergarap akan membuat dua daftar saling tertukar tanpa
// peringatan apa pun. Membukanya bergantian membuat keadaan itu mustahil,
// bukan sekadar jarang.
//
// Daftar videonya datang dari server sebagai props (halaman ini force-dynamic),
// sama seperti PlaylyVisibilityManager — jadi tidak ada kedipan "memuat", dan
// satu-satunya panggilan jaringan terjadi saat tombol Simpan ditekan.
import { useState } from "react";
import { Download, Loader2, PencilLine } from "lucide-react";
import type { PlaylyVideo } from "@/lib/playly";
import type { PetaUnduhanPlayly } from "@/lib/playly-unduhan";
import type { DownloadProvider } from "@/lib/types";
import DownloadProviderFields from "./DownloadProviderFields";
import { Button } from "@/components/ui/button";

type Pesan = { jenis: "ok" | "gagal"; teks: string };

const KETERANGAN_PLAYLY =
  "Dibiarkan KOSONG = tombol DOWNLOAD di bawah pemutar tetap seperti sekarang " +
  "(mengaku belum tersedia). Begitu ada minimal satu baris dengan nama + " +
  "alamat yang sah, tombol itu berubah jadi pembuka panel pilihan provider. " +
  "Baris yang nama/alamatnya belum lengkap akan dibuang saat disimpan — bukan " +
  "disimpan setengah jadi.";

export default function PlaylyUnduhanManager({
  videos,
  initialUnduhan,
}: {
  /** Seluruh video milik akun kita, termasuk yang sedang disembunyikan. */
  videos: PlaylyVideo[];
  /** Peta videoId -> provider yang sudah tersimpan. */
  initialUnduhan: PetaUnduhanPlayly;
}) {
  const [peta, setPeta] = useState<PetaUnduhanPlayly>(initialUnduhan);
  const [dibuka, setDibuka] = useState<string | null>(null);
  const [draft, setDraft] = useState<DownloadProvider[]>([]);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState<Pesan | null>(null);

  const buka = (videoId: string) => {
    setPesan(null);
    if (dibuka === videoId) {
      setDibuka(null);
      return;
    }
    setDibuka(videoId);
    // Disalin, bukan dipakai langsung: mengedit array milik `peta` berarti
    // layar ikut berubah sebelum ada yang menekan Simpan — dan tombol Batal
    // jadi tidak bisa mengembalikan apa pun.
    setDraft((peta[videoId] ?? []).map((p) => ({ ...p })));
  };

  const simpan = async (videoId: string) => {
    setMenyimpan(true);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/playly/unduhan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, providers: draft }),
      });
      const data = (await res.json()) as {
        unduhan?: PetaUnduhanPlayly;
        disimpan?: number;
        dibuang?: number;
        error?: string;
      };
      if (!res.ok) {
        setPesan({ jenis: "gagal", teks: data.error ?? "Gagal menyimpan perubahan." });
        return;
      }
      // Peta terbaru datang dari server — dipakai apa adanya, jadi layar tidak
      // pernah menebak hasilnya sendiri.
      setPeta(data.unduhan ?? {});
      setDibuka(null);
      // Baris yang dibuang penyaring DISEBUT, tidak hilang diam-diam: tanpa ini
      // admin mengira alamat yang salah ketik sudah tersimpan.
      const dibuang = data.dibuang ?? 0;
      setPesan({
        jenis: dibuang > 0 ? "gagal" : "ok",
        teks:
          dibuang > 0
            ? `${data.disimpan ?? 0} provider tersimpan, ${dibuang} baris DIBUANG karena nama kosong atau alamatnya tidak diawali http:// atau https://.`
            : (data.disimpan ?? 0) > 0
              ? `${data.disimpan} provider tersimpan untuk video ini.`
              : "Provider video ini dikosongkan. Tombol DOWNLOAD kembali ke perilaku sebelumnya.",
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

  const jumlahTerisi = videos.filter((v) => (peta[v.id]?.length ?? 0) > 0).length;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-base font-semibold text-white">
        Provider download per video
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        {videos.length === 0
          ? "Belum ada video di akun Playly kita, jadi belum ada yang bisa diisi."
          : `${jumlahTerisi} dari ${videos.length} video sudah punya link provider. Video yang belum diisi tetap tampil seperti biasa — hanya tombol DOWNLOAD-nya yang belum aktif.`}
      </p>

      {pesan && (
        <p
          role="status"
          className={`mt-3 text-sm ${
            pesan.jenis === "ok" ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {pesan.teks}
        </p>
      )}

      {videos.length > 0 && (
        <ul className="mt-4 divide-y divide-zinc-800">
          {videos.map((v) => {
            const jumlah = peta[v.id]?.length ?? 0;
            const terbuka = dibuka === v.id;
            return (
              <li key={v.id} className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">
                      {v.title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                      {jumlah > 0 ? (
                        <>
                          <Download className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                          {jumlah} provider
                        </>
                      ) : (
                        "belum ada link provider"
                      )}
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
                    {terbuka ? "Tutup" : "Atur provider"}
                  </button>
                </div>

                {terbuka && (
                  <div>
                    <DownloadProviderFields
                      providers={draft}
                      setProviders={setDraft}
                      judul={`Provider download — ${v.title}`}
                      keterangan={KETERANGAN_PLAYLY}
                      kualitasOpsional
                    />
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => simpan(v.id)}
                        disabled={menyimpan}
                        className="h-9 rounded-full bg-pink-600 px-5 text-xs font-bold text-white hover:bg-pink-500"
                      >
                        {menyimpan && (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        )}
                        Simpan provider
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
