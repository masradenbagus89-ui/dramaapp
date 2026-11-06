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
// BARIS "Playly" (2026-11-06, dari potongan kode yang diserahkan owner): satu
// baris TAMBAHAN di paling bawah, isinya unduhan dari server Playly sendiri --
// bukan provider yang diisi admin. Datanya ditanyakan ke /api/playly/unduh saat
// popup DIBUKA (bukan diterima sebagai prop), dan barisnya hanya digambar kalau
// Playly memang mengizinkan video itu diunduh. Per hari itu `unduh` masih null
// di 200 dari 200 video kita -- izin unduh adalah saklar per-video milik
// pengunggah di Playly, jadi "barisnya belum muncul" = keadaan DATA, bukan
// kerusakan kode. Aturannya di lib/playly-unduh-langsung.ts.
//
// KENAPA BUKAN DownloadModal: itu popup DRAMA berlatar gelap; yang ini putih
// senada kotak keterangan Playly. Warna kepala tabel & tombol tetap dari
// app/components/unduhan-kelas.ts.
//
// ALAMATNYA MILIK PIHAK LUAR (Drive/Telegram/Cast/Mega/Sendcm), bukan server DramaKu:
//   - `target="_blank"` + `rel="noopener noreferrer"`. Tanpa `noopener`,
//     halaman tujuan bisa menyetir tab kita lewat `window.opener`.
//   - TANPA atribut `download`: browser mengabaikannya untuk alamat beda
//     domain, jadi memasangnya cuma menjanjikan yang tak ditepati.
import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  KELAS_KEPALA_TABEL,
  KELAS_WARNA_TOMBOL,
  labelTombolProvider,
} from "@/app/components/unduhan-kelas";
import {
  kelompokkanPerProvider,
  type KualitasUnduhan,
  type LinkUnduhanPublik,
} from "@/lib/playly-unduhan";
import {
  labelTombolUnduhPlayly,
  urlUnduhResolusi,
  warnaTombolUnduhPlayly,
  type PilihanUnduhPlayly,
  type UnduhLangsungPlayly,
} from "@/lib/playly-unduh-langsung";
import type { DownloadButtonColor } from "@/lib/types";

/**
 * Warna tombol per kualitas (owner 2026-10-07, contoh gambar): 1080p biru,
 * 480p oranye — penonton membedakan ketajaman dari warnanya sebelum membaca.
 * Record bertipe KualitasUnduhan: kualitas baru tanpa warna = error tsc.
 */
const WARNA_KUALITAS: Record<KualitasUnduhan, DownloadButtonColor> = {
  "1080p": "blue",
  "480p": "orange",
};

