"use client";

// ISI CEPAT — lengkapi data banyak video Playly dalam satu jalan.
//
// KENAPA ADA (owner 2026-11-11): "sebagian film kan tidak ada di imdb dan saya
// harus isi manual contohnya kualitas, rating dll, kalau diisi satu persatu
// akan makan waktu bisa kamu buatkan agar saya bisa mengisinya sekali jalan
// agar tidak perlu isi persatu film".
//
// DUA CARA MENGISI, dan owner memilih KEDUANYA (popup 2026-11-11):
//   1. CENTANG BANYAK -> terapkan satu nilai. Untuk kolom yang nilainya sama
//      di banyak film (Kualitas, Jenis, Kategori, Tahun).
//   2. KETIK SEMUA -> Simpan sekali. Untuk kolom yang angkanya beda tiap film
//      (Rating, Durasi), dan untuk membetulkan hasil cara pertama.
//
// ⚠️ KENAPA LAYAR SENDIRI, BUKAN MENUMPANG TABEL IMDb. Tabel itu sudah tujuh
// kolom dan lebarnya sudah mepet — catatan ukuran di KOLOM_BARIS
// (PlaylyVisibilityManager.tsx) mencatat judul film cuma kebagian ±124px.
// Menambah kotak centang + Tahun + Durasi ke sana membuat judulnya tersisa
// beberapa huruf, keluhan yang sudah pernah owner sampaikan. Di sini tabel itu
// tidak disentuh sama sekali.
//
// ⚠️ ISIAN YANG BELUM DISIMPAN HIDUP DI MEMORI KOMPONEN INI. PlaylyBagianAktif
// menyembunyikan panel yang tidak dibuka (bukan melepasnya dari halaman), jadi
// menengok menu lain TIDAK menghapus ketikan. Yang tidak bisa dijaga React
// adalah halaman yang dimuat ulang — itu dijaga peringatan `beforeunload` di
// bawah. Tanpa keduanya, mengisi 40 film lalu kehilangan semuanya membuat
// fitur ini lebih buruk daripada tidak ada.
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Loader2, Save, X } from "lucide-react";
import type { PlaylyVideo } from "@/lib/playly";
import type { PlaylyImdbMapRingkas } from "@/lib/playly-imdb";
import { DRAMA_QUALITY_OPTIONS } from "@/lib/types";
import PilihKategori from "./PilihKategori";
import { cn } from "@/lib/utils";
import { saringDenganKetikan } from "@/lib/pencarian";
import { formatDuration } from "@/lib/format";
import { jelaskanDurasiManual } from "@/lib/meta-video-manual";
import { JENIS_BAWAAN, LABEL_JENIS, type JenisVideo } from "@/lib/jenis-video";
import { ratingTampil } from "@/lib/rating-video";
import { asalKualitas, kelompokkanUnduhan } from "@/lib/ringkasan-isian-video";
import {
  KOLOM_MASSAL,
  kolomKosongVideo,
  type KolomMassal,
  type PetaIsian,
} from "@/lib/isian-massal-video";
import { Button } from "@/components/ui/button";
import BantuanSingkat from "./BantuanSingkat";
import PaginasiDaftar from "./PaginasiDaftar";
import KotakCariDaftar from "./KotakCariDaftar";
import {
  UKURAN_BAWAAN,
  HALAMAN_PERTAMA,
  jepitHalaman,
  potongHalaman,
  type UkuranHalaman,
} from "@/lib/paginasi";

/** Isian satu video yang BELUM disimpan. Kunci = nama kolom, isi = teks mentah
 *  seperti yang diketik — penyaringannya tetap di server (UI bukan pagar). */
type Draft = Partial<Record<KolomMassal, string>>;

/** Alasan penolakan per kolom, dari balasan server. */
type Ditolak = Record<string, Partial<Record<KolomMassal, string>>>;

type Pesan = { jenis: "ok" | "gagal"; teks: string };

/**
 * Tata kolom tabel. Delapan kolom: centang + judul + enam isian.
 *
 * 🪤 SENGAJA TIDAK memuat kelas `grid` itu sendiri — tailwind-merge membuat
 * `grid` di dalam konstanta ini MENIMPA `hidden` milik baris judul kolom
 * (keduanya utilitas display, dan konstanta ini dioper belakangan). Akibatnya
 * judul kolom tetap tergambar di layar sempit sambil menunjuk kontrol yang
 * salah. Jebakan ini sudah terukur sekali di PlaylyVisibilityManager; ditulis
 * ulang di sini supaya tidak ditemukan untuk kedua kalinya.
 *
 * Lebarnya diturunkan dari tabel IMDb yang sudah jalan, dikurangi kolom IMDb
 * (tidak ada di sini) dan ditambah Tahun + Durasi. Judul tetap `minmax(0,1fr)`
 * supaya ia yang menyerap sisa ruang, bukan kotak isian yang melar sia-sia.
 */
