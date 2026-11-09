"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MOVIE_EPISODE_COUNT,
  type Drama,
  type DownloadProvider,
  type DramaKind,
  type DramaQuality,
  type DramaStatus,
} from "@/lib/types";
import { readUser, type User } from "@/lib/auth";
import { slugify } from "@/lib/format";
import {
  scanDrama,
  hardlinkDrama,
  ukurDurasiDrama,
  type ScanResult,
} from "@/lib/admin-api";
import TwoFactorSettings from "@/app/components/TwoFactorSettings";
import SponsorAdsManager from "@/app/components/SponsorAdsManager";
import AdminManager from "@/app/components/admin/AdminManager";
import AdminDashboard from "@/app/components/admin/AdminDashboard";
import DurasiUkurSemua from "@/app/components/admin/DurasiUkurSemua";
import AdminSidebar from "@/app/components/admin/AdminSidebar";
import DramaList from "@/app/components/admin/DramaList";
import DramaForm from "@/app/components/admin/DramaForm";
import AdminPasswordSettings from "@/app/components/admin/AdminPasswordSettings";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { ADS_ENABLED } from "@/lib/saklar-fitur";
import {
  BAGIAN_BAWAAN,
  JUDUL_BAGIAN,
  KETERANGAN_BAGIAN,
  parseBagianAdmin,
  type BagianAdmin,
} from "@/lib/bagian-admin";