export default function ModalProviderPlayly({
  open,
  onClose,
  links,
  title,
  videoId,
}: {
  open: boolean;
  onClose: () => void;
  /** Sudah disaring server (https + domain per provider) sebelum sampai sini. */
  links: LinkUnduhanPublik[];
  /** Judul video, dipakai sebagai keterangan kecil di kepala popup. */
  title?: string;
  /**
   * Id video Playly, untuk menanyakan baris "Playly".
   *
   * OPSIONAL dengan sengaja: tanpa id, popup berperilaku PERSIS seperti sebelum
   * baris itu ada -- nol panggilan jaringan. Itulah yang membuat penambahan ini
   * tidak mengubah apa pun bagi pemanggil yang belum mengirimkannya.
   */
  videoId?: string | null;
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

  /**
   * Tawaran unduhan dari server Playly untuk video INI. null = belum ada
   * jawaban, atau memang tidak ada -- dua-duanya berarti barisnya tak digambar.
   */
  const [unduhPlayly, setUnduhPlayly] = useState<UnduhLangsungPlayly | null>(null);
  /**
   * true selama jawabannya belum sampai. Dipakai MENAHAN teks "Link unduhan
   * belum tersedia": tanpa ini, video yang hanya punya unduhan Playly sempat
   * menampilkan kalimat yang salah sebelum barisnya muncul.
   */
  const [memeriksaPlayly, setMemeriksaPlayly] = useState(false);
  /** Id yang sudah pernah ditanyakan -- buka-tutup popup tak menanyakannya lagi. */
  const sudahDitanya = useRef<string | null>(null);

  // Ditanyakan saat popup DIBUKA, satu kali per video. Hook dipasang SEBELUM
  // early-return, sama alasannya dengan hook Escape di atas.
  useEffect(() => {
    if (!open || !videoId) return;
    if (sudahDitanya.current === videoId) return;
    sudahDitanya.current = videoId;

    let hidup = true;
    let terjawab = false;
    setUnduhPlayly(null);
    setMemeriksaPlayly(true);

    (async () => {
      try {
        const res = await fetch(`/api/playly/unduh?id=${encodeURIComponent(videoId)}`);
        // Balasan gagal (404/502) sengaja diperlakukan sama dengan "tidak ada":
        // penonton tidak bisa memperbaiki apa pun dari pesan error Playly.
        const json: unknown = res.ok ? await res.json() : null;
        terjawab = true;
        if (hidup) setUnduhPlayly(bacaBalasanUnduh(json));
      } catch {
        // Jaringan putus / balasan bukan JSON -> gagal-AMAN: baris Playly tidak
        // digambar, provider lain tetap tampil seperti biasa.
      } finally {
        if (hidup) setMemeriksaPlayly(false);
      }
    })();

    return () => {
      hidup = false;
      // Ditutup SEBELUM terjawab -> boleh ditanyakan lagi saat dibuka lagi.
      // Tanpa baris ini, menutup popup di tengah pengambilan membuat baris
      // Playly tak pernah muncul lagi sampai halaman dimuat ulang.
      if (!terjawab) sudahDitanya.current = null;
    };
  }, [open, videoId]);

  if (!open) return null;

  const baris = kelompokkanPerProvider(links);
  // Tabel digambar kalau ADA yang bisa ditawarkan -- dari provider yang diisi
  // admin ATAU dari Playly. Sebelum baris Playly ada, cukup `baris.length`.
  const adaIsi = baris.length > 0 || unduhPlayly !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pilih provider download"
        // max-h + gulir di DALAM kotak: di HP mendatar, tabel 5 provider bisa
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
          {!adaIsi ? (
            <p className="rounded-lg bg-zinc-100 px-3 py-6 text-center text-sm font-medium text-zinc-600">
              {memeriksaPlayly ? "Memeriksa ketersediaan unduhan..." : "Link unduhan belum tersedia"}
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
                                KELAS_WARNA_TOMBOL[WARNA_KUALITAS[t.quality]],
                              )}
                            >
                              <a href={t.url} target="_blank" rel="noopener noreferrer">
                                <Download className="size-3.5" />
                                {labelTombolProvider(t.quality)}
                              </a>
                            </Button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* PALING BAWAH, mengikuti contoh kode owner: provider yang
                      diisi admin lebih dulu, unduhan langsung dari Playly
                      sebagai tambahan. Alamatnya juga milik pihak luar, jadi
                      aturan target/rel-nya sama dengan baris di atas. */}
                  {unduhPlayly && (
                    <tr className="border-b border-zinc-200 last:border-0">
                      <td className="px-3 py-2.5 align-middle text-sm font-medium text-zinc-800">
                        Playly
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {/* `res` ke alamat, `label` ke mata penonton — keduanya
                              boleh berbeda (lib/playly-unduh-langsung.ts). */}
                          {unduhPlayly.pilihan.map((pil) => (
                            <Button
                              key={pil.res}
                              asChild
                              size="sm"
                              className={cn(
                                "h-8 whitespace-nowrap rounded-md px-3 text-xs font-bold text-white",
                                KELAS_WARNA_TOMBOL[warnaTombolUnduhPlayly(pil.label)],
                              )}
                            >
                              <a
                                href={urlUnduhResolusi(unduhPlayly.url, pil.res)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="size-3.5" />
                                {labelTombolUnduhPlayly(pil.label)}
                              </a>
                            </Button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
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

/**
 * Balasan /api/playly/unduh -> bentuk siap digambar, atau null.
 *
 * PENYARING KEAMANANNYA DI SERVER (https + wajib domain Playly,
 * lib/playly-unduh-langsung.ts). Yang di sini cuma memastikan BENTUKNYA sesuai
 * sebelum dipakai menggambar, supaya balasan di luar dugaan tidak membuat popup
 * gagal digambar sama sekali. Daftar domainnya memang tidak bisa diperiksa ulang
 * di browser: isinya dari env server yang sengaja tidak dikirim ke browser.
 */
function bacaBalasanUnduh(json: unknown): UnduhLangsungPlayly | null {
  if (typeof json !== "object" || json === null) return null;
  const { unduh } = json as { unduh?: unknown };
  if (typeof unduh !== "object" || unduh === null) return null;
  const { url, pilihan } = unduh as { url?: unknown; pilihan?: unknown };
  if (typeof url !== "string" || !url || !Array.isArray(pilihan)) return null;

  const bersih: PilihanUnduhPlayly[] = [];
  for (const item of pilihan) {
    if (typeof item !== "object" || item === null) continue;
    const { res, label } = item as { res?: unknown; label?: unknown };
    if (typeof res !== "string" || res === "") continue;
    // Tulisan tombol tak pernah dibiarkan kosong: jatuh ke `res` supaya tidak
    // ada tombol tanpa teks yang tetap bisa diklik.
    bersih.push({ res, label: typeof label === "string" && label !== "" ? label : res });
  }
  return bersih.length > 0 ? { url, pilihan: bersih } : null;
}
