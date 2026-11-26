"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { nameAfterLogin, readUser, writeUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { tujuanSetelahMasuk } from "@/lib/tujuan-login";

/**
 * Kotak email + password.
 *
 * Isian TIDAK dikunci ke state React. Browser sering mengisi email/password
 * sendiri tanpa memberi tahu React; kalau nilainya hanya dibaca dari state,
 * tombol Masuk mengira kotaknya kosong. Nilai dibaca dari form saat dikirim.
 *
 * `method` + `action` sengaja ada: kalau JavaScript halaman belum menempel,
 * browser tetap mengirim form ke server. Tanpa itu klik Masuk cuma memuat
 * ulang /login? dan tidak ada yang diperiksa.
 */
export default function FormMasuk({
  pesan,
  next,
}: {
  pesan: string | null;
  next: string | null;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(pesan);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    if (!email.includes("@")) {
      setError("Format email tidak valid.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next }),
      });
      const jawaban = await res.json();

      if (!res.ok || !jawaban.ok) {
        setSubmitting(false);
        setError(String(jawaban.error ?? "Login gagal. Coba lagi."));
        return;
      }
      writeUser({
        name: nameAfterLogin(jawaban.name, jawaban.email, readUser()),
        email: jawaban.email,
        role: jawaban.role,
      });
      const role = jawaban.role === "admin" ? "admin" : "viewer";
      router.push(tujuanSetelahMasuk(role, next));
    } catch {
      setSubmitting(false);
      setError("Koneksi gagal. Coba lagi.");
    }
  };

  return (
    <Card className="rounded-2xl border-zinc-800 bg-zinc-900/40 py-0">
      <CardContent className="p-6">
        <form method="post" action="/api/auth/login" onSubmit={onSubmit}>
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div className="space-y-2">
            <Label htmlFor="login-email" className="text-zinc-300">
              Email
            </Label>
            <Input
              id="login-email"
              name="email"
              type="email"
              placeholder="nama@email.com"
              autoComplete="email"
              required
              className="rounded-lg border-zinc-700 bg-zinc-900 text-white focus-visible:border-amber-400 focus-visible:ring-0"
            />
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="login-password" className="text-zinc-300">
              Password
            </Label>
            <div className="relative">
              <Input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Ketik password"
                autoComplete="current-password"
                required
                className="rounded-lg border-zinc-700 bg-zinc-900 pr-10 text-white focus-visible:border-amber-400 focus-visible:ring-0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-zinc-400 hover:bg-transparent hover:text-white"
                aria-label={showPassword ? "Sembunyikan" : "Tampilkan"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-700 bg-red-900/30 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-full bg-amber-400 py-3 text-sm font-bold text-black hover:bg-amber-300"
          >
            {submitting ? "Memproses..." : "Masuk"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function TautanBawahLogin() {
  return (
    <>
      <p className="mt-4 text-center text-sm text-zinc-400">
        Lupa password?{" "}
        <Button
          asChild
          variant="link"
          className="h-auto p-0 font-semibold text-amber-400"
        >
          <Link href="/lupa-password">Pulihkan dengan kode</Link>
        </Button>
      </p>

      <p className="mt-2 text-center text-sm text-zinc-400">
        Belum punya akun?{" "}
        <Button
          asChild
          variant="link"
          className="h-auto p-0 font-semibold text-amber-400"
        >
          <Link href="/daftar">Daftar sekarang</Link>
        </Button>
      </p>
    </>
  );
}
