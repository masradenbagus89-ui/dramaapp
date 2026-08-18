"use client";

import { useState } from "react";
import { MIN_VIEWER_PASSWORD_LEN } from "@/lib/viewer-password";
import RecoveryCodePanel from "@/app/components/RecoveryCodePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";

/**
 * Bagian "kode pemulihan" di halaman profil.
 *
 * Dua keadaan yang dilayani: akun yang dibuat sebelum fitur ini ada (Tahap 6,
 * belum punya kode sama sekali) dan penonton yang kodenya hilang tapi masih
 * bisa masuk.
 *
 * Password diminta ulang karena membuat kode baru MENGHANGUSKAN kode lama —
 * aturan itu ditegakkan server, form ini cuma mengikutinya.
 */
export default function RecoverySection() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError("Masukkan password kamu dulu.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/recovery-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Gagal membuat kode. Coba lagi.");
        return;
      }
      setCode(data.recoveryCode);
      setPassword("");
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (code) {
    return (
      <div className="mx-auto max-w-2xl">
        <RecoveryCodePanel code={code} />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setCode(null);
            setOpen(false);
          }}
          className="mt-3 w-full rounded-2xl border-zinc-800 bg-zinc-900/50 py-3 text-sm font-semibold text-zinc-300"
        >
          Selesai
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-2">
        <KeyRound className="size-4 shrink-0 text-amber-400" />
        <h2 className="text-sm font-semibold text-white">Kode pemulihan</h2>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Kalau lupa password, kode inilah satu-satunya cara masuk kembali.
        Membuat kode baru membuat kode lama tidak berlaku lagi.
      </p>

      {!open ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="mt-3 w-full rounded-xl border-zinc-700 bg-zinc-900 py-2 text-sm font-semibold text-zinc-200"
        >
          Buat kode pemulihan baru
        </Button>
      ) : (
        <form onSubmit={onSubmit} className="mt-3 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="pulih-cek-password" className="text-zinc-300">
              Konfirmasi password kamu
            </Label>
            <Input
              id="pulih-cek-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`Minimal ${MIN_VIEWER_PASSWORD_LEN} karakter`}
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-full py-2 text-sm font-bold hover:bg-amber-300 disabled:opacity-50"
            >
              {submitting ? "Membuat..." : "Buat kode"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setPassword("");
                setError(null);
              }}
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              Batal
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
