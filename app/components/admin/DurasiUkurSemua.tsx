"use client";

// Isi kolom Durasi BANYAK drama sekaligus, diukur dari berkas videonya.
//
// KENAPA ADA (owner 2026-11-09): mengisi satu per satu lewat tombol "Ukur dari
// video" di DramaForm benar tapi melelahkan — 25 serial masih memakai isian
// massal lama "119 min" yang tidak punya sumber sama sekali
// (supabase_migrations/isi_lencana_awal_dramas.sql menyatakannya sendiri).
// Owner: "buat otomatis durasinya jadi saya cukup edit sedikit".
//
// ⚠️ TINJAU DULU, BARU SIMPAN. Pola + alasannya dipinjam dari
// PlaylyCocokkanSemua.tsx: hasil mesin ditahan di layar sampai admin
// menyetujuinya. Di sini taruhannya sama — durasi SALAH yang tayang di poster
// adalah kerusakan SENYAP (tak ada error, tak ada yang melapor), dan itu persis
// cara isian massal lama bertahan berbulan-bulan tanpa ketahuan.
//
// TIGA PAGAR LAIN:
//  1. Drama yang durasinya SUDAH benar (terbaca sebagai durasi episode) tidak
//     ikut dipilih otomatis — koreksi tangan owner tak boleh tertimpa.
//  2. Penyimpanan lewat endpoint SEMPIT yang cuma menyentuh kolom runtime,
//     bukan endpoint simpan drama biasa yang menerima seluruh data.
//  3. Bisa dihentikan di tengah; yang sudah terukur tetap bisa ditinjau.
//
// KENAPA SATU PER SATU, BUKAN SATU PERMINTAAN BESAR: tiap pengukuran membuka
// berkas video di tunnel PC backup rumahan. 40 berkas dalam satu permintaan
// pasti melewati batas waktu, dan kemajuannya tak terlihat sama sekali.
import { useRef, useState } from "react";
import { Loader2, Ruler, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ukurDurasiDrama, simpanDurasiDrama } from "@/lib/admin-api";
import { durasiTayangan } from "@/lib/format";
import { dramaButuhDurasi, durasinyaSudahBenar } from "@/lib/durasi-video";
import { isMovie, type Drama } from "@/lib/types";

/**
 * Jeda antar pengukuran, milidetik.
 *
 * Bukan syarat teknis: sumbernya PC backup rumahan di belakang quick tunnel,
 * dan menyerbunya dengan 40 permintaan beruntun membuat yang belakangan
 * timeout. Juga memberi layar kesempatan menggambar kemajuannya.
 */
const JEDA_MS = 200;

type Baris = {
  id: string;
  title: string;
  film: boolean;
  /** Isi kolom Durasi SEKARANG, apa adanya. */
  lama: string;
  /** Hasil ukur siap simpan ("1.47"), atau null kalau gagal. */
  baru: string | null;
  /** Bentuk yang akan tergambar di poster ("1:47") — yang dilihat penonton. */
  tergambar: string | null;
  galat: string | null;
  pilih: boolean;
};

type Fase = "siap" | "mengukur" | "tinjau" | "menyimpan";

