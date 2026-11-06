"use client";

// Kontrol halaman untuk daftar panjang di panel admin: pemilih baris per
// halaman, nomor halaman, dan tombol Sebelumnya / Berikutnya.
//
// KENAPA ADA (owner 2026-11-06): "buatkan pagination dimana setiap halaman
// bisa kita adjust (25,50,100,150,200, dst) ada sebelumnya - berikutnya".
//
// Komponen ini sengaja TIDAK menyimpan nomor halaman sendiri — ia menerima
// `halaman` dan melaporkan perubahan lewat `onHalaman`. Nomor halaman adalah
// milik DAFTARNYA, bukan milik tombolnya: saringan yang berubah atau video
// yang selesai dicocokkan juga menggesernya, dan dua ingatan untuk satu
// keadaan pasti menyimpang.
//
// Aturan hitungnya (berapa halaman + penjepit nomor halaman) ada di
// lib/paginasi.ts supaya bisa diuji tanpa DOM.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  UKURAN_HALAMAN,
  daftarNomorHalaman,
  hitungJumlahHalaman,
  jepitHalaman,
  type UkuranHalaman,
} from "@/lib/paginasi";

export default function PaginasiDaftar({
  total,
  halaman,
  ukuran,
  onHalaman,
  onUkuran,
  className,
}: {
  /** Jumlah baris SESUDAH disaring — bukan jumlah seluruh data. */
  total: number;
  halaman: number;
  ukuran: UkuranHalaman;
  onHalaman: (halaman: number) => void;
  onUkuran: (ukuran: UkuranHalaman) => void;
  className?: string;
}) {
  // Dijepit di sini juga, bukan hanya di pemanggil: kalau nomor halaman yang
  // dioper sudah kedaluwarsa, "Hal 3 / 2" akan tercetak apa adanya — angka
  // yang berbohong lebih menyesatkan daripada daftar yang kosong.
  const aman = jepitHalaman(halaman, total, ukuran);
  const jumlahHalaman = hitungJumlahHalaman(total, ukuran);

  const adaSebelumnya = aman > 1;
  const adaBerikutnya = aman < jumlahHalaman;

  const tombol =
    "inline-flex min-h-9 items-center gap-1 rounded-full border border-zinc-700 px-3 text-xs font-semibold text-zinc-300 transition hover:border-amber-400 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-700 disabled:hover:text-zinc-300";

  const nomor = daftarNomorHalaman(aman, jumlahHalaman);

  return (
    // TIGA kelompok: pengatur baris di kiri, nomor halaman di tengah, tombol
    // maju-mundur di KANAN (owner 2026-11-06: "sebelumnya - berikutnya kamu
    // letak di kanan lalu halamannya tertera juga").
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2",
        className,
      )}
    >
      <label className="flex items-center gap-1.5 text-xs text-zinc-500">
        Baris:
        <select
          value={ukuran}
          // Ganti ukuran SELALU memulangkan ke halaman 1. Mempertahankan
          // nomor halaman lama di sini membuat "25 -> 200 saat di halaman
          // 10" menunjuk baris ke-1800 yang tidak ada; penjepit memang
          // menyelamatkannya, tapi melompat ke halaman terakhir tanpa
          // diminta lebih membingungkan daripada kembali ke awal.
          onChange={(e) => {
            onUkuran(Number(e.target.value) as UkuranHalaman);
            onHalaman(1);
          }}
          className="min-h-9 rounded-full border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-200 outline-none transition focus-visible:border-amber-400"
        >
          {UKURAN_HALAMAN.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      {/* Nomor halaman yang bisa diklik langsung. Halaman pertama & terakhir
          selalu ikut, "…" menandai yang dilompati — aturannya di
          lib/paginasi.ts supaya bisa diuji tanpa DOM. */}
      <div className="flex flex-wrap items-center gap-1">
        {nomor.map((petak, i) =>
          petak === "…" ? (
            // key memakai posisi karena "…" bisa muncul dua kali dalam satu
            // deretan; nilainya sendiri tidak unik.
            <span
              key={`lompat-${i}`}
              className="px-1 text-xs text-zinc-600"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={petak}
              type="button"
              onClick={() => onHalaman(petak)}
              aria-current={petak === aman ? "page" : undefined}
              aria-label={`Halaman ${petak}`}
              className={cn(
                "min-h-8 min-w-8 rounded-lg border px-2 text-xs font-semibold transition",
                petak === aman
                  ? "border-amber-500 bg-amber-500/15 text-amber-700"
                  : "border-zinc-700 text-zinc-400 hover:border-amber-400 hover:text-amber-700",
              )}
            >
              {petak}
            </button>
          ),
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onHalaman(aman - 1)}
          disabled={!adaSebelumnya}
          className={tombol}
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          Sebelumnya
        </button>
        <button
          type="button"
          onClick={() => onHalaman(aman + 1)}
          disabled={!adaBerikutnya}
          className={tombol}
        >
          Berikutnya
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
