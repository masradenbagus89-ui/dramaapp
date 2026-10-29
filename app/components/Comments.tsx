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
  role: "admin" | "viewer";
  text: string;
  time: string;
  /** Kosong/absen = komentar utama. Lihat lib/store.ts. */
  parentId?: string;
  /**
   * "Komentar ini kamu yang tulis" — DIPUTUSKAN SERVER, bukan dihitung di sini.
   *
   * Sejak penonton bisa berkomentar tanpa akun (2026-10-29), identitasnya
   * hidup di cookie `httpOnly` yang memang TIDAK bisa dibaca JavaScript. Jadi
   * halaman ini mustahil menghitungnya sendiri — dulu ia membandingkan
   * `user.email` dengan email penulis, dan email itu kini sengaja tak dikirim
   * lagi ke browser (lihat `untukPublik` di app/api/comments/route.ts).
   */
  milikku?: boolean;
  /**
   * Situs yang diketik penulis. Digambar sebagai tautan pada NAMANYA.
   * `emailKontak` SENGAJA tidak ada di sini — server membuangnya sebelum
   * mengirim (lihat `untukPublik` di app/api/comments/route.ts).
   */
  website?: string;
};

/**
 * Nama tampilan penonton tanpa akun, diingat di browsernya sendiri supaya tak
 * perlu diketik ulang tiap komentar. Murni kenyamanan — identitas sebenarnya
 * tetap nomor tamu di cookie, jadi mengubah nilai ini tidak membuat siapa pun
 * bisa menyamar jadi orang lain.
 */
const KUNCI_NAMA_TAMU = "dramaku:nama-tamu";
const KUNCI_EMAIL_TAMU = "dramaku:email-tamu";
const KUNCI_WEBSITE_TAMU = "dramaku:website-tamu";
/** Centang "simpan di browser ini". Default MATI — ingat-mengingat data
 *  pribadi harus dipilih sadar oleh penontonnya, bukan dinyalakan diam-diam. */