const KOLOM_ISI =
  "grid-cols-1 gap-1 sm:grid-cols-[28px_minmax(0,1fr)_76px_104px_96px_64px_64px_84px] sm:items-center";

/** Kolom yang nilainya masuk akal diterapkan ke banyak film sekaligus.
 *  Rating & Durasi sengaja TIDAK ada di sini: angkanya unik tiap film, dan
 *  menyediakan tombolnya cuma mengundang seluruh katalog diberi angka yang
 *  sama. */
const KOLOM_BORONGAN = ["jenis", "kategori", "kualitas", "tahun"] as const;
type KolomBorongan = (typeof KOLOM_BORONGAN)[number];

/** Nilai dropdown borongan yang berarti "kolom ini jangan diubah". */
const LEWATI = "";

/**
 * Kunci simpanan sementara di browser (localStorage).
 *
 * 🪤 KENAPA ADA — terbukti menggigit di pemakaian PERTAMA (owner 2026-11-11):
 * halaman admin melempar "Supabase tidak menjawab setelah 2 percobaan" saat
 * Supabase telat lewat 6 detik, React membuang seluruh panel, dan 4 isian yang
 * sudah diketik lenyap. Peringatan `beforeunload` tidak menolong di situ: yang
 * terjadi bukan halaman ditutup, melainkan halamannya sendiri yang gagal
 * dirender.
 *
 * Yang disimpan HANYA isian yang belum tersimpan — nol data pribadi, nol
 * token. Dibuang sendiri begitu penyimpanan berhasil.
 */
const KUNCI_DRAFT = "dramaku:isi-cepat:draft";

