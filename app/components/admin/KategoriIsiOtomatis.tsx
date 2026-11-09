"use client";

// Isi kategori BANYAK video Playly sekaligus, ditebak dari genre IMDb yang
// sudah tersimpan.
//
// KENAPA ADA (owner 2026-11-09): "di video playly sebagian belum ada
// kategorinya bisa kamu buat otomatis agar tidak perlu cek film satu persatu".
// Diukur saat itu: 489 video, hanya 3 berkategori — padahal 466 sudah punya
// data IMDb lengkap dengan genre.
//
// 💡 NOL permintaan jaringan untuk menebak. Beda dari PlaylyCocokkanSemua yang
// memanggil OMDb sekali per video, panel ini membaca genre yang SUDAH ada di
// `playly:imdb`. Jadi menebak 353 kategori memakan nol jatah OMDb dan selesai
// seketika — yang perlu jaringan hanya penyimpanannya.
//
// ⚠️ TINJAU DULU, BARU SIMPAN — pola & alasannya sama dengan
// PlaylyCocokkanSemua.tsx. Kategori yang salah tidak pernah melempar error;
// videonya cuma muncul di baris beranda yang keliru, dan tak ada yang melapor.
//
// PAGAR: video yang kategorinya SUDAH diisi tidak pernah ikut diusulkan —
// koreksi tangan admin tak boleh tertimpa tebakan mesin.
import { useRef, useState } from "react";
import { Loader2, Square, Tags } from "lucide-react";
import BantuanSingkat from "./BantuanSingkat";
import { Button } from "@/components/ui/button";
import {
  susunUsulKategori,
  type KategoriIsi,
  type UsulKategori,
} from "@/lib/kategori-otomatis";
import type { PlaylyVideo } from "@/lib/playly";
import type { PlaylyImdbMap } from "@/lib/playly-imdb";

/**
 * Jeda antar penyimpanan, milidetik.
 *
 * Tiap penyimpanan menulis satu baris ke database lewat endpoint yang sama.
 * 353 permintaan beruntun tanpa jeda membuat yang belakangan antre lama dan
 * kemajuannya tak terlihat bergerak.
 */
const JEDA_MS = 80;

type Baris = UsulKategori & { pilih: boolean };
type Fase = "siap" | "tinjau" | "menyimpan";

