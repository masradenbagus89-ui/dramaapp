"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Drama } from "@/lib/types";
import { readUser, type User } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { scanDrama, hardlinkDrama, type ScanResult } from "@/lib/admin-api";
import TwoFactorSettings from "@/app/components/TwoFactorSettings";
import SponsorAdsManager from "@/app/components/SponsorAdsManager";
import AdminManager from "@/app/components/admin/AdminManager";
import AdminDashboard from "@/app/components/admin/AdminDashboard";
import AdminSidebar from "@/app/components/admin/AdminSidebar";
import DramaList from "@/app/components/admin/DramaList";
import DramaForm from "@/app/components/admin/DramaForm";
import AdminPasswordSettings from "@/app/components/admin/AdminPasswordSettings";

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

  const effectiveId = id.trim() || (title.trim() ? slugify(title) : "");

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
      const scanRes = await scanDrama(effectiveId, authUser.email);
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
        const hlRes = await hardlinkDrama(effectiveId, authUser.email);
        if (!hlRes.ok) {
          setMessage({
            type: "error",
            text: `Auto-hardlink gagal: ${hlRes.error}`,
          });
          return;
        }
        // Re-scan after hardlink
        const scan2 = await scanDrama(effectiveId, authUser.email);
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
      <AdminSidebar />

      <div className="space-y-6">
        <AdminDashboard dramas={dramas} />

        <DramaForm
          id={id}
          setId={setId}
          title={title}
          setTitle={setTitle}
          category={category}
          setCategory={setCategory}
          synopsis={synopsis}
          setSynopsis={setSynopsis}
          views={views}
          setViews={setViews}
          episodes={episodes}
          setEpisodes={setEpisodes}
          posterImage={posterImage}
          setPosterImage={setPosterImage}
          heroImage={heroImage}
          setHeroImage={setHeroImage}
          subtitles={subtitles}
          setSubtitles={setSubtitles}
          premium={premium}
          setPremium={setPremium}
          effectiveId={effectiveId}
          scanning={scanning}
          scanResult={scanResult}
          submitting={submitting}
          message={message}
          formRef={formRef}
          onScan={onScan}
          onSubmit={onSubmit}
        />

        <DramaList
          dramas={dramas}
          onEdit={loadDramaToForm}
          onDelete={onDelete}
        />

        <AdminManager currentAdminEmail={authUser.email} />

        <AdminPasswordSettings />

        <TwoFactorSettings />

        <SponsorAdsManager />
      </div>
    </div>
  );
}