export default function PlaylyIsiCepat({
  videos,
  imdb = {},
  awal,
  linkUnduhan = [],
}: {
  videos: PlaylyVideo[];
  /** Data IMDb — dibaca saja, untuk tahu nilai mana yang sudah terisi otomatis. */
  imdb?: PlaylyImdbMapRingkas;
  /** Kelima peta isian yang sudah tersimpan, dirakit halaman di server. */
  awal: PetaIsian;
  /** Link unduhan — dibaca saja, supaya kolom Kualitas bisa menyebut hasil
   *  turunannya ("Otomatis · HD") alih-alih cuma "Otomatis". */
  linkUnduhan?: readonly {
    videoId: string;
    provider: string;
    quality: string;
    url: string;
  }[];
}) {
  const [tersimpan, setTersimpan] = useState<PetaIsian>(awal);
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  /** Berapa film isiannya dipulihkan dari simpanan browser. 0 = tidak ada. */
  const [dipulihkan, setDipulihkan] = useState(0);
  const [tercentang, setTercentang] = useState<Set<string>>(new Set());
  const [ditolak, setDitolak] = useState<Ditolak>({});
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState<Pesan | null>(null);

  const [hanyaBelumLengkap, setHanyaBelumLengkap] = useState(true);
  const [ketikan, setKetikan] = useState("");
  const [halaman, setHalaman] = useState(HALAMAN_PERTAMA);
  const [ukuran, setUkuran] = useState<UkuranHalaman>(UKURAN_BAWAAN);

  /** Nilai borongan yang sedang dipilih di bar atas. */
  const [borongan, setBorongan] = useState<Record<KolomBorongan, string>>({
    jenis: LEWATI,
    kategori: LEWATI,
    kualitas: LEWATI,
    tahun: "",
  });

  // PULIHKAN isian yang belum tersimpan dari kunjungan sebelumnya.
  //
  // Dibaca di dalam efek, BUKAN sebagai nilai awal useState: `localStorage`
  // tidak ada saat HTML dibuat di server, dan membacanya langsung membuat
  // render pertama di browser berbeda dari HTML server (hydration mismatch).
  useEffect(() => {
    try {
      const teks = window.localStorage.getItem(KUNCI_DRAFT);
      if (!teks) return;
      const isi = JSON.parse(teks) as Record<string, Draft>;
      const jumlah = isi && typeof isi === "object" ? Object.keys(isi).length : 0;
      if (jumlah === 0) return;
      setDraft(isi);
      setDipulihkan(jumlah);
    } catch {
      // Simpanan rusak/ditolak browser bukan alasan merusak panel: isiannya
      // memang hilang, tapi panelnya tetap bisa dipakai dari nol.
    }
  }, []);

  // TULIS tiap kali isian berubah. Satu tempat untuk SEMUA jalur pengubah
  // (ketik satuan, borongan, batalkan) — menitipkannya ke tiap pemanggil
  // berarti jalur yang lupa memanggilnya diam-diam kehilangan simpanannya.
  useEffect(() => {
    try {
      if (Object.keys(draft).length === 0) {
        window.localStorage.removeItem(KUNCI_DRAFT);
      } else {
        window.localStorage.setItem(KUNCI_DRAFT, JSON.stringify(draft));
      }
    } catch {
      // Kuota penuh / mode penyamaran: isian tetap hidup di memori panel.
      // Diam di sini disengaja — memunculkan pesan gagal untuk cadangan yang
      // sifatnya bantuan cuma membuat admin mengira isiannya tidak tersimpan.
    }
  }, [draft]);

  // Dikelompokkan SEKALI: 489 video × ratusan link = ratusan ribu perbandingan
  // per render kalau disaring ulang tiap baris, cukup untuk membuat panel
  // tersendat tiap satu kotak diketik.
  const petaUnduhan = useMemo(
    () => kelompokkanUnduhan(linkUnduhan),
    [linkUnduhan],
  );

  /**
   * Nilai yang TAMPIL untuk sebuah kolom kalau belum diketik apa-apa.
   *
   * Inilah yang dibandingkan saat menentukan "benar-benar berubah". Sengaja
   * memakai nilai EFEKTIF (termasuk yang datang dari IMDb/Playly), bukan isian
   * manual saja: kalau dibandingkan dengan isian manual, sekadar menyentuh
   * kotak lalu berpindah akan MENGUNCI angka IMDb jadi nilai ketikan — video
   * itu lalu berhenti mengikuti IMDb selamanya tanpa ada yang memberi tahu.
   * Jebakan yang sama sudah terukur di jalur rating satuan.
   */
  const nilaiOtomatis = (v: PlaylyVideo, kolom: KolomMassal): string => {
    const id = v.id;
    if (kolom === "jenis") return tersimpan.jenis[id] ?? JENIS_BAWAAN;
    if (kolom === "kategori") return tersimpan.kategori[id] ?? "";
    // Kualitas: kotak kosong berarti "Otomatis", jadi yang dibandingkan adalah
    // isian manualnya — bukan hasil turunan, yang memang tidak bisa diketik.
    if (kolom === "kualitas") return tersimpan.kualitas[id] ?? "";
    if (kolom === "rating") {
      return ratingTampil(tersimpan.rating[id], imdb[id]?.rating) ?? "";
    }
    if (kolom === "tahun") {
      return tersimpan.meta[id]?.tahun ?? imdb[id]?.year ?? "";
    }
    const detik = tersimpan.meta[id]?.durasiDetik;
    if (detik) return formatDuration(detik);
    const dariPlayly = (v.durationLabel ?? "").trim();
    return dariPlayly && dariPlayly !== "-" ? dariPlayly : "";
  };

  const nilaiTampil = (v: PlaylyVideo, kolom: KolomMassal): string =>
    draft[v.id]?.[kolom] ?? nilaiOtomatis(v, kolom);

  const ubahDraft = (videoId: string, kolom: KolomMassal, nilai: string) => {
    setDraft((d) => ({ ...d, [videoId]: { ...d[videoId], [kolom]: nilai } }));
    // Penanda penolakan dari percobaan simpan sebelumnya dibuang begitu
    // kotaknya disentuh — menandai merah kotak yang sedang dibetulkan membuat
    // admin mengira betulannya juga ditolak.
    setDitolak((t) => {
      if (!t[videoId]?.[kolom]) return t;
      const baris = { ...t[videoId] };
      delete baris[kolom];
      return { ...t, [videoId]: baris };
    });
  };

  /**
   * Baris yang BENAR-BENAR berubah — inilah yang dikirim ke server.
   *
   * Isian yang diketik lalu dikembalikan ke nilai semula TIDAK ikut: mengirim
   * nilai yang sama berarti mengubah nilai turunan jadi nilai manual (video
   * berhenti mengikuti sumber otomatisnya) tanpa ada yang memintanya.
   */
  const perubahanTerkirim = useMemo(() => {
    const petaVideo = new Map(videos.map((v) => [v.id, v]));
    const hasil: ({ videoId: string } & Partial<Record<KolomMassal, string>>)[] =
      [];

    for (const [videoId, isian] of Object.entries(draft)) {
      const v = petaVideo.get(videoId);
      if (!v) continue;
      const baris: { videoId: string } & Partial<Record<KolomMassal, string>> = {
        videoId,
      };
      let ada = false;
      for (const kolom of Object.keys(KOLOM_MASSAL) as KolomMassal[]) {
        const nilai = isian[kolom];
        if (nilai === undefined) continue;
        if (nilai.trim() === nilaiOtomatis(v, kolom).trim()) continue;
        baris[kolom] = nilai;
        ada = true;
      }
      if (ada) hasil.push(baris);
    }
    return hasil;
    // `tersimpan` & `imdb` ikut karena nilaiOtomatis membacanya: tanpa itu,
    // hitungan perubahan tidak ikut turun sesudah penyimpanan berhasil.
  }, [draft, videos, tersimpan, imdb]);

  const jumlahKotak = perubahanTerkirim.reduce(
    (n, b) => n + Object.keys(b).length - 1,
    0,
  );

  // 🪤 PERINGATAN SEBELUM HALAMAN DITUTUP. Tanpa ini, mengisi 40 film lalu
  // menekan F5 (atau menutup tab) menghapus semuanya tanpa satu pun
  // peringatan — kerugian terbesar yang bisa dialami fitur ini, dan satu
  // satunya yang tidak bisa dipulihkan.
  useEffect(() => {
    if (perubahanTerkirim.length === 0) return;
    const jaga = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", jaga);
    return () => window.removeEventListener("beforeunload", jaga);
  }, [perubahanTerkirim.length]);

  /** Video yang masih punya kolom kosong — daftar pekerjaan yang sebenarnya. */
  const kosongPerVideo = useMemo(() => {
    const sumber = {
      kategori: tersimpan.kategori,
      kualitasEfektif: (id: string) => {
        const asal = asalKualitas(id, tersimpan.kualitas, petaUnduhan);
        return asal.jenis === "kosong" ? null : asal.nilai;
      },
      ratingEfektif: (id: string) =>
        ratingTampil(tersimpan.rating[id], imdb[id]?.rating),
      meta: tersimpan.meta,
      tahunImdb: Object.fromEntries(
        Object.entries(imdb).map(([id, m]) => [id, m?.year]),
      ),
    };
    const peta = new Map<string, ReturnType<typeof kolomKosongVideo>>();
    for (const v of videos) peta.set(v.id, kolomKosongVideo(v, sumber));
    return peta;
  }, [videos, tersimpan, imdb, petaUnduhan]);

  const jumlahBelumLengkap = videos.filter(
    (v) => (kosongPerVideo.get(v.id)?.length ?? 0) > 0,
  ).length;

  // DUA lapis saringan, urutannya penting: saringan kelengkapan dulu, baru
  // ketikan. Dibalik, angka di tombol saringan ikut menyusut mengikuti
  // pencarian — padahal angka itu dibaca sebagai "berapa sisa pekerjaan".
  const videoSaringan = hanyaBelumLengkap
    ? videos.filter((v) => (kosongPerVideo.get(v.id)?.length ?? 0) > 0)
    : videos;
  const videoTampil = saringDenganKetikan(videoSaringan, ketikan, (v) => [
    v.title,
  ]);

  const halamanAman = jepitHalaman(halaman, videoTampil.length, ukuran);
  const videoHalaman = potongHalaman(videoTampil, halamanAman, ukuran);

  const semuaTercentang =
    videoHalaman.length > 0 && videoHalaman.every((v) => tercentang.has(v.id));

  const ubahCentang = (videoId: string, nyala: boolean) => {
    setTercentang((s) => {
      const baru = new Set(s);
      if (nyala) baru.add(videoId);
      else baru.delete(videoId);
      return baru;
    });
  };

  const centangSemuaHalaman = (nyala: boolean) => {
    setTercentang((s) => {
      const baru = new Set(s);
      for (const v of videoHalaman) {
        if (nyala) baru.add(v.id);
        else baru.delete(v.id);
      }
      return baru;
    });
  };

  /**
   * Terapkan nilai borongan ke semua video yang tercentang.
   *
   * SENGAJA hanya mengisi kotak, BUKAN menyimpan ke database. Dua sebab:
   * hasilnya terlihat dulu (ditandai kuning) sehingga salah pilih bisa
   * dibatalkan tanpa pernah menyentuh data penonton, dan seluruh penyimpanan
   * tetap lewat SATU pintu — tombol Simpan di bawah. Dua jalur tulis yang
   * berbeda pasti menyimpang perilakunya cepat atau lambat.
   */
  const terapkanBorongan = () => {
    const dipilih = (Object.keys(borongan) as KolomBorongan[]).filter(
      (k) => borongan[k].trim() !== "",
    );
    if (dipilih.length === 0 || tercentang.size === 0) return;

    setDraft((d) => {
      const baru = { ...d };
      for (const id of tercentang) {
        const isian = { ...baru[id] };
        for (const kolom of dipilih) isian[kolom] = borongan[kolom];
        baru[id] = isian;
      }
      return baru;
    });
    setPesan({
      jenis: "ok",
      teks: `Nilai dipasang ke ${tercentang.size} film — belum tersimpan. Periksa kotak kuning, lalu tekan "Simpan semua".`,
    });
  };

  const batalkanSemua = () => {
    setDraft({});
    setDitolak({});
    setDipulihkan(0);
    setPesan(null);
  };

  const simpanSemua = async () => {
    if (perubahanTerkirim.length === 0) return;
    setMenyimpan(true);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/playly/massal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perubahan: perubahanTerkirim }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        tersimpan?: number;
        peta?: PetaIsian;
        ditolak?: { videoId: string; kolom: KolomMassal; alasan: string }[];
        error?: string;
      };

      if (!res.ok || !data.peta) {
        // 🪤 DRAFT TIDAK DIHAPUS saat gagal. Menghapusnya berarti isian 40 film
        // lenyap justru di saat penyimpanannya tidak berhasil — kerugian
        // terbesar yang bisa terjadi di panel ini.
        setPesan({
          jenis: "gagal",
          teks:
            data.error ??
            `Gagal menyimpan (HTTP ${res.status}). Isian kamu masih utuh di layar — coba tekan Simpan lagi.`,
        });
        return;
      }

      // Peta terbaru datang dari server, dipakai apa adanya — layar tidak
      // menebak hasilnya sendiri dan ikut benar walau ada admin lain bekerja.
      setTersimpan(data.peta);

      const tolakan: Ditolak = {};
      for (const t of data.ditolak ?? []) {
        tolakan[t.videoId] = { ...tolakan[t.videoId], [t.kolom]: t.alasan };
      }
      setDitolak(tolakan);

      // Hanya isian yang DITOLAK yang ditinggal di layar; sisanya sudah jadi
      // nilai tersimpan, jadi menyisakannya membuat kotak kuning tak pernah
      // hilang walau pekerjaannya sudah beres.
      setDraft((d) => {
        const sisa: Record<string, Draft> = {};
        for (const [videoId, isian] of Object.entries(d)) {
          const kolomDitolak = tolakan[videoId];
          if (!kolomDitolak) continue;
          const baris: Draft = {};
          for (const kolom of Object.keys(kolomDitolak) as KolomMassal[]) {
            if (isian[kolom] !== undefined) baris[kolom] = isian[kolom];
          }
          if (Object.keys(baris).length > 0) sisa[videoId] = baris;
        }
        return sisa;
      });

      setTercentang(new Set());
      // Pemberitahuan "dipulihkan" dimatikan begitu isiannya benar-benar
      // masuk database — membiarkannya membuat spanduk itu menetap di layar
      // sesudah pekerjaannya selesai.
      setDipulihkan(0);

      const jumlahTolak = data.ditolak?.length ?? 0;
      setPesan({
        jenis: jumlahTolak > 0 ? "gagal" : "ok",
        teks:
          jumlahTolak > 0
            ? `${data.tersimpan ?? 0} film tersimpan, ${jumlahTolak} isian ditolak karena tidak terbaca — kotaknya ditandai merah di bawah. Betulkan lalu simpan lagi.`
            : `${data.tersimpan ?? 0} film tersimpan. Perubahannya tampil di situs dalam waktu sekitar 5 menit.`,
      });
    } catch {
      setPesan({
        jenis: "gagal",
        teks: "Tidak bisa menghubungi server. Isian kamu masih utuh di layar — cek koneksi lalu tekan Simpan lagi.",
      });
    } finally {
      setMenyimpan(false);
    }
  };

  /** Kelas kotak isian: kuning = belum disimpan, merah = ditolak server. */
  const kelasKotak = (videoId: string, kolom: KolomMassal) =>
    cn(
      "min-h-9 w-full min-w-0 rounded-lg border bg-zinc-900 px-2 text-xs text-zinc-200 outline-none transition focus-visible:border-amber-400 disabled:opacity-50",
      ditolak[videoId]?.[kolom]
        ? "border-rose-500 bg-rose-500/10"
        : draft[videoId]?.[kolom] !== undefined
          ? "border-amber-500 bg-amber-500/10"
          : "border-zinc-700",
    );

  if (videos.length === 0) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <p className="text-sm text-zinc-400">
          Belum ada video di akun Playly kita. Upload dulu di dashboard Playly —
          begitu ter-upload, video langsung muncul di sini.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <BantuanSingkat
        label="Bagaimana cara pakainya?"
        judul={
          <h2 className="text-base font-semibold text-white">
            Isi data banyak film sekaligus
          </h2>
        }
      >
        <p>
          Layar ini untuk film yang{" "}
          <strong className="text-zinc-200">tidak ada di IMDb</strong>, jadi
          poster, tahun, dan ratingnya tidak bisa diisi otomatis. Semua kotak di
          bawah bisa diketik langsung, dan{" "}
          <strong className="text-zinc-200">
            tidak ada yang tersimpan sampai kamu menekan tombol Simpan
          </strong>{" "}
          — jadi aman dicoba-coba.
        </p>
        <p>
          Kalau banyak film butuh nilai yang <em>sama</em> (misalnya semuanya
          HD): centang film-filmnya, pilih nilainya di baris biru, lalu klik{" "}
          <strong className="text-zinc-200">Terapkan</strong>. Kotak yang
          terisi jadi kuning — itu tandanya belum tersimpan. Periksa dulu, baru
          tekan Simpan.
        </p>
        <p>
          <strong className="text-zinc-200">Durasi</strong> ditulis persis
          seperti yang tampil di kartu: “1:47:00” = 1 jam 47 menit, “2:25” = 2
          menit 25 detik. <strong className="text-zinc-200">Rating</strong> 0-10
          (boleh pakai koma). Kotak yang{" "}
          <strong className="text-zinc-200">dikosongkan</strong> berarti film
          itu kembali memakai angka otomatis dari IMDb/Playly.
        </p>
      </BantuanSingkat>

      {/* SARINGAN + PENCARIAN. Bawaannya "Belum lengkap" — itulah daftar
          pekerjaan yang sebenarnya, dan membuka layar ini langsung di
          daftar 489 video membuat yang perlu dikerjakan tenggelam. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {[
          { nilai: true, label: "Belum lengkap", jumlah: jumlahBelumLengkap },
          { nilai: false, label: "Semua video", jumlah: videos.length },
        ].map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => {
              setHanyaBelumLengkap(t.nilai);
              // Tanpa baris ini: sedang di halaman 5 daftar "Semua" lalu
              // berpindah ke daftar yang cuma 1 halaman = layar kosong.
              setHalaman(HALAMAN_PERTAMA);
            }}
            aria-pressed={hanyaBelumLengkap === t.nilai}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              hanyaBelumLengkap === t.nilai
                ? "border-amber-500 bg-amber-500/15 text-amber-700"
                : "border-zinc-700 text-zinc-400 hover:border-amber-400 hover:text-amber-700",
            )}
          >
            {t.label} <span className="font-bold">{t.jumlah}</span>
          </button>
        ))}

        <KotakCariDaftar
          className="ml-auto"
          nilai={ketikan}
          onNilai={setKetikan}
          jumlah={videoTampil.length}
          total={videoSaringan.length}
          placeholder="Cari judul film…"
        />
      </div>

      {/* BAR BORONGAN. Muncul hanya saat ada yang dicentang: bar yang selalu
          tampil tapi tak bisa dipakai terbaca seperti kontrol rusak. */}
      {tercentang.size > 0 && (
        <div className="mt-3 rounded-xl border border-sky-500/40 bg-sky-500/10 p-3">
          <p className="text-xs font-semibold text-sky-100">
            Terapkan ke {tercentang.size} film tercentang
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-sky-200/80">Jenis</span>
              <select
                aria-label="Terapkan jenis ke film tercentang"
                value={borongan.jenis}
                onChange={(e) =>
                  setBorongan((b) => ({ ...b, jenis: e.target.value }))
                }
                className="min-h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
              >
                <option value={LEWATI}>— tidak diubah —</option>
                {(Object.keys(LABEL_JENIS) as JenisVideo[]).map((j) => (
                  <option key={j} value={j}>
                    {LABEL_JENIS[j]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-sky-200/80">Kategori</span>
              <PilihKategori
                label="Terapkan kategori ke film tercentang"
                nilai={borongan.kategori}
                onPilih={(nilaiBaru) =>
                  setBorongan((b) => ({ ...b, kategori: nilaiBaru }))
                }
                // Di kotak borongan, nilai kosong (`LEWATI`) berarti "jangan
                // sentuh kolom ini" — BUKAN "kosongkan kategorinya".
                teksKosong="— tidak diubah —"
                className="min-h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-sky-200/80">Kualitas</span>
              <select
                aria-label="Terapkan kualitas ke film tercentang"
                value={borongan.kualitas}
                onChange={(e) =>
                  setBorongan((b) => ({ ...b, kualitas: e.target.value }))
                }
                className="min-h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
              >
                <option value={LEWATI}>— tidak diubah —</option>
                {DRAMA_QUALITY_OPTIONS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-sky-200/80">Tahun</span>
              <input
                type="text"
                inputMode="numeric"
                aria-label="Terapkan tahun ke film tercentang"
                value={borongan.tahun}
                onChange={(e) =>
                  setBorongan((b) => ({ ...b, tahun: e.target.value }))
                }
                placeholder="2024"
                className="min-h-9 w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
              />
            </label>

            <Button
              type="button"
              size="sm"
              onClick={terapkanBorongan}
              className="bg-sky-600 text-white hover:bg-sky-500"
            >
              <Check className="size-3.5" aria-hidden="true" />
              Terapkan
            </Button>

            <button
              type="button"
              onClick={() => setTercentang(new Set())}
              className="text-xs text-sky-200/80 underline-offset-2 hover:underline"
            >
              Lepas semua centang
            </button>
          </div>

          {/* Rating & Durasi sengaja tidak ada di sini — dikatakan apa adanya
              supaya tidak dicari-cari. */}
          <p className="mt-2 text-[11px] text-sky-200/70">
            Rating dan Durasi tidak bisa diborong: angkanya beda tiap film, jadi
            keduanya diketik langsung di barisnya masing-masing.
          </p>
        </div>
      )}

      {/* ISIAN YANG DIPULIHKAN. Wajib dikatakan, bukan diam-diam dipasang
          kembali: kotak kuning yang muncul sendiri tanpa penjelasan terbaca
          seperti panel yang mengisi dirinya sendiri — dan admin tidak akan
          tahu bahwa yang terlihat itu BELUM tersimpan. */}
      {dipulihkan > 0 && perubahanTerkirim.length > 0 && (
        <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
          Isian di <strong>{dipulihkan} film</strong> dari kunjungan sebelumnya
          dipulihkan — halaman sempat tertutup atau bermasalah sebelum sempat
          disimpan. Periksa kotak kuningnya, lalu tekan{" "}
          <strong>Simpan semua</strong>. Kalau tidak dibutuhkan, tekan{" "}
          <strong>Batalkan</strong>.
        </p>
      )}

      {pesan && (
        <p
          role="status"
          className={cn(
            "mt-3 text-sm",
            pesan.jenis === "ok" ? "text-emerald-400" : "text-rose-400",
          )}
        >
          {pesan.teks}
        </p>
      )}

      {videoTampil.length === 0 ? (
        <p className="mt-4 rounded-lg border border-zinc-700 p-4 text-center text-sm text-zinc-400">
          {ketikan.trim() !== "" ? (
            <>
              Tidak ada film yang cocok dengan “{ketikan}”.{" "}
              <button
                type="button"
                onClick={() => setKetikan("")}
                className="text-amber-600 underline-offset-2 hover:underline"
              >
                Kosongkan pencarian
              </button>
            </>
          ) : (
            "Semua film sudah lengkap datanya. Tidak ada yang tersisa."
          )}
        </p>
      ) : (
        <div className="mt-4 px-1">
          {/* Judul kolom — hanya di layar yang kolomnya memang sejajar. Di
              layar sempit kontrolnya menumpuk, jadi judul kolom di sana justru
              menunjuk kontrol yang salah. */}
          <div
            className={cn(
              "hidden border-b border-zinc-800 pb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 sm:grid",
              KOLOM_ISI,
            )}
          >
            <span>
              <input
                type="checkbox"
                checked={semuaTercentang}
                onChange={(e) => centangSemuaHalaman(e.target.checked)}
                aria-label="Centang semua film di halaman ini"
                className="size-4 accent-amber-500"
              />
            </span>
            <span>Judul</span>
            <span>Jenis</span>
            <span>Kategori</span>
            <span>Kualitas</span>
            <span>Rating</span>
            <span>Tahun</span>
            <span>Durasi</span>
          </div>

          <ul className="divide-y divide-zinc-800">
            {videoHalaman.map((v) => {
              const kosong = kosongPerVideo.get(v.id) ?? [];
              const draftBaris = draft[v.id];
              const tolakBaris = ditolak[v.id];
              return (
                <li
                  key={v.id}
                  data-baris-isi-cepat=""
                  className="transition even:bg-zinc-900/40 hover:bg-zinc-800/50"
                >
                  <div className={cn("grid py-1.5", KOLOM_ISI)}>
                    <label className="flex items-center">
                      <span className="sr-only">Centang {v.title}</span>
                      <input
                        type="checkbox"
                        checked={tercentang.has(v.id)}
                        onChange={(e) => ubahCentang(v.id, e.target.checked)}
                        className="size-4 accent-amber-500"
                      />
                    </label>

                    <span
                      title={v.title}
                      className="flex min-w-0 items-center gap-1.5"
                    >
                      <span className="truncate text-sm font-medium text-zinc-100">
                        {v.title}
                      </span>
                      {/* Berapa kolom yang masih kosong — penanda kecil yang
                          membuat baris paling butuh perhatian langsung
                          terlihat tanpa membaca keenam kotaknya. */}
                      {kosong.length > 0 && (
                        <span className="shrink-0 rounded-full bg-zinc-800 px-1.5 text-[10px] font-semibold text-zinc-400">
                          {kosong.length} kosong
                        </span>
                      )}
                    </span>

                    <select
                      aria-label={`Jenis untuk ${v.title}`}
                      value={nilaiTampil(v, "jenis")}
                      onChange={(e) => ubahDraft(v.id, "jenis", e.target.value)}
                      className={kelasKotak(v.id, "jenis")}
                    >
                      {(Object.keys(LABEL_JENIS) as JenisVideo[]).map((j) => (
                        <option key={j} value={j}>
                          {LABEL_JENIS[j]}
                        </option>
                      ))}
                    </select>

                    {/* Kolom CARI, bukan <select> (owner 2026-11-13): 30
                        kategori terlalu panjang untuk dipindai mata satu per
                        satu. Lihat app/components/admin/PilihKategori.tsx. */}
                    <PilihKategori
                      label={`Kategori untuk ${v.title}`}
                      nilai={nilaiTampil(v, "kategori")}
                      onPilih={(nilaiBaru) =>
                        ubahDraft(v.id, "kategori", nilaiBaru)
                      }
                      className={kelasKotak(v.id, "kategori")}
                    />

                    <select
                      aria-label={`Kualitas untuk ${v.title}`}
                      value={nilaiTampil(v, "kualitas")}
                      onChange={(e) =>
                        ubahDraft(v.id, "kualitas", e.target.value)
                      }
                      className={kelasKotak(v.id, "kualitas")}
                    >
                      {/* Label "Otomatis" menyebut HASILnya: tanpa itu,
                          "Otomatis" pada film yang sudah HD dan pada film yang
                          TIDAK punya sumber sama sekali terbaca persis sama. */}
                      <option value="">
                        {(() => {
                          const asal = asalKualitas(
                            v.id,
                            tersimpan.kualitas,
                            petaUnduhan,
                          );
                          return asal.jenis === "turunan"
                            ? `Otomatis · ${asal.nilai}`
                            : "Otomatis · belum ada";
                        })()}
                      </option>
                      {DRAMA_QUALITY_OPTIONS.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>

                    <input
                      aria-label={`Rating untuk ${v.title}`}
                      inputMode="decimal"
                      placeholder="–"
                      value={nilaiTampil(v, "rating")}
                      onChange={(e) => ubahDraft(v.id, "rating", e.target.value)}
                      className={kelasKotak(v.id, "rating")}
                    />

                    <input
                      aria-label={`Tahun untuk ${v.title}`}
                      inputMode="numeric"
                      placeholder="–"
                      value={nilaiTampil(v, "tahun")}
                      onChange={(e) => ubahDraft(v.id, "tahun", e.target.value)}
                      className={kelasKotak(v.id, "tahun")}
                    />

                    <input
                      aria-label={`Durasi untuk ${v.title}`}
                      placeholder="1:47:00"
                      value={nilaiTampil(v, "durasi")}
                      onChange={(e) => ubahDraft(v.id, "durasi", e.target.value)}
                      className={kelasKotak(v.id, "durasi")}
                    />
                  </div>

                  {/* PRATINJAU durasi + alasan penolakan. Keduanya hanya muncul
                      saat ada isinya, jadi baris tetap setinggi satu baris
                      selama tidak ada yang perlu dibaca.

                      Pratinjau bukan hiasan: "1:45" berarti 1 menit 45 detik
                      dan "1:45:00" berarti 1 jam 45 menit — dua ketikan yang
                      cuma beda ":00" di ekor, dan salah pilih TIDAK memunculkan
                      error apa pun; angkanya langsung tayang ke penonton. */}
                  {(draftBaris?.durasi?.trim() || tolakBaris) && (
                    <div className="flex flex-wrap gap-x-3 pb-1.5 pl-1 text-[11px] sm:pl-8">
                      {draftBaris?.durasi?.trim() &&
                        (() => {
                          const terbaca = jelaskanDurasiManual(
                            draftBaris.durasi,
                          );
                          return terbaca ? (
                            <span className="text-emerald-400">
                              Durasi = {terbaca}
                            </span>
                          ) : (
                            <span className="text-amber-400">
                              Durasi belum terbaca — contoh: 1:47:00
                            </span>
                          );
                        })()}
                      {tolakBaris &&
                        (Object.keys(tolakBaris) as KolomMassal[]).map((k) => (
                          <span key={k} className="text-rose-400">
                            {KOLOM_MASSAL[k]}: {tolakBaris[k]}
                          </span>
                        ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {videoTampil.length > 0 && (
        <PaginasiDaftar
          className="mt-4 border-t border-zinc-800 pt-3"
          total={videoTampil.length}
          halaman={halamanAman}
          ukuran={ukuran}
          onHalaman={setHalaman}
          onUkuran={setUkuran}
        />
      )}

      {/* BARIS SIMPAN — menempel di bawah layar selama ada yang belum
          tersimpan. Bukan hiasan: daftarnya bisa 50 baris, dan tombol simpan
          yang tergulung jauh di bawah membuat isian mudah ditinggalkan tanpa
          pernah disimpan. */}
      {perubahanTerkirim.length > 0 && (
        <div className="sticky bottom-3 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/50 bg-zinc-950/95 p-3 shadow-lg">
          <AlertTriangle
            className="size-4 shrink-0 text-amber-400"
            aria-hidden="true"
          />
          <span className="text-xs text-amber-100">
            <strong>{jumlahKotak} isian</strong> di{" "}
            <strong>{perubahanTerkirim.length} film</strong> belum tersimpan.
          </span>

          <Button
            type="button"
            size="sm"
            onClick={simpanSemua}
            disabled={menyimpan}
            className="ml-auto bg-emerald-600 text-white hover:bg-emerald-500"
          >
            {menyimpan ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-3.5" aria-hidden="true" />
            )}
            Simpan semua
          </Button>

          <button
            type="button"
            onClick={batalkanSemua}
            disabled={menyimpan}
            className="flex items-center gap-1 text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline disabled:opacity-50"
          >
            <X className="size-3.5" aria-hidden="true" />
            Batalkan
          </button>
        </div>
      )}
    </section>
  );
}
