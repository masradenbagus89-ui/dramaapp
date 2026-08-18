"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { writeUser } from "@/lib/auth";
import { MIN_VIEWER_PASSWORD_LEN } from "@/lib/viewer-password";
import RecoveryCodePanel from "@/app/components/RecoveryCodePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

/**
 * Pulihkan akun penonton memakai kode pemulihan.
 *
 * Project belum bisa kirim email (butuh domain sendiri), jadi kode pemulihan
 * inilah pengganti "link reset lewat email".
 */
export default function LupaPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<{ name: string; email: string } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !code.trim() || !password) {
      setError("Semua kolom wajib diisi.");
      return;
    }
    if (password.length < MIN_VIEWER_PASSWORD_LEN) {
      setError(`Password baru minimal ${MIN_VIEWER_PASSWORD_LEN} karakter.`);
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword: password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSubmitting(false);
        setError(data.error ?? "Pemulihan gagal. Coba lagi.");
        return;
      }
      // Kode lama sudah hangus — tampilkan kode BARU sebelum masuk.
      setPendingUser({ name: data.name, email: data.email });
      setNewCode(data.recoveryCode);
      setSubmitting(false);
    } catch {
      setSubmitting(false);
      setError("Koneksi gagal. Coba lagi.");
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="title-gold text-3xl leading-tight">Pulihkan akun</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Masukkan kode pemulihan yang kamu simpan saat mendaftar.
            </p>
          </div>

          {newCode ? (
            <div className="space-y-3">
              <p className="rounded-lg border border-emerald-600/40 bg-emerald-600/10 p-3 text-sm text-emerald-300">
                Password berhasil diganti. Kode lama sudah tidak berlaku — ini
                kode barumu.
              </p>
              <RecoveryCodePanel
                code={newCode}
                confirmLabel="Saya sudah menyimpan kode baru ini"
                onConfirm={() => {
                  if (pendingUser) {
                    writeUser({ ...pendingUser, role: "viewer" });
                  }
                  router.push("/beranda");
                }}
              />
            </div>
          ) : (
            <Card className="rounded-2xl border-zinc-800 bg-zinc-900/40 py-0">
              <CardContent className="p-6">
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pulih-email" className="text-zinc-300">
                      Email
                    </Label>
                    <Input
                      id="pulih-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@contoh.com"
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pulih-kode" className="text-zinc-300">
                      Kode pemulihan
                    </Label>
                    <Input
                      id="pulih-kode"
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="ABCD-EFGH-JKMN-PQRS"
                      className="font-mono tracking-widest"
                      autoComplete="off"
                    />
                    <p className="text-[11px] text-zinc-500">
                      Huruf besar-kecil dan tanda hubung tidak masalah.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pulih-password" className="text-zinc-300">
                      Password baru
                    </Label>
                    <div className="relative">
                      <Input
                        id="pulih-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={`Minimal ${MIN_VIEWER_PASSWORD_LEN} karakter`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pulih-konfirmasi" className="text-zinc-300">
                      Ulangi password baru
                    </Label>
                    <Input
                      id="pulih-konfirmasi"
                      type={showPassword ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                  {error && <p className="text-xs text-red-400">{error}</p>}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-full py-2 text-sm font-bold hover:bg-amber-300 disabled:opacity-50"
                  >
                    {submitting ? "Memproses..." : "Ganti password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <p className="mt-6 text-center text-sm text-zinc-400">
            Ingat password kamu?{" "}
            <Button asChild variant="link" className="h-auto p-0 font-semibold text-amber-400">
              <Link href="/login">Masuk di sini</Link>
            </Button>
          </p>

          <p className="mt-4 text-center text-[11px] text-zinc-600">
            Kode pemulihan hilang juga? Selama masih bisa masuk, buat kode baru
            di halaman Profil. Kalau sudah tidak bisa masuk sama sekali,
            hubungi admin.
          </p>
        </div>
      </div>
    </div>
  );
}
