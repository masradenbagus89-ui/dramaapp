"use client";

// Jalankan `tanya` sekarang lalu tiap `jedaMs`, selama `aktif` true.
//
// Pengganti "real-time" untuk Live Chat & lencana notifikasi: situs ini di
// Vercel, yang tak bisa menahan koneksi WebSocket lama (fungsi server mati
// setelah beberapa detik — rak realtime §2.5). Bertanya berkala cukup untuk
// percakapan bantuan.
//
// Berhenti saat tab disembunyikan (tiap tanya = satu baca database; tab yang
// terlupa di latar tak boleh terus menghabiskannya), lalu langsung bertanya
// lagi begitu tab terlihat — supaya yang tampil bukan data basi (resync).
import { useEffect, useRef } from "react";

export function usePolling(tanya: () => unknown, jedaMs: number, aktif: boolean): void {
  // Simpan versi terbaru `tanya` tanpa memulai ulang jadwal tiap render.
  const tanyaRef = useRef(tanya);
  useEffect(() => {
    tanyaRef.current = tanya;
  });

  useEffect(() => {
    if (!aktif) return;
    let jadwal: number | undefined;
    const jalan = () => {
      if (document.visibilityState === "visible") void tanyaRef.current();
    };
    const mulai = () => {
      window.clearInterval(jadwal);
      jalan();
      jadwal = window.setInterval(jalan, jedaMs);
    };
    const saatTerlihat = () => {
      if (document.visibilityState === "visible") mulai();
    };
    mulai();
    document.addEventListener("visibilitychange", saatTerlihat);
    return () => {
      window.clearInterval(jadwal);
      document.removeEventListener("visibilitychange", saatTerlihat);
    };
  }, [jedaMs, aktif]);
}
