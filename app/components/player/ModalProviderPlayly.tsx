"use client";

// Popup pilihan provider unduhan untuk video Playly — jendela MENGAMBANG di
// tengah layar dengan latar gelap yang bisa diklik.
//
// ⚠️ BENTUKNYA BERUBAH 2026-09-30 atas keputusan owner. Sebelumnya berkas ini
// bernama PanelProviderPlayly dan tergambar INLINE di dalam kotak keterangan,
// dengan alasan "penonton tetap melihat videonya berjalan". Owner memilih
// popup mengambang sesudah membandingkan keduanya langsung. Jangan
// "membetulkannya" balik ke inline tanpa permintaan baru — ada tes yang
// mengunci bentuk ini (tests/playly-modal-provider.test.ts).
// Video SENGAJA dibiarkan terus berjalan di belakang popup (keputusan owner
// yang sama): menjedanya menuntut PlaylyPlayer diberi prop baru + state panel
// dipindah naik ke PlaylyVideoGrid, dan itu di luar lingkup yang disetujui.
//
// KENAPA KOMPONEN SENDIRI, bukan memakai DownloadModal: latarnya beda.
// DownloadModal seluruhnya dirancang untuk kotak GELAP (`bg-zinc-900`,
// `text-zinc-200`), sedangkan yang diminta owner kotak PUTIH senada kotak
// keterangan Playly (lihat catatan panjang di InfoVideoPlayly.tsx).
// Yang TIDAK digandakan: tipe data & penyaring alamat tetap satu
// (`DownloadProvider` + `parseDownloadProviders`, lib/types.ts), dan warna
// serta label tombolnya diambil dari app/components/unduhan-kelas.ts.
//
// ALAMATNYA MILIK PIHAK LUAR (Telegram/Mega/Google Share/...), bukan server
// DramaKu. Karena itu:
//   - `target="_blank"` + `rel="noopener noreferrer"`. Tanpa `noopener`,
//     halaman tujuan bisa menyetir tab kita lewat `window.opener`.
//   - TANPA atribut `download`: browser mengabaikannya untuk alamat beda
//     domain, jadi memasangnya cuma menjanjikan yang tak ditepati (alasan yang
//     sama dicatat di app/components/DownloadButton.tsx:44-47).
import { useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  KELAS_KEPALA_TABEL,
  KELAS_WARNA_TOMBOL,
  labelTombolProvider,
} from "@/app/components/unduhan-kelas";
import type { DownloadProvider } from "@/lib/types";

export default function ModalProviderPlayly({
  open,
  onClose,
  providers,
  title,
}: {
  open: boolean;
  onClose: () => void;
  /** Sudah disaring `parseDownloadProviders` di server sebelum sampai sini. */
  providers: DownloadProvider[];
  /** Judul video, dipakai sebagai keterangan kecil di kepala popup. */
  title?: string;
}) {
  // Escape menutup popup. Penonton HP menutup lewat tombol × / ketuk latar,
  // tapi di desktop Escape adalah kebiasaan yang sudah terbentuk.
  //
  // Dipasang SEBELUM early-return di bawah: hook tidak boleh dilewati secara
  // bersyarat, jadi penjagaan "sedang tertutup" ada di dalam effect-nya.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Daftar kosong seharusnya tak pernah sampai ke sini (InfoVideoPlayly jatuh
  // ke perilaku lama sebelum membuka popup). Dijaga juga di sini supaya tak ada
  // keadaan "popup terbuka tapi isinya nol baris".
  if (!open || providers.length === 0) return null;

  const catatan = providers.filter((p) => p.note);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pilih provider download"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
        // Klik DI DALAM kotak tidak boleh ikut menutup popup — tanpa ini, klik
        // tombol provider pun menutupnya sebelum tautannya sempat terbuka.
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
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

        <div className="p-4">
          {catatan.map((p) => (
            <div
              key={p.name}
              className="mb-3 rounded-lg border border-sky-300 bg-sky-100 px-3 py-2 text-xs leading-5 text-sky-950"
            >
              {p.note}
              {p.tutorialUrl && (
                <>
                  {" "}
                  <a
                    href={p.tutorialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-sky-700 underline underline-offset-2 hover:text-sky-900"
                  >
                    Klik disini untuk lihat video tutorial
                  </a>
                </>
              )}
            </div>
          ))}

          {/* Nama provider bisa panjang. Pembungkus yang bisa digeser mendatar
              ini jaring terakhir: yang melebar digeser DI DALAM popup, bukan
              mendorong seluruh halaman jadi bisa digeser ke samping. */}
          <div className="overflow-x-auto">
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
                {providers.map((p) => (
                  <tr
                    key={p.name + p.url}
                    className="border-b border-zinc-200 last:border-0"
                  >
                    {/* Nama menyerap sisa lebar & boleh turun baris; kolom
                        tombol dipaksa selebar isinya (w-px + nowrap) supaya di
                        layar HP tombolnya tak pernah terpotong — nama yang
                        mengalah. */}
                    <td className="break-words px-3 py-2.5 align-middle text-sm font-medium text-zinc-800">
                      {p.name}
                    </td>
                    <td className="w-px whitespace-nowrap px-3 py-2.5 text-right align-middle">
                      <Button
                        asChild
                        size="sm"
                        className={cn(
                          "h-8 rounded-md px-3 text-xs font-bold text-white",
                          KELAS_WARNA_TOMBOL[p.buttonColor ?? "blue"],
                        )}
                      >
                        <a href={p.url} target="_blank" rel="noopener noreferrer">
                          <Download className="size-3.5" />
                          {labelTombolProvider(p.quality)}
                        </a>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[11px] leading-4 text-zinc-500">
            Link di atas menuju situs provider masing-masing, bukan server
            DramaKu. Kecepatan &amp; ketersediaannya di luar kendali kami.
          </p>
        </div>
      </div>
    </div>
  );
}