export default function KategoriIsiOtomatis({
  videos,
  imdb,
  kategoriSekarang,
  onTersimpan,
}: {
  videos: PlaylyVideo[];
  imdb: PlaylyImdbMap;
  /** videoId -> kategori yang sudah tersimpan. */
  kategoriSekarang: Record<string, string>;
  /** Dipanggil tiap satu kategori berhasil disimpan, supaya tabel induk segar. */
  onTersimpan: (videoId: string, kategori: KategoriIsi) => void;
}) {
  const [fase, setFase] = useState<Fase>("siap");
  const [baris, setBaris] = useState<Baris[]>([]);
  const [kemajuan, setKemajuan] = useState({ selesai: 0, total: 0 });
  const [pesan, setPesan] = useState<string | null>(null);
  // Bendera henti dibaca DI DALAM loop, jadi harus ref — nilai state yang
  // tertangkap closure tidak pernah berubah walau tombolnya ditekan.
  const berhenti = useRef(false);

  const { usul, lewat } = susunUsulKategori(videos, imdb, kategoriSekarang);

  const tebak = () => {
    setPesan(null);
    setBaris(usul.map((u) => ({ ...u, pilih: true })));
    setFase("tinjau");
  };

  const simpan = async () => {
    const dipilih = baris.filter((b) => b.pilih);
    if (dipilih.length === 0) return;
    berhenti.current = false;
    setFase("menyimpan");
    setPesan(null);
    setKemajuan({ selesai: 0, total: dipilih.length });

    let gagal = 0;
    for (let i = 0; i < dipilih.length; i++) {
      if (berhenti.current) break;
      const b = dipilih[i];
      try {
        const res = await fetch("/api/admin/playly/genre", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: b.videoId, genre: b.kategori }),
        });
        if (res.ok) onTersimpan(b.videoId, b.kategori);
        else gagal++;
      } catch {
        // Sambungan putus di tengah: hentikan, jangan ulangi 300 kali dengan
        // kegagalan yang sama persis.
        setPesan(
          "Sambungan ke server terputus. Yang sudah tersimpan tetap tersimpan.",
        );
        break;
      }
      setKemajuan({ selesai: i + 1, total: dipilih.length });
      if (JEDA_MS > 0) await new Promise((r) => setTimeout(r, JEDA_MS));
    }

    setPesan(
      gagal === 0
        ? `${dipilih.length - gagal} kategori tersimpan.`
        : `${dipilih.length - gagal} tersimpan, ${gagal} gagal.`,
    );
    setBaris([]);
    setFase("siap");
  };

  const dicentang = baris.filter((b) => b.pilih).length;
  const sibuk = fase === "menyimpan";

  // Nol usulan: jangan gambar panelnya sama sekali. Tombol yang diklik lalu
  // tidak menghasilkan apa pun terbaca seperti fitur rusak.
  if (usul.length === 0 && fase === "siap" && !pesan) return null;

  return (
    <section className="mt-4 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Keterangan panjang masuk ke balik tombol "?" (owner 2026-11-09:
            "rapikan agar tulisannya tidak memenuhi layar"). Angkanya tetap
            terlihat langsung — itu yang dicari mata; kalimatnya cuma perlu
            dibaca sekali. */}
        <BantuanSingkat
          label="Bagaimana kategori ditebak?"
          judul={
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Tags className="size-4 text-sky-400" aria-hidden="true" />
                Isi kategori otomatis dari genre IMDb
              </h3>
              <p className="text-xs text-zinc-500">
                <strong className="text-sky-300">{usul.length}</strong> bisa
                diisi · {lewat["sudah-punya"]} sudah ada ·{" "}
                {lewat["tanpa-imdb"]} tanpa IMDb ·{" "}
                {lewat["genre-tak-cocok"]} genre tak cocok
              </p>
            </div>
          }
        >
          <p>
            Menebak kategori dari data IMDb yang{" "}
            <strong className="text-zinc-200">sudah tersimpan</strong>, jadi{" "}
            <strong>tidak memakai jatah permintaan OMDb sama sekali</strong>.
            Hasilnya ditampilkan untuk kamu periksa dulu — tidak langsung
            disimpan.
          </p>
          <p>
            Genre yang lebih spesifik menang: film “Action, Romance” masuk{" "}
            <strong>Romance</strong>, bukan Action — karena lebih dari separuh
            katalog bergenre Action, dan kategori yang menampung segalanya tidak
            membantu penonton menjelajah.
          </p>
          <p>
            <strong>{lewat["genre-tak-cocok"]} genre tak cocok</strong> dibiarkan
            kosong, bukan dipaksakan: kebanyakan Horror dan Documentary, dan
            DramaKu belum punya kategori untuk itu. Memaksakan Horror jadi
            “Fantasy” membuat penonton yang membuka Fantasy menemukan film yang
            salah.
          </p>
          <p>
            <strong>Tycoon</strong>, <strong>Harem</strong>, dan{" "}
            <strong>Time Travel</strong> tidak pernah ditebak — ketiganya untuk
            drama pendek dan tak punya padanan genre IMDb mana pun.
          </p>
        </BantuanSingkat>

        <div className="flex shrink-0 items-center gap-2">
          {sibuk ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => (berhenti.current = true)}
            >
              <Square className="mr-1.5 size-3.5" />
              Hentikan
            </Button>
          ) : fase === "tinjau" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setBaris([]);
                  setFase("siap");
                }}
              >
                Batal
              </Button>
              <Button type="button" size="sm" onClick={simpan} disabled={dicentang === 0}>
                Simpan {dicentang} kategori
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" onClick={tebak} disabled={usul.length === 0}>
              <Tags className="mr-1.5 size-3.5" />
              Tebak kategori
            </Button>
          )}
        </div>
      </div>

      {sibuk && (
        <p className="mt-3 flex items-center gap-2 text-xs text-sky-300">
          <Loader2 className="size-3.5 animate-spin" />
          Menyimpan {kemajuan.selesai} dari {kemajuan.total}…
        </p>
      )}

      {pesan && <p className="mt-3 text-xs text-zinc-300">{pesan}</p>}

      {baris.length > 0 && (
        // Genre aslinya ikut dipajang di sebelah tebakan — tanpa itu admin cuma
        // bisa percaya atau tidak, tidak bisa MEMERIKSA.
        <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-2 py-1.5 font-medium">✓</th>
                <th className="px-2 py-1.5 font-medium">Judul</th>
                <th className="px-2 py-1.5 font-medium">Genre IMDb</th>
                <th className="px-2 py-1.5 font-medium">Kategori</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b, i) => (
                <tr key={b.videoId} className="border-t border-zinc-800/70">
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={b.pilih}
                      disabled={sibuk}
                      onChange={() =>
                        setBaris((lama) =>
                          lama.map((x, j) => (j === i ? { ...x, pilih: !x.pilih } : x)),
                        )
                      }
                      className="accent-sky-400"
                    />
                  </td>
                  <td className="max-w-[20rem] truncate px-2 py-1.5 text-zinc-200">
                    {b.judul}
                  </td>
                  <td className="max-w-[14rem] truncate px-2 py-1.5 text-zinc-500">
                    {b.genre}
                  </td>
                  <td className="px-2 py-1.5 font-semibold text-sky-300">
                    {b.kategori}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
