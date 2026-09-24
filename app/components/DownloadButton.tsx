"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DownloadProvider } from "@/lib/types";
import DownloadModal from "./DownloadModal";
import {
  DETAIL_DOWNLOAD_EP,
  detailDownloadUrl,
  downloadFileName,
} from "@/lib/video";

/** Berapa lama tulisan "Menyiapkan…" bertahan sebelum kembali normal. */
const FEEDBACK_MS = 2500;

/**
 * Tombol unduh di halaman detail drama.
 *
 * DUA PERILAKU, ditentukan oleh ada-tidaknya daftar provider:
 *
 * 1. ADA provider (`providers` terisi) -> tombol MEMBUKA MODAL berisi pilihan
 *    sumber unduhan (Google Share / Telegram / Mega / ...). Alamatnya milik
 *    pihak luar, jadi modal yang mengurusnya — lihat DownloadModal.
 * 2. TIDAK ada provider -> perilaku lama: unduh satu berkas dari server sendiri
 *    lewat /api/download. Sengaja dipertahankan, bukan dihapus: sebagian besar
 *    judul di katalog belum punya daftar provider, dan tombol yang hilang untuk
 *    judul-judul itu = kemunduran yang tak ada yang minta.
 *
 * Catatan perilaku lama (masih berlaku untuk jalur 2):
 *
 * Sengaja memakai <a download> asli, bukan tombol ber-JavaScript: klik-kanan
 * "Simpan tautan sebagai" tetap jalan, dan unduhan tetap bisa dimulai walau
 * JavaScript gagal dimuat. Umpan balik "Menyiapkan…" hanya lapisan tambahan —
 * ada karena route /api/download perlu sedetik-dua untuk menanyakan alamat
 * sumber, dan tanpa tanda apa pun penonton mengira tombolnya rusak lalu
 * mengklik berulang.
 *
 * Atribut `download` dihormati browser saat berkasnya same-origin (mode
 * lokal/dev). Di produksi route membalas 307 ke tunnel, dan header
 * `Content-Disposition: attachment` dari sana (pc-backup-agent/Caddyfile:20-27)
 * yang memaksa HP MENGUNDUH, bukan membuka video di tab.
 *
 * TIDAK dipakai untuk video Playly: berkasnya beda domain dengan alamat
 * bertanda tangan yang kedaluwarsa ~6 jam (lib/playly.ts:1217), dan browser
 * mengabaikan atribut `download` lintas-domain — tombol yang tidak benar-benar
 * mengunduh lebih buruk daripada tidak ada tombol. Keputusan owner 2026-09-21.
 */
export default function DownloadButton({
  dramaId,
  episodes,
  title,
  providers = [],
  className,
}: {
  dramaId: string;
  /** Jumlah episode drama; dipakai HANYA untuk menamai tombol dengan jujur. */
  episodes: number;
  /** Judul drama, diteruskan ke modal sebagai keterangan. */
  title?: string;
  /**
   * Pilihan unduhan lewat provider luar. Kosong/tak dikirim = perilaku lama
   * (jalur 2 di atas) — itulah sebabnya default-nya array kosong, bukan wajib.
   */
  providers?: DownloadProvider[];
  className?: string;
}) {
  const [started, setStarted] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const pakaiProvider = providers.length > 0;

  // Serial punya banyak episode tapi jalur /api/download cuma mengambil episode
  // 1, jadi nomornya WAJIB disebut — "DOWNLOAD" polos di serial 20 episode
  // menjanjikan sesuatu yang tidak diberikan.
  //
  // Mode provider TIDAK memakai embel-embel episode: yang ditawarkan di modal
  // adalah berkas milik provider, dan cakupannya ditentukan owner saat mengisi
  // datanya — menempelkan "EP 1" di situ justru jadi keterangan yang salah.
  const label =
    !pakaiProvider && episodes > 1
      ? `DOWNLOAD EP ${DETAIL_DOWNLOAD_EP}`
      : "DOWNLOAD";

  const kelas = cn(
    "h-11 rounded-full bg-pink-600 px-5 text-sm font-bold tracking-wide text-white hover:bg-pink-500",
    className,
  );

  if (pakaiProvider) {
    return (
      <>
        <Button
          type="button"
          onClick={() => setIsDownloadModalOpen(true)}
          className={kelas}
        >
          <Download className="size-4" />
          {label}
        </Button>
        <DownloadModal
          open={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          providers={providers}
          title={title}
        />
      </>
    );
  }

  return (
    <Button asChild className={kelas}>
      <a
        href={detailDownloadUrl(dramaId)}
        download={downloadFileName(dramaId, DETAIL_DOWNLOAD_EP)}
        rel="noopener"
        onClick={() => {
          setStarted(true);
          window.setTimeout(() => setStarted(false), FEEDBACK_MS);
        }}
      >
        <Download className="size-4" />
        {started ? "Menyiapkan…" : label}
      </a>
    </Button>
  );
}
