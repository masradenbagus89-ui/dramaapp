"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  className,
}: {
  dramaId: string;
  /** Jumlah episode drama; dipakai HANYA untuk menamai tombol dengan jujur. */
  episodes: number;
  className?: string;
}) {
  const [started, setStarted] = useState(false);

  // Serial punya banyak episode tapi tombol ini cuma mengambil episode 1, jadi
  // nomornya WAJIB disebut — "DOWNLOAD" polos di serial 20 episode menjanjikan
  // sesuatu yang tidak diberikan.
  const label =
    episodes > 1 ? `DOWNLOAD EP ${DETAIL_DOWNLOAD_EP}` : "DOWNLOAD";

  return (
    <Button
      asChild
      className={cn(
        "h-11 rounded-full bg-pink-600 px-5 text-sm font-bold tracking-wide text-white hover:bg-pink-500",
        className,
      )}
    >
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
