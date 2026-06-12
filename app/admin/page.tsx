"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Drama } from "@/lib/types";
import { SUBTITLE_LANGS } from "@/lib/types";
import { readUser, type User } from "@/lib/auth";
import TwoFactorSettings from "@/app/components/TwoFactorSettings";
import SponsorAdsManager from "@/app/components/SponsorAdsManager";

const CATEGORY_OPTIONS = [
  "Romance",
  "Tycoon",
  "Harem",
  "Time Travel",
  "Action",
  "Comedy",
  "Fantasy",
] as const;

function parseViews(s: string): number {
  const m = s.trim().match(/^([0-9.]+)\s*([kKmMbB]?)$/);
  if (!m) return Number(s) || 0;
  const num = parseFloat(m[1]);
  const mult =
    m[2].toLowerCase() === "m" ? 1_000_000 : m[2].toLowerCase() === "k" ? 1_000 : m[2].toLowerCase() === "b" ? 1_000_000_000 : 1;
  return num * mult;
}

function formatViews(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const CATEGORY_COLORS: Record<string, string> = {
  Romance: "bg-rose-500",
  Tycoon: "bg-amber-500",
  Harem: "bg-pink-500",
  "Time Travel": "bg-violet-500",
  Action: "bg-orange-500",
  Comedy: "bg-yellow-500",
  Fantasy: "bg-emerald-500",
};

type ScanResult = {
  count: number;
  min: number;
  max: number;
  missing: number[];
  folderUrl: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Romance");
  const [synopsis, setSynopsis] = useState("");
  const [views, setViews] = useState("");
  const [episodes, setEpisodes] = useState<number>(1);
  const [posterImage, setPosterImage] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [subtitles, setSubtitles] = useState<string[]>([]);
  const [premium, setPremium] = useState(true); // drama baru default berbayar

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);
  const [dramas, setDramas] = useState<Drama[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const [admins, setAdmins] = useState<
    { email: string; name: string; addedAt: string }[]
  >([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [adminMessage, setAdminMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const effectiveId = id.trim() || (title.trim() ? slugify(title) : "");

  const refreshAdmins = () => {
    fetch("/api/admins")
      .then((r) => r.json())
      .then(
        (data: {
          admins?: { email: string; name: string; addedAt: string }[];
        }) => setAdmins(data.admins ?? []),
      )
      .catch(() => setAdmins([]));
  };

  useEffect(() => {
    const u = readUser();
    setAuthUser(u);
    setAuthChecked(true);
    if (!u) {
      router.replace("/login");
      return;
    }
    if (u.role !== "admin") {
      router.replace("/beranda");
    }
  }, [router]);

  const refreshList = () => {
    fetch("/api/dramas")
      .then((r) => r.json())
      .then((data: Drama[]) => setDramas(data))
      .catch(() => setDramas([]));
  };

  useEffect(refreshList, []);
  useEffect(refreshAdmins, []);

  const onAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMessage(null);
    if (!newAdminEmail.trim() || !authUser) return;
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
        requesterEmail: authUser.email,
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
    if (!authUser) return;
    if (!confirm(`Hapus admin "${email}"? Akun ini akan jadi viewer biasa.`))
      return;
    const res = await fetch("/api/admins", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, requesterEmail: authUser.email }),
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

  const stats = useMemo(() => {
    const totalEpisode = dramas.reduce((a, d) => a + d.episodes, 0);
    const totalViews = dramas.reduce((a, d) => a + parseViews(d.views), 0);
    const withPoster = dramas.filter((d) => d.posterImage).length;
    const counts = new Map<string, number>();
    for (const d of dramas) counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
    const byCategory = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return { totalEpisode, totalViews, withPoster, byCategory };
  }, [dramas]);

  const doScanOnly = async (
    id: string,
  ): Promise<
    { ok: true; result: ScanResult } | { ok: false; status: number; error: string }
  > => {
    if (!authUser) return { ok: false, status: 0, error: "Not logged in" };
    const res = await fetch(`/api/admin/scan?id=${encodeURIComponent(id)}`, {
      headers: { "x-admin-email": authUser.email },
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        status: res.status,
        error: data.error ?? `HTTP ${res.status}`,
      };
    }
    return {
      ok: true,
      result: {
        count: data.count,
        min: data.min,
        max: data.max,
        missing: data.missing ?? [],
        folderUrl: data.folderUrl,
      },
    };
  };

  const doHardlink = async (
    id: string,
  ): Promise<{ ok: boolean; message?: string; error?: string }> => {
    if (!authUser) return { ok: false, error: "Not logged in" };
    const res = await fetch(`/api/admin/hardlink`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-email": authUser.email,
      },
      body: JSON.stringify({ dramaId: id }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error:
          data.error ??
          `Hardlink gagal (HTTP ${res.status}). Pastikan agent jalan di PC backup.`,
      };
    }
    return { ok: true, message: data.message };
  };

  const onScan = async () => {
    setMessage(null);
    setScanResult(null);
    if (!effectiveId) {
      setMessage({
        type: "error",
        text: "Isi 'ID slug' atau 'Judul' dulu — saya butuh tahu folder mana yang di-scan.",
      });
      return;
    }
    if (!authUser) return;
    setScanning(true);
    try {
      // Step 1: scan first
      const scanRes = await doScanOnly(effectiveId);
      if (scanRes.ok) {
        setScanResult(scanRes.result);
        setEpisodes(scanRes.result.max);
        return;
      }

      // Step 2: scan failed. If 404 (no N.mp4 files), try auto-hardlink + re-scan
      if (scanRes.status === 404) {
        setMessage({
          type: "ok",
          text: `Folder belum siap (file masih raw atau folder kosong). Mencoba auto-hardlink di PC backup...`,
        });
        const hlRes = await doHardlink(effectiveId);
        if (!hlRes.ok) {
          setMessage({
            type: "error",
            text: `Auto-hardlink gagal: ${hlRes.error}`,
          });
          return;
        }
        // Re-scan after hardlink
        const scan2 = await doScanOnly(effectiveId);
        if (!scan2.ok) {
          setMessage({
            type: "error",
            text: `Hardlink berhasil (${hlRes.message ?? "ok"}) tapi re-scan masih gagal: ${scan2.error}`,
          });
          return;
        }
        setScanResult(scan2.result);
        setEpisodes(scan2.result.max);
        setMessage({
          type: "ok",
          text: `Auto-hardlink berhasil: ${hlRes.message ?? "ok"}. Folder siap dipakai.`,
        });
        return;
      }

      // Other scan errors (e.g., tunnel down)
      setMessage({ type: "error", text: scanRes.error });
    } catch (err) {
      const m = err instanceof Error ? err.message : "Scan gagal";
      setMessage({ type: "error", text: m });
    } finally {
      setScanning(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setMessage({ type: "error", text: "Judul wajib diisi." });
      return;
    }
    if (!authUser) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/drama", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": authUser.email,
        },
        body: JSON.stringify({
          id: effectiveId,
          title: title.trim(),
          category,
          synopsis: synopsis.trim(),
          views: views.trim(),
          episodes,
          posterImage: posterImage.trim(),
          heroImage: heroImage.trim(),
          subtitles,
          premium,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage({
          type: "error",
          text: data.error ?? `Gagal simpan (HTTP ${res.status})`,
        });
        return;
      }
      setMessage({
        type: "ok",
        text: `Drama "${data.drama.title}" berhasil ${data.action === "updated" ? "diperbarui" : "ditambahkan"}. Vercel auto-deploy ~1-2 menit, lalu refresh halaman ini.`,
      });
      setId("");
      setTitle("");
      setSynopsis("");
      setViews("");
      setEpisodes(1);
      setPosterImage("");
      setHeroImage("");
      setSubtitles([]);
      setPremium(true);
      setScanResult(null);
      formRef.current?.reset();
      refreshList();
    } catch (err) {
      const m = err instanceof Error ? err.message : "Koneksi gagal";
      setMessage({ type: "error", text: m });
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (dramaId: string, dramaTitle: string) => {
    if (
      !confirm(
        `Hapus drama "${dramaTitle}" dari daftar? Catatan: file video di PC backup TIDAK ikut terhapus — kamu bisa tambahkan lagi entry-nya kapan saja.`,
      )
    )
      return;
    if (!authUser) return;
    const res = await fetch("/api/admin/drama", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-email": authUser.email,
      },
      body: JSON.stringify({ id: dramaId }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setMessage({
        type: "ok",
        text: `Drama "${dramaTitle}" dihapus dari daftar. File video di PC backup tetap utuh.`,
      });
      refreshList();
    } else {
      setMessage({ type: "error", text: data.error ?? "Hapus gagal" });
    }
  };

  const loadDramaToForm = (d: Drama) => {
    setId(d.id);
    setTitle(d.title);
    setCategory(d.category);
    setSynopsis(d.synopsis);
    setViews(d.views);
    setEpisodes(d.episodes);
    setPosterImage(d.posterImage ?? "");
    setHeroImage(d.heroImage ?? "");
    setSubtitles(d.subtitles ?? []);
    setPremium(d.premium ?? false);
    setScanResult(null);
    setMessage({
      type: "ok",
      text: `Form terisi data "${d.title}". Ubah field yang perlu (mis. URL hero), lalu klik Simpan drama.`,
    });
    if (typeof document !== "undefined") {
      document.getElementById("tambah")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const maxCategoryCount = stats.byCategory[0]?.[1] ?? 1;

  if (!authChecked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <p className="text-sm text-zinc-500">Memeriksa akses...</p>
      </div>
    );
  }

  if (!authUser || authUser.role !== "admin") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white">Akses ditolak</h1>
        <p className="text-sm text-zinc-400">
          Halaman ini hanya untuk admin. Login dengan email yang sudah terdaftar di daftar admin DramaKu untuk mengakses.
        </p>
        <Link
          href="/beranda"
          className="mt-2 rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-black hover:bg-amber-300"
        >
          ← Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl gap-6 px-4 pb-10 pt-6 md:grid md:grid-cols-[220px_1fr] md:px-6">
      <aside className="hidden self-start rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 md:sticky md:top-20 md:block">
        <div className="mb-4 px-2">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Admin Panel</p>
          <p className="mt-1 text-base font-bold text-white">DramaKu</p>
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          {[
            { href: "#dashboard", label: "Dashboard", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
            { href: "#tambah", label: "Tambah Drama", icon: "M12 4v16m-8-8h16" },
            { href: "#daftar", label: "Daftar Drama", icon: "M4 6h16M4 12h16M4 18h16" },
            { href: "#kelola-admin", label: "Kelola Admin", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
            { href: "#keamanan", label: "Keamanan (2FA)", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
            { href: "#iklan", label: "Iklan Sponsor", icon: "M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 11-5.8-1.6" },
            { href: "/", label: "← Kembali ke web", icon: "M10 19l-7-7m0 0l7-7m-7 7h18" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={item.icon} />
              </svg>
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="space-y-6">
        <section id="dashboard">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white md:text-3xl">Dashboard</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Selamat datang kembali, Admin 👋
              </p>
            </div>
            <Link
              href="/"
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-amber-400 hover:text-amber-400 md:hidden"
            >
              ← Web
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Total Drama"
              value={String(dramas.length)}
              accent="bg-amber-500/15 text-amber-400"
              icon="M4 6h16M4 12h16M4 18h16"
            />
            <StatCard
              label="Total Episode"
              value={String(stats.totalEpisode)}
              accent="bg-rose-500/15 text-rose-400"
              icon="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
            <StatCard
              label="Total View"
              value={formatViews(stats.totalViews)}
              accent="bg-emerald-500/15 text-emerald-400"
              icon="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
            <StatCard
              label="Drama Berposter"
              value={`${stats.withPoster}/${dramas.length}`}
              accent="bg-blue-500/15 text-blue-400"
              icon="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Distribusi Kategori</h2>
            <span className="text-xs text-zinc-500">{stats.byCategory.length} kategori aktif</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {stats.byCategory.length === 0 ? (
              <p className="text-sm text-zinc-500">Belum ada drama.</p>
            ) : (
              stats.byCategory.map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs text-zinc-300">{cat}</span>
                  <div className="flex-1 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full ${CATEGORY_COLORS[cat] ?? "bg-zinc-500"}`}
                      style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs text-zinc-400">{count}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section id="tambah">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Tambah / Update Drama</h2>
          </div>
          <div className="mb-3 rounded-xl border border-amber-700/60 bg-amber-900/15 px-4 py-3 text-xs text-amber-200">
            <p className="font-semibold">📋 Workflow self-hosted:</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5">
              <li>Taruh file video di PC backup, folder <code className="text-amber-100">{`<drama-id>`}</code>. Nama file <strong>bebas</strong> (raw): mis. <code className="text-amber-100">ep01.mp4</code>, <code className="text-amber-100">Video 1.mp4</code>, dst.</li>
              <li>Isi form di bawah — judul, kategori, sinopsis.</li>
              <li>Klik <strong>🪄 Scan & auto-hardlink</strong> → agent di PC backup auto-rename (kalau perlu) ke <code className="text-amber-100">1.mp4 2.mp4 ...</code> + scan jumlah episode.</li>
              <li>Klik <strong>Simpan drama</strong> → commit ke GitHub → Vercel auto-deploy ~1-2 menit.</li>
            </ol>
          </div>
          <form
            ref={formRef}
            onSubmit={onSubmit}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 md:p-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm text-zinc-300">Judul drama *</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Misal: Putri Ajaib Yang Hilang"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
              </label>
              <label className="block">
                <span className="text-sm text-zinc-300">Kategori *</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-sm text-zinc-300">
                ID slug <span className="text-zinc-500">(opsional — auto-generate dari judul kalau kosong; harus sama dengan nama folder di PC backup)</span>
              </span>
              <input
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder={
                  title.trim()
                    ? `auto: ${slugify(title)}`
                    : "contoh: istri-tersembunyi-sang-ceo"
                }
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400 font-mono"
              />
              {effectiveId && (
                <p className="mt-1 text-xs text-zinc-500">
                  Final id yang dipakai: <code className="text-amber-300">{effectiveId}</code>
                </p>
              )}
            </label>

            <label className="mt-4 block">
              <span className="text-sm text-zinc-300">
                Sinopsis <span className="text-zinc-500">(opsional)</span>
              </span>
              <textarea
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                rows={3}
                placeholder="Cerita pendek tentang drama ini..."
                className="mt-1 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              />
            </label>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm text-zinc-300">Jumlah ditonton (opsional)</span>
                <input
                  value={views}
                  onChange={(e) => setViews(e.target.value)}
                  placeholder="contoh: 1.2M atau 500K"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
              </label>

              <label className="block">
                <span className="text-sm text-zinc-300">URL poster (opsional)</span>
                <span className="block text-xs text-zinc-500">Gambar tegak/portrait buat card</span>
                <input
                  value={posterImage}
                  onChange={(e) => setPosterImage(e.target.value)}
                  placeholder="/posters/istri-tersembunyi-sang-ceo.png"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400 font-mono"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm text-zinc-300">URL hero / banner (opsional)</span>
                <span className="block text-xs text-zinc-500">Gambar lebar/landscape buat banner besar di halaman detail. Kalau kosong, pakai poster.</span>
                <input
                  value={heroImage}
                  onChange={(e) => setHeroImage(e.target.value)}
                  placeholder="https://i.imgur.com/xxxxxxx.png"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400 font-mono"
                />
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <span className="text-sm text-zinc-300">Subtitle / bahasa tersedia</span>
              <span className="block text-xs text-zinc-500">
                Centang bahasa yang file <code className="text-zinc-400">.vtt</code>-nya sudah kamu taruh di folder PC backup.
                Pola nama: <code className="text-zinc-400">{`<ep>.<kode>.vtt`}</code> — mis. <code className="text-zinc-400">1.id.vtt</code>, <code className="text-zinc-400">1.en.vtt</code>.
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUBTITLE_LANGS.map((l) => {
                  const on = subtitles.includes(l.code);
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() =>
                        setSubtitles((prev) =>
                          prev.includes(l.code)
                            ? prev.filter((c) => c !== l.code)
                            : [...prev, l.code],
                        )
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                        on
                          ? "border-amber-400 bg-amber-400/15 text-amber-300"
                          : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"
                      }`}
                    >
                      {on ? "✓ " : ""}
                      {l.label} <span className="opacity-60">({l.code})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={premium}
                  onChange={(e) => setPremium(e.target.checked)}
                  className="mt-0.5 h-5 w-5 accent-amber-400"
                />
                <span>
                  <span className="text-sm font-semibold text-white">
                    Drama berbayar (pakai koin)
                  </span>
                  <span className="block text-xs text-zinc-500">
                    Centang = episode di atas {/* free */}batas gratis dikunci, penonton buka pakai koin.
                    Kosongkan = drama 100% gratis. <strong className="text-amber-300/80">Drama baru default berbayar</strong>; koleksi lama biarkan kosong agar tetap gratis.
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="text-sm text-zinc-300">Jumlah episode *</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={episodes}
                    onChange={(e) =>
                      setEpisodes(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="mt-1 w-32 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                  />
                </label>
                <button
                  type="button"
                  onClick={onScan}
                  disabled={scanning || !effectiveId}
                  className="rounded-lg border border-amber-400/60 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                  title={
                    !effectiveId
                      ? "Isi Judul atau ID slug dulu"
                      : "Auto-hardlink (kalau perlu) + scan folder PC backup"
                  }
                >
                  {scanning ? "Memproses..." : "🪄 Scan & auto-hardlink"}
                </button>
                {scanResult && (
                  <div className="text-xs text-zinc-400">
                    Ditemukan <strong className="text-emerald-300">{scanResult.count}</strong> file (ep 1-{scanResult.max})
                    {scanResult.missing.length > 0 && (
                      <span className="ml-2 text-amber-300">
                        ⚠️ ada gap: ep {scanResult.missing.join(", ")} tidak ada
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Cek folder <code className="text-zinc-400">{`<tunnel-url>/${effectiveId || "<drama-id>"}/`}</code>. Kalau file masih raw (mis. <code className="text-zinc-400">Video PM 1.mp4</code>), agent di PC backup auto-bikin hardlink <code className="text-zinc-400">N.mp4</code> dulu, baru hitung.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-amber-400 px-6 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
              >
                {submitting ? "Menyimpan ke GitHub..." : "Simpan drama"}
              </button>
              <span className="text-xs text-zinc-500">
                Commit ke <code>data/dramas.json</code> → Vercel auto-deploy ~1-2 menit
              </span>
            </div>

            {message && (
              <div
                className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                  message.type === "ok"
                    ? "border-emerald-700 bg-emerald-900/30 text-emerald-300"
                    : "border-red-700 bg-red-900/30 text-red-300"
                }`}
              >
                {message.text}
              </div>
            )}
          </form>
        </section>

        <section id="daftar">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Daftar Drama</h2>
            <span className="text-xs text-zinc-500">{dramas.length} total</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-zinc-800">
            <div className="divide-y divide-zinc-800">
              {dramas.map((d) => (
                <div key={d.id} className="flex items-center gap-3 bg-zinc-900/40 p-3 hover:bg-zinc-900/70">
                  <div className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gradient-to-br ${d.gradient}`}>
                    {d.posterImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.posterImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{d.title}</div>
                    <div className="text-xs text-zinc-500">
                      <span className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${CATEGORY_COLORS[d.category] ?? "bg-zinc-500"}`} />
                      {d.category} · {d.episodes} eps · {d.views}
                    </div>
                  </div>
                  <Link
                    href={`/drama/${d.id}`}
                    className="hidden rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-amber-400 hover:text-amber-400 sm:inline-block"
                  >
                    Lihat
                  </Link>
                  <button
                    onClick={() => loadDramaToForm(d)}
                    className="rounded-md border border-amber-700 px-3 py-1 text-xs text-amber-300 hover:border-amber-400 hover:bg-amber-950/40 hover:text-amber-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(d.id, d.title)}
                    className="rounded-md border border-red-900 px-3 py-1 text-xs text-red-400 hover:border-red-500 hover:bg-red-950 hover:text-red-300"
                  >
                    Hapus
                  </button>
                </div>
              ))}
              {dramas.length === 0 && (
                <div className="p-6 text-center text-sm text-zinc-500">
                  Belum ada drama. Tambahkan dari form di atas.
                </div>
              )}
            </div>
          </div>
        </section>

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
                const isMe = a.email.toLowerCase() === authUser?.email.toLowerCase();
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

        <TwoFactorSettings />

        <SponsorAdsManager />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
