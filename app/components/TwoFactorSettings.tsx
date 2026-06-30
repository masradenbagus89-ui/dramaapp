"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "idle" | "enabling" | "disabling";

export default function TwoFactorSettings() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");

  const [secret, setSecret] = useState("");
  const [otpauth, setOtpauth] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(
    null,
  );

  const load = () => {
    fetch("/api/auth/2fa", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { enabled?: boolean } | null) => setEnabled(Boolean(d?.enabled)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startSetup = async () => {
    setBusy(true);
    setMsg(null);
    setCode("");
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const d = await res.json();
      if (res.ok && d.ok) {
        setSecret(d.secret);
        setOtpauth(d.otpauth);
        setMode("enabling");
      } else {
        setMsg({ type: "error", text: d.error ?? "Gagal memulai setup." });
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmEnable = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/auth/2fa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: code }),
    });
    const d = await res.json();
    if (res.ok && d.ok) {
      setEnabled(true);
      setMode("idle");
      setSecret("");
      setOtpauth("");
      setCode("");
      setMsg({ type: "ok", text: "2FA aktif. Login berikutnya minta kode." });
    } else {
      setMsg({ type: "error", text: d.error ?? "Kode salah." });
    }
    setBusy(false);
  };

  const confirmDisable = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/auth/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: code }),
    });
    const d = await res.json();
    if (res.ok && d.ok) {
      setEnabled(false);
      setMode("idle");
      setCode("");
      setMsg({ type: "ok", text: "2FA dinonaktifkan." });
    } else {
      setMsg({ type: "error", text: d.error ?? "Kode salah." });
    }
    setBusy(false);
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setMsg({ type: "ok", text: "Kunci disalin." });
    } catch {
      /* abaikan */
    }
  };

  const onCode = (v: string) => setCode(v.replace(/\D/g, "").slice(0, 6));

  return (
    <section id="keamanan">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Keamanan (2FA)</h2>
        {!loading && (
          <Badge
            variant={enabled ? "outline" : "secondary"}
            className={
              enabled
                ? "border-emerald-500/30 bg-emerald-500/15 font-bold text-emerald-300"
                : "font-bold"
            }
          >
            {enabled ? "AKTIF" : "NONAKTIF"}
          </Badge>
        )}
      </div>

      <Card className="rounded-2xl border-zinc-800 bg-zinc-900/40 py-0">
        <CardContent className="p-5">
          <p className="text-sm text-zinc-400">
            Two-Factor Authentication (TOTP) menambah lapisan kedua saat login admin:
            selain password, wajib kode 6 digit dari aplikasi authenticator
            (Google Authenticator / Authy). Melindungi panel admin walau password bocor.
          </p>

          {/* IDLE */}
          {mode === "idle" && (
            <div className="mt-4 flex flex-wrap gap-2">
              {!enabled ? (
                <Button
                  onClick={startSetup}
                  disabled={busy || loading}
                  className="rounded-full bg-amber-400 px-5 font-bold text-black hover:bg-amber-300"
                >
                  {busy ? "Memproses…" : "Aktifkan 2FA"}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMode("disabling");
                      setCode("");
                      setMsg(null);
                    }}
                    className="rounded-full border-red-800 px-5 font-semibold text-red-300 hover:border-red-500 hover:bg-red-950/40 hover:text-red-300"
                  >
                    Nonaktifkan 2FA
                  </Button>
                  <Button
                    variant="outline"
                    onClick={startSetup}
                    disabled={busy}
                    className="rounded-full border-zinc-700 px-5 font-semibold text-zinc-300 hover:border-amber-400 hover:bg-transparent hover:text-amber-300"
                  >
                    Ganti perangkat
                  </Button>
                </>
              )}
            </div>
          )}

          {/* ENABLING — tampilkan secret + minta kode */}
          {mode === "enabling" && (
            <div className="mt-4 space-y-3">
              <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-300">
                <li>Buka Google Authenticator / Authy → tambah akun → <strong>Masukkan kunci setup</strong>.</li>
                <li>Akun: <code className="text-amber-300">DramaKu</code>. Kunci (base32):</li>
              </ol>

              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-amber-200">
                  {secret}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copySecret}
                  className="rounded-lg border-zinc-700 text-xs text-zinc-300 hover:border-amber-400"
                >
                  Salin
                </Button>
              </div>

              <details className="text-xs text-zinc-500">
                <summary className="cursor-pointer hover:text-zinc-300">URI otpauth:// (alternatif)</summary>
                <code className="mt-1 block break-all rounded bg-zinc-950 p-2 font-mono text-zinc-400">
                  {otpauth}
                </code>
              </details>

              <div className="space-y-1">
                <Label htmlFor="twofa-enable-code" className="text-sm text-zinc-300">
                  Masukkan 6 digit dari app untuk konfirmasi
                </Label>
                <Input
                  id="twofa-enable-code"
                  value={code}
                  onChange={(e) => onCode(e.target.value)}
                  inputMode="numeric"
                  placeholder="123456"
                  className="h-auto w-40 rounded-lg border-amber-700 bg-zinc-900 py-2 text-center text-lg tracking-[0.3em] text-white focus-visible:border-amber-400 focus-visible:ring-0"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={confirmEnable}
                  disabled={busy || code.length < 6}
                  className="rounded-full bg-amber-400 px-5 font-bold text-black hover:bg-amber-300"
                >
                  {busy ? "Memverifikasi…" : "Konfirmasi & aktifkan"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMode("idle");
                    setMsg(null);
                  }}
                  className="rounded-full border-zinc-700 px-5 font-semibold text-zinc-300 hover:border-zinc-500 hover:bg-transparent hover:text-zinc-300"
                >
                  Batal
                </Button>
              </div>
            </div>
          )}

          {/* DISABLING — minta kode untuk konfirmasi */}
          {mode === "disabling" && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-zinc-300">
                Masukkan kode authenticator untuk menonaktifkan 2FA.
              </p>
              <Input
                value={code}
                onChange={(e) => onCode(e.target.value)}
                inputMode="numeric"
                placeholder="123456"
                aria-label="Kode authenticator untuk menonaktifkan 2FA"
                className="h-auto w-40 rounded-lg border-red-800 bg-zinc-900 py-2 text-center text-lg tracking-[0.3em] text-white focus-visible:border-red-500 focus-visible:ring-0"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={confirmDisable}
                  disabled={busy || code.length < 6}
                  className="rounded-full bg-red-500 px-5 font-bold text-white hover:bg-red-400"
                >
                  {busy ? "Memproses…" : "Nonaktifkan"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMode("idle");
                    setMsg(null);
                  }}
                  className="rounded-full border-zinc-700 px-5 font-semibold text-zinc-300 hover:border-zinc-500 hover:bg-transparent hover:text-zinc-300"
                >
                  Batal
                </Button>
              </div>
            </div>
          )}

          {msg && (
            <div
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                msg.type === "ok"
                  ? "border-emerald-700 bg-emerald-900/30 text-emerald-300"
                  : "border-red-700 bg-red-900/30 text-red-300"
              }`}
            >
              {msg.text}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
