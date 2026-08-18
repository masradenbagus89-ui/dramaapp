"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { writeUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

/** Samakan dengan MIN_VIEWER_PASSWORD_LEN di app/api/auth/register/route.ts. */
const MIN_PASSWORD_LEN = 8;

export default function DaftarPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError("Semua kolom wajib diisi.");
      return;
    }
    if (!email.includes("@")) {
      setError("Format email tidak valid.");
      return;
    }
    if (password.length < MIN_PASSWORD_LEN) {
      setError(`Password minimal ${MIN_PASSWORD_LEN} karakter.`);
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    if (!agree) {
      setError("Centang persetujuan dulu untuk lanjut.");
      return;
    }

    setSubmitting(true);
    try {
      // Akun DIBUAT DI SERVER: password disimpan sebagai hash, lalu server
      // memberi cookie sesi. Sebelum Tahap 6, pendaftaran cuma menulis ke
      // localStorage dan password yang diketik dibuang begitu saja.
      // Penolakan email admin & email yang sudah dipakai juga diputuskan server.
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSubmitting(false);
        setError(data.error ?? "Pendaftaran gagal. Coba lagi.");
        return;
      }

      // localStorage hanya untuk tampilan (nama & avatar) — identitas sebenarnya
      // ada di cookie sesi yang baru saja diberikan server.
      writeUser({ name: data.name, email: data.email, role: "viewer" });
      router.push("/beranda");
    } catch {
      setSubmitting(false);
      setError("Pendaftaran gagal. Coba lagi.");
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
              Buat akun baru
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Daftar gratis untuk mulai menonton drama favorit kamu.
            </p>
          </div>

          <Card className="rounded-2xl border-zinc-800 bg-zinc-900/40 py-0">
            <CardContent className="p-6">
              <form onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="daftar-name" className="text-zinc-300">
                    Nama lengkap
                  </Label>
                  <Input
                    id="daftar-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama kamu"
                    autoComplete="name"
                    className="rounded-lg border-zinc-700 bg-zinc-900 text-white focus-visible:border-amber-400 focus-visible:ring-0"
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="daftar-email" className="text-zinc-300">
                    Email
                  </Label>
                  <Input
                    id="daftar-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    autoComplete="email"
                    className="rounded-lg border-zinc-700 bg-zinc-900 text-white focus-visible:border-amber-400 focus-visible:ring-0"
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="daftar-password" className="text-zinc-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="daftar-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 8 karakter"
                      autoComplete="new-password"
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

                <div className="mt-4 space-y-2">
                  <Label htmlFor="daftar-confirm" className="text-zinc-300">
                    Konfirmasi password
                  </Label>
                  <Input
                    id="daftar-confirm"
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Ulangi password"
                    autoComplete="new-password"
                    className="rounded-lg border-zinc-700 bg-zinc-900 text-white focus-visible:border-amber-400 focus-visible:ring-0"
                  />
                </div>

                <Label
                  htmlFor="daftar-agree"
                  className="mt-4 flex items-start gap-2"
                >
                  <input
                    id="daftar-agree"
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-amber-400"
                  />
                  <span className="text-xs font-normal text-zinc-400">
                    Saya setuju untuk membuat akun DramaKu dan menerima update
                    drama baru.
                  </span>
                </Label>

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
                  {submitting ? "Memproses..." : "Daftar Sekarang"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-5 text-center text-sm text-zinc-400">
            Sudah punya akun?{" "}
            <Button
              asChild
              variant="link"
              className="h-auto p-0 font-semibold text-amber-400"
            >
              <Link href="/login">Masuk di sini</Link>
            </Button>
          </p>

          <p className="mt-6 text-center text-[11px] text-zinc-600">
            ⚠️ Versi prototype — data tersimpan di local storage browser kamu,
            bukan database online.
          </p>
        </div>
      </div>
    </div>
  );
}
