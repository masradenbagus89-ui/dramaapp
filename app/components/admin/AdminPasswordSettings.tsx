"use client";

// Panel "Ubah Password Pribadi" di halaman admin. Admin yang sedang login bisa
// memasang password khusus untuk dirinya (berbeda dari password admin bersama).
// Server mengidentifikasi admin dari cookie sesi (bukan input) lalu menyimpan
// hash-nya. Kalau belum dipasang, admin tetap memakai password bersama.
import { useState, type FormEvent } from "react";

export default function AdminPasswordSettings() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(
    null,
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (pw.length < 8) {
      setMsg({ type: "error", text: "Password minimal 8 karakter." });
      return;
    }
    if (pw !== confirm) {
      setMsg({ type: "error", text: "Konfirmasi password tidak cocok." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/admin-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: pw }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMsg({
          type: "ok",
          text: "Password pribadi berhasil dipasang. Mulai sekarang kamu login pakai password ini.",
        });
        setPw("");
        setConfirm("");
      } else {
        setMsg({ type: "error", text: data.error ?? "Gagal menyimpan password." });
      }
    } catch {
      setMsg({ type: "error", text: "Koneksi gagal. Coba lagi." });
    } finally {
      setBusy(false);
    }
  };

  const field =
    "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400";

  return (
    <section id="ubah-password">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Ubah Password Pribadi</h2>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <p className="mb-3 text-sm text-zinc-400">
          Pasang password khusus untuk akunmu (berbeda dari password admin
          bersama). Kalau belum dipasang, kamu tetap login pakai password
          bersama.
        </p>
        <form onSubmit={onSubmit} className="grid gap-3 md:max-w-md">
          <input
            type={show ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password baru (min 8 karakter)"
            autoComplete="new-password"
            className={field}
          />
          <input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Ulangi password baru"
            autoComplete="new-password"
            className={field}
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
              className="h-4 w-4 accent-amber-400"
            />
            Tampilkan password
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-max rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-black hover:bg-amber-300 disabled:opacity-50"
          >
            {busy ? "Menyimpan..." : "Simpan Password"}
          </button>
        </form>

        {msg && (
          <div
            className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
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
