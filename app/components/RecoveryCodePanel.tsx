"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, KeyRound, TriangleAlert } from "lucide-react";

const FEEDBACK_MS = 2000;

/**
 * Menampilkan kode pemulihan SEKALI, dengan tombol salin.
 *
 * Dipakai di tiga tempat: sesudah daftar, sesudah reset password, dan di
 * halaman profil. Pre-mortem rencana Tahap 7: penonton cenderung meng-klik
 * "sudah saya simpan" tanpa benar-benar menyalin — jadi peringatan dan tombol
 * salin di sini bukan hiasan.
 */
export default function RecoveryCodePanel({
  code,
  onConfirm,
  confirmLabel = "Saya sudah menyimpan kode ini",
}: {
  code: string;
  /** Tak diisi = panel hanya menampilkan, tanpa tombol lanjut. */
  onConfirm?: () => void;
  confirmLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [checked, setChecked] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), FEEDBACK_MS);
    } catch {
      // Clipboard diblokir browser — kode tetap terlihat & bisa disalin manual.
    }
  };

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 text-amber-300">
        <KeyRound className="size-4 shrink-0" />
        <h2 className="text-sm font-bold">Kode pemulihan</h2>
      </div>

      <p className="mt-2 text-xs text-zinc-300">
        Simpan kode ini di tempat aman. Kalau lupa password, kode inilah
        satu-satunya cara masuk kembali ke akunmu.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 select-all rounded-lg border border-zinc-700 bg-black px-3 py-2 text-center font-mono text-base tracking-widest text-amber-300">
          {code}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copy}
          className="shrink-0 border-zinc-700 bg-zinc-900 text-zinc-200"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Tersalin" : "Salin"}
        </Button>
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs text-amber-200/90">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Kode ini <strong>tidak akan ditampilkan lagi</strong>. Kalau hilang,
          kamu bisa membuat yang baru di halaman Profil selagi masih bisa masuk.
        </span>
      </p>

      {onConfirm && (
        <div className="mt-4">
          <label className="flex cursor-pointer items-start gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 size-4 accent-amber-400"
            />
            <span>{confirmLabel}</span>
          </label>
          <Button
            type="button"
            disabled={!checked}
            onClick={onConfirm}
            className="mt-3 w-full rounded-full py-2 text-sm font-bold hover:bg-amber-300 disabled:opacity-50"
          >
            Lanjut
          </Button>
        </div>
      )}
    </div>
  );
}