export default function AdminPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<User | null>(null);
  /**
   * Bagian yang sedang ditampilkan (owner 2026-11-05: "satu menu = satu
   * tampilan"). Disimpan di HASH alamat, bukan state biasa — alasannya lengkap
   * di lib/bagian-admin.ts: tautan menu lama tetap bekerja, tombol Kembali
   * browser berfungsi, dan halamannya bisa di-bookmark.
   */
  const [bagian, setBagian] = useState<BagianAdmin>(BAGIAN_BAWAAN);
  const [authChecked, setAuthChecked] = useState(false);

  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Romance");
  const [synopsis, setSynopsis] = useState("");
  const [views, setViews] = useState("");
  const [episodes, setEpisodes] = useState<number>(1);
  // Jenis tayangan: serial berepisode (perilaku lama) atau film 1 video utuh.
  const [kind, setKind] = useState<DramaKind>("series");
  // "" = belum ditentukan. Sengaja BOLEH kosong: memaksa owner memilih akan
  // membuat drama lama tertandai asal-asalan saat diedit karena hal lain.
  const [status, setStatus] = useState<DramaStatus | "">("");
  // "" = belum diisi -> lencana kualitas tidak digambar di poster.
  const [quality, setQuality] = useState<DramaQuality | "">("");
  // Daftar kosong = tombol DOWNLOAD di halaman detail kembali ke perilaku
  // unduh lama. Itu keadaan normal untuk judul yang belum diisi providernya.
  const [downloadProviders, setDownloadProviders] = useState<
    DownloadProvider[]
  >([]);
  const [posterImage, setPosterImage] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [subtitles, setSubtitles] = useState<string[]>([]);
  const [premium, setPremium] = useState(true); // drama baru default berbayar
  // Penanda tab SERIES UNGGULAN. Disimpan di field `exclusive` yang sudah ada.
  const [unggulan, setUnggulan] = useState(false);
  // Metadata IMDb (opsional; diisi dari "Ambil draft")
  const [imdbIdMeta, setImdbIdMeta] = useState("");
  const [year, setYear] = useState("");
  const [contentRating, setContentRating] = useState("");
  const [runtime, setRuntime] = useState("");
  const [imdbRating, setImdbRating] = useState("");
  const [imdbVotes, setImdbVotes] = useState("");
  const [genre, setGenre] = useState("");
  const [director, setDirector] = useState("");
  const [writer, setWriter] = useState("");
  const [stars, setStars] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");

  const [scanning, setScanning] = useState(false);
  const [mengukurDurasi, setMengukurDurasi] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);
  const [dramas, setDramas] = useState<Drama[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const effectiveId = id.trim() || (title.trim() ? slugify(title) : "");

  // ⚠️ INI BUKAN PENJAGA KEAMANAN — jangan diandalkan sebagai pagar.
  //
  // Sejak 2026-10-24 pagar sungguhannya ada di `app/admin/layout.tsx`: cookie
  // sesi admin diperiksa DI SERVER sebelum apa pun dirender, jadi orang tanpa
  // sesi admin tidak pernah menerima isi halaman ini. Nilai `role` di bawah
  // dibaca dari `localStorage` dan BISA DIKARANG siapa pun lewat console
  // browsernya sendiri (lib/auth.ts:34) — dulu inilah satu-satunya penjaga,
  // dan itu temuan audit T-3.
  //
  // Yang masih dikerjakan blok ini, dan sebabnya tidak dihapus: mengalihkan
  // pengunjung ke halaman yang masuk akal (/login atau /beranda) alih-alih
  // membiarkan mereka menatap layar "Akses ditolak". Murni kenyamanan.
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

  /**
   * Hasil scan folder → jumlah episode di form. Film tetap 1 berapa pun berkas
   * yang ditemukan (server juga memaksanya) — kalau folder film berisi lebih
   * dari satu berkas, angkanya tetap 1 dan hasil scan tampil apa adanya sebagai
   * peringatan bahwa folder itu berisi berkas lain.
   */
  const applyScanCount = (max: number) =>
    setEpisodes(kind === "movie" ? MOVIE_EPISODE_COUNT : max);

  /**
   * Isi kolom Durasi dari berkas video sungguhan (owner 2026-11-09:
   * "buat otomatis durasinya jadi saya cukup edit sedikit").
   *
   * Hanya MENGISI FORM — tidak menyimpan. Owner melihat angkanya dulu, boleh
   * menyuntingnya, lalu menekan Simpan seperti biasa. Itu disengaja: isian
   * massal 2026-09-22 ("119 min" ke 25 serial) jadi masalah justru karena
   * angkanya masuk ke katalog tanpa pernah dilihat orang.
   */
  const onUkurDurasi = async () => {
    setMessage(null);
    if (!effectiveId) {
      setMessage({
        type: "error",
        text: "Isi 'ID slug' atau 'Judul' dulu — saya butuh tahu folder mana yang videonya diukur.",
      });
      return;
    }
    if (!authUser) return;
    setMengukurDurasi(true);
    try {
      const hasil = await ukurDurasiDrama(effectiveId, authUser.email);
      if (!hasil.ok) {
        setMessage({ type: "error", text: `Gagal mengukur durasi: ${hasil.error}` });
        return;
      }
      setRuntime(hasil.teks);
      setMessage({
        type: "ok",
        text: `Durasi episode ${hasil.ep} terbaca: ${hasil.teks} (${Math.round(hasil.detik)} detik). Periksa dulu, lalu tekan Simpan.`,
      });
    } finally {
      setMengukurDurasi(false);
    }
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
      const scanRes = await scanDrama(effectiveId, authUser.email);
      if (scanRes.ok) {
        setScanResult(scanRes.result);
        applyScanCount(scanRes.result.max);
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
        applyScanCount(scan2.result.max);
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
          kind,
          status,
          quality,
          downloadProviders,
          posterImage: posterImage.trim(),
          heroImage: heroImage.trim(),
          subtitles,
          premium,
          exclusive: unggulan,
          imdbId: imdbIdMeta.trim(),
          year: year.trim(),
          contentRating: contentRating.trim(),
          runtime: runtime.trim(),
          imdbRating: imdbRating.trim(),
          imdbVotes: imdbVotes.trim(),
          genre: genre.trim(),
          director: director.trim(),
          writer: writer.trim(),
          stars: stars.trim(),
          country: country.trim(),
          language: language.trim(),
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
        text: `Drama "${data.drama.title}" berhasil ${data.action === "updated" ? "diperbarui" : "ditambahkan"}. Tersimpan langsung ke database — daftar di bawah sudah diperbarui.`,
      });
      setId("");
      setTitle("");
      setSynopsis("");
      setViews("");
      setEpisodes(1);
      setKind("series");
      setStatus("");
      setQuality("");
      setDownloadProviders([]);
      setPosterImage("");
      setHeroImage("");
      setSubtitles([]);
      setPremium(true);
      setUnggulan(false);
      setImdbIdMeta("");
      setYear("");
      setContentRating("");
      setRuntime("");
      setImdbRating("");
      setImdbVotes("");
      setGenre("");
      setDirector("");
      setWriter("");
      setStars("");
      setCountry("");
      setLanguage("");
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

  // Hash dibaca lewat efek, BUKAN saat render: `window` tidak ada saat HTML
  // dibuat di server. `hashchange` saja tidak cukup — mengklik menu yang
  // hash-nya SAMA dengan yang sedang dibuka tidak memicunya, sehingga bagian
  // yang diklik terasa "tidak merespons". `click` menutup celah itu.
  useEffect(() => {
    const baca = () => setBagian(parseBagianAdmin(window.location.hash));
    baca();
    window.addEventListener("hashchange", baca);
    window.addEventListener("click", baca);
    return () => {
      window.removeEventListener("hashchange", baca);
      window.removeEventListener("click", baca);
    };
  }, []);

  /**
   * Pindah bagian dari dalam halaman (bukan lewat klik menu).
   *
   * Hash ikut diperbarui supaya keadaan layar dan alamat tidak pernah berbeda —
   * kalau hanya state yang diubah, tombol Kembali browser akan memulangkan
   * admin ke bagian yang tidak sesuai dengan yang terlihat.
   */
  const bukaBagian = (tujuan: BagianAdmin) => {
    setBagian(tujuan);
    if (typeof window !== "undefined") window.location.hash = tujuan;
  };

  const loadDramaToForm = (d: Drama) => {
    setId(d.id);
    setTitle(d.title);
    setCategory(d.category);
    setSynopsis(d.synopsis);
    setViews(d.views);
    setEpisodes(d.episodes);
    setKind(d.kind ?? "series");
    setStatus(d.status ?? "");
    setQuality(d.quality ?? "");
    setDownloadProviders(d.downloadProviders ?? []);
    setPosterImage(d.posterImage ?? "");
    setHeroImage(d.heroImage ?? "");
    setSubtitles(d.subtitles ?? []);
    setPremium(d.premium ?? false);
    setUnggulan(d.exclusive ?? false);
    setImdbIdMeta(d.imdbId ?? "");
    setYear(d.year ?? "");
    setContentRating(d.contentRating ?? "");
    setRuntime(d.runtime ?? "");
    setImdbRating(d.imdbRating ?? "");
    setImdbVotes(d.imdbVotes ?? "");
    setGenre(d.genre ?? "");
    setDirector(d.director ?? "");
    setWriter(d.writer ?? "");
    setStars(d.stars ?? "");
    setCountry(d.country ?? "");
    setLanguage(d.language ?? "");
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
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-white">Akses ditolak</h1>
        <p className="text-sm text-zinc-400">
          Halaman ini hanya untuk admin. Login dengan email yang sudah terdaftar di daftar admin DramaKu untuk mengakses.
        </p>
        <Button
          asChild
          className="mt-2 rounded-full bg-amber-400 px-5 text-sm font-bold text-black hover:bg-amber-300"
        >
          <Link href="/beranda">← Kembali ke Beranda</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl gap-6 px-4 pb-10 pt-6 md:grid md:grid-cols-[220px_1fr] md:px-6">
      <AdminSidebar />

      <div className="space-y-6">
        {/* KEPALA BAGIAN — admin selalu tahu sedang berada di mana. Sebelum
            2026-11-05 enam bagian bertumpuk tanpa penanda posisi sama sekali,
            dan begitu digulung semuanya terasa menyatu (keluhan owner). */}
        <header>
          <h1 className="text-2xl font-bold text-white">{JUDUL_BAGIAN[bagian]}</h1>
          <p className="mt-1 text-sm text-zinc-400">{KETERANGAN_BAGIAN[bagian]}</p>
        </header>

        {bagian === "dashboard" && <AdminDashboard dramas={dramas} />}

        {/* Form SENGAJA tetap dirender (disembunyikan dengan `hidden`), bukan
            dilepas dari halaman. Alasannya nyata: isinya diisi dari tombol Edit
            di Daftar Drama, dan sebagian isian — mis. berkas poster yang dipilih
            — tidak ikut tersimpan di state halaman ini. Melepasnya dari DOM
            berarti isian itu hilang diam-diam tiap admin menengok bagian lain. */}
        <div className={bagian === "tambah" ? undefined : "hidden"}>
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
          kind={kind}
          status={status}
          setStatus={setStatus}
          quality={quality}
          setQuality={setQuality}
          downloadProviders={downloadProviders}
          setDownloadProviders={setDownloadProviders}
          setKind={setKind}
          posterImage={posterImage}
          setPosterImage={setPosterImage}
          heroImage={heroImage}
          setHeroImage={setHeroImage}
          subtitles={subtitles}
          setSubtitles={setSubtitles}
          premium={premium}
          setPremium={setPremium}
          unggulan={unggulan}
          setUnggulan={setUnggulan}
          imdbIdMeta={imdbIdMeta}
          setImdbIdMeta={setImdbIdMeta}
          year={year}
          setYear={setYear}
          contentRating={contentRating}
          setContentRating={setContentRating}
          runtime={runtime}
          setRuntime={setRuntime}
          imdbRating={imdbRating}
          setImdbRating={setImdbRating}
          imdbVotes={imdbVotes}
          setImdbVotes={setImdbVotes}
          genre={genre}
          setGenre={setGenre}
          director={director}
          setDirector={setDirector}
          writer={writer}
          setWriter={setWriter}
          stars={stars}
          setStars={setStars}
          country={country}
          setCountry={setCountry}
          language={language}
          setLanguage={setLanguage}
          effectiveId={effectiveId}
          scanning={scanning}
          mengukurDurasi={mengukurDurasi}
          onUkurDurasi={onUkurDurasi}
          scanResult={scanResult}
          submitting={submitting}
          message={message}
          formRef={formRef}
          onScan={onScan}
          onSubmit={onSubmit}
        />

        </div>

        {bagian === "daftar" && (
          <div className="space-y-4">
            {/* Ditaruh DI ATAS daftar, bukan di bagian "Tambah Drama": yang
                diisi adalah katalog yang sudah ada, dan hasilnya langsung
                terlihat di daftar tepat di bawahnya. */}
            <DurasiUkurSemua
              dramas={dramas}
              adminEmail={authUser.email}
              onSelesai={refreshList}
            />
          <DramaList
            dramas={dramas}
            /* Edit MEMBUKA bagian form dulu, baru mengisinya. Urutannya tidak
               boleh dibalik: `loadDramaToForm` menggulung ke elemen #tambah,
               dan elemen itu masih tersembunyi sampai bagiannya dibuka —
               menggulung ke sesuatu yang tak terlihat tidak menghasilkan apa
               pun, sehingga tombol Edit terasa tidak berfungsi. */
            onEdit={(d) => {
              bukaBagian("tambah");
              loadDramaToForm(d);
            }}
            onDelete={onDelete}
          />
          </div>
        )}

        {bagian === "kelola-admin" && (
          <AdminManager currentAdminEmail={authUser.email} />
        )}

        {/* Password dan 2FA disatukan di bagian "Keamanan": keduanya menjawab
            pertanyaan yang sama ("bagaimana akun admin dilindungi?"), dan
            memisahkannya berarti satu menu lagi yang isinya cuma satu kotak.
            Sekaligus menutup menu "Keamanan (2FA)" yang SELAMA INI RUSAK —
            targetnya `#keamanan` tidak pernah ada di halaman, jadi diklik pun
            tidak membawa ke mana-mana. */}
        {bagian === "keamanan" && (
          <>
            <AdminPasswordSettings />
            <TwoFactorSettings />
          </>
        )}

        {/* Pengatur iklan sponsor — ikut mati bersama saklar iklan
            (lib/saklar-fitur.ts). Disembunyikan, bukan dibiarkan: mengatur
            daftar iklan yang tidak akan tayang membuang waktu admin. */}
        {ADS_ENABLED && bagian === "iklan" && <SponsorAdsManager />}
      </div>
    </div>
  );
}
