"use client";

// Bagian "Kelola Admin" di halaman admin: daftar admin + tambah/hapus admin.
// Dipisah dari app/admin/page.tsx supaya halaman lebih ringkas. Bagian ini
// mengurus datanya sendiri (ambil daftar admin dari /api/admins); satu-satunya
// yang dibutuhkan dari luar = email admin yang sedang login (untuk verifikasi
// "requester" di server). Perilaku & tampilan dipertahankan sama persis.
import { useEffect, useState, type FormEvent } from "react";

type AdminEntry = { email: string; name: string; addedAt: string };

export default function AdminManager({
  currentAdminEmail,
}: {
  currentAdminEmail: string;
}) {
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [adminMessage, setAdminMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const refreshAdmins = () => {
    fetch("/api/admins")
      .then((r) => r.json())
      .then((data: { admins?: AdminEntry[] }) => setAdmins(data.admins ?? []))
      .catch(() => setAdmins([]));
  };

  useEffect(refreshAdmins, []);

  const onAddAdmin = async (e: FormEvent) => {
    e.preventDefault();
    setAdminMessage(null);
    if (!newAdminEmail.trim()) return;
    if (!newAdminEmail.includes("@")) {
      setAdminMessage({ type: "error", text: "Format email tidak valid." });
      return;
    }
    const res = await fetch("/api/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newAdminEmail.trim(),
        name: newAdminName.trim() || newAdminEmail.split("@")[0],
        requesterEmail: currentAdminEmail,
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setAdminMessage({
        type: "ok",
        text: `Admin "${data.admin.email}" ditambahkan. Mereka bisa login sekarang.`,
      });
      setNewAdminEmail("");
      setNewAdminName("");
      refreshAdmins();
    } else {
      setAdminMessage({
        type: "error",
        text: data.error ?? "Gagal tambah admin",
      });
    }
  };

  const onRemoveAdmin = async (email: string) => {
    if (!confirm(`Hapus admin "${email}"? Akun ini akan jadi viewer biasa.`))
      return;
    const res = await fetch("/api/admins", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, requesterEmail: currentAdminEmail }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setAdminMessage({ type: "ok", text: `Admin "${email}" dihapus.` });
      refreshAdmins();
    } else {
      setAdminMessage({
        type: "error",
        text: data.error ?? "Gagal hapus admin",
      });
    }
  };

  return (
    <section id="kelola-admin">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Kelola Admin</h2>
        <span className="text-xs text-zinc-500">{admins.length} admin</span>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <p className="mb-3 text-sm text-zinc-400">
          Tambah email kolega yang mau Anda jadikan admin. Mereka login pakai email itu (password apa saja) dan otomatis dapat role admin.
        </p>
        <form
          onSubmit={onAddAdmin}
          className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
        >
          <input
            type="email"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            placeholder="email-admin-baru@contoh.com"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
          />
          <input
            type="text"
            value={newAdminName}
            onChange={(e) => setNewAdminName(e.target.value)}
            placeholder="Nama (opsional)"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            className="rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-black hover:bg-amber-300"
          >
            + Tambah Admin
          </button>
        </form>

        {adminMessage && (
          <div
            className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
              adminMessage.type === "ok"
                ? "border-emerald-700 bg-emerald-900/30 text-emerald-300"
                : "border-red-700 bg-red-900/30 text-red-300"
            }`}
          >
            {adminMessage.text}
          </div>
        )}

        <div className="mt-5 divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
          {admins.map((a) => {
            const isMe = a.email.toLowerCase() === currentAdminEmail.toLowerCase();
            const isLast = admins.length <= 1;
            return (
              <div key={a.email} className="flex items-center gap-3 bg-zinc-900/40 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-sm font-bold text-black">
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-white">{a.name}</span>
                    {isMe && (
                      <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">
                        Anda
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-zinc-500">
                    {a.email} · ditambah {a.addedAt}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveAdmin(a.email)}
                  disabled={isMe || isLast}
                  className="rounded-md border border-red-900 px-3 py-1 text-xs text-red-400 hover:border-red-500 hover:bg-red-950 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                  title={
                    isMe
                      ? "Tidak bisa hapus akun Anda sendiri"
                      : isLast
                        ? "Minimal harus ada 1 admin"
                        : "Hapus admin"
                  }
                >
                  Hapus
                </button>
              </div>
            );
          })}
          {admins.length === 0 && (
            <div className="p-6 text-center text-sm text-zinc-500">
              Belum ada admin terdaftar.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