const KUNCI_SIMPAN_TAMU = "dramaku:simpan-identitas";
const MAKS_NAMA = 24;
const MAKS_EMAIL = 120;
const MAKS_WEBSITE = 200;

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
  terang = false,
}: {
  c: Comment;
  canDelete: boolean;
  onDelete: () => void;
  /** Tak diisi = tombol Balas disembunyikan (balasan tak boleh dibalas lagi). */
  onReply?: () => void;
  terang?: boolean;
}) {
  return (
    <Card
      className={cn(
        "flex flex-row items-start gap-3 rounded-xl py-0 p-3 shadow-none",
        terang ? "border-zinc-200 bg-zinc-50" : "border-zinc-800 bg-zinc-900/30",
      )}
    >
      <Avatar className="size-9 shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-amber-400 to-rose-500 text-sm font-bold text-black">
          {c.user.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {c.website ? (
            /* rel WAJIB lengkap — tiap bagiannya menutup lubang berbeda:
                 nofollow + ugc : kolom komentar berubah jadi ladang spam
                                  backlink dalam hitungan hari tanpa ini, dan
                                  Google menghukum situs yang menjualnya;
                 noopener       : tanpa ini halaman tujuan bisa mengendalikan
                                  tab kita lewat `window.opener` (tabnabbing);
                 noreferrer     : alamat halaman kita tidak ikut bocor.
               Alamatnya sendiri sudah disaring di server — hanya http/https
               yang pernah tersimpan (`bersihkanWebsiteTamu` di lib/tamu.ts). */
            <a
              href={c.website}
              target="_blank"
              rel="nofollow ugc noopener noreferrer"
              className={cn(
                "truncate text-sm font-semibold hover:underline",
                terang ? "text-rose-700" : "text-amber-400",
              )}
            >
              {c.user}
            </a>
          ) : (
            <span className={cn("truncate text-sm font-semibold", terang ? "text-zinc-900" : "text-white")}>
              {c.user}
            </span>
          )}
          {c.role === "admin" && (
            <Badge className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">
              Admin
            </Badge>
          )}
          <span className="text-[11px] text-zinc-500">· {timeAgo(c.time)}</span>
        </div>
        <p className={cn("mt-1 whitespace-pre-wrap break-words text-sm", terang ? "text-zinc-700" : "text-zinc-300")}>
          {c.text}
        </p>
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

export default function Comments({
  dramaId,
  terang = false,
}: {
  dramaId: string;
  /**
   * Gambar untuk LATAR TERANG (halaman film sejak owner 2026-10-29).
   * Default `false` — WAJIB default gelap: komponen ini juga dipakai
   * `FeedPlayer` dan `CommentsDrawer`, dua layar pemutar yang harus tetap
   * gelap. Mengubah nilai bawaannya akan menerangi keduanya tanpa ada yang
   * meminta.
   */
  terang?: boolean;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  /** Nama yang dipakai penonton tanpa akun. Kosong = server pakai "Penonton". */
  const [nama, setNama] = useState("");
  /** Keduanya OPSIONAL (owner 2026-10-29). Email tidak pernah dipublikasikan. */
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  /** "Simpan di browser ini" — mengikuti pola situs pembanding. */
  const [simpan, setSimpan] = useState(false);
  /** Hak hapus milik admin — dari server, bukan dari localStorage yang bisa diubah sendiri. */
  const [adminAktif, setAdminAktif] = useState(false);

  const refresh = async () => {
    try {
      const res = await fetch(`/api/comments?dramaId=${encodeURIComponent(dramaId)}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        comments?: Comment[];
        admin?: boolean;
      };
      setComments(data.comments ?? []);
      setAdminAktif(Boolean(data.admin));
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUser(readUser());
    // localStorage bisa melempar (mode privat / penyimpanan diblokir), dan
    // kegagalan membaca NAMA tak boleh menjatuhkan seluruh kolom komentar.
    try {
      const ingat = localStorage.getItem(KUNCI_SIMPAN_TAMU) === "1";
      setSimpan(ingat);
      // Nama tetap diingat walau centangnya mati — ia sudah begitu sejak
      // kolomnya lahir, dan nama tampilan bukan data pribadi seperti email.
      setNama(localStorage.getItem(KUNCI_NAMA_TAMU) ?? "");
      if (ingat) {
        setEmail(localStorage.getItem(KUNCI_EMAIL_TAMU) ?? "");
        setWebsite(localStorage.getItem(KUNCI_WEBSITE_TAMU) ?? "");
      }
    } catch {
      /* biarkan kosong — server memakai "Penonton" */
    }
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
    // Tidak ada lagi gerbang "harus login" di sini (owner 2026-10-29). Penonton
    // tanpa akun mendapat identitas tamu dari server pada kiriman pertamanya;
    // lihat app/api/comments/route.ts.
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
          // Nama akun kalau login; kalau tidak, nama yang diketik penonton.
          // Server tetap membersihkan & memotongnya — nilai ini dari klien,
          // jadi tak boleh dipercaya apa adanya (lib/tamu.ts).
          user: user?.name ?? nama,
          // Keduanya opsional & dibersihkan ULANG di server — yang dikirim dari
          // sini tidak pernah dipercaya apa adanya (lib/tamu.ts).
          ...(user ? {} : { emailKontak: email, website }),
          text: bersih,
          ...(parentId ? { parentId } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        // Nama yang berhasil dipakai diingat, supaya komentar berikutnya tak
        // perlu mengetiknya lagi.
        if (!user) {
          try {
            if (nama.trim()) localStorage.setItem(KUNCI_NAMA_TAMU, nama.trim());
            localStorage.setItem(KUNCI_SIMPAN_TAMU, simpan ? "1" : "0");
            if (simpan) {
              localStorage.setItem(KUNCI_EMAIL_TAMU, email.trim());
              localStorage.setItem(KUNCI_WEBSITE_TAMU, website.trim());
            } else {
              // Centang dimatikan = HAPUS yang pernah tersimpan. Membiarkannya
              // berarti penonton mengira datanya sudah dilupakan padahal masih
              // ada di browsernya.
              localStorage.removeItem(KUNCI_EMAIL_TAMU);
              localStorage.removeItem(KUNCI_WEBSITE_TAMU);
            }
          } catch {
            /* tak bisa disimpan = cuma kehilangan kenyamanan, bukan fitur */
          }
        }
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
    // Pemeriksaan "siapa boleh menghapus" ada di SERVER (route DELETE). Di sini
    // tombolnya memang hanya digambar untuk komentar sendiri / admin, tapi itu
    // kerapian tampilan — bukan pengaman.
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
      <h2 className={cn("text-sm font-semibold uppercase tracking-wider", terang ? "text-zinc-500" : "text-zinc-300")}>
        Komentar {comments.length > 0 && <span className="text-zinc-500">· {comments.length}</span>}
      </h2>

      {/* Form komentar SELALU tergambar — tak ada lagi gerbang "Login dulu"
          (owner 2026-10-29: "viewer masih bisa kasih rating komen"). Yang
          berbeda cuma dari mana namanya datang: pemilik akun memakai nama
          akunnya, penonton biasa mengetiknya sendiri di kolom di bawah. */}
      <Card
        className={cn(
          "mt-3 gap-0 rounded-2xl py-0 p-3 shadow-none",
          terang ? "border-zinc-200 bg-zinc-50" : "border-zinc-800 bg-zinc-900/40",
        )}
      >
        <form onSubmit={onSubmit}>
          <div className="flex items-start gap-3">
            <Avatar className="size-9 shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-rose-500 text-sm font-bold text-black">
                {(user?.name || nama || "P").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              {/* TIGA kolom identitas, SEMUANYA OPSIONAL (owner 2026-10-29:
                  "nama, email, website kasih optional juga").

                  Berbeda dari contoh situs pembanding yang menandai Name & Email
                  dengan bintang WAJIB — owner meminta opsional, dan itu memang
                  lebih tepat di sini: tanpa sistem akun, memaksa email cuma
                  menghasilkan alamat palsu yang diketik asal-asalan.

                  Hanya digambar untuk yang TIDAK punya akun; pemilik akun sudah
                  punya nama & email di profilnya. */}
              {!user && (
                <div className="mb-2 grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Nama (opsional)"
                    maxLength={MAKS_NAMA}
                    aria-label="Nama kamu"
                    className={cn(
                      "w-full rounded-lg border px-3 py-1.5 text-sm outline-none placeholder:text-zinc-500 focus:border-amber-400",
                      terang
                        ? "border-zinc-300 bg-white text-zinc-900"
                        : "border-zinc-700 bg-zinc-900 text-white",
                    )}
                  />
                  <input
                    /* `type="email"` memberi papan ketik HP yang tepat (ada
                       tombol @) dan peringatan bawaan browser — bukan pengganti
                       pemeriksaan server, yang tetap dijalankan di lib/tamu.ts. */
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email (opsional)"
                    maxLength={MAKS_EMAIL}
                    aria-label="Email kamu"
                    className={cn(
                      "w-full rounded-lg border px-3 py-1.5 text-sm outline-none placeholder:text-zinc-500 focus:border-amber-400",
                      terang
                        ? "border-zinc-300 bg-white text-zinc-900"
                        : "border-zinc-700 bg-zinc-900 text-white",
                    )}
                  />
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="Website (opsional)"
                    maxLength={MAKS_WEBSITE}
                    aria-label="Website kamu"
                    className={cn(
                      "w-full rounded-lg border px-3 py-1.5 text-sm outline-none placeholder:text-zinc-500 focus:border-amber-400 sm:col-span-2",
                      terang
                        ? "border-zinc-300 bg-white text-zinc-900"
                        : "border-zinc-700 bg-zinc-900 text-white",
                    )}
                  />
                </div>
              )}

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Tulis komentarmu... (maks ${MAX_COMMENT_LENGTH} karakter)`}
                rows={2}
                maxLength={MAX_COMMENT_LENGTH}
                className={cn(
                  "w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none focus:border-amber-400",
                  terang
                    ? "border-zinc-300 bg-white text-zinc-900"
                    : "border-zinc-700 bg-zinc-900 text-white",
                )}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[11px] text-zinc-500">
                  {text.length}/{MAX_COMMENT_LENGTH} · sebagai{" "}
                  <strong className="text-zinc-300">
                    {user?.name || nama.trim() || "Penonton"}
                  </strong>
                </span>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || !text.trim()}
                  className="shrink-0 rounded-full px-4 py-1.5 text-xs font-bold hover:bg-amber-300 disabled:opacity-50"
                >
                  {submitting ? "Mengirim..." : "Kirim"}
                </Button>
              </div>
            </div>
          </div>
          {!user && (
            <div className="mt-2 space-y-1.5 pl-12">
              <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-snug">
                <input
                  type="checkbox"
                  checked={simpan}
                  onChange={(e) => setSimpan(e.target.checked)}
                  className="mt-0.5 size-3.5 shrink-0 accent-rose-600"
                />
                <span className={terang ? "text-zinc-600" : "text-zinc-400"}>
                  Simpan nama, email &amp; website di browser ini untuk komentar
                  berikutnya
                </span>
              </label>
              {/* Janji yang HARUS benar, dan memang benar: `untukPublik()` di
                  app/api/comments/route.ts membuang `email` DAN `emailKontak`
                  sebelum balasan dikirim — dijaga tes "tidak mengirim field
                  email sama sekali". Jangan tulis kalimat ini di tempat lain
                  tanpa memastikan pagarnya masih ada. */}
              <p className={cn("text-[11px]", terang ? "text-zinc-500" : "text-zinc-500")}>
                Email kamu tidak akan ditampilkan ke siapa pun.
              </p>
            </div>
          )}
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </form>
      </Card>

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-xs text-zinc-500">Memuat komentar...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-zinc-500">Belum ada komentar. Jadilah yang pertama!</p>
        ) : (
          topLevel.map((c) => {
            const bisaHapus = (t: Comment) => Boolean(t.milikku || adminAktif);
            const balasan = repliesOf(c.id);
            return (
              <div key={c.id} className="space-y-2">
                <CommentCard
                  terang={terang}
                  c={c}
                  canDelete={bisaHapus(c)}
                  onDelete={() => onDelete(c.id)}
                  onReply={() => {
                    setReplyTo(replyTo === c.id ? null : c.id);
                    setReplyText("");
                  }}
                />

                {balasan.length > 0 && (
                  <div className="ml-6 space-y-2 border-l border-zinc-800 pl-3">
                    {balasan.map((r) => (
                      <CommentCard
                        terang={terang}
                        key={r.id}
                        c={r}
                        canDelete={bisaHapus(r)}
                        onDelete={() => onDelete(r.id)}
                      />
                    ))}
                  </div>
                )}

                {replyTo === c.id && (
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
