"use client";

// Atur video Playly mana yang TAMPIL di halaman penonton.
//
// Semua video milik akun mitra tampil otomatis begitu di-upload di Playly —
// admin tidak perlu menyetujui apa pun. Yang diatur di sini adalah daftar
// PENGECUALIAN: video yang sengaja disembunyikan.
//
// Daftar videonya datang dari server sebagai props (halaman ini force-dynamic),
// jadi komponen ini tidak perlu memuat apa pun saat dibuka — tidak ada kedipan
// "memuat", dan satu-satunya panggilan jaringan terjadi saat tombol ditekan.
//
// "BELUM SIAP" = catatan videonya ada di Playly (judul, durasi, sampul) tapi
// BERKAS videonya tidak — biasanya upload putus di tengah. Video begini sudah
// otomatis tidak ditampilkan ke penonton; ditandai di sini supaya admin tahu
// perbaikannya ada di dashboard Playly, bukan di DramaKu.
import { useState } from "react";
import { AlertTriangle, Eye, EyeOff, Info, Loader2 } from "lucide-react";
import type { PlaylyVideo, PlaylySumber } from "@/lib/playly";

type Pesan = { jenis: "ok" | "gagal"; teks: string };

export default function PlaylyVisibilityManager({
  videos,
  initialHidden,
  belumSiapIds,
  fetchError,
  source,
  creator,
}: {
  /** Seluruh video milik akun kita, termasuk yang sedang disembunyikan. */
  videos: PlaylyVideo[];
  initialHidden: string[];
  /** Video yang berkasnya belum ada di Playly — tidak tampil ke penonton. */
  belumSiapIds: string[];
  /** Terisi kalau daftar gagal diambil dari Playly. */
  fetchError: string | null;
  source: PlaylySumber;
  /** Nama akun Playly yang dipakai menyaring saat jalur kunci tidak terpakai. */
  creator: string;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set(initialHidden));
  const [sedangProses, setSedangProses] = useState<string | null>(null);
  const [pesan, setPesan] = useState<Pesan | null>(null);

  const ubah = async (videoId: string, jadikanTersembunyi: boolean) => {
    setSedangProses(videoId);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/playly/hidden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, hidden: jadikanTersembunyi }),
      });
      const data = (await res.json()) as { hidden?: string[]; error?: string };
      if (!res.ok) {
        setPesan({ jenis: "gagal", teks: data.error ?? "Gagal menyimpan perubahan." });
        return;
      }
      // Daftar terbaru datang dari server — dipakai apa adanya, jadi layar tidak
      // pernah menebak hasilnya sendiri dan ikut benar walau ada admin lain.
      setHidden(new Set(data.hidden ?? []));
      setPesan({
        jenis: "ok",
        teks: jadikanTersembunyi
          ? "Video disembunyikan dari halaman penonton."
          : "Video ditampilkan lagi.",
      });
    } catch {
      setPesan({
        jenis: "gagal",
        teks: "Tidak bisa menghubungi server. Cek koneksi internet lalu coba lagi.",
      });
    } finally {
      setSedangProses(null);
    }
  };

  if (fetchError) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
        <p className="flex items-start gap-2 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{fetchError}</span>
        </p>
      </div>
    );
  }

  // Dihitung dari daftar aslinya, bukan pengurangan angka: video bisa
  // disembunyikan DAN belum siap sekaligus, jadi mengurangi dua angka akan
  // menghitungnya dua kali dan hasilnya bisa minus.
  const belumSiap = new Set(belumSiapIds);
  const jumlahTampil = videos.filter(
    (v) => !hidden.has(v.id) && !belumSiap.has(v.id),
  ).length;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-base font-semibold text-white">
        Video yang tampil di halaman penonton
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        {videos.length === 0
          ? "Belum ada video di akun Playly kita. Upload dulu di dashboard Playly — begitu ter-upload, video langsung muncul di sini dan di halaman penonton."
          : `${jumlahTampil} dari ${videos.length} video tampil. Semua video tampil otomatis; sembunyikan yang tidak ingin ditayangkan.`}
      </p>

      {belumSiap.size > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-100">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            <strong>{belumSiap.size} video belum siap.</strong> Catatannya ada di
            Playly (judul, durasi, sampul), tapi file videonya tidak — biasanya
            karena upload putus di tengah. Video ini <strong>tidak</strong>{" "}
            ditampilkan ke penonton, karena kalau diklik yang muncul cuma layar
            "Video belum tersedia". Perbaikannya di dashboard Playly: upload ulang
            videonya sampai 100% selesai, lalu buka lagi halaman ini.
          </span>
        </p>
      )}

      {source === "katalog-publik" && videos.length > 0 && (
        // Dikatakan apa adanya: daftar ini TIDAK datang dari kunci mitra, jadi
        // jangan sampai ada yang mengira kuncinya sudah jalan padahal belum.
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-100">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Daftar ini diambil dari katalog publik Playly dan disaring ke nama akun{" "}
            <strong>{creator}</strong>, karena kunci mitra sedang tidak diterima
            Playly. Videonya tetap hanya milik akun kita. Kalau nama akun Playly
            berubah, ganti lewat Environment Variable <code>PLAYLY_CREATOR</code>.
          </span>
        </p>
      )}

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
            const tersembunyi = hidden.has(v.id);
            const belumAdaFile = belumSiap.has(v.id);
            const proses = sedangProses === v.id;
            // Status bisa menumpuk (belum siap + disembunyikan), jadi dirangkai
            // dari daftar, bukan rantai ternary yang saling menutupi.
            const catatan = [
              v.creator || "tanpa nama kreator",
              v.durationLabel !== "-" ? v.durationLabel : null,
              belumAdaFile ? "file videonya belum ada di Playly — upload ulang di sana" : null,
              tersembunyi ? "disembunyikan" : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li
                key={v.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`truncate text-sm font-medium ${
                        tersembunyi ? "text-zinc-500 line-through" : "text-zinc-100"
                      }`}
                    >
                      {v.title}
                    </p>
                    {belumAdaFile && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        belum siap
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">{catatan}</p>
                </div>
                <button
                  type="button"
                  onClick={() => ubah(v.id, !tersembunyi)}
                  disabled={proses}
                  className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition disabled:opacity-50 ${
                    tersembunyi
                      ? "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                      : "border-amber-500/50 text-amber-300 hover:border-amber-400"
                  }`}
                >
                  {proses ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : tersembunyi ? (
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {tersembunyi ? "Tampilkan" : "Sembunyikan"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
