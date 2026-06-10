"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AVATAR_COLORS,
  clearUser,
  getAvatarClass,
  readUser,
  writeUser,
  type User,
} from "@/lib/auth";
import CoinWallet from "@/app/components/CoinWallet";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>("");
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    setUser(readUser());
  }, []);

  const onLogout = () => {
    if (!confirm("Yakin mau keluar dari akun?")) return;
    clearUser();
    router.push("/");
  };

  const onStartEdit = () => {
    if (!user) return;
    setEditName(user.name);
    setEditColor(user.avatarColor || AVATAR_COLORS[0].className);
    setEditing(true);
    setSaveMsg(null);
  };

  const onCancelEdit = () => {
    setEditing(false);
    setSaveMsg(null);
  };

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setSaveMsg({ type: "error", text: "Nama tidak boleh kosong." });
      return;
    }
    if (trimmed.length > 40) {
      setSaveMsg({ type: "error", text: "Nama maksimal 40 karakter." });
      return;
    }
    const updated: User = {
      ...user,
      name: trimmed,
      avatarColor: editColor || undefined,
    };
    writeUser(updated);
    setUser(updated);
    setEditing(false);
    setSaveMsg({ type: "ok", text: "Profil tersimpan." });
  };

  const [expanded, setExpanded] = useState<string | null>(null);

  type MenuItem = {
    key: string;
    label: string;
    icon: string;
    onClick?: () => void;
    content?: React.ReactNode;
  };

  const menuItems: MenuItem[] = [
    {
      key: "riwayat",
      label: "Riwayat tontonan",
      icon: "M12 8v4l3 2",
      content: (
        <div className="px-4 pb-4 text-sm text-zinc-400">
          Riwayat tontonan otomatis terisi saat kamu menonton drama. Fitur tracking otomatis akan ditambahkan di update berikutnya.
        </div>
      ),
    },
    {
      key: "pengaturan",
      label: "Pengaturan akun",
      icon: "M12 15a3 3 0 100-6 3 3 0 000 6z",
      onClick: () => {
        setExpanded(null);
        if (user) onStartEdit();
      },
    },
    {
      key: "bahasa",
      label: "Bahasa",
      icon: "M3 12h18M12 3v18",
      content: (
        <div className="px-4 pb-4 text-sm text-zinc-400">
          Saat ini hanya tersedia <strong className="text-zinc-200">Bahasa Indonesia</strong>. Bahasa lain (English, Mandarin) akan ditambahkan nanti.
        </div>
      ),
    },
    {
      key: "tentang",
      label: "Tentang DramaKu",
      icon: "M12 8v4M12 16h.01",
      content: (
        <div className="space-y-2 px-4 pb-4 text-sm text-zinc-400">
          <p><strong className="text-zinc-200">DramaKu v0.1</strong> — prototype platform menonton drama China pendek dalam Bahasa Indonesia.</p>
          <p>Dibuat untuk koleksi drama pribadi. Login menggunakan local storage browser (bukan database asli — versi prototype).</p>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-6 md:px-6">
      {/* Header card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-bold text-black ${getAvatarClass(user)}`}
          >
            {mounted && user ? user.name.charAt(0).toUpperCase() : "T"}
          </div>
          <div className="min-w-0 flex-1">
            {mounted && user ? (
              <>
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-lg font-semibold text-white">{user.name}</h1>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      user.role === "admin"
                        ? "bg-amber-400/20 text-amber-300"
                        : "bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <p className="truncate text-xs text-zinc-400">{user.email}</p>
              </>
            ) : (
              <>
                <h1 className="text-lg font-semibold text-white">Tamu</h1>
                <p className="text-xs text-zinc-400">Belum login · Mode tamu</p>
              </>
            )}
          </div>
          {mounted && user && !editing && (
            <button
              onClick={onStartEdit}
              className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-amber-400 hover:text-amber-400"
            >
              Edit
            </button>
          )}
        </div>

        {/* Edit form */}
        {editing && user && (
          <form onSubmit={onSave} className="mt-4 border-t border-zinc-800 pt-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-300">Nama</span>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={40}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              />
            </label>

            <div className="mt-4">
              <p className="text-sm font-medium text-zinc-300">Warna avatar</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {AVATAR_COLORS.map((c) => {
                  const active = editColor === c.className;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setEditColor(c.className)}
                      title={c.label}
                      className={`relative h-10 w-10 rounded-full bg-gradient-to-br transition-transform ${c.className} ${
                        active
                          ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110"
                          : "hover:scale-105"
                      }`}
                    >
                      {active && (
                        <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {saveMsg && (
              <div
                className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                  saveMsg.type === "ok"
                    ? "border-emerald-700 bg-emerald-900/30 text-emerald-300"
                    : "border-red-700 bg-red-900/30 text-red-300"
                }`}
              >
                {saveMsg.text}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-full bg-amber-400 py-2.5 text-sm font-bold text-black hover:bg-amber-300"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="flex-1 rounded-full border border-zinc-700 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-500"
              >
                Batal
              </button>
            </div>
          </form>
        )}

        {!editing && saveMsg && (
          <div className="mt-3 rounded-lg border border-emerald-700 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-300">
            {saveMsg.text}
          </div>
        )}
      </div>

      {mounted && !user && (
        <div className="mt-3 flex gap-2">
          <Link
            href="/login"
            className="flex-1 rounded-full border border-zinc-700 py-3 text-center text-sm font-semibold text-white hover:border-amber-400 hover:text-amber-400"
          >
            Masuk
          </Link>
          <Link
            href="/daftar"
            className="flex-1 rounded-full bg-amber-400 py-3 text-center text-sm font-bold text-black hover:bg-amber-300"
          >
            Daftar
          </Link>
        </div>
      )}

      <CoinWallet />

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
        {menuItems.map((item, i) => {
          const isExpanded = expanded === item.key;
          const isLast = i === menuItems.length - 1;
          const handleClick = () => {
            if (item.onClick) {
              item.onClick();
            } else {
              setExpanded(isExpanded ? null : item.key);
            }
          };
          return (
            <div key={item.key} className={isLast ? "" : "border-b border-zinc-800"}>
              <button
                onClick={handleClick}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={item.icon} />
                  </svg>
                  {item.label}
                </div>
                {item.content ? (
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 fill-zinc-500 transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-zinc-500">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                )}
              </button>
              {item.content && isExpanded && (
                <div className="border-t border-zinc-800/60 bg-zinc-900/30">
                  {item.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {mounted && user && (
        <button
          onClick={onLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 17l5-5-5-5M21 12H9M9 5H4a2 2 0 00-2 2v10a2 2 0 002 2h5" />
          </svg>
          Keluar dari akun
        </button>
      )}

      <p className="mt-6 text-center text-[11px] text-zinc-600">
        DramaKu v0.1 · Prototype
      </p>
    </div>
  );
}