export default function DurasiUkurSemua({
  dramas,
  adminEmail,
  onSelesai,
}: {
  dramas: Drama[];
  adminEmail: string;
  /** Dipanggil sesudah penyimpanan supaya daftar di halaman ikut segar. */
  onSelesai: () => void;
}) {
  const [fase, setFase] = useState<Fase>("siap");
  const [kemajuan, setKemajuan] = useState({ selesai: 0, total: 0 });
  const [baris, setBaris] = useState<Baris[]>([]);
  const [pesan, setPesan] = useState<string | null>(null);
  // Bendera henti dibaca DI DALAM loop, jadi harus ref — nilai state yang
  // tertangkap closure loop tidak pernah berubah walau tombolnya ditekan.
  const berhenti = useRef(false);

  const belumBenar = dramaButuhDurasi(dramas);

  const mulai = async () => {
    berhenti.current = false;
    setFase("mengukur");
    setPesan(null);
    setBaris([]);
    setKemajuan({ selesai: 0, total: dramas.length });

    const hasil: Baris[] = [];
    for (let i = 0; i < dramas.length; i++) {
      if (berhenti.current) break;
      const d = dramas[i];
      const film = isMovie(d);
      const sudahBenar = durasinyaSudahBenar(d);

      let baru: string | null = null;
      let galat: string | null = null;
      try {
        const r = await ukurDurasiDrama(d.id, adminEmail);
        if (r.ok) baru = r.teks;
        else galat = r.error;
      } catch {
        setPesan(
          "Sambungan ke server terputus. Yang sudah terukur tetap bisa ditinjau dan disimpan.",
        );
        break;
      }

      // Hasil ukur SELALU dibaca ulang dengan aturan tampilan sebelum
      // ditawarkan: angka yang tersimpan tapi tak pernah tergambar adalah
      // kerusakan senyap. Film dan serial memakai aturan berbeda untuk teks
      // yang sama, jadi `film` ikut dioper.
      const tergambar = baru ? durasiTayangan(baru, film) : null;

      hasil.push({
        id: d.id,
        title: d.title,
        film,
        lama: (d.runtime ?? "").trim(),
        baru,
        tergambar,
        galat,
        // Dicentang HANYA kalau terukur DAN durasinya belum benar. Lihat
        // `durasinyaSudahBenar` — pagar "jangan timpa isian tangan".
        pilih: tergambar !== null && !sudahBenar,
      });
      setBaris([...hasil]);
      setKemajuan({ selesai: i + 1, total: dramas.length });
      if (JEDA_MS > 0) await new Promise((r) => setTimeout(r, JEDA_MS));
    }

    setFase("tinjau");
  };

  const simpan = async () => {
    const dipilih = baris.filter((b) => b.pilih && b.baru);
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
        const r = await simpanDurasiDrama(b.id, b.baru!, adminEmail);
        if (!r.ok) gagal++;
      } catch {
        gagal++;
      }
      setKemajuan({ selesai: i + 1, total: dipilih.length });
    }

    setPesan(
      gagal === 0
        ? `${dipilih.length} durasi tersimpan.`
        : `${dipilih.length - gagal} tersimpan, ${gagal} gagal.`,
    );
    setFase("tinjau");
    onSelesai();
  };

  const terukur = baris.filter((b) => b.tergambar !== null).length;
  const dicentang = baris.filter((b) => b.pilih).length;
  const sibuk = fase === "mengukur" || fase === "menyimpan";

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Ruler className="size-4 text-amber-400" />
            Isi durasi otomatis dari video
          </h3>
          <p className="mt-1 text-xs text-zinc-400">
            Membaca durasi asli episode 1 tiap drama langsung dari berkas
            videonya di PC backup, lalu menawarkan hasilnya untuk kamu periksa.
            Tidak ada yang tersimpan sebelum kamu menekan Simpan.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {dramas.length} judul di katalog · {belumBenar.length} durasinya
            belum benar (itu yang akan dicentang otomatis)
          </p>
        </div>

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
          ) : (
            <Button type="button" size="sm" onClick={mulai} disabled={!dramas.length}>
              <Ruler className="mr-1.5 size-3.5" />
              {fase === "tinjau" ? "Ukur ulang" : "Mulai ukur"}
            </Button>
          )}
        </div>
      </div>

      {sibuk && (
        <p className="mt-3 flex items-center gap-2 text-xs text-amber-300">
          <Loader2 className="size-3.5 animate-spin" />
          {fase === "mengukur" ? "Mengukur" : "Menyimpan"} {kemajuan.selesai} dari{" "}
          {kemajuan.total}…
        </p>
      )}

      {pesan && <p className="mt-3 text-xs text-zinc-300">{pesan}</p>}

      {baris.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-zinc-400">
              {terukur} terbaca dari {baris.length} · {dicentang} dicentang untuk
              disimpan
            </p>
            {fase === "tinjau" && dicentang > 0 && (
              <Button type="button" size="sm" onClick={simpan}>
                Simpan {dicentang} durasi
              </Button>
            )}
          </div>

          {/* Tabel digulung sendiri supaya 40 baris tidak mendorong sisa
              halaman admin jauh ke bawah. */}
          <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="px-2 py-1.5 font-medium">✓</th>
                  <th className="px-2 py-1.5 font-medium">Judul</th>
                  <th className="px-2 py-1.5 font-medium">Sekarang</th>
                  <th className="px-2 py-1.5 font-medium">Hasil ukur</th>
                  <th className="px-2 py-1.5 font-medium">Di poster</th>
                </tr>
              </thead>
              <tbody>
                {baris.map((b, i) => (
                  <tr key={b.id} className="border-t border-zinc-800/70">
                    <td className="px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={b.pilih}
                        disabled={b.tergambar === null || sibuk}
                        onChange={() =>
                          setBaris((lama) =>
                            lama.map((x, j) =>
                              j === i ? { ...x, pilih: !x.pilih } : x,
                            ),
                          )
                        }
                        className="accent-amber-400 disabled:opacity-30"
                      />
                    </td>
                    <td className="max-w-[18rem] truncate px-2 py-1.5 text-zinc-200">
                      {b.title}
                      {b.film && (
                        <span className="ml-1.5 text-[10px] text-zinc-500">FILM</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-zinc-500">
                      {b.lama || <span className="text-zinc-600">kosong</span>}
                    </td>
                    <td className="px-2 py-1.5">
                      {b.baru ? (
                        <span className="font-semibold text-emerald-300">{b.baru}</span>
                      ) : (
                        <span className="text-rose-300" title={b.galat ?? ""}>
                          gagal
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-zinc-300">
                      {b.tergambar ?? <span className="text-zinc-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Alasan gagal ditulis lengkap di bawah tabel, bukan cuma jadi
              tooltip: owner perlu tahu BEDA antara "berkasnya tidak ada" dan
              "PC backup mati" — keduanya butuh tindakan yang berbeda. */}
          {baris.some((b) => b.galat) && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-zinc-400">
                Kenapa sebagian gagal? ({baris.filter((b) => b.galat).length} judul)
              </summary>
              <ul className="mt-1.5 space-y-1 text-[11px] text-zinc-400">
                {baris
                  .filter((b) => b.galat)
                  .map((b) => (
                    <li key={b.id}>
                      <span className="text-zinc-300">{b.title}</span> — {b.galat}
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}
