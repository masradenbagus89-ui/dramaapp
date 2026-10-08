"use client";

// Cari & pasang data IMDb untuk SATU video Playly.
//
// KENAPA CARI PAKAI JUDUL, BUKAN ID (owner 2026-10-08): jalur yang sudah ada di
// form drama menuntut ID IMDb (`tt9224104`), dan satu-satunya tempat wajar
// mencarinya — imdb.com — DIBLOKIR dari jaringan owner (CloudFront 403).
// Jadi di sini owner mengetik NAMA FILM, memilih dari daftar beserta posternya,
// dan ID-nya diurus di belakang layar — tak pernah perlu diketik atau dilihat.
//
// Kotak pencarian sudah TERISI judul video yang dibersihkan dari embel-embel
// rilis (`The Gunman 2015 YIFY` -> `The Gunman`), jadi untuk mayoritas video
// owner cukup menekan Cari tanpa mengetik apa pun.
//
// Dipisah dari PlaylyVisibilityManager karena ia sudah mengurus dua hal lain
// (sembunyikan + kategori); menumpuk alur pencarian berlangkah-langkah di sana
// akan membuat satu berkas mengurus tiga alur yang tak berhubungan.
import { useState } from "react";
import { Check, Loader2, Search, Star, X } from "lucide-react";
import { bersihkanJudulRilis, type PlaylyImdbMap, type PlaylyImdbMeta } from "@/lib/playly-imdb";

/** Satu kandidat dari OMDb, sebatas yang digambar di layar. */
type Kandidat = {
  imdbId: string;
  title: string;
  year: string;
  poster: string;
  kind: string;
};

type Pesan = { jenis: "ok" | "gagal"; teks: string };

