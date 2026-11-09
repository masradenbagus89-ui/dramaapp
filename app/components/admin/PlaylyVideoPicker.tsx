"use client";

// Pemilih video Playly untuk admin: lihat daftar -> pilih satu -> kaitkan ke
// drama DramaKu -> tersimpan dan langsung tampil di halaman publik.
//
// Daftarnya diambil dari /api/admin/playly/videos, yaitu jalur milik DramaKu
// sendiri. Server kita yang memanggil Playly memakai kunci tersimpan; browser
// admin tidak pernah menerima kunci itu.
//
// Empat keadaan tampilan sengaja dibedakan supaya tidak ada layar kosong yang
// membingungkan: sedang memuat / gagal / belum ada video / berhasil.
import { useCallback, useEffect, useRef, useState } from "react";
import KotakCariDaftar from "./KotakCariDaftar";
import PaginasiDaftar from "./PaginasiDaftar";
import { useDaftarAdmin } from "./useDaftarAdmin";
import PilihTampilanDaftar, { useTampilanDaftar } from "./PilihTampilanDaftar";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Film,
  Link2,
  Loader2,
  RefreshCw,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import EmbedPlayer from "@/app/components/EmbedPlayer";
import { cn } from "@/lib/utils";
import type { PlaylyVideo } from "@/lib/playly";
import type { PlaylyEmbed } from "@/lib/store";

type Status = "loading" | "error" | "empty" | "ready";
type Pesan = { type: "ok" | "error"; text: string };

export type PilihanDrama = { id: string; title: string; episodes: number };

/** Kode tempel yang bisa disalin admin kalau mau memasang video di tempat lain. */
function kodeIframe(video: { embedUrl: string; title: string }): string {
  return `<iframe src="${video.embedUrl}" title="${video.title}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen loading="lazy" style="border:0;width:100%;aspect-ratio:16/9"></iframe>`;
}

