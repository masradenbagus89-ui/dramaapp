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
import { Check, Loader2, Search, X } from "lucide-react";
import {
  bersihkanJudulRilis,
  type PlaylyImdbMapRingkas,
  type PlaylyImdbRingkas,
} from "@/lib/playly-imdb";

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
  meta?: PlaylyImdbRingkas;
  /** Dipanggil dengan peta TERBARU dari server sesudah simpan/lepas. */
  onPerbarui: (imdb: PlaylyImdbMapRingkas) => void;
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
      const data = (await res.json()) as { imdb?: PlaylyImdbMapRingkas; error?: string };
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
      const data = (await res.json()) as { imdb?: PlaylyImdbMapRingkas; error?: string };
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
    // `relative` = titik jangkar panel pencarian di bawah. `min-w-0` supaya
    // kotak ini ikut menyusut mengikuti lebar kolomnya di daftar video —
    // `shrink-0` yang lama memaksa kolom melebar dan mendorong tombol di
    // sebelahnya turun ke baris berikutnya.
    //
    // 🪤 RATA KIRI + MENGISI PENUH, bukan rata kanan (owner 2026-11-06: "masih
    // terlihat acak acakan"). Dulu isinya didorong ke kanan, jadi titik
    // mulainya berpindah-pindah tiap baris: video yang sudah punya data mulai
    // di posisi yang bergantung panjang judul filmnya, yang belum punya mulai
    // di posisi tombol "Cari di IMDb". Tidak ada satu pun garis tegak yang
    // konsisten — itulah yang terbaca acak, bukan tinggi barisnya.
    <div className="relative w-full min-w-0 text-left">
      {meta ? (
        // SATU tombol untuk satu sel tabel: ia sekaligus MEMPERLIHATKAN film
        // yang tercocok dan menjadi pintu untuk menggantinya. Dua elemen
        // (lencana + tombol "Ganti") tidak muat di kolom selebar ini tanpa
        // memotong nama filmnya sampai tak terbaca — dan nama itulah satu-
        // satunya cara memeriksa pencocokannya benar.
        //
        // Tombol "lepas data IMDb" pindah KE DALAM panel pencarian: ia aksi
        // yang jarang dipakai, dan menahannya di baris memakan ±40px di TIAP
        // baris hanya untuk berjaga-jaga.
        <button
          type="button"
          onClick={buka}
          title={`${meta.title}${meta.year ? ` (${meta.year})` : ""} — klik untuk ganti atau lepas`}
          className="flex min-h-9 w-full min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 text-[11px] font-semibold text-emerald-300 transition hover:border-emerald-400"
        >
          <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {meta.title}
            {meta.year ? ` (${meta.year})` : ""}
          </span>
          {/* Rating sengaja TIDAK ikut di sini: ia sudah punya kolomnya
              sendiri di daftar, dan mengulangnya di tombol cuma memakan
              ruang yang dibutuhkan nama filmnya. */}
        </button>
      ) : (
        <button
          type="button"
          onClick={buka}
          className="flex min-h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-sky-500/50 px-2 text-xs font-semibold text-sky-300 transition hover:border-sky-400"
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
        // 🪤 MELAYANG (absolute), bukan ikut alur baris. Sebelumnya panel
        // selebar 420px ini DIDORONG masuk ke dalam baris video: kolomnya
        // melebar, kontrol di sebelahnya terdorong turun, dan seluruh daftar
        // bergoyang tiap kali satu pencarian dibuka. Melayang membuat lebar
        // baris tidak berubah sama sekali.
        //
        // z-20 supaya menutupi baris di bawahnya, bukan tertutup olehnya.
        // Tidak ada induk ber-`overflow-hidden` di jalur ini (dicek di
        // PlaylyVisibilityManager + PlaylyBagianAktif), jadi panelnya tidak
        // terpotong.
        <div className="absolute right-0 top-full z-20 mt-2 w-[min(420px,80vw)] rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-left shadow-xl shadow-black/40">
          {/* Pindahan dari baris daftar: aksi yang jarang dipakai tidak perlu
              memakan tempat di tiap baris. Hanya muncul kalau memang ADA data
              yang bisa dilepas. */}
          {meta && (
            <button
              type="button"
              onClick={lepas}
              disabled={menyimpan === "lepas"}
              className="mb-2 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-800 px-2 text-xs font-semibold text-zinc-400 transition hover:border-rose-500/50 hover:text-rose-300 disabled:opacity-50"
            >
              {menyimpan === "lepas" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Lepas data IMDb dari video ini
            </button>
          )}
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
              // Enter di kotak INI dulu tidak melakukan apa-apa, sementara
              // Enter di kotak "Nama film" sebelahnya mencari. Dua kotak
              // bersebelahan dengan tombol yang sama tapi perilaku tombol
              // Enter berbeda = owner mengira pencariannya macet, padahal
              // cuma salah kotak saat menekan Enter.
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void cari();
                }
              }}
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
