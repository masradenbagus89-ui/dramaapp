"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { writeUser } from "@/lib/auth";

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
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
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
      // Block emails yang sudah terdaftar sebagai admin — daftar publik hanya untuk viewer.
      const res = await fetch("/api/admins");
      if (res.ok) {
        const data = (await res.json()) as { admins?: { email: string }[] };
        const adminEmails = (data.admins ?? []).map((a) => a.email.trim().toLowerCase());
        if (adminEmails.includes(email.trim().toLowerCase())) {
          setSubmitting(false);
          setError(
            "Email ini sudah terdaftar sebagai admin. Silakan login, atau gunakan email lain.",
          );
          return;
        }
      }

      writeUser({
        name: name.trim(),
        email: email.trim(),
        role: "viewer",
      });
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
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-400 font-serif text-base font-bold text-black">
              D
            </div>
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
            <h1 className="title-gold text-3xl leading-tight md:text-4xl">
              Buat akun baru
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Daftar gratis untuk mulai menonton drama favorit kamu.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
          >
            <label className="block">
              <span className="text-sm font-medium text-zinc-300">Nama lengkap</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama kamu"
                autoComplete="name"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-medium text-zinc-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                autoComplete="email"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-medium text-zinc-300">Password</span>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-10 text-sm text-white outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <path d="M1 1l22 22" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-medium text-zinc-300">Konfirmasi password</span>
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Ulangi password"
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
              />
            </label>

            <label className="mt-4 flex items-start gap-2">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-amber-400"
              />
              <span className="text-xs text-zinc-400">
                Saya setuju untuk membuat akun DramaKu dan menerima update
                drama baru.
              </span>
            </label>

            {error && (
              <div className="mt-4 rounded-lg border border-red-700 bg-red-900/30 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 w-full rounded-full bg-amber-400 py-3 text-sm font-bold text-black hover:bg-amber-300 disabled:opacity-50"
            >
              {submitting ? "Memproses..." : "Daftar Sekarang"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-zinc-400">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-amber-400 hover:underline">
              Masuk di sini
            </Link>
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
