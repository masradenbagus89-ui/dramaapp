"use client";

// Popup pilihan unduhan untuk video Playly — jendela MENGAMBANG di tengah
// layar dengan latar gelap yang bisa diklik. SATU komponen untuk semua tombol
// DOWNLOAD Playly (/film, baris Playly di /discover, dan /tonton/[id]), lewat
// InfoVideoPlayly.
//
// ⚠️ BENTUK MENGAMBANG = keputusan owner 2026-09-30 (sebelumnya inline). Jangan
// "membetulkannya" balik tanpa permintaan baru — dikunci
// tests/playly-modal-provider.test.ts. Video sengaja dibiarkan terus berjalan
// di belakang popup (keputusan owner yang sama).
//
// ISI (owner 2026-10-05): satu BARIS per provider, satu TOMBOL per kualitas.
// Provider tanpa link tak punya baris; kualitas tanpa link tak punya tombol;
// video tanpa link sama sekali -> "Link unduhan belum tersedia". Pengelompokan
// & urutannya diputuskan `kelompokkanPerProvider` (lib/playly-unduhan.ts),
// bukan di sini, supaya aturannya bisa diuji tanpa menggambar apa pun.
//
// KENAPA BUKAN DownloadModal: itu popup DRAMA berlatar gelap; yang ini putih
// senada kotak keterangan Playly. Warna kepala tabel & tombol tetap dari
// app/components/unduhan-kelas.ts.
//
// ALAMATNYA MILIK PIHAK LUAR (Drive/Telegram/Cast/Mega), bukan server DramaKu:
//   - `target="_blank"` + `rel="noopener noreferrer"`. Tanpa `noopener`,
//     halaman tujuan bisa menyetir tab kita lewat `window.opener`.
//   - TANPA atribut `download`: browser mengabaikannya untuk alamat beda
//     domain, jadi memasangnya cuma menjanjikan yang tak ditepati.
import { useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { KELAS_KEPALA_TABEL, KELAS_WARNA_TOMBOL } from "@/app/components/unduhan-kelas";
import { kelompokkanPerProvider, type LinkUnduhanPublik } from "@/lib/playly-unduhan";

export default function ModalProviderPlayly({
  open,
  onClose,
  links,
  title,
}: {
  open: boolean;
  onClose: () => void;
  /** Sudah disaring server (https + domain per provider) sebelum sampai sini. */
  links: LinkUnduhanPublik[];
  /** Judul video, dipakai sebagai keterangan kecil di kepala popup. */
  title?: string;
}) {
  // Escape menutup popup. Dipasang SEBELUM early-return: hook tidak boleh
  // dilewati secara bersyarat, jadi penjagaan "sedang tertutup" ada di dalamnya.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const baris = kelompokkanPerProvider(links);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pilih provider download"
        // max-h + gulir di DALAM kotak: di HP mendatar, tabel 4 provider bisa
        // lebih tinggi dari layar — tanpa ini tombol × ikut terdorong keluar.
        className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
        // Klik DI DALAM kotak tidak boleh ikut menutup popup — tanpa ini, klik
        // tombol provider pun menutupnya sebelum tautannya sempat terbuka.
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-900">Pilih provider download</p>
            {title && <p className="truncate text-xs text-zinc-500">{title}</p>}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Tutup"
            className="size-8 shrink-0 rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="overflow-y-auto p-4">
          {baris.length === 0 ? (
            <p className="rounded-lg bg-zinc-100 px-3 py-6 text-center text-sm font-medium text-zinc-600">
              Link unduhan belum tersedia
            </p>
          ) : (
            <>
              <table className="w-full border-collapse">
                <thead>
                  <tr className={KELAS_KEPALA_TABEL}>
                    <th className="rounded-l-md px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">
                      Provider
                    </th>
                    <th className="rounded-r-md px-3 py-2 text-right text-xs font-bold uppercase tracking-wide">
                      Download
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {baris.map((b) => (
                    <tr key={b.provider} className="border-b border-zinc-200 last:border-0">
                      <td className="px-3 py-2.5 align-middle text-sm font-medium text-zinc-800">
                        {b.label}
                      </td>
                      {/* Tombol boleh turun baris di layar sempit (flex-wrap);
                          tiap tombolnya sendiri tak pernah terpotong (nowrap). */}
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {b.tombol.map((t) => (
                            <Button
                              key={t.quality}
                              asChild
                              size="sm"
                              className={cn(
                                "h-8 whitespace-nowrap rounded-md px-3 text-xs font-bold text-white",
                                KELAS_WARNA_TOMBOL.blue,
                              )}
                            >
                              <a href={t.url} target="_blank" rel="noopener noreferrer">
                                <Download className="size-3.5" />
                                {t.quality}
                              </a>
                            </Button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-3 text-[11px] leading-4 text-zinc-500">
                Link di atas menuju situs provider masing-masing, bukan server
                DramaKu. Kecepatan &amp; ketersediaannya di luar kendali kami.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
