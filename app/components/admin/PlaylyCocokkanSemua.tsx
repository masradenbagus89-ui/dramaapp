"use client";

// Cocokkan BANYAK video Playly ke IMDb sekaligus, lalu tinjau sebelum disimpan.
//
// KENAPA ADA (owner 2026-10-08): mencocokkan satu per satu lewat PlaylyImdbPicker
// benar tapi melelahkan — katalognya 186 video. Judul Playly sendiri sudah cukup
// rapi ("The Beekeeper (2024)"), jadi mesin bisa menebak sebagian besar.
//
// ⚠️ TINJAU DULU, BARU SIMPAN — dan ini bukan kehati-hatian berlebihan.
// Diukur pada 60 judul nyata, pencocokan otomatis meleset pada kasus seperti
// "Darkness of Man (2025)" yang tercocok ke film 2024. Poster dan sinopsis film
// YANG SALAH tayang ke penonton adalah kerusakan SENYAP: tak ada error, tak ada
// yang melapor. Karena itu hasil tebakan ditahan di layar sampai admin
// menyetujuinya, bukan langsung disimpan.
//
// DUA PAGAR LAIN:
//  1. Video yang SUDAH punya data TIDAK ikut diproses sama sekali — koreksi
//     tangan admin tak boleh tertimpa tebakan mesin.
//  2. Tiap baris tersimpan ditandai `sumber: "otomatis"`, jadi asal-usulnya
//     tetap bisa dibedakan sesudahnya.
//
// KENAPA SATU PER SATU, BUKAN SATU PERMINTAAN BESAR: 186 panggilan OMDb dalam
// satu permintaan pasti melewati batas waktu fungsi server. Dipecah begini,
// tiap permintaan kecil, kemajuannya terlihat, dan bisa dihentikan di tengah.
import { useRef, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import BantuanSingkat from "./BantuanSingkat";
import {
  bersihkanJudulRilis,
  videoBelumDicocokkan,
  type PlaylyImdbMap,
} from "@/lib/playly-imdb";
import type { PlaylyVideo } from "@/lib/playly";

/**
 * Jeda antar panggilan ke OMDb, dalam milidetik.
 *
 * Bukan syarat dari OMDb (batasnya per-HARI, bukan per-detik), melainkan sopan
 * santun ke layanan gratis sekaligus memberi layar kesempatan menggambar
 * kemajuannya. 150 ms × 186 video ≈ 28 detik tambahan — sepadan.
 */
const JEDA_MS = 150;

type Kandidat = { imdbId: string; title: string; year: string; poster: string; kind: string };
type Baris = {
  videoId: string;
  judulVideo: string;
  /** Kata yang benar-benar dipakai mencari — ditampilkan supaya admin tahu kenapa meleset. */
  dicari: string;
  kandidat: Kandidat | null;
  pilih: boolean;
};
type Fase = "siap" | "mencari" | "tinjau" | "menyimpan";

export default function PlaylyCocokkanSemua({
  videos,
  imdb,
  onPerbarui,
}: {
  videos: PlaylyVideo[];
  imdb: PlaylyImdbMap;
  onPerbarui: (imdb: PlaylyImdbMap) => void;
}) {
  const [fase, setFase] = useState<Fase>("siap");
  const [kemajuan, setKemajuan] = useState({ selesai: 0, total: 0 });
  const [baris, setBaris] = useState<Baris[]>([]);
  const [pesan, setPesan] = useState<string | null>(null);
  // Bendera henti dibaca DI DALAM loop, jadi harus ref — nilai state yang
  // tertangkap closure loop tidak pernah berubah walau tombolnya ditekan.
  const berhenti = useRef(false);

  // Pagar "jangan timpa isian tangan" — aturannya ada di lib/playly-imdb.ts
  // supaya bisa diuji tanpa merender komponen ini.
  const belumPunya = videoBelumDicocokkan(videos, imdb);

  const mulai = async () => {
    berhenti.current = false;
    setFase("mencari");
    setPesan(null);
    setBaris([]);
    setKemajuan({ selesai: 0, total: belumPunya.length });

    const hasil: Baris[] = [];
    for (let i = 0; i < belumPunya.length; i++) {
      if (berhenti.current) break;
      const v = belumPunya[i];
      const { judul, tahun } = bersihkanJudulRilis(v.title);
      let kandidat: Kandidat | null = null;

      if (judul) {
        try {
          const url = `/api/admin/playly/imdb?cari=${encodeURIComponent(judul)}${
            tahun ? `&tahun=${encodeURIComponent(tahun)}` : ""
          }`;
          const res = await fetch(url, { cache: "no-store" });
          const data = (await res.json()) as { kandidat?: Kandidat[]; error?: string };
          if (!res.ok) {
            // Kegagalan layanan (kunci ditolak, OMDb mati) dihentikan di sini
            // alih-alih diulang 186 kali — pesannya akan sama persis tiap kali.
            setPesan(data.error ?? `Pencarian berhenti (HTTP ${res.status}).`);
            break;
          }
          kandidat = data.kandidat?.[0] ?? null;
        } catch {
          setPesan("Sambungan ke server terputus. Yang sudah ditemukan tetap bisa ditinjau.");
          break;
        }
      }

      hasil.push({ videoId: v.id, judulVideo: v.title, dicari: judul, kandidat, pilih: kandidat !== null });
      setBaris([...hasil]);
      setKemajuan({ selesai: i + 1, total: belumPunya.length });
      if (JEDA_MS > 0) await new Promise((r) => setTimeout(r, JEDA_MS));
    }

    setFase("tinjau");
  };

  const simpan = async () => {
    const dipilih = baris.filter((b) => b.pilih && b.kandidat);
    if (dipilih.length === 0) return;
    berhenti.current = false;
    setFase("menyimpan");
    setPesan(null);
    setKemajuan({ selesai: 0, total: dipilih.length });

    let petaTerbaru: PlaylyImdbMap = imdb;
    let gagal = 0;
    for (let i = 0; i < dipilih.length; i++) {
      if (berhenti.current) break;
      const b = dipilih[i];
      try {
        const res = await fetch("/api/admin/playly/imdb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // `otomatis: true` -> baris ditandai sumber "otomatis" di server.
          body: JSON.stringify({ videoId: b.videoId, imdbId: b.kandidat!.imdbId, otomatis: true }),
        });
        const data = (await res.json()) as { imdb?: PlaylyImdbMap; error?: string };
        if (res.ok && data.imdb) {
          petaTerbaru = data.imdb;
          onPerbarui(data.imdb);
        } else {
          gagal++;
        }
      } catch {
        gagal++;
      }
      setKemajuan({ selesai: i + 1, total: dipilih.length });
      if (JEDA_MS > 0) await new Promise((r) => setTimeout(r, JEDA_MS));
    }

    // Baris yang berhasil dibuang dari layar tinjau: ia sudah punya data, jadi
    // menampilkannya lagi sebagai "calon" cuma mengundang penyimpanan ganda.
    setBaris((lama) => lama.filter((b) => !petaTerbaru[b.videoId]));
    setFase("tinjau");
    setPesan(
      gagal === 0
        ? `Tersimpan. Poster & keterangannya muncul di situs dalam ±5 menit.`
        : `Tersimpan sebagian — ${gagal} gagal. Yang gagal masih ada di daftar dan bisa dicoba lagi.`,
    );
  };

  const ketemu = baris.filter((b) => b.kandidat).length;
  const terpilih = baris.filter((b) => b.pilih && b.kandidat).length;
  const sedangJalan = fase === "mencari" || fase === "menyimpan";

  if (videos.length === 0) return null;

  return (
    // Tiga panel alat bantu di halaman ini (Cocokkan · Kategori · Ringkasan)
    // memakai bingkai NETRAL yang sama (owner 2026-11-09: "lebih rapikan lagi
    // agar UI nya enak dilihat"). Sebelumnya dua di antaranya berbingkai biru
    // dan satu abu — tiga nada berbeda bertumpuk membuat halaman ramai tanpa
    // satu pun di antaranya jadi lebih penting. Aksen warna kini cuma dari
    // IKON dan TOMBOL, bukan dari latar seluruh kotak.
    <section className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      {/* Satu baris: judul + angka di kiri, aksi di kanan — tata letak yang
          sama persis dengan dua panel tetangganya. Sebelumnya tombol panel ini
          turun ke baris sendiri di bawah judul, jadi tingginya beda sendiri dan
          deretan tombol tidak pernah sejajar. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <BantuanSingkat
          label="Bagaimana pencocokan massal bekerja?"
          judul={
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Search className="size-4 text-sky-400" aria-hidden="true" />
                Cocokkan semua ke IMDb sekaligus
              </h3>
              <p className="text-xs text-zinc-500">
                <strong className="text-sky-300">{belumPunya.length}</strong> belum
                punya data
                {belumPunya.length > 0 && (
                  <>
                    {" · "}± {belumPunya.length * 2} permintaan OMDb dari jatah 1.000/hari
                  </>
                )}
              </p>
            </div>
          }
        >
        <p>
          Mencari otomatis dari judul tiap video, lalu{" "}
          <strong className="text-zinc-200">
            menampilkan hasilnya untuk kamu periksa dulu
          </strong>{" "}
          — tidak langsung disimpan.
        </p>
        <p>
          Video yang sudah punya data{" "}
          <strong className="text-zinc-200">tidak ikut diproses</strong>, jadi
          isian yang kamu buat sendiri aman.
        </p>
        <p>
          Tiap video memakai <strong>1 permintaan</strong> ke OMDb, dan{" "}
          <strong>1 lagi</strong> saat disimpan. Jatah akun gratis{" "}
          <strong>1.000 per hari</strong> — {belumPunya.length} video memakai
          sekitar <strong>{belumPunya.length * 2}</strong> kalau semuanya
          disimpan.
        </p>
        <p>
          Pencocokan otomatis bisa meleset pada judul yang mirip (terukur:
          “Darkness of Man (2025)” sempat tercocok ke film 2024). Karena itu
          hasilnya ditahan di layar sampai kamu menyetujuinya — poster dan
          sinopsis film yang salah tayang ke penonton adalah kerusakan yang
          tidak memunculkan error apa pun.
        </p>
        </BantuanSingkat>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
        {!sedangJalan && (
          <Button
            type="button"
            onClick={mulai}
            disabled={belumPunya.length === 0}
            size="sm"
          >
            {/* Warna BAWAAN tombol project, bukan `bg-sky-600` seperti dulu
                (owner 2026-11-09: "warna tidak sama jadi UInya kurang pas").
                Tombol ini dan "Tebak kategori" di panel sebelahnya sama-sama
                aksi utama panelnya, jadi dua warna berbeda membuat salah
                satunya terbaca lebih penting padahal setara. */}
            <Search className="mr-1.5 size-3.5" />
            {baris.length > 0 ? "Cari ulang" : "Cocokkan semua"}
          </Button>
        )}

        {sedangJalan && (
          <>
            <span className="inline-flex items-center gap-2 text-xs text-zinc-300">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {fase === "mencari" ? "Mencari" : "Menyimpan"} {kemajuan.selesai} dari {kemajuan.total}
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                berhenti.current = true;
              }}
              className="h-8 rounded-full border-zinc-600 px-3 text-xs text-zinc-300"
            >
              Hentikan
            </Button>
          </>
        )}

        {fase === "tinjau" && terpilih > 0 && (
          <Button
            type="button"
            onClick={simpan}
            size="sm"
            className="rounded-full bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            <Check className="mr-1.5 size-3.5" />
            Simpan {terpilih} yang dicentang
          </Button>
        )}
        </div>
      </div>

      {pesan && <p className="mt-2 text-xs text-amber-300">{pesan}</p>}

      {baris.length > 0 && (
        <>
          <p className="mt-3 text-xs text-zinc-400">
            Ketemu <strong className="text-zinc-200">{ketemu}</strong> dari {baris.length} yang
            diproses. Hapus centang pada yang salah — periksa terutama{" "}
            <strong className="text-zinc-200">tahunnya</strong>, di situ tebakan paling sering
            meleset.
          </p>

          <ul className="mt-2 max-h-96 space-y-1 overflow-y-auto">
            {baris.map((b) => (
              <li
                key={b.videoId}
                className="flex items-start gap-2 rounded-lg border border-zinc-800 p-2"
              >
                {b.kandidat ? (
                  <>
                    <input
                      type="checkbox"
                      checked={b.pilih}
                      onChange={(e) =>
                        setBaris((lama) =>
                          lama.map((x) =>
                            x.videoId === b.videoId ? { ...x, pilih: e.target.checked } : x,
                          ),
                        )
                      }
                      aria-label={`Pakai hasil untuk ${b.judulVideo}`}
                      className="mt-1 size-4 shrink-0 accent-emerald-500"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.kandidat.poster || ""}
                      alt=""
                      loading="lazy"
                      className="h-12 w-8 shrink-0 rounded bg-zinc-800 object-cover"
                    />
                    <span className="min-w-0 flex-1 text-xs">
                      <span className="block truncate text-zinc-500">{b.judulVideo}</span>
                      <span className="block truncate font-medium text-zinc-100">
                        → {b.kandidat.title}
                        {b.kandidat.year ? ` (${b.kandidat.year})` : ""}
                        {b.kandidat.kind === "series" ? " · serial" : ""}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <X className="mt-0.5 size-4 shrink-0 text-zinc-600" aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-xs">
                      <span className="block truncate text-zinc-500">{b.judulVideo}</span>
                      <span className="block text-zinc-600">
                        tidak ketemu — dicari sebagai &quot;{b.dicari || "(kosong)"}&quot;; isi
                        manual lewat tombol Cari di IMDb pada barisnya
                      </span>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