export default function PlaylyImdbPicker({
  videoId,
  judulVideo,
  meta,
  onPerbarui,
}: {
  videoId: string;
  /** Judul mentah dari Playly — dipakai sebagai isi awal kotak pencarian. */
  judulVideo: string;
  /** Data yang sudah tersimpan untuk video ini, kalau ada. */
  meta?: PlaylyImdbMeta;
  /** Dipanggil dengan peta TERBARU dari server sesudah simpan/lepas. */
  onPerbarui: (imdb: PlaylyImdbMap) => void;
}) {
  const [terbuka, setTerbuka] = useState(false);
  const [kata, setKata] = useState("");
  const [tahun, setTahun] = useState("");
  const [kandidat, setKandidat] = useState<Kandidat[] | null>(null);
  const [mencari, setMencari] = useState(false);
  const [menyimpan, setMenyimpan] = useState("");
  const [pesan, setPesan] = useState<Pesan | null>(null);

  /**
   * Buka panel + isi kotak dengan tebakan terbaik dari judul videonya.
   *
   * Isi awal dihitung di sini (bukan saat komponen dirender) supaya 186 baris
   * daftar tidak masing-masing menjalankan pembersih judul pada tiap render —
   * padahal hanya satu baris yang panelnya benar-benar dibuka.
   */
  const buka = () => {
    const { judul, tahun: t } = bersihkanJudulRilis(judulVideo);
    setKata(judul);
    setTahun(t);
    setKandidat(null);
    setPesan(null);
    setTerbuka(true);
  };

  const cari = async () => {
    const q = kata.trim();
    if (!q) return;
    setMencari(true);
    setPesan(null);
    setKandidat(null);
    try {
      const url = `/api/admin/playly/imdb?cari=${encodeURIComponent(q)}${
        tahun.trim() ? `&tahun=${encodeURIComponent(tahun.trim())}` : ""
      }`;
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as { kandidat?: Kandidat[]; error?: string };
      if (!res.ok) {
        setPesan({ jenis: "gagal", teks: data.error ?? `Pencarian gagal (HTTP ${res.status}).` });
        return;
      }
      setKandidat(data.kandidat ?? []);
    } catch {
      setPesan({
        jenis: "gagal",
        teks: "Tidak bisa menghubungi server. Cek koneksi internet lalu coba lagi.",
      });
    } finally {
      setMencari(false);
    }
  };

  const pasang = async (imdbId: string, judulFilm: string) => {
    setMenyimpan(imdbId);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/playly/imdb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, imdbId }),
      });
      const data = (await res.json()) as { imdb?: PlaylyImdbMap; error?: string };
      if (!res.ok) {
        setPesan({ jenis: "gagal", teks: data.error ?? "Gagal menyimpan." });
        return;
      }
      // Peta terbaru datang dari server, dipakai apa adanya — layar tidak
      // menebak hasilnya sendiri dan ikut benar walau ada admin lain bekerja.
      onPerbarui(data.imdb ?? {});
      setTerbuka(false);
      setPesan({
        jenis: "ok",
        teks: `Terpasang: ${judulFilm}. Poster & keterangannya muncul di situs dalam ±1 menit.`,
      });
    } catch {
      setPesan({
        jenis: "gagal",
        teks: "Tidak bisa menghubungi server. Cek koneksi internet lalu coba lagi.",
      });
    } finally {
      setMenyimpan("");
    }
  };

  const lepas = async () => {
    setMenyimpan("lepas");
    setPesan(null);
    try {
      const res = await fetch("/api/admin/playly/imdb", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
      const data = (await res.json()) as { imdb?: PlaylyImdbMap; error?: string };
      if (!res.ok) {
        setPesan({ jenis: "gagal", teks: data.error ?? "Gagal melepas." });
        return;
      }
      onPerbarui(data.imdb ?? {});
      setPesan({ jenis: "ok", teks: "Data IMDb dilepas. Kartunya kembali seperti semula." });
    } catch {
      setPesan({
        jenis: "gagal",
        teks: "Tidak bisa menghubungi server. Cek koneksi internet lalu coba lagi.",
      });
    } finally {
      setMenyimpan("");
    }
  };

  return (
    <div className="shrink-0 text-right">
      {meta ? (
        <div className="flex items-center justify-end gap-2">
          <span
            className="inline-flex max-w-[200px] items-center gap-1 truncate rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300"
            title={`${meta.title}${meta.year ? ` (${meta.year})` : ""}`}
          >
            <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {meta.title}
              {meta.year ? ` (${meta.year})` : ""}
            </span>
            {meta.rating && (
              <span className="flex shrink-0 items-center gap-0.5 text-amber-300">
                <Star className="h-3 w-3" aria-hidden="true" />
                {meta.rating}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={buka}
            className="min-h-9 rounded-full border border-zinc-700 px-3 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500"
          >
            Ganti
          </button>
          <button
            type="button"
            onClick={lepas}
            disabled={menyimpan === "lepas"}
            className="min-h-9 rounded-full border border-zinc-800 px-2 text-xs text-zinc-500 transition hover:border-rose-500/50 hover:text-rose-300 disabled:opacity-50"
            aria-label={`Lepas data IMDb dari ${judulVideo}`}
          >
            {menyimpan === "lepas" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={buka}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-sky-500/50 px-3 text-xs font-semibold text-sky-300 transition hover:border-sky-400"
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          Cari di IMDb
        </button>
      )}

      {pesan && (
        <p
          role="status"
          className={`mt-1 text-xs ${
            pesan.jenis === "ok" ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {pesan.teks}
        </p>
      )}

      {terbuka && (
        <div className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-left sm:w-[420px]">
          <div className="flex gap-2">
            <input
              value={kata}
              onChange={(e) => setKata(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void cari();
                }
              }}
              placeholder="Nama film"
              aria-label="Nama film yang dicari"
              className="min-h-9 min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus-visible:border-sky-400"
            />
            <input
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              placeholder="Tahun"
              inputMode="numeric"
              aria-label="Tahun rilis (boleh dikosongkan)"
              className="min-h-9 w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-100 outline-none focus-visible:border-sky-400"
            />
            <button
              type="button"
              onClick={cari}
              disabled={mencari || !kata.trim()}
              className="min-h-9 shrink-0 rounded-lg border border-sky-500/50 px-3 text-xs font-semibold text-sky-300 transition hover:border-sky-400 disabled:opacity-50"
            >
              {mencari ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                "Cari"
              )}
            </button>
            <button
              type="button"
              onClick={() => setTerbuka(false)}
              className="min-h-9 shrink-0 rounded-lg px-2 text-zinc-500 transition hover:text-zinc-300"
              aria-label="Tutup pencarian"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Daftar kosong dibedakan dari "belum mencari": keduanya sama-sama
              tanpa hasil di layar, tapi hanya yang pertama butuh saran
              tindakan. */}
          {kandidat?.length === 0 && (
            <p className="mt-3 text-xs text-zinc-400">
              Tidak ada film dengan nama itu. Coba kurangi katanya (mis. buang
              angka atau kata tambahan), atau kosongkan kolom Tahun — tahun pada
              nama berkas sering tahun unggah, bukan tahun rilis filmnya.
            </p>
          )}

          {kandidat && kandidat.length > 0 && (
            <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
              {kandidat.map((k) => (
                <li key={k.imdbId}>
                  <button
                    type="button"
                    onClick={() => pasang(k.imdbId, k.title)}
                    disabled={menyimpan !== ""}
                    className="flex w-full items-center gap-3 rounded-lg border border-transparent p-1.5 text-left transition hover:border-zinc-700 hover:bg-zinc-900 disabled:opacity-50"
                  >
                    {/* next/image sengaja tidak dipakai: ini pratinjau sebesar
                        perangko di layar admin yang hanya dilihat beberapa
                        detik, jadi pengoptimalan gambarnya tak sepadan. Pola
                        yang sama dipakai kartu video di PlaylyVideoGrid. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={k.poster || ""}
                      alt=""
                      loading="lazy"
                      className="h-14 w-10 shrink-0 rounded bg-zinc-800 object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-zinc-100">
                        {k.title}
                      </span>
                      <span className="block text-xs text-zinc-500">
                        {[k.year, k.kind === "series" ? "serial" : "film"]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {menyimpan === k.imdbId && (
                      <Loader2
                        className="h-4 w-4 shrink-0 animate-spin text-zinc-400"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
