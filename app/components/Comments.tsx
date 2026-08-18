"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readUser, type User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const MAX_COMMENT_LENGTH = 500;

type Comment = {
  id: string;
  user: string;
  email: string;
  role: "admin" | "viewer";
  text: string;
  time: string;
  /** Kosong/absen = komentar utama. Lihat lib/store.ts. */
  parentId?: string;
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

/** Satu kartu komentar. Dipakai untuk komentar utama MAUPUN balasan. */
function CommentCard({
  c,
  canDelete,
  onDelete,
  onReply,
}: {
  c: Comment;
  canDelete: boolean;
  onDelete: () => void;
  /** Tak diisi = tombol Balas disembunyikan (balasan tak boleh dibalas lagi). */
  onReply?: () => void;
}) {
  return (
    <Card className="flex flex-row items-start gap-3 rounded-xl border-zinc-800 bg-zinc-900/30 py-0 p-3 shadow-none">
      <Avatar className="size-9 shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-amber-400 to-rose-500 text-sm font-bold text-black">
          {c.user.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-white">{c.user}</span>
          {c.role === "admin" && (
            <Badge className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">
              Admin
            </Badge>
          )}
          <span className="text-[11px] text-zinc-500">· {timeAgo(c.time)}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-300">{c.text}</p>
        {onReply && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReply}
            className="mt-1 h-auto p-0 text-xs text-zinc-500 hover:bg-transparent hover:text-amber-400"
          >
            Balas
          </Button>
        )}
      </div>
      {canDelete && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-auto p-0 text-xs text-zinc-500 hover:bg-transparent hover:text-red-400"
          title="Hapus komentar"
        >
          Hapus
        </Button>
      )}
    </Card>
  );
}

export default function Comments({ dramaId }: { dramaId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

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

  /**
   * Kirim komentar. `parentId` diisi = balasan. Dipakai bersama oleh form
   * utama dan form balasan supaya validasi & penanganan error cuma ada di
   * SATU tempat.
   */
  const postComment = async (isi: string, parentId?: string): Promise<boolean> => {
    if (!user) {
      setError("Login dulu untuk bisa berkomentar.");
      return false;
    }
    const bersih = isi.trim();
    if (!bersih) return false;
    if (bersih.length > MAX_COMMENT_LENGTH) {
      setError(`Maksimal ${MAX_COMMENT_LENGTH} karakter.`);
      return false;
    }
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // email & role TIDAK dikirim: server menentukannya dari cookie sesi.
        // Nama tampilan tetap dikirim karena itu label kosmetik, bukan identitas.
        body: JSON.stringify({
          dramaId,
          user: user.name,
          text: bersih,
          ...(parentId ? { parentId } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        refresh();
        return true;
      }
      setError(data.error ?? "Gagal kirim komentar.");
      return false;
    } catch {
      setError("Koneksi gagal.");
      return false;
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    if (await postComment(text)) setText("");
    setSubmitting(false);
  };

  const onSubmitReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    if (await postComment(replyText, parentId)) {
      setReplyText("");
      setReplyTo(null);
    }
    setSubmitting(false);
  };

  const onDelete = async (commentId: string) => {
    if (!user) return;
    if (!confirm("Hapus komentar ini?")) return;
    const res = await fetch("/api/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      // Siapa yang menghapus ditentukan server dari cookie sesi.
      body: JSON.stringify({ dramaId, commentId }),
    });
    const data = await res.json();
    if (res.ok && data.ok) refresh();
    else setError(data.error ?? "Gagal hapus komentar.");
  };

  // Komentar lama (dibuat sebelum fitur balasan ada) tidak punya parentId —
  // otomatis dianggap komentar utama, jadi tak perlu migrasi data apa pun.
  const topLevel = comments.filter((c) => !c.parentId);
  // Balasan diurut terlama dulu supaya percakapan terbaca dari atas ke bawah
  // (daftar mentahnya terbaru-dulu karena komentar disisipkan dengan unshift).
  const repliesOf = (id: string) =>
    comments.filter((c) => c.parentId === id).slice().reverse();

  return (
    <div id="komentar" className="mt-8 scroll-mt-20">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
        Komentar {comments.length > 0 && <span className="text-zinc-500">· {comments.length}</span>}
      </h2>

      {user ? (
        <Card className="mt-3 gap-0 rounded-2xl border-zinc-800 bg-zinc-900/40 py-0 p-3 shadow-none">
          <form onSubmit={onSubmit}>
            <div className="flex items-start gap-3">
              <Avatar className="size-9 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-rose-500 text-sm font-bold text-black">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Tulis komentarmu... (maks ${MAX_COMMENT_LENGTH} karakter)`}
                  rows={2}
                  maxLength={MAX_COMMENT_LENGTH}
                  className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">
                    {text.length}/{MAX_COMMENT_LENGTH} · sebagai <strong className="text-zinc-300">{user.name}</strong>
                  </span>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting || !text.trim()}
                    className="rounded-full px-4 py-1.5 text-xs font-bold hover:bg-amber-300 disabled:opacity-50"
                  >
                    {submitting ? "Mengirim..." : "Kirim"}
                  </Button>
                </div>
              </div>
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-400">{error}</p>
            )}
          </form>
        </Card>
      ) : (
        <Card className="mt-3 flex flex-row items-center justify-between gap-3 rounded-2xl border-zinc-800 bg-zinc-900/40 py-0 p-4 shadow-none">
          <p className="text-sm text-zinc-400">Login dulu untuk bisa berkomentar.</p>
          <Button
            asChild
            size="sm"
            className="rounded-full px-4 py-1.5 text-xs font-bold hover:bg-amber-300"
          >
            <Link href="/login">Masuk</Link>
          </Button>
        </Card>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-xs text-zinc-500">Memuat komentar...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-zinc-500">Belum ada komentar. Jadilah yang pertama!</p>
        ) : (
          topLevel.map((c) => {
            const bisaHapus = (t: Comment) =>
              Boolean(user && (user.email === t.email || user.role === "admin"));
            const balasan = repliesOf(c.id);
            return (
              <div key={c.id} className="space-y-2">
                <CommentCard
                  c={c}
                  canDelete={bisaHapus(c)}
                  onDelete={() => onDelete(c.id)}
                  onReply={
                    user
                      ? () => {
                          setReplyTo(replyTo === c.id ? null : c.id);
                          setReplyText("");
                        }
                      : undefined
                  }
                />

                {balasan.length > 0 && (
                  <div className="ml-6 space-y-2 border-l border-zinc-800 pl-3">
                    {balasan.map((r) => (
                      <CommentCard
                        key={r.id}
                        c={r}
                        canDelete={bisaHapus(r)}
                        onDelete={() => onDelete(r.id)}
                      />
                    ))}
                  </div>
                )}

                {replyTo === c.id && user && (
                  <form
                    onSubmit={(e) => onSubmitReply(e, c.id)}
                    className="ml-6 border-l border-zinc-800 pl-3"
                  >
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Balas ${c.user}...`}
                      rows={2}
                      maxLength={MAX_COMMENT_LENGTH}
                      className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={submitting || !replyText.trim()}
                        className="rounded-full px-4 py-1.5 text-xs font-bold hover:bg-amber-300 disabled:opacity-50"
                      >
                        {submitting ? "Mengirim..." : "Kirim balasan"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReplyTo(null);
                          setReplyText("");
                        }}
                        className="h-auto p-0 text-xs text-zinc-500 hover:bg-transparent hover:text-zinc-300"
                      >
                        Batal
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
