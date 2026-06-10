"use client";

import { useEffect, useState } from "react";

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
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              enabled
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-zinc-700 text-zinc-300"
            }`}
          >
            {enabled ? "AKTIF" : "NONAKTIF"}
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <p className="text-sm text-zinc-400">
          Two-Factor Authentication (TOTP) menambah lapisan kedua saat login admin:
          selain password, wajib kode 6 digit dari aplikasi authenticator
          (Google Authenticator / Authy). Melindungi panel admin walau password bocor.
        </p>

        {/* IDLE */}
        {mode === "idle" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {!enabled ? (
              <button
                onClick={startSetup}
                disabled={busy || loading}
                className="rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-black hover:bg-amber-300 disabled:opacity-50"
              >
                {busy ? "Memproses…" : "Aktifkan 2FA"}
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMode("disabling");
                    setCode("");
                    setMsg(null);
                  }}
                  className="rounded-full border border-red-800 px-5 py-2 text-sm font-semibold text-red-300 hover:border-red-500 hover:bg-red-950/40"
                >
                  Nonaktifkan 2FA
                </button>
                <button
                  onClick={startSetup}
                  disabled={busy}
                  className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-300 hover:border-amber-400 hover:text-amber-300 disabled:opacity-50"
                >
                  Ganti perangkat
                </button>
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
              <button
                onClick={copySecret}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-amber-400"
              >
                Salin
              </button>
            </div>

            <details className="text-xs text-zinc-500">
              <summary className="cursor-pointer hover:text-zinc-300">URI otpauth:// (alternatif)</summary>
              <code className="mt-1 block break-all rounded bg-zinc-950 p-2 font-mono text-zinc-400">
                {otpauth}
              </code>
            </details>

            <label className="block">
              <span className="text-sm text-zinc-300">Masukkan 6 digit dari app untuk konfirmasi</span>
              <input
                value={code}
                onChange={(e) => onCode(e.target.value)}
                inputMode="numeric"
                placeholder="123456"
                className="mt-1 w-40 rounded-lg border border-amber-700 bg-zinc-900 px-3 py-2 text-center text-lg tracking-[0.3em] text-white outline-none focus:border-amber-400"
              />
            </label>

            <div className="flex gap-2">
              <button
                onClick={confirmEnable}
                disabled={busy || code.length < 6}
                className="rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-black hover:bg-amber-300 disabled:opacity-50"
              >
                {busy ? "Memverifikasi…" : "Konfirmasi & aktifkan"}
              </button>
              <button
                onClick={() => {
                  setMode("idle");
                  setMsg(null);
                }}
                className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-300 hover:border-zinc-500"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* DISABLING — minta kode untuk konfirmasi */}
        {mode === "disabling" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-zinc-300">
              Masukkan kode authenticator untuk menonaktifkan 2FA.
            </p>
            <input
              value={code}
              onChange={(e) => onCode(e.target.value)}
              inputMode="numeric"
              placeholder="123456"
              className="w-40 rounded-lg border border-red-800 bg-zinc-900 px-3 py-2 text-center text-lg tracking-[0.3em] text-white outline-none focus:border-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={confirmDisable}
                disabled={busy || code.length < 6}
                className="rounded-full bg-red-500 px-5 py-2 text-sm font-bold text-white hover:bg-red-400 disabled:opacity-50"
              >
                {busy ? "Memproses…" : "Nonaktifkan"}
              </button>
              <button
                onClick={() => {
                  setMode("idle");
                  setMsg(null);
                }}
                className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-300 hover:border-zinc-500"
              >
                Batal
              </button>
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
      </div>
    </section>
  );
}
