"use client";

// Kerangka bersama jendela Report Video & Live Chat: latar gelap, kotak yang
// naik dari bawah di HP / di tengah di layar lebar, judul + tombol tutup, Esc.
//
// SENGAJA tanpa portal (sama seperti DownloadModal): pemutar drama memakai
// layar penuh pada elemennya sendiri, dan isi yang dipindah ke <body> lewat
// portal tak terlihat selama layar penuh aktif.
import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function JendelaBantuan({
  open,
  onClose,
  judul,
  subjudul,
  children,
}: {
  open: boolean;
  onClose: () => void;
  judul: string;
  subjudul?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={judul}
        className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-zinc-800 bg-zinc-950 text-left shadow-2xl sm:rounded-2xl"
        // Klik di dalam kotak tak boleh ikut menutup jendela.
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">{judul}</p>
            {subjudul && <p className="truncate text-xs text-zinc-400">{subjudul}</p>}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Tutup"
            className="size-8 shrink-0 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="size-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Isi jendela untuk tamu: fitur bantuan butuh akun supaya pengirimnya jelas. */
export function PerluMasuk({ alasan }: { alasan: string }) {
  return (
    <div className="space-y-3 p-5 text-center">
      <p className="text-sm text-zinc-300">{alasan}</p>
      <Button asChild className="bg-amber-400 text-zinc-950 hover:bg-amber-300">
        <Link href="/login">Masuk</Link>
      </Button>
      <p className="text-xs text-zinc-500">
        Belum punya akun?{" "}
        <Link href="/daftar" className="text-amber-400 underline">
          Daftar gratis
        </Link>
      </p>
    </div>
  );
}
