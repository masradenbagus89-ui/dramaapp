"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readUser, type User } from "@/lib/auth";

type Comment = {
  id: string;
  user: string;
  email: string;
  role: "admin" | "viewer";
  text: string;
  time: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Comments({ dramaId }: { dramaId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch(`/api/comments?dramaId=${encodeURIComponent(dramaId)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { comments?: Comment[] };
      setComments(data.comments ?? []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUser(readUser());
    refresh();
    const handler = () => setUser(readUser());
    window.addEventListener("dramaku:auth-changed", handler);
    return () => window.removeEventListener("dramaku:auth-changed", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dramaId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
      setError("Login dulu untuk bisa berkomentar.");
      return;
    }
    if (!text.trim()) return;
    if (text.length > 500) {
      setError("Maksimal 500 karakter.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dramaId,
          user: user.name,
          email: user.email,
          role: user.role,
          text: text.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setText("");
        refresh();
      } else {
        setError(data.error ?? "Gagal kirim komentar.");
      }
    } catch {
      setError("Koneksi gagal.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (commentId: string) => {
    if (!user) return;
    if (!confirm("Hapus komentar ini?")) return;
    const res = await fetch("/api/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dramaId,
        commentId,
        requesterEmail: user.email,
        requesterRole: user.role,
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok) refresh();
    else setError(data.error ?? "Gagal hapus komentar.");
  };

  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
        Komentar {comments.length > 0 && <span className="text-zinc-500">· {comments.length}</span>}
      </h2>

      {user ? (
        <form onSubmit={onSubmit} className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-sm font-bold text-black">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tulis komentarmu... (maks 500 karakter)"
                rows={2}
                maxLength={500}
                className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">
                  {text.length}/500 · sebagai <strong className="text-zinc-300">{user.name}</strong>
                </span>
                <button
                  type="submit"
                  disabled={submitting || !text.trim()}
                  className="rounded-full bg-amber-400 px-4 py-1.5 text-xs font-bold text-black hover:bg-amber-300 disabled:opacity-50"
                >
                  {submitting ? "Mengirim..." : "Kirim"}
                </button>
              </div>
            </div>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </form>
      ) : (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="text-sm text-zinc-400">Login dulu untuk bisa berkomentar.</p>
          <Link
            href="/login"
            className="rounded-full bg-amber-400 px-4 py-1.5 text-xs font-bold text-black hover:bg-amber-300"
          >
            Masuk
          </Link>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-xs text-zinc-500">Memuat komentar...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-zinc-500">Belum ada komentar. Jadilah yang pertama!</p>
        ) : (
          comments.map((c) => {
            const canDelete =
              user && (user.email === c.email || user.role === "admin");
            return (
              <div key={c.id} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-sm font-bold text-black">
                  {c.user.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-white">{c.user}</span>
                    {c.role === "admin" && (
                      <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">
                        Admin
                      </span>
                    )}
                    <span className="text-[11px] text-zinc-500">· {timeAgo(c.time)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-300">{c.text}</p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => onDelete(c.id)}
                    className="text-xs text-zinc-500 hover:text-red-400"
                    title="Hapus komentar"
                  >
                    Hapus
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
