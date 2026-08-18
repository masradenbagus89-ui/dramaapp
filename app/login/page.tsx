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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [need2fa, setNeed2fa] = useState(false);
  const [token, setToken] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    if (!email.includes("@")) {
      setError("Format email tidak valid.");
      return;
    }
    if (need2fa && token.trim().length < 6) {
      setError("Masukkan 6 digit kode dari aplikasi authenticator.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          token: need2fa ? token.trim() : undefined,
        }),
      });
      const data = await res.json();

      // Password benar tapi akun admin ini pakai 2FA → minta kode.
      if (data.need2fa) {
        setSubmitting(false);
        setNeed2fa(true);
        setError(data.error ?? null); // error terisi hanya kalau kode tadi salah
        return;
      }

      if (!res.ok || !data.ok) {
        setSubmitting(false);
        const raw = String(data.error ?? "Login gagal. Coba lagi.");
        setError(
          raw.includes("Password admin salah")
            ? "Password admin salah. Pakai password admin — bukan password akun penonton. Kalau belum punya password pribadi, tanya admin yang menambahkan akun ini."
            : raw,
        );
        return;
      }
      writeUser({
        name: nameAfterLogin(data.name, data.email, readUser()),
        email: data.email,
        role: data.role,
      });
      router.push("/beranda");
    } catch {
      setSubmitting(false);
      setError("Koneksi gagal. Coba lagi.");
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-zinc-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="DramaKu" width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="text-lg font-bold text-white">DramaKu</span>
          </Link>
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">
            ← Kembali
          </Link>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="DramaKu" className="mx-auto mb-4 h-28 w-auto" />
            <h1 className="title-gold text-3xl leading-tight md:text-4xl">
              Selamat datang
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Masuk ke akun DramaKu kamu untuk lanjut menonton.
            </p>
          </div>

          <Card className="rounded-2xl border-zinc-800 bg-zinc-900/40 py-0">
            <CardContent className="p-6">
              <form onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-zinc-300">
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    autoComplete="email"
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
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
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

                {need2fa && (
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="login-2fa" className="text-zinc-300">
                      Kode 2FA (6 digit)
                    </Label>
                    <Input
                      id="login-2fa"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      value={token}
                      onChange={(e) =>
                        setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="123456"
                      className="h-auto rounded-lg border-amber-700 bg-zinc-900 py-2.5 text-center text-lg tracking-[0.4em] text-white focus-visible:border-amber-400 focus-visible:ring-0"
                    />
                    <span className="block text-xs text-zinc-500">
                      Buka aplikasi authenticator (Google Authenticator / Authy) dan masukkan kode untuk DramaKu.
                    </span>
                  </div>
                )}

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
                  {submitting
                    ? "Memproses..."
                    : need2fa
                      ? "Verifikasi & Masuk"
                      : "Masuk"}
                </Button>
              </form>
            </CardContent>
          </Card>

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

          <p className="mt-6 text-center text-[11px] text-zinc-600">
            Baru diangkat jadi admin? Keluar dari sesi penonton dulu tidak wajib
            — cukup masuk lagi di sini dengan password admin, yang berbeda dari
            password akun penontonmu. Belum bisa masuk sebagai penonton? Akun
            penonton kini butuh password; kalau kamu memakai situs ini sebelum
            password diberlakukan, daftar ulang dengan email yang sama.
          </p>
        </div>
      </div>
    </div>
  );
}