export default function PlaylyVideoPicker({
  dramas,
  initialEmbeds,
}: {
  dramas: PilihanDrama[];
  initialEmbeds: PlaylyEmbed[];
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [videos, setVideos] = useState<PlaylyVideo[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  // Catatan dari server saat daftar TIDAK datang dari kunci mitra (mis. kunci
  // belum dipasang / ditolak, jadi dipakai katalog publik Playly).
  const [catatan, setCatatan] = useState("");

  const [aktif, setAktif] = useState<PlaylyVideo | null>(null);
  const [dramaId, setDramaId] = useState("");
  const [episode, setEpisode] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState<Pesan | null>(null);
  const [tersalin, setTersalin] = useState(false);

  const [embeds, setEmbeds] = useState<PlaylyEmbed[]>(initialEmbeds);
  const [melepas, setMelepas] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);

  // Judul video saja — itu satu-satunya teks yang tergambar di tiap petak,
  // jadi mencari di field lain membuat hasilnya terasa acak bagi admin.
  const daftar = useDaftarAdmin(videos, (v) => [v.title]);
  const [tampilan, setTampilan] = useTampilanDaftar("admin:tampilan:playly-video");

  const muat = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    setCatatan("");
    try {
      const res = await fetch("/api/admin/playly/videos", { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        videos?: PlaylyVideo[];
        error?: string;
        note?: string | null;
      };

      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? `Gagal memuat daftar video (HTTP ${res.status}).`);
        setStatus("error");
        return;
      }

      const list = data.videos ?? [];
      setCatatan(data.note ?? "");
      setVideos(list);
      setStatus(list.length > 0 ? "ready" : "empty");
    } catch {
      setErrorMsg("Tidak bisa menghubungi server DramaKu. Cek koneksi lalu coba lagi.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  const pilih = (v: PlaylyVideo) => {
    setAktif(v);
    setPesan(null);
    setTersalin(false);
    // Kalau video ini sudah pernah dikaitkan, isi ulang pilihannya supaya admin
    // melihat kondisi sekarang, bukan form kosong.
    const lama = embeds.find((e) => e.videoId === v.id);
    setDramaId(lama?.dramaId ?? "");
    setEpisode(lama?.episode ? String(lama.episode) : "");
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const simpanKaitan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aktif) return;
    setPesan(null);

    if (!dramaId) {
      setPesan({ type: "error", text: "Pilih dulu drama DramaKu yang mau dikaitkan." });
      return;
    }

    setMenyimpan(true);
    try {
      const res = await fetch("/api/admin/playly/embeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: aktif.id,
          dramaId,
          episode: episode.trim() === "" ? null : episode.trim(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        embed?: PlaylyEmbed;
        dramaTitle?: string;
        error?: string;
      };

      if (!res.ok || !data.ok || !data.embed) {
        setPesan({
          type: "error",
          text: data.error ?? `Gagal menyimpan kaitan (HTTP ${res.status}).`,
        });
        return;
      }

      const baru = data.embed;
      setEmbeds((sebelum) => [baru, ...sebelum.filter((x) => x.videoId !== baru.videoId)]);
      setPesan({
        type: "ok",
        text: `Video "${baru.title}" sudah dikaitkan ke drama ${
          data.dramaTitle ?? baru.dramaId
        }. Sekarang tampil di halaman Discover.`,
      });
    } catch {
      setPesan({ type: "error", text: "Koneksi ke server DramaKu gagal. Coba lagi." });
    } finally {
      setMenyimpan(false);
    }
  };

  const lepasKaitan = async (embed: PlaylyEmbed) => {
    const setuju = confirm(
      `Lepas video "${embed.title}" dari drama ${embed.dramaId}?\n\nVideo tidak akan tampil lagi di halaman publik. Video aslinya di Playly TIDAK ikut terhapus.`,
    );
    if (!setuju) return;

    setMelepas(embed.videoId);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/playly/embeds", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: embed.videoId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setPesan({
          type: "error",
          text: data.error ?? `Gagal melepas kaitan (HTTP ${res.status}).`,
        });
        return;
      }
      setEmbeds((sebelum) => sebelum.filter((x) => x.videoId !== embed.videoId));
      setPesan({ type: "ok", text: `Kaitan video "${embed.title}" sudah dilepas.` });
    } catch {
      setPesan({ type: "error", text: "Koneksi ke server DramaKu gagal. Coba lagi." });
    } finally {
      setMelepas(null);
    }
  };

  const salinKode = async () => {
    if (!aktif) return;
    try {
      await navigator.clipboard.writeText(kodeIframe(aktif));
      setTersalin(true);
      window.setTimeout(() => setTersalin(false), 2500);
    } catch {
      setPesan({
        type: "error",
        text: "Browser menolak menyalin otomatis. Blok kodenya bisa disorot lalu disalin manual.",
      });
    }
  };

  const judulDrama = (id: string) => dramas.find((d) => d.id === id)?.title ?? id;

  return (
    <div className="space-y-6">
      {/* ============ Panel video terpilih ============ */}
      <div ref={panelRef} className="scroll-mt-4">
        {aktif && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="text-sm font-bold text-white">Video terpilih</h2>

            <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <EmbedPlayer src={aktif.embedUrl} title={aktif.title} />
                <h3 className="mt-3 text-base font-semibold text-white">{aktif.title}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {aktif.durationLabel}
                  </span>
                  {aktif.creator && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" aria-hidden="true" />
                      {aktif.creator}
                    </span>
                  )}
                </p>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-zinc-300">Kode tempel (iframe)</p>
                  <code className="mt-1 block max-h-24 overflow-auto rounded-lg bg-black/40 p-2 text-[11px] leading-relaxed text-zinc-300">
                    {kodeIframe(aktif)}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void salinKode()}
                    className="mt-2 min-h-11 rounded-full px-4 text-xs font-semibold"
                  >
                    {tersalin ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                    {tersalin ? "Tersalin" : "Salin kode"}
                  </Button>
                  <p className="mt-2 text-[11px] text-zinc-500">
                    Untuk menampilkannya di DramaKu, kode ini tidak perlu ditempel
                    manual — cukup pilih dramanya di sebelah lalu simpan.
                  </p>
                </div>
              </div>

              {/* --- Form kaitkan ke drama --- */}
              <form onSubmit={simpanKaitan} className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                <Label htmlFor="kait-drama" className="text-zinc-300">
                  Kaitkan ke drama
                </Label>
                <select
                  id="kait-drama"
                  value={dramaId}
                  onChange={(e) => setDramaId(e.target.value)}
                  className="mt-2 min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white focus-visible:border-amber-400 focus-visible:outline-none"
                >
                  <option value="">— pilih drama —</option>
                  {dramas.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>

                <Label htmlFor="kait-episode" className="mt-4 block text-zinc-300">
                  Episode ke- <span className="text-zinc-500">(boleh dikosongkan)</span>
                </Label>
                <Input
                  id="kait-episode"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={episode}
                  onChange={(e) => setEpisode(e.target.value)}
                  placeholder="mis. 3"
                  aria-describedby="kait-episode-bantuan"
                  className="mt-2 min-h-11 rounded-lg border-zinc-700 bg-zinc-900 text-white focus-visible:border-amber-400 focus-visible:ring-0"
                />
                <p id="kait-episode-bantuan" className="mt-2 text-xs text-zinc-500">
                  Diisi kalau video ini episode tertentu. Dikosongkan berarti video
                  tambahan (cuplikan, trailer, dan sejenisnya).
                </p>

                {dramas.length === 0 && (
                  <p className="mt-3 text-xs text-amber-200">
                    Katalog DramaKu masih kosong. Tambahkan minimal satu drama dulu di
                    halaman admin utama.
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={menyimpan || dramas.length === 0}
                  className="mt-4 min-h-11 w-full rounded-full px-5 text-sm font-semibold"
                >
                  {menyimpan ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  Simpan kaitan
                </Button>
              </form>
            </div>

            <div aria-live="polite" className="mt-4 empty:mt-0">
              {pesan && (
                <p
                  className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
                    pesan.type === "ok"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                      : "border-rose-500/40 bg-rose-500/10 text-rose-100"
                  }`}
                >
                  {pesan.type === "ok" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>{pesan.text}</span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ============ Daftar video dari Playly ============ */}
      <section aria-labelledby="judul-daftar-playly">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="judul-daftar-playly" className="text-lg font-bold text-white">
            Daftar video Playly
          </h2>
          <Button
            type="button"
            variant="outline"
            onClick={() => void muat()}
            disabled={status === "loading"}
            className="min-h-11 rounded-full px-4 text-xs font-semibold"
          >
            <RefreshCw
              className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Muat ulang
          </Button>
        </div>

        {/* 0) Dari mana daftar ini datang — hanya muncul kalau BUKAN jalur mitra */}
        {catatan && status !== "loading" && status !== "error" && (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{catatan}</span>
          </p>
        )}

        {/* 1) Sedang memuat */}
        {status === "loading" && (
          <div
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy="true"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-zinc-800" />
            ))}
          </div>
        )}

        {/* 2) Gagal */}
        {status === "error" && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-5">
            <p className="flex items-start gap-2 text-sm text-rose-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errorMsg}</span>
            </p>
            <Button
              onClick={() => void muat()}
              className="mt-4 min-h-11 rounded-full px-5 text-sm font-semibold"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Coba lagi
            </Button>
          </div>
        )}

        {/* 3) Belum ada video */}
        {status === "empty" && (
          <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900 p-6 text-center">
            <Film className="mx-auto h-8 w-8 text-zinc-500" aria-hidden="true" />
            <p className="mt-3 text-sm text-zinc-300">
              Sambungan ke Playly berhasil, tapi belum ada video yang bisa diambil.
            </p>
          </div>
        )}

        {/* 4) Berhasil */}
        {status === "ready" && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <KotakCariDaftar
              className="min-w-0 flex-1"
              nilai={daftar.ketikan}
              onNilai={daftar.setKetikan}
              jumlah={daftar.tersaring.length}
              total={videos.length}
              placeholder="Cari judul video…"
            />
            <PilihTampilanDaftar nilai={tampilan} onNilai={setTampilan} />
          </div>
        )}

        {status === "ready" && daftar.kosongKarenaCari && (
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

        {status === "ready" && daftar.tampil.length > 0 && (
          // Satu daftar, dua bentuk. Yang berubah cuma KELASnya — isi tiap
          // baris tetap komponen yang sama, jadi perubahan (mis. badge
          // "Terpasang") tidak perlu ditulis dua kali lalu menyimpang.
          <ul
            className={
              tampilan === "petak"
                ? "mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                : "mt-4 divide-y divide-zinc-800 rounded-xl border border-zinc-800"
            }
          >
            {daftar.tampil.map((v) => {
              const dipilih = aktif?.id === v.id;
              const sudahDikaitkan = embeds.find((e) => e.videoId === v.id);
              const baris = tampilan === "baris";
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => pilih(v)}
                    aria-current={dipilih ? "true" : undefined}
                    className={cn(
                      "group w-full overflow-hidden text-left transition",
                      baris
                        ? "flex items-center gap-3 px-3 py-2"
                        : "rounded-xl border",
                      dipilih
                        ? baris
                          ? "bg-amber-400/10"
                          : "border-amber-400 ring-2 ring-amber-400/40"
                        : baris
                          ? "hover:bg-zinc-800/60"
                          : "border-zinc-800 hover:border-zinc-600",
                    )}
                  >
                    <div
                      className={cn(
                        "relative bg-zinc-800",
                        // Sampul dikecilkan di mode baris, bukan dihilangkan:
                        // sampul adalah cara tercepat mengenali film, dan
                        // membuangnya menghapus satu-satunya keunggulan daftar
                        // ini dibanding tabel biasa.
                        baris
                          ? "h-12 w-20 shrink-0 overflow-hidden rounded"
                          : "aspect-video w-full",
                      )}
                    >
                      {v.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.thumbnail}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Film className="h-7 w-7 text-zinc-600" aria-hidden="true" />
                        </div>
                      )}
                      {/* Di mode baris, durasi & badge pindah ke kolom teks:
                          di atas sampul 80px keduanya saling menimpa sampai
                          tak terbaca. */}
                      {!baris && (
                        <>
                          <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-zinc-100">
                            {v.durationLabel}
                          </span>
                          {sudahDikaitkan && (
                            <span className="absolute left-1 top-1 rounded bg-emerald-500/90 px-1.5 py-0.5 text-[11px] font-semibold text-black">
                              Terpasang
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className={baris ? "min-w-0 flex-1" : "p-3"}>
                      <p
                        className={cn(
                          "text-sm font-semibold text-zinc-100",
                          baris ? "truncate" : "line-clamp-2",
                        )}
                      >
                        {v.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-zinc-400">
                        {baris && (
                          <>
                            <span className="shrink-0 tabular-nums text-zinc-300">
                              {v.durationLabel}
                            </span>
                            <span aria-hidden="true" className="text-zinc-600">
                              ·
                            </span>
                          </>
                        )}
                        <span className="truncate">
                          {v.creator || "Kreator tidak dicantumkan"}
                        </span>
                      </p>
                      {sudahDikaitkan && (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-emerald-300">
                          Terpasang di: {judulDrama(sudahDikaitkan.dramaId)}
                          {sudahDikaitkan.episode ? ` · Eps ${sudahDikaitkan.episode}` : ""}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {status === "ready" && daftar.tersaring.length > 0 && (
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

      {/* ============ Kaitan yang sudah tersimpan ============ */}
      <section aria-labelledby="judul-kaitan-tersimpan">
        <h2 id="judul-kaitan-tersimpan" className="text-lg font-bold text-white">
          Video yang sudah terpasang di DramaKu
        </h2>

        {embeds.length === 0 ? (
          <p className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
            Belum ada video Playly yang dipasang. Pilih salah satu video di atas untuk
            mulai.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {embeds.map((e) => (
              <li
                key={e.videoId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-100">{e.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Drama: {judulDrama(e.dramaId)}
                    {e.episode ? ` · Episode ${e.episode}` : ""} · Durasi {e.durationLabel}
                    {e.creator ? ` · ${e.creator}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void lepasKaitan(e)}
                  disabled={melepas === e.videoId}
                  className="min-h-11 rounded-full px-4 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                >
                  {melepas === e.videoId ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  Lepas
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
