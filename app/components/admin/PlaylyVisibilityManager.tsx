"use client";

// Atur video Playly mana yang TAMPIL di halaman penonton.
//
// Semua video milik akun mitra tampil otomatis begitu di-upload di Playly —
// admin tidak perlu menyetujui apa pun. Yang diatur di sini adalah daftar
// PENGECUALIAN: video yang sengaja disembunyikan.
//
// Daftar videonya datang dari server sebagai props (halaman ini force-dynamic),
// jadi komponen ini tidak perlu memuat apa pun saat dibuka — tidak ada kedipan
// "memuat", dan satu-satunya panggilan jaringan terjadi saat tombol ditekan.
//
// "BELUM SIAP" = catatan videonya ada di Playly (judul, durasi, sampul) tapi
// BERKAS videonya tidak — biasanya upload putus di tengah. Video begini sudah
// otomatis tidak ditampilkan ke penonton; ditandai di sini supaya admin tahu
// perbaikannya ada di dashboard Playly, bukan di DramaKu.
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Info,
  ListChecks,
  Loader2,
  Star,
} from "lucide-react";
import {
  alamatBagianPlayly,
  JUDUL_BAGIAN_PLAYLY,
} from "@/lib/bagian-playly";
import type { PlaylyVideo, PlaylySumber } from "@/lib/playly";
import type { PlaylyImdbMapRingkas } from "@/lib/playly-imdb";
import { DRAMA_QUALITY_OPTIONS } from "@/lib/types";
import PilihKategori from "./PilihKategori";
import { cn } from "@/lib/utils";
import { saringDenganKetikan } from "@/lib/pencarian";
import { formatDuration } from "@/lib/format";
// Fungsi MURNI (nol impor Node) — aman diimpor komponen "use client" ini.
// Lihat peringatan di lib/format.ts: mengimpor modul server ke sini membuat
// `npm run build` GAGAL, dan tsc maupun vitest tidak menangkapnya.
import { jelaskanDurasiManual } from "@/lib/meta-video-manual";
import { Button } from "@/components/ui/button";
import {
  asalKualitas,
  kelompokkanUnduhan,
  ringkasIsian,
} from "@/lib/ringkasan-isian-video";
import { JENIS_BAWAAN, LABEL_JENIS, type JenisVideo } from "@/lib/jenis-video";
import { parseRatingManual, ratingTampil } from "@/lib/rating-video";
import {
  hitungImdb,
  LABEL_SARING,
  SARING_BAWAAN,
  saringVideoImdb,
  type SaringImdb,
} from "@/lib/saring-video-admin";
import PlaylyImdbPicker from "./PlaylyImdbPicker";
import PlaylyCocokkanSemua from "./PlaylyCocokkanSemua";
import KategoriIsiOtomatis from "./KategoriIsiOtomatis";
import RingkasanIsianVideo from "./RingkasanIsianVideo";
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

type Pesan = { jenis: "ok" | "gagal"; teks: string };

/** Nilai dropdown yang berarti "belum dipilihkan kategori". */
const KOSONG = "";

/**
 * Tata kolom baris kontrol tiap video (owner 2026-11-06: "kamu rapikan kalau
 * perlu di bikin chart agar lebih enak lihatnya").
 *
 * SATU BARIS, enam kolom, judul di kolom pertama — bentuk tabel yang owner
 * kirim contohnya (owner 2026-11-06: "ubah seperti image 1").
 *
 * 🪤 Judul memang jadi sempit di jendela browser yang kecil, dan itu
 * KEPUTUSAN owner, bukan kelalaian: "kalau ruang kurang karena judul panjang
 * bisa kamu kasih titik atau apa dan begitu klik muncul judul lengkap". Jadi
 * judulnya dipotong dengan "…" dan bisa diklik untuk menampilkan judul penuh
 * beserta keterangannya.
 *
 * 📐 Lebar tiap kolom DIUKUR dari potret, bukan ditebak: percobaan pertama
 * memakai 80/116/96/132 dan kolom judul cuma kebagian 78px — sekitar sepuluh
 * huruf, tidak cukup membedakan "Americana" dari "American Siege". Kolom lain
 * dirampingkan sampai batas isinya masih terbaca ("Series" 72px, "Tanpa
 * kategori" 108px, "Otomatis" 88px) supaya sisanya jatuh ke judul. Dua putaran sebelumnya judul ditaruh di tingkat
 * atas justru untuk menghindari pemotongan ini — owner lebih memilih tabel
 * yang lurus.
 *
 * 📐 ANGKANYA DIUKUR DARI POTRET, bukan ditebak. Percobaan pertama memberi
 * kolom tetap terlalu lebar (92/136/144/132), sehingga kolom IMDb cuma
 * kebagian ±130px: badge hijaunya tergencet jadi lingkaran tanpa judul, tombol
 * "x" lenyap, dan tombol "Cari di IMDb" terbungkus jadi TIGA baris sehingga
 * tinggi barisnya kembali tak seragam. Kolom Kualitas boleh paling banyak
 * menyusut karena labelnya sudah dipendekkan jadi "Otomatis".
 *
 * 🪤 Kolom IMDb diberi lebar TETAP (144px), bukan `1fr` (owner 2026-11-06:
 * "IMDB kamu kecilkan"). Dengan `1fr` ia menyerap SELURUH sisa ruang, jadi
 * tombol "Ganti" membentang ±315px — satu tombol selebar tiga dropdown
 * sekaligus. 144px pas untuk teks "Cari di IMDb" tanpa pernah membungkus jadi
 * dua baris, dan cukup untuk "Ganti" + tombol lepas.
 *
 * Kolom aksi tinggal selebar ikon (owner: "sembunyikan kamu jadikan icon saja
 * jadi lebih irit tempat"); `1fr`-nya menampung SISA ruang supaya grid tetap
 * mengisi penuh tanpa kolom lain ikut melar di layar lebar.
 *
 * 🪤 SENGAJA TIDAK memuat kelas `grid` itu sendiri. `cn()` memakai
 * tailwind-merge, dan `grid` di dalam konstanta ini akan MENIMPA `hidden`
 * milik baris judul kolom (keduanya utilitas `display`, dan konstanta ini
 * dioper belakangan). Akibatnya judul kolom tetap tergambar di layar sempit,
 * menumpuk jadi dua kolom dan menunjuk kontrol yang salah — terukur di
 * viewport 560px, tanpa satu pun error. Tiap pemakai menyebut `grid` /
 * `sm:grid` sendiri.
 *
 * Ditulis SEKALI di sini lalu dipakai baris header maupun tiap baris video —
 * dua salinan template kolom pasti menyimpang, dan kolom yang menyimpang
 * membuat judul kolom menunjuk kontrol yang salah tanpa ada yang error.
 */
const KOLOM_BARIS =
  "grid-cols-2 gap-1 sm:grid-cols-[minmax(0,1fr)_72px_108px_88px_124px_72px_36px] sm:items-center";

/**
 * Warna tiap nada spanduk. Dikumpulkan di satu peta supaya tiga spanduk di
 * panel ini (gangguan pengambilan · video belum siap · sumber katalog publik)
 * mustahil menyimpang bentuknya — sebelumnya masing-masing menulis ulang
 * rentetan kelas sendiri, dan yang satu sudah terlanjur beda ukuran teks.
 */
const NADA_SPANDUK = {
  peringatan: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  bahaya: "border-rose-500/30 bg-rose-500/10 text-rose-100",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-100",
} as const;

/** Spanduk pemberitahuan sebaris-ikon. Di luar komponen utama supaya React
 *  tidak menganggapnya komponen baru tiap render. */
function Spanduk({
  nada,
  ikon: Ikon,
  children,
}: {
  nada: keyof typeof NADA_SPANDUK;
  ikon: typeof AlertTriangle;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-xl border p-3 text-xs leading-relaxed",
        NADA_SPANDUK[nada],
      )}
    >
      <Ikon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Satu angka ringkasan.
 *
 * Angka dipisah dari kalimat (dulu: "488 dari 500 video tampil ... Ditandai
 * Series: 0 dari 500 · Sudah ada data IMDb: 376 dari 500") karena yang dicari
 * mata tiap panel dibuka adalah ANGKA-nya, bukan kalimatnya — mencarinya di
 * tengah paragraf berarti membaca ulang kalimat yang sama setiap kali.
 */
function KartuAngka({
  label,
  nilai,
  dari,
}: {
  label: string;
  /** Teks diizinkan supaya angka yang BELUM pasti bisa tampil sebagai "…". */
  nilai: number | string;
  dari?: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-lg font-bold leading-tight text-zinc-100">
        {nilai}
        {dari !== undefined && (
          <span className="ml-1 text-xs font-normal text-zinc-500">
            / {dari}
          </span>
        )}
      </dd>
    </div>
  );
}

export default function PlaylyVisibilityManager({
  videos,
  initialHidden,
  initialGenres = {},
  initialImdb = {},
  initialKualitas = {},
  initialJenis = {},
  initialRating = {},
  initialMetaManual = {},
  linkUnduhan = [],
  belumSiapIds,
  fetchError,
  source,
  creators,
}: {
  /** Seluruh video milik akun kita, termasuk yang sedang disembunyikan. */
  videos: PlaylyVideo[];
  initialHidden: string[];
  /**
   * Kategori yang sudah dipilih admin (videoId -> nama kategori).
   *
   * Bawaannya peta kosong supaya pemanggil lama tidak wajib berubah — dan itu
   * keadaan yang benar-benar terjadi hari ini: per 2026-09-26 belum satu pun
   * video punya kategori.
   */
  initialGenres?: Record<string, string>;
  /**
   * Data IMDb yang sudah dicocokkan admin (videoId -> metadata).
   *
   * Bawaannya peta kosong dengan alasan yang sama seperti `initialGenres`:
   * fitur ini baru ada 2026-10-08, jadi pemanggil lama tetap berlaku apa adanya.
   */
  initialImdb?: PlaylyImdbMapRingkas;
  /**
   * Kualitas yang sudah DIKOREKSI admin (videoId -> "HD"/"CAM"/...).
   *
   * Bawaannya peta kosong — dan itu memang keadaan normal: kualitas poster
   * diturunkan otomatis dari link unduhan (lib/kualitas-video.ts), jadi entri
   * di sini hanya ada untuk video yang turunannya meleset dan dibetulkan orang.
   */
  initialKualitas?: Record<string, string>;
  /**
   * Jenis tayangan yang sudah ditandai admin (videoId -> "film"/"series").
   *
   * Bawaannya peta kosong, dan itu keadaan normal: semua video dihitung FILM
   * sampai ditandai. Entri di sini hanya ada untuk video yang memang serial.
   */
  initialJenis?: Record<string, string>;
  /**
   * Rating yang sudah DIKETIK admin (videoId -> "7.4").
   *
   * Bawaannya peta kosong — keadaan normal: rating biasanya ikut terbawa dari
   * IMDb, dan entri di sini hanya ada untuk video yang angkanya diisi/dikoreksi
   * dengan tangan.
   */
  initialRating?: Record<string, string>;
  /** Tahun & durasi ketikan admin (videoId -> nilai). Kosong = semua ikut sumber otomatis. */
  initialMetaManual?: Record<string, { tahun?: string; durasiDetik?: number }>;
  /**
   * Link unduhan tiap video — HANYA dibaca, tidak pernah diubah di panel ini.
   *
   * Dibutuhkan karena kualitas poster diturunkan darinya
   * (lib/kualitas-video.ts). Tanpa data ini, dropdown kualitas cuma bisa
   * menulis "Otomatis" tanpa memberi tahu otomatisnya jadi apa — dan admin
   * mustahil membedakan "sudah HD" dari "tidak ada sumbernya" tanpa membuka
   * video satu per satu (owner 2026-11-09).
   *
   * Bawaannya daftar kosong supaya pemanggil lama tetap berlaku: tanpa data
   * ini panelnya tetap jalan, cuma tidak bisa menyebut asal kualitasnya.
   */
  linkUnduhan?: readonly {
    videoId: string;
    provider: string;
    quality: string;
    url: string;
  }[];
  /**
   * Video yang berkasnya belum ada di Playly — tidak tampil ke penonton.
   *
   * ⚠️ BIASANYA TIDAK DIISI, dan itu disengaja (owner 2026-11-11). Memeriksanya
   * berarti menanyakan SETIAP video ke Playly satu per satu — 489 video = lantai
   * ≥47 detik. Kalau halaman yang menanggungnya, ongkos itu dibayar ulang tiap
   * halaman dibuka dan jawabannya tidak pernah bisa diingat. Jadi saat prop ini
   * KOSONG, panel memintanya sendiri ke /api/admin/playly/belum-siap sesudah
   * tabelnya tergambar — endpoint itu mengingat hasilnya 5 menit.
   *
   * Diisi HANYA kalau pemanggil kebetulan sudah tahu jawabannya (dipakai tes,
   * supaya tidak perlu menyentuh jaringan).
   */
  belumSiapIds?: string[];
  /** Terisi kalau daftar gagal diambil dari Playly. */
  fetchError: string | null;
  source: PlaylySumber;
  /** Nama akun Playly yang dipakai menyaring saat jalur kunci tidak terpakai.
   * Jamak sejak 2026-10-06: kunci DramaKu mencakup tiga akun sekaligus. */
  creators: string[];
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set(initialHidden));

  // Hasil pemeriksaan "berkasnya ada atau tidak" kalau panel yang memintanya.
  // `null` = belum tiba (beda dari `[]` = sudah tiba dan hasilnya kosong) —
  // bedanya penting, karena nol penanda TANPA keterangan terbaca sebagai
  // "semua video aman", padahal pemeriksaannya belum selesai.
  const [hasilBelumSiap, setHasilBelumSiap] = useState<string[] | null>(null);
  const pakaiProp = Array.isArray(belumSiapIds);
  const menungguBerkas = !pakaiProp && hasilBelumSiap === null;
  const belumSiapAktif = pakaiProp ? belumSiapIds : (hasilBelumSiap ?? []);

  // Dirangkai jadi SATU string supaya efek di bawah tidak berjalan ulang tiap
  // render — `videos.map(...)` menghasilkan array baru setiap kali, dan array
  // baru di daftar dependensi membuat efeknya menembak server tanpa henti.
  const kunciVideo = videos.map((v) => v.id).join(",");

  useEffect(() => {
    // Pemanggil sudah tahu jawabannya (tes) → jangan sentuh jaringan.
    if (pakaiProp) return;
    const ids = kunciVideo ? kunciVideo.split(",") : [];
    if (ids.length === 0) {
      setHasilBelumSiap([]);
      return;
    }

    let batal = false;
    fetch("/api/admin/playly/belum-siap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { ids?: unknown } | null) => {
        if (batal) return;
        setHasilBelumSiap(Array.isArray(data?.ids) ? (data.ids as string[]) : []);
      })
      // Gagal memeriksa bukan alasan merusak panel: dianggap "tidak ada yang
      // ketahuan belum siap", dan keterangan "sedang memeriksa" ikut hilang
      // supaya tidak berputar selamanya.
      .catch(() => {
        if (!batal) setHasilBelumSiap([]);
      });
    return () => {
      batal = true;
    };
  }, [pakaiProp, kunciVideo]);

  const [genres, setGenres] = useState<Record<string, string>>(initialGenres);
  const [imdb, setImdb] = useState<PlaylyImdbMapRingkas>(initialImdb);
  const [sedangProses, setSedangProses] = useState<string | null>(null);
  const [sedangGenre, setSedangGenre] = useState<string | null>(null);
  const [kualitas, setKualitas] = useState<Record<string, string>>(initialKualitas);
  const [sedangKualitas, setSedangKualitas] = useState<string | null>(null);
  const [jenis, setJenis] = useState<Record<string, string>>(initialJenis);
  const [sedangJenis, setSedangJenis] = useState<string | null>(null);
  const [ratingManual, setRatingManual] =
    useState<Record<string, string>>(initialRating);
  // Ketikan yang BELUM disimpan, per video. Dipisah dari `ratingManual` supaya
  // tiap huruf yang diketik tidak langsung menembak server — penyimpanan baru
  // terjadi saat kotaknya ditinggalkan atau Enter ditekan.
  const [draftRating, setDraftRating] = useState<Record<string, string>>({});
  const [sedangRating, setSedangRating] = useState<string | null>(null);

  // Tahun & durasi KETIKAN admin (owner 2026-11-09: "kalau yang tidak ada
  // gimana cara isi manualnya"). Satu-satunya jalan mengisi film yang tidak
  // ada di IMDb sama sekali.
  const [metaManual, setMetaManual] =
    useState<Record<string, { tahun?: string; durasiDetik?: number }>>(initialMetaManual);
  // Ketikan yang BELUM disimpan, dipisah dari `metaManual` dengan alasan yang
  // sama seperti draftRating: kalau digabung, tiap huruf yang diketik akan
  // terbaca sebagai nilai tersimpan dan memicu tampilan ikut berubah.
  const [draftMeta, setDraftMeta] =
    useState<Record<string, { tahun?: string; durasi?: string }>>({});
  const [sedangMeta, setSedangMeta] = useState<string | null>(null);
  const [pesan, setPesan] = useState<Pesan | null>(null);
  /** Saringan "sudah / belum ada IMDb" (owner 2026-11-05: "biar mudah"). */
  const [saring, setSaring] = useState<SaringImdb>(SARING_BAWAAN);
  // Kotak cari (owner 2026-11-09). Daftar ini 500 judul — tombol saringan saja
  // tidak cukup untuk menemukan SATU judul tertentu.
  const [ketikan, setKetikan] = useState("");
  // Paginasi (owner 2026-11-06). Nomor halaman TIDAK dibetulkan lewat efek —
  // lihat jepitHalaman di lib/paginasi.ts untuk alasannya.
  const [halaman, setHalaman] = useState<number>(HALAMAN_PERTAMA);
  const [ukuran, setUkuran] = useState<UkuranHalaman>(UKURAN_BAWAAN);
  // Video yang sedang menampilkan judul lengkapnya. Satu pada satu waktu:
  // membuka banyak sekaligus membuat daftar kembali bertinggi tak beraturan,
  // yang persis keluhan yang sedang diperbaiki.
  const [detail, setDetail] = useState<string | null>(null);

  const ubah = async (videoId: string, jadikanTersembunyi: boolean) => {
    setSedangProses(videoId);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/playly/hidden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, hidden: jadikanTersembunyi }),
      });
      const data = (await res.json()) as { hidden?: string[]; error?: string };
      if (!res.ok) {
        setPesan({ jenis: "gagal", teks: data.error ?? "Gagal menyimpan perubahan." });
        return;
      }
      // Daftar terbaru datang dari server — dipakai apa adanya, jadi layar tidak
      // pernah menebak hasilnya sendiri dan ikut benar walau ada admin lain.
      setHidden(new Set(data.hidden ?? []));
      setPesan({
        jenis: "ok",
        teks: jadikanTersembunyi
          ? "Video disembunyikan dari halaman penonton."
          : "Video ditampilkan lagi.",
      });
    } catch {
      setPesan({
        jenis: "gagal",
        teks: "Tidak bisa menghubungi server. Cek koneksi internet lalu coba lagi.",
      });
    } finally {
      setSedangProses(null);
    }
  };

  /**
   * Pasang/kosongkan kategori sebuah video.
   *
   * Kategori inilah yang menentukan video ikut tampil di baris genre beranda
   * (mis. "Drama Action"). Video tanpa kategori TIDAK hilang — ia tetap ada di
   * baris "Film Terbaru" di atas beranda.
   */
  const ubahGenre = async (videoId: string, genre: string) => {
    setSedangGenre(videoId);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/playly/genre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // String kosong dikirim sebagai null supaya maksud "kosongkan" tidak
        // bergantung pada tafsiran server terhadap teks kosong.
        body: JSON.stringify({ videoId, genre: genre || null }),
      });
      const data = (await res.json()) as {
        genres?: Record<string, string>;
        error?: string;
      };
      if (!res.ok) {
        setPesan({ jenis: "gagal", teks: data.error ?? "Gagal menyimpan kategori." });
        return;
      }
      // Peta terbaru datang dari server, dipakai apa adanya — layar tidak
      // pernah menebak hasilnya sendiri dan ikut benar walau ada admin lain.
      setGenres(data.genres ?? {});
      setPesan({
        jenis: "ok",
        teks: genre
          ? `Kategori disimpan. Video ini akan muncul di baris "${genre}" di beranda dalam ±1 menit.`
          : "Kategori dikosongkan. Videonya tetap tampil di baris Film Terbaru.",
      });
    } catch {
      setPesan({
        jenis: "gagal",
        teks: "Tidak bisa menghubungi server. Cek koneksi internet lalu coba lagi.",
      });
    } finally {
      setSedangGenre(null);
    }
  };

  /**
   * KOREKSI kualitas sebuah video, atau kembalikan ke otomatis.
   *
   * Bawaannya situs MENURUNKAN kualitas dari link unduhan (1080p -> "HD",
   * hanya 480p -> "SD"; lib/kualitas-video.ts). Turunan itu bisa meleset —
   * berkas 1080p hasil rekaman bioskop tetap CAM — dan di sinilah orang
   * membetulkannya. Nilai pilihan admin SELALU menang atas turunan.
   */
  /**
   * Simpan rating ketikan admin untuk satu video.
   *
   * 🪤 Hanya menembak server kalau nilainya BENAR-BENAR berubah dari yang
   * sedang tampil. Tanpa penjaga itu, sekadar mengklik kotak lalu berpindah
   * akan MENGUNCI angka IMDb jadi rating manual — video itu lalu berhenti
   * mengikuti IMDb selamanya, tanpa ada yang memberi tahu.
   */
  /**
   * Simpan tahun & durasi ketikan admin untuk satu video.
   *
   * Dikirim bersamaan dalam SATU permintaan: keduanya diisi dari panel yang
   * sama, dan memisahkannya berarti satu klik "Simpan" bisa berakhir dengan
   * tahun tersimpan tapi durasi gagal — tanpa ada yang memberi tahu.
   */
  const simpanMeta = async (videoId: string) => {
    const draft = draftMeta[videoId];
    if (!draft) return;

    setSedangMeta(videoId);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/playly/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Hanya field yang BENAR-BENAR disentuh yang dikirim. Field yang tidak
        // ada di body sengaja tidak diubah server — tanpa itu, membetulkan
        // durasi saja akan ikut menghapus tahun yang sudah benar.
        body: JSON.stringify({
          videoId,
          ...(draft.tahun !== undefined ? { tahun: draft.tahun } : {}),
          ...(draft.durasi !== undefined ? { durasi: draft.durasi } : {}),
        }),
      });
      const data = (await res.json()) as {
        meta?: Record<string, { tahun?: string; durasiDetik?: number }>;
        error?: string;
      };
      if (!res.ok || !data.meta) {
        setPesan({
          jenis: "gagal",
          teks: data.error ?? `Gagal menyimpan (HTTP ${res.status}).`,
        });
        return;
      }
      setMetaManual(data.meta);
      setDraftMeta((d) => {
        const { [videoId]: _buang, ...sisa } = d;
        return sisa;
      });
      setPesan({ jenis: "ok", teks: "Tahun & durasi tersimpan." });
    } catch {
      setPesan({
        jenis: "gagal",
        teks: "Tidak bisa menghubungi server. Coba lagi.",
      });
    } finally {
      setSedangMeta(null);
    }
  };

  const simpanRating = async (videoId: string, judul: string) => {
    const diketik = draftRating[videoId];
    if (diketik === undefined) return;

    const tampilSekarang =
      ratingTampil(ratingManual[videoId], imdb[videoId]?.rating) ?? "";
    // Dibandingkan SESUDAH disaring supaya "7,4" dan "7.4" tidak dianggap dua
    // nilai berbeda lalu memicu simpan yang tidak perlu.
    const nilai = parseRatingManual(diketik);
    if ((nilai ?? "") === tampilSekarang) {
      setDraftRating((d) => {
        const { [videoId]: _buang, ...sisa } = d;
        return sisa;
      });
      return;
    }

    setSedangRating(videoId);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/playly/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Kotak yang dikosongkan dikirim sebagai null supaya maksud "ikuti
        // IMDb lagi" tidak bergantung pada tafsiran server terhadap teks kosong.
        body: JSON.stringify({ videoId, rating: nilai }),
      });
      const data = (await res.json()) as {
        rating?: Record<string, string>;
        error?: string;
      };
      if (!res.ok) {
        setPesan({ jenis: "gagal", teks: data.error ?? "Gagal menyimpan rating." });
        return;
      }
      // Peta terbaru datang dari server, dipakai apa adanya — layar tidak
      // menebak hasilnya sendiri dan ikut benar walau ada admin lain bekerja.
      setRatingManual(data.rating ?? {});
      setDraftRating((d) => {
        const { [videoId]: _buang, ...sisa } = d;
        return sisa;
      });
      setPesan({
        jenis: "ok",
        teks: nilai
          ? `Rating "${judul}" disimpan: ${nilai}. Angkanya muncul di situs dalam ±5 menit.`
          : `Rating "${judul}" dikosongkan — video ini kembali memakai angka dari IMDb.`,
      });
    } catch {
      setPesan({
        jenis: "gagal",
        teks: "Tidak bisa menghubungi server. Cek koneksi internet lalu coba lagi.",
      });
    } finally {
      setSedangRating(null);
    }
  };

  const ubahKualitas = async (videoId: string, label: string) => {
    setSedangKualitas(videoId);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/playly/kualitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // String kosong dikirim sebagai null supaya maksud "ikuti otomatis
        // lagi" tidak bergantung pada tafsiran server terhadap teks kosong.
        body: JSON.stringify({ videoId, kualitas: label || null }),
      });
      const data = (await res.json()) as {
        kualitas?: Record<string, string>;
        error?: string;
      };
      if (!res.ok) {
        setPesan({ jenis: "gagal", teks: data.error ?? "Gagal menyimpan kualitas." });
        return;
      }
      // Peta terbaru datang dari server, dipakai apa adanya — layar tidak
      // menebak hasilnya sendiri dan ikut benar walau ada admin lain.
      setKualitas(data.kualitas ?? {});
      setPesan({
        jenis: "ok",
        teks: label
          ? `Kualitas disimpan. Poster film ini akan menampilkan "${label}" dalam ±5 menit.`
          : "Kualitas dikembalikan ke otomatis: mengikuti link unduhan (ada 1080p → HD, hanya 480p → SD).",
      });
    } catch {
      setPesan({
        jenis: "gagal",
        teks: "Tidak bisa menghubungi server. Cek koneksi internet lalu coba lagi.",
      });
    } finally {
      setSedangKualitas(null);
    }
  };

  /**
   * Tandai video ini FILM atau SERIES (owner 2026-11-05).
   *
   * Inilah satu-satunya hal yang memindahkan sebuah video dari seksi "Film
   * Terbaru" ke "Series Terbaru" di beranda — Playly tidak pernah mengirim
   * penanda jenis, dan tebakan otomatis dari judul/durasi sudah diukur lalu
   * ditolak (angkanya di lib/jenis-video.ts).
   */
  const ubahJenis = async (videoId: string, pilihan: string) => {
    setSedangJenis(videoId);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/playly/jenis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // String kosong dikirim sebagai null supaya maksud "kembalikan ke
        // bawaan" tidak bergantung pada tafsiran server terhadap teks kosong.
        body: JSON.stringify({ videoId, jenis: pilihan || null }),
      });
      const data = (await res.json()) as {
        jenis?: Record<string, string>;
        error?: string;
      };
      if (!res.ok) {
        setPesan({ jenis: "gagal", teks: data.error ?? "Gagal menyimpan jenis." });
        return;
      }
      // Peta terbaru datang dari server, dipakai apa adanya — layar tidak
      // menebak hasilnya sendiri dan ikut benar walau ada admin lain.
      setJenis(data.jenis ?? {});
      setPesan({
        jenis: "ok",
        teks:
          pilihan === "series"
            ? 'Ditandai SERIES. Video ini pindah ke baris "Series Terbaru" di beranda dalam ±1 menit.'
            : 'Ditandai FILM. Video ini tampil di baris "Film Terbaru" di beranda dalam ±1 menit.',
      });
    } catch {
      setPesan({
        jenis: "gagal",
        teks: "Tidak bisa menghubungi server. Cek koneksi internet lalu coba lagi.",
      });
    } finally {
      setSedangJenis(null);
    }
  };

  /**
   * Pengambilan gagal DAN tak ada satu pun video yang bisa ditampilkan — barulah
   * panel menyerah dan cuma menampilkan peringatan.
   *
   * ⚠️ Sampai 2026-11-05 syaratnya cuma `fetchError`, dan itu terbukti
   * menyandera owner: Playly telat menjawab 10 detik → SELURUH panel diganti
   * kotak peringatan → daftar video beserta KETIGA dropdown-nya (Jenis,
   * Kategori, Kualitas) hilang dari layar, sehingga tak ada satu pun video yang
   * bisa ditandai sampai Playly kebetulan sedang cepat. Owner melaporkannya
   * dengan kalimat "dropdown paling kiri aku tidak ketemu" — dan memang tidak
   * ada, bukan terlewat.
   *
   * Sekarang daftarnya bisa datang dari salinan terakhir (lihat halaman
   * pemanggil), jadi selama ADA video, panel tetap bekerja dan peringatannya
   * cukup tampil sebagai spanduk di atas daftar.
   */
  if (fetchError && videos.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
        <p className="flex items-start gap-2 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{fetchError}</span>
        </p>
      </div>
    );
  }

  // Dihitung dari daftar aslinya, bukan pengurangan angka: video bisa
  // disembunyikan DAN belum siap sekaligus, jadi mengurangi dua angka akan
  // menghitungnya dua kali dan hasilnya bisa minus.
  // Dihitung dari `imdb` yang ADA DI STATE, bukan dari prop awal: begitu admin
  // mencocokkan sebuah video, angka di tombol saringan ikut turun seketika
  // tanpa perlu memuat ulang halaman.
  // Link unduhan dikelompokkan SEKALI, bukan disaring ulang tiap baris:
  // 489 video × 761 link = ratusan ribu perbandingan per render, cukup untuk
  // membuat panel tersendat tiap satu dropdown disentuh.
  const petaUnduhan = useMemo(() => kelompokkanUnduhan(linkUnduhan), [linkUnduhan]);
  const ringkasan = useMemo(
    () => ringkasIsian(videos, kualitas, ratingManual, imdb, petaUnduhan),
    [videos, kualitas, ratingManual, imdb, petaUnduhan],
  );

  const jumlahSaring = hitungImdb(videos, imdb);
  // DUA lapis saringan, dan urutannya penting: tombol saringan dulu (Semua /
  // Sudah ada IMDb / Belum), baru ketikan. Dibalik, angka di tombol saringan
  // ikut menyusut mengikuti ketikan — padahal angka itu dibaca admin sebagai
  // "berapa total yang belum dikerjakan", bukan "berapa hasil pencarian".
  const videoSaringan = saringVideoImdb(videos, imdb, saring);
  const videoTampil = saringDenganKetikan(videoSaringan, ketikan, (v) => [v.title]);

  // Dipotong SESUDAH disaring, bukan sebelum: memotong dulu lalu menyaring
  // akan menghasilkan halaman yang jumlah barisnya berubah-ubah (halaman 1
  // berisi 12 baris, halaman 2 berisi 40) tanpa ada yang salah di layar.
  const halamanAman = jepitHalaman(halaman, videoTampil.length, ukuran);
  const videoHalaman = potongHalaman(videoTampil, halamanAman, ukuran);

  const belumSiap = new Set(belumSiapAktif);
  const jumlahTampil = videos.filter(
    (v) => !hidden.has(v.id) && !belumSiap.has(v.id),
  ).length;
  const jumlahSeries = videos.filter((v) => jenis[v.id] === "series").length;
  const jumlahImdb = videos.filter((v) => imdb[v.id]).length;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      {/* Keterangan Jenis/Kategori/IMDb pindah ke balik tombol "?" (owner
          2026-11-06: "jadi klo orang mau baca tinggal klik"). Isinya sama
          persis — yang berubah cuma: tiga paragraf itu tidak lagi mendorong
          daftar videonya jauh ke bawah layar tiap panel dibuka. */}
      <BantuanSingkat
        label="Apa arti Jenis, Kategori, dan Cari di IMDb?"
        judul={
          <h2 className="text-base font-semibold text-white">
            Video yang tampil di halaman penonton
          </h2>
        }
      >

        {/* Ketiga keterangan ini SELALU dirender, tidak lagi bersyarat
            "ada video": tombol "?" yang diklik lalu tidak menampilkan apa-apa
            terbaca seperti tombol rusak. Yang bersyarat cuma ANGKA-nya, dan
            angka itu kini duduk di baris ringkas di luar kotak — tempatnya
            memang di baris status, bukan terkubur di tengah penjelasan. */}
        <p>
          <strong className="text-zinc-200">Jenis</strong> menentukan video ini
          masuk baris <strong className="text-zinc-200">&quot;Film Terbaru&quot;</strong> atau{" "}
          <strong className="text-zinc-200">&quot;Series Terbaru&quot;</strong> di
          beranda. Bawaannya <em>Film</em>, jadi pilih <em>Series</em> untuk
          episode drama berseri. Playly tidak pernah memberi tahu kita sebuah
          video itu film atau serial, jadi pilihan di sinilah satu-satunya yang
          menentukan. Perubahan terlihat di situs dalam ±1 menit.
        </p>

        {/* Keterangan kategori ditulis di sini, bukan di sebelah tiap
            dropdown: aturannya sama untuk semua baris, dan mengulangnya 46
            kali cuma membuat daftar jadi padat tanpa menambah kejelasan. */}
        <p>
          <strong className="text-zinc-200">Kategori</strong> menentukan video
          ikut muncul di baris genre beranda (mis. &quot;Drama Action&quot;).
          Dibiarkan <em>Tanpa kategori</em> pun videonya{" "}
          <strong className="text-zinc-200">tetap tampil</strong> di baris
          &quot;Film Terbaru&quot; di atas beranda — jadi tidak ada video yang
          hilang karena belum diisi. Perubahan terlihat di situs dalam ±1 menit.
        </p>

        {/* Keterangan IMDb ditulis sekali di sini, bukan di sebelah tiap
            tombol — alasan yang sama dengan keterangan kategori di atas. */}
        <p>
          <strong className="text-zinc-200">Cari di IMDb</strong> mengisi poster,
          sinopsis, genre, tahun, dan rating untuk video itu. Playly tidak pernah
          mengirim data ini, jadi tanpa diisi kartunya memang tampil polos —
          itulah kenapa video di sini terlihat beda dari film yang kamu tambahkan
          sendiri. Kotak pencariannya{" "}
          <strong className="text-zinc-200">sudah terisi otomatis</strong> dari
          judul videonya, jadi biasanya tinggal tekan <em>Cari</em> lalu pilih
          film yang benar.
        </p>
      </BantuanSingkat>

      {/* RINGKASAN ANGKA. Keempatnya dihitung ulang tiap render, jadi begitu
          sebuah video disembunyikan / ditandai Series / dicocokkan ke IMDb,
          angkanya bergerak seketika tanpa memuat ulang halaman. */}
      {videos.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">
          Belum ada video di akun Playly kita. Upload dulu di dashboard Playly —
          begitu ter-upload, video langsung muncul di sini dan di halaman
          penonton.
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <KartuAngka label="Total video" nilai={videos.length} />
            <KartuAngka
              label="Tampil ke penonton"
              /* Selagi pemeriksaan berjalan angkanya PASTI kelebihan (video
                 yang berkasnya hilang belum ketahuan), jadi lebih jujur
                 menampilkan titik-titik daripada angka yang sebentar lagi
                 berubah sendiri tanpa penjelasan. */
              nilai={menungguBerkas ? "…" : jumlahTampil}
              dari={videos.length}
            />
            <KartuAngka
              label="Ditandai Series"
              nilai={jumlahSeries}
              dari={videos.length}
            />
            <KartuAngka
              label="Sudah ada IMDb"
              nilai={jumlahImdb}
              dari={videos.length}
            />
          </dl>
          <p className="mt-2 text-xs text-zinc-500">
            Semua video tampil otomatis; sembunyikan yang tidak ingin
            ditayangkan.
          </p>
        </>
      )}

      {/* SEMUA PEMBERITAHUAN DIKUMPULKAN DI SATU TEMPAT (owner 2026-11-06:
          "rapikan lagi agar UI nya lebih bagus"). Sebelumnya ketiganya
          berserak — satu di atas kalimat status, dua lagi terselip di bawah
          tombol pencocokan massal — sehingga peringatan penting bisa terlewat
          karena posisinya berpindah tergantung spanduk mana yang muncul. */}
      <div className="mt-4 space-y-2 empty:hidden">
        {/* Pengambilan bermasalah TAPI daftarnya masih ada (dari salinan
            terakhir). Peringatannya tetap tampil — jujur bahwa daftar ini bisa
            ketinggalan video yang baru di-upload — tanpa menyandera seluruh
            panel seperti sebelum 2026-11-05. Penandaan yang disimpan dari sini
            TETAP sah: ia menulis ke database kita sendiri, bukan ke Playly. */}
        {fetchError && (
          <Spanduk nada="peringatan" ikon={AlertTriangle}>
            {fetchError} Daftar di bawah dipakai dari salinan terakhir, jadi
            video yang baru saja di-upload mungkin belum muncul. Pengaturan yang
            kamu simpan di sini tetap tersimpan dengan benar.
          </Spanduk>
        )}

        {/* Selama hasilnya belum tiba, katakan apa adanya. Tanpa baris ini,
            tabel tanpa satu pun penanda "belum siap" terbaca sebagai "semua
            video aman" — kesimpulan yang salah dan tak ada yang mengoreksinya. */}
        {menungguBerkas && (
          <Spanduk nada="info" ikon={Loader2}>
            Memeriksa berkas tiap video ke Playly… Tabel di bawah sudah bisa
            dipakai; penanda <strong>belum siap</strong> dan angka{" "}
            <strong>Tampil ke penonton</strong> menyusul setelah pemeriksaan
            selesai.
          </Spanduk>
        )}

        {belumSiap.size > 0 && (
          <Spanduk nada="bahaya" ikon={AlertTriangle}>
            <strong>{belumSiap.size} video belum siap.</strong> Catatannya ada di
            Playly (judul, durasi, sampul), tapi file videonya tidak — biasanya
            karena upload putus di tengah. Video ini <strong>tidak</strong>{" "}
            ditampilkan ke penonton, karena kalau diklik yang muncul cuma layar
            &quot;Video belum tersedia&quot;. Perbaikannya di dashboard Playly:
            upload ulang videonya sampai 100% selesai, lalu buka lagi halaman
            ini.
          </Spanduk>
        )}

        {/* Dikatakan apa adanya: daftar ini TIDAK datang dari kunci mitra, jadi
            jangan sampai ada yang mengira kuncinya sudah jalan padahal belum. */}
        {source === "katalog-publik" && videos.length > 0 && (
          <Spanduk nada="info" ikon={Info}>
            Daftar ini diambil dari katalog publik Playly dan disaring ke akun{" "}
            <strong>{creators.join(", ")}</strong>, karena kunci mitra sedang
            tidak diterima Playly. Videonya tetap hanya milik akun kita. Kalau
            ada akun Playly baru, tambahkan lewat Environment Variable{" "}
            <code>PLAYLY_CREATOR</code> (dipisah koma) — isinya MENAMBAH daftar
            bawaan, bukan menggantikannya.
          </Spanduk>
        )}
      </div>

      {/* Pencocokan massal. Diletakkan SESUDAH keterangan dan SEBELUM daftar:
          urutan kerjanya memang begitu — pahami dulu apa yang diisi, kerjakan
          borongan, baru rapikan sisanya satu per satu di daftar di bawah. */}
      {!fetchError && (
        <PlaylyCocokkanSemua videos={videos} imdb={imdb} onPerbarui={setImdb} />
      )}

      {/* ⚠️ SENGAJA DI LUAR pagar `!fetchError` — jangan "dirapikan" masuk ke
          dalamnya bersama panel di atas.

          `fetchError` berarti PLAYLY yang tidak menjawab. Panel di atas memang
          pantas sembunyi saat itu (mencocokkan daftar yang mungkin basi).
          Tebakan kategori TIDAK menyentuh Playly sama sekali: ia membaca genre
          dari data IMDb yang sudah tersimpan, dan daftar videonya sendiri
          datang dari salinan `playly:cadangan` yang tetap lengkap.

          Ketahuan saat diperiksa di localhost 2026-11-09: dengan panel ini di
          dalam pagar, ia lenyap persis di keadaan yang paling sering terjadi —
          produksi pun sedang menampilkan "Playly tidak menjawab dalam 10
          detik". Fitur yang mati justru saat paling dibutuhkan.

          Ditaruh SESUDAH pencocokan IMDb karena urutan kerjanya memang begitu:
          cocokkan dulu, baru tebak kategorinya. Panel ini menyembunyikan diri
          sendiri kalau tidak ada yang bisa diusulkan. */}
      <KategoriIsiOtomatis
        videos={videos}
        imdb={imdb}
        kategoriSekarang={genres}
        onTersimpan={(videoId, kategori) =>
          setGenres((lama) => ({ ...lama, [videoId]: kategori }))
        }
      />

      {/* Ringkasan kualitas & rating. Juga DI LUAR pagar `!fetchError`, dengan
          alasan yang sama seperti panel kategori di atas: angkanya dihitung
          dari data yang sudah tersimpan di sisi kita, bukan dari Playly. */}
      <RingkasanIsianVideo ringkasan={ringkasan} />

      {pesan && (
        <p
          role="status"
          className={`mt-3 text-sm ${
            pesan.jenis === "ok" ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {pesan.teks}
        </p>
      )}

      {/* SARINGAN IMDb (owner 2026-11-05: "biar mudah"). Ditaruh tepat di atas
          daftar, bukan di kepala panel: ia menjelaskan isi daftar di bawahnya,
          dan keterangan yang jauh dari yang dijelaskan mudah terlewat.

          Angkanya dihitung ulang tiap render, jadi begitu sebuah video
          dicocokkan, hitungannya bergerak seketika — admin melihat sisanya
          berkurang tanpa memuat ulang halaman. */}
      {videos.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(Object.keys(LABEL_SARING) as SaringImdb[]).map((pilihan) => {
            const dipakai = saring === pilihan;
            return (
              <button
                key={pilihan}
                type="button"
                onClick={() => {
                  setSaring(pilihan);
                  // 🪤 Tanpa baris ini: sedang di halaman 3 "Semua" (359
                  // video) lalu klik "Belum ada IMDb" (61 video, cuma 1
                  // halaman) = halaman 3 tidak ada, daftarnya kosong. Penjepit
                  // di lib/paginasi.ts menahan kerusakannya, tapi melompat ke
                  // halaman terakhir tanpa diminta tetap membingungkan.
                  setHalaman(HALAMAN_PERTAMA);
                }}
                aria-pressed={dipakai}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  dipakai
                    ? "border-amber-500 bg-amber-500/15 text-amber-700"
                    : "border-zinc-700 text-zinc-400 hover:border-amber-400 hover:text-amber-700",
                )}
              >
                {LABEL_SARING[pilihan]}{" "}
                <span className="font-bold">{jumlahSaring[pilihan]}</span>
              </button>
            );
          })}

          {/* PINTU MASUK panel "Isi manual" (owner 2026-11-11: "pindahkan isi
              cepat ke filter yang ada di imdb biar lebih rapi"). Dulu sebuah
              menu di sidebar; dipindah ke sini karena DI SINILAH kebutuhannya
              muncul — admin menyaring "Belum ada IMDb", melihat film yang
              poster/tahun/rating-nya tak bisa diisi otomatis, lalu butuh
              mengisinya tangan. Sidebar ikut jadi lebih pendek.

              ⚠️ SENGAJA TIDAK berbentuk tombol bundar seperti tiga saringan di
              kirinya. Ketiganya MEMPERSEMPIT daftar di halaman yang sama; yang
              ini BERPINDAH panel. Bentuk yang seragam membuat admin mengklik
              sambil menunggu daftarnya menyusut, lalu bingung karena layarnya
              berganti. Tiga penanda bahwa ini jenis lain: garis pemisah, sudut
              kotak (rounded-md bawaan Button), dan ikon.

              Labelnya diambil dari JUDUL_BAGIAN_PLAYLY, bukan diketik ulang —
              judul panel dan tombol yang membukanya jadi mustahil menyimpang. */}
          <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-zinc-700" />
          <Button asChild variant="outline" size="sm">
            <a href={alamatBagianPlayly("isi-cepat")}>
              <ListChecks className="size-3.5" />
              {JUDUL_BAGIAN_PLAYLY["isi-cepat"]}
            </a>
          </Button>

          {saring === "belum" && jumlahSaring.belum > 0 && (
            // Kalimat ini mencegah kebingungan yang pasti muncul: saat saringan
            // "Belum" aktif, video yang BARU SAJA dicocokkan langsung lenyap
            // dari daftar — itu benar, tapi tanpa penjelasan terbaca seperti
            // videonya terhapus.
            <span className="text-xs text-zinc-500">
              Video hilang dari daftar ini begitu selesai dicocokkan — itu
              tandanya berhasil.
            </span>
          )}

          {/* Kotak cari duduk SEBARIS dengan tombol saringan, bukan di atasnya:
              keduanya mempersempit daftar yang sama, jadi memisahkannya membuat
              admin mengira salah satunya menimpa yang lain. `ml-auto` mendorong
              ke kanan supaya tombol saringan tetap jadi yang pertama dibaca. */}
          <KotakCariDaftar
            className="ml-auto"
            nilai={ketikan}
            onNilai={setKetikan}
            jumlah={videoTampil.length}
            total={videoSaringan.length}
            placeholder="Cari judul video…"
          />
        </div>
      )}

      {videos.length > 0 && videoTampil.length === 0 && (
        // Daftar kosong karena SARINGAN, bukan karena tidak ada video. Dua hal
        // itu wajib dibedakan: tanpa pesan ini, panel terbaca seperti rusak.
        <p className="mt-4 rounded-lg border border-zinc-700 p-4 text-center text-sm text-zinc-400">
          {/* Ketikan diperiksa DULU: kalau admin sedang mencari, itulah sebab
              yang paling mungkin — dan tindakannya beda dari mengganti
              saringan. Menyebut saringan saat yang salah ketikannya membuat
              admin mengutak-atik tombol yang bukan penyebabnya. */}
          {ketikan.trim() !== "" ? (
            <>
              Tidak ada video yang cocok dengan “{ketikan}”.{" "}
              <button
                type="button"
                onClick={() => setKetikan("")}
                className="text-amber-600 underline-offset-2 hover:underline"
              >
                Kosongkan pencarian
              </button>
            </>
          ) : saring === "belum" ? (
            "Semua video sudah dicocokkan ke IMDb. Tidak ada yang tersisa."
          ) : (
            "Belum ada video yang cocok dengan saringan ini."
          )}
        </p>
      )}

      {videos.length > 0 && (
        // 🪤 PADDING HORIZONTAL HANYA DI SINI. Sebelumnya baris judul kolom
        // dan tiap baris video sama-sama ber-`px-2` di tempatnya
        // masing-masing — kesejajarannya bergantung pada dua nilai yang
        // KEBETULAN sama, dan nilai yang kebetulan sama adalah nilai yang
        // menyimpang begitu salah satunya disunting. Sekarang keduanya
        // mulai dari tepi yang sama persis, jadi mustahil meleset.
        <div className="mt-4 px-1">
          {/* Judul kolom — inilah yang membuat daftar terbaca seperti tabel.
              Hanya muncul di layar yang kolomnya memang sejajar (sm ke atas);
              di bawah itu kontrolnya jatuh jadi 2 kolom, jadi judul kolom di
              sana justru menunjuk ke kontrol yang salah. */}
          <div
            className={cn(
              // Tanpa padding horizontal sendiri — lihat catatan di
              // pembungkusnya. `sm:grid` saja (bukan `grid`) supaya `hidden`
              // tetap berlaku di layar sempit.
              "hidden border-b border-zinc-800 pb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 sm:grid",
              KOLOM_BARIS,
            )}
          >
            <span>Judul</span>
            <span>Jenis</span>
            <span>Kategori</span>
            <span>Kualitas</span>
            <span>IMDb</span>
            <span>Rating</span>
            <span>Aksi</span>
          </div>

          <ul className="divide-y divide-zinc-800">
          {videoHalaman.map((v) => {
            const tersembunyi = hidden.has(v.id);
            const belumAdaFile = belumSiap.has(v.id);
            const proses = sedangProses === v.id;
            // Status bisa menumpuk (belum siap + disembunyikan), jadi dirangkai
            // dari daftar, bukan rantai ternary yang saling menutupi.
            const catatan = [
              v.creator || "tanpa nama kreator",
              v.durationLabel !== "-" ? v.durationLabel : null,
              belumAdaFile ? "file videonya belum ada di Playly — upload ulang di sana" : null,
              tersembunyi ? "disembunyikan" : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li
                key={v.id}
                // Penanda untuk tests/paginasi.test.ts. Sebelum ada ini tesnya
                // menghitung SEMUA `<li>` di panel, jadi ia pecah begitu
                // daftar lain ditambahkan — terjadi 2026-11-09 saat ringkasan
                // kualitas & rating masuk (7 `<li>` baru, nol hubungannya
                // dengan paginasi). Atributnya menyatakan apa yang sebenarnya
                // diukur: baris video, bukan sembarang butir daftar.
                data-baris-video=""
                // Latar berselang-seling (zebra) + garis pemisah: di daftar
                // puluhan baris, mata kehilangan jejak baris mana yang sedang
                // dibaca tanpa keduanya.
                className="transition even:bg-zinc-900/40 hover:bg-zinc-800/50"
              >
                <div className={cn("grid py-1.5", KOLOM_BARIS)}>
                  {/* JUDUL — kolom pertama, sejajar seperti kolom "Domain" di
                      contoh yang owner kirim. Dipotong dengan "…" saat ruang
                      kurang, dan DIKLIK untuk memunculkan judul lengkapnya
                      (owner 2026-11-06). `title` dipasang juga supaya judul
                      penuh bisa dibaca cukup dengan mendiamkan kursor. */}
                  <button
                    type="button"
                    onClick={() => setDetail(detail === v.id ? null : v.id)}
                    title={v.title}
                    aria-expanded={detail === v.id}
                    className="flex min-w-0 items-center gap-1.5 text-left"
                  >
                    {belumAdaFile && (
                      <AlertTriangle
                        className="size-3.5 shrink-0 text-rose-400"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`truncate text-sm font-medium ${
                        tersembunyi
                          ? "text-zinc-500 line-through"
                          : "text-zinc-100"
                      }`}
                    >
                      {v.title}
                    </span>
                  </button>

                {/* JENIS tayangan (owner 2026-11-05). Ditaruh PALING KIRI di
                    antara ketiga dropdown karena ia yang paling menentukan:
                    kategori & kualitas cuma mengubah label dan baris genre,
                    sedangkan yang ini memindahkan judulnya antar-seksi beranda.
                    Bentuknya sengaja sama dengan dua dropdown di bawahnya. */}
                <label className="flex min-w-0 items-center gap-1.5">
                  <span className="sr-only">Jenis tayangan untuk {v.title}</span>
                  <select
                    value={jenis[v.id] ?? JENIS_BAWAAN}
                    onChange={(e) => ubahJenis(v.id, e.target.value)}
                    disabled={sedangJenis === v.id}
                    className="min-h-9 w-full min-w-0 rounded-full border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 outline-none transition focus-visible:border-amber-400 disabled:opacity-50"
                  >
                    {/* Ditulis dari LABEL_JENIS, bukan diketik ulang: nama yang
                        dilihat admin dan nilai yang tersimpan jadi mustahil
                        menyimpang kalau nanti jenisnya bertambah. */}
                    {(Object.keys(LABEL_JENIS) as JenisVideo[]).map((j) => (
                      <option key={j} value={j}>
                        {LABEL_JENIS[j]}
                      </option>
                    ))}
                  </select>
                  {sedangJenis === v.id && (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin text-zinc-400"
                      aria-hidden="true"
                    />
                  )}
                </label>

                {/* Kategori untuk baris beranda.
                    ⚠️ DULU memakai <select> bawaan, dengan alasan tertulis:
                    "daftarnya 8 pilihan tetap, dan di HP select bawaan
                    membuka pemilih layar-penuh yang lebih enak dipakai".
                    Alasan pertamanya GUGUR 2026-11-13 — owner menaikkan
                    kategori jadi 30, dan menggulung 30 baris jauh lebih buruk
                    daripada mengetik 3 huruf. Alasan HP-nya masih benar dan
                    tidak dibantah; ia kalah karena panel ini dipakai dari
                    desktop (tabel 8 kolom yang mustahil muat di layar HP).
                    Kalau ternyata dipakai dari HP juga, kembalikan <select>
                    DI SINI saja — PlaylyIsiCepat.tsx tetap kolom cari. */}
                <label className="flex min-w-0 items-center gap-1.5">
                  <span className="sr-only">Kategori untuk {v.title}</span>
                  <PilihKategori
                    label={`Kategori untuk ${v.title}`}
                    nilai={genres[v.id] ?? KOSONG}
                    onPilih={(nilaiBaru) => ubahGenre(v.id, nilaiBaru)}
                    disabled={sedangGenre === v.id}
                    className="min-h-9 w-full min-w-0 rounded-full border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 outline-none transition focus-visible:border-amber-400 disabled:opacity-50"
                  />
                  {sedangGenre === v.id && (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin text-zinc-400"
                      aria-hidden="true"
                    />
                  )}
                </label>

                {/* KUALITAS poster (owner 2026-10-31). Bawaannya "Otomatis":
                    situs menurunkannya sendiri dari link unduhan, jadi daftar
                    ini hanya perlu disentuh kalau turunannya meleset —
                    terutama film CAM yang berkas unduhannya kebetulan 1080p.
                    Bentuknya sengaja sama dengan dropdown kategori di atas. */}
                <label className="flex min-w-0 items-center gap-1.5">
                  <span className="sr-only">Kualitas untuk {v.title}</span>
                  <select
                    value={kualitas[v.id] ?? KOSONG}
                    onChange={(e) => ubahKualitas(v.id, e.target.value)}
                    disabled={sedangKualitas === v.id}
                    className="min-h-9 w-full min-w-0 rounded-full border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 outline-none transition focus-visible:border-amber-400 disabled:opacity-50"
                  >
                    {/* Label "Otomatis" menyebut HASILnya, bukan cuma namanya
                        (owner 2026-11-09). Tanpa ini, "Otomatis" pada video
                        yang sudah HD dan pada video yang TIDAK punya sumber
                        sama sekali terbaca persis sama — satu-satunya cara
                        membedakannya adalah membuka video satu per satu. */}
                    <option value={KOSONG}>
                      {(() => {
                        const asal = asalKualitas(v.id, kualitas, petaUnduhan);
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
                  {sedangKualitas === v.id && (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin text-zinc-400"
                      aria-hidden="true"
                    />
                  )}
                </label>

                {/* Data IMDb (poster, sinopsis, rating) untuk video ini.
                    Playly tidak pernah mengirimnya, jadi inilah satu-satunya
                    pintu masuknya. */}
                <PlaylyImdbPicker
                  videoId={v.id}
                  judulVideo={v.title}
                  meta={imdb[v.id]}
                  onPerbarui={setImdb}
                />

                {/* RATING — BISA DIKETIK (owner 2026-11-06: "kalau yang
                    belum ada ratingnya bisa kita edit kan?").
                    Angkanya ikut terbawa sendiri saat video dicocokkan ke
                    IMDb; kotak ini untuk dua keadaan yang tidak terlayani
                    jalur itu — video yang belum dicocokkan, dan film yang
                    memang tak punya nilai di IMDb.
                    Disimpan saat kotaknya ditinggalkan atau Enter ditekan,
                    bukan tiap huruf: mengetik "7.4" akan menembak server tiga
                    kali, dan yang dua di antaranya menyimpan angka setengah
                    jadi ("7", "7.") yang sempat tayang ke penonton. */}
                <label className="flex items-center gap-1">
                  <span className="sr-only">Rating untuk {v.title}</span>
                  {/* Bintang menyala kalau ADA nilainya — dari mana pun
                      asalnya. Sebelumnya hanya menyala untuk rating ketikan,
                      sehingga angka IMDb yang sah tampil dengan bintang redup
                      dan terbaca seperti nilai mati. Yang diisi tangan
                      dibedakan lewat warna ANGKA-nya, bukan bintangnya. */}
                  <Star
                    className={cn(
                      "size-3 shrink-0",
                      ratingTampil(ratingManual[v.id], imdb[v.id]?.rating)
                        ? "text-amber-500"
                        : "text-zinc-600",
                    )}
                    aria-hidden="true"
                  />
                  <input
                    // Nilai yang sedang diketik menang; kalau tidak ada,
                    // yang tampil adalah rating EFEKTIF (ketikan admin, lalu
                    // IMDb) — sama persis dengan yang dilihat penonton.
                    value={
                      draftRating[v.id] ??
                      ratingTampil(ratingManual[v.id], imdb[v.id]?.rating) ??
                      ""
                    }
                    onChange={(e) =>
                      setDraftRating((d) => ({ ...d, [v.id]: e.target.value }))
                    }
                    onBlur={() => simpanRating(v.id, v.title)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      // Escape membatalkan ketikan, bukan menyimpannya —
                      // tanpa ini satu-satunya jalan keluar dari salah ketik
                      // adalah menyimpannya dulu lalu membetulkannya.
                      if (e.key === "Escape") {
                        setDraftRating((d) => {
                          const { [v.id]: _buang, ...sisa } = d;
                          return sisa;
                        });
                        e.currentTarget.blur();
                      }
                    }}
                    disabled={sedangRating === v.id}
                    inputMode="decimal"
                    placeholder="–"
                    title={
                      ratingManual[v.id]
                        ? `Rating diisi manual. Kosongkan untuk kembali memakai angka IMDb.`
                        : `Ketik rating 0-10. Angka ini tampil di kartu video untuk penonton.`
                    }
                    className={cn(
                      "min-h-9 w-full min-w-0 rounded-lg border border-transparent bg-transparent px-1 text-xs outline-none transition placeholder:text-zinc-600 hover:border-zinc-700 focus-visible:border-amber-400 disabled:opacity-50",
                      ratingManual[v.id]
                        ? "font-semibold text-amber-700"
                        : "text-zinc-300",
                    )}
                  />
                  {sedangRating === v.id && (
                    <Loader2
                      className="size-3 shrink-0 animate-spin text-zinc-400"
                      aria-hidden="true"
                    />
                  )}
                </label>

                <button
                  type="button"
                  onClick={() => ubah(v.id, !tersembunyi)}
                  disabled={proses}
                  // IKON SAJA (owner 2026-11-06: "sembunyikan kamu jadikan
                  // icon saja jadi lebih irit tempat"). Tombol berteks memakan
                  // ±110px di tiap baris; ikon cukup 36px.
                  //
                  // `title` + `aria-label` WAJIB ada dan berbunyi sama: begitu
                  // teksnya hilang dari layar, satu-satunya cara tahu tombol
                  // ini mengerjakan apa adalah mendiamkan kursor di atasnya —
                  // dan pembaca layar hanya punya aria-label. Ikon tanpa
                  // keduanya = tombol yang fungsinya cuma bisa ditebak.
                  title={tersembunyi ? `Tampilkan ${v.title}` : `Sembunyikan ${v.title}`}
                  aria-label={
                    tersembunyi ? `Tampilkan ${v.title}` : `Sembunyikan ${v.title}`
                  }
                  aria-pressed={tersembunyi}
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-50 ${
                    tersembunyi
                      ? "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                      : "border-amber-500/50 text-amber-500 hover:border-amber-400 hover:bg-amber-500/10"
                  }`}
                >
                  {proses ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : tersembunyi ? (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
                </div>

                {/* Judul lengkap + keterangannya. Muncul hanya saat judulnya
                    diklik, jadi baris tetap setinggi satu baris selama tidak
                    dibuka — kalau selalu tampil, seluruh daftar kembali
                    bertinggi ganda. */}
                {detail === v.id && (
                  <div className="pb-3">
                    <p className="text-xs leading-relaxed text-zinc-400">
                      <strong className="text-zinc-200">{v.title}</strong>
                      <br />
                      {catatan}
                    </p>

                    {/* ISIAN MANUAL tahun & durasi (owner 2026-11-09: "kalau
                        yang tidak ada gimana cara isi manualnya"). Ditaruh di
                        panel detail, BUKAN sebagai dua kolom tabel: owner
                        memilihnya supaya tabel tetap lega dan ada ruang untuk
                        menerangkan formatnya. Keduanya hanya perlu disentuh
                        untuk film yang tak ada di IMDb — kasus minoritas, jadi
                        tak pantas memakan lebar tabel setiap hari. */}
                    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-zinc-400">
                          Tahun
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={
                            draftMeta[v.id]?.tahun ??
                            metaManual[v.id]?.tahun ??
                            imdb[v.id]?.year ??
                            ""
                          }
                          onChange={(e) =>
                            setDraftMeta((d) => ({
                              ...d,
                              [v.id]: { ...d[v.id], tahun: e.target.value },
                            }))
                          }
                          placeholder="2024"
                          className="h-8 w-20 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100 outline-none focus-visible:border-amber-400"
                        />
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-zinc-400">
                          Durasi
                        </span>
                        <input
                          type="text"
                          value={
                            draftMeta[v.id]?.durasi ??
                            (metaManual[v.id]?.durasiDetik
                              ? formatDuration(metaManual[v.id]!.durasiDetik!)
                              : "")
                          }
                          onChange={(e) =>
                            setDraftMeta((d) => ({
                              ...d,
                              [v.id]: { ...d[v.id], durasi: e.target.value },
                            }))
                          }
                          placeholder="1:47:00"
                          className="h-8 w-24 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100 outline-none focus-visible:border-amber-400"
                        />
                      </label>

                      {/* PRATINJAU — memperlihatkan hasil bacaan SEBELUM
                          disimpan. Bukan hiasan: "1:45" berarti 1 menit 45
                          detik dan "1:45:00" berarti 1 jam 45 menit, dua
                          ketikan yang cuma beda ":00" di ekor, dan salah pilih
                          TIDAK memunculkan error apa pun — angkanya langsung
                          tayang ke penonton. Satu kalimat petunjuk lagi tetap
                          bisa terlewat; angka yang terbaca di depan mata tidak. */}
                      {(() => {
                        const diketik = draftMeta[v.id]?.durasi;
                        if (diketik === undefined || !diketik.trim()) return null;
                        const terbaca = jelaskanDurasiManual(diketik);
                        return terbaca ? (
                          <span className="pb-1.5 text-[11px] text-emerald-400">
                            = {terbaca}
                          </span>
                        ) : (
                          <span className="pb-1.5 text-[11px] text-amber-400">
                            belum terbaca — lihat contoh di bawah
                          </span>
                        );
                      })()}

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => simpanMeta(v.id)}
                        disabled={!draftMeta[v.id] || sedangMeta === v.id}
                        className="bg-emerald-600 text-white hover:bg-emerald-500"
                      >
                        {sedangMeta === v.id ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          "Simpan"
                        )}
                      </Button>

                      <p className="w-full text-[11px] leading-relaxed text-zinc-500">
                        Durasi ditulis{" "}
                        <strong>persis seperti yang tampil di kartu</strong> —
                        “1:47:00” = 1 jam 47 menit, “2:25” = 2 menit 25 detik.
                        Bentuk “95 min” dari IMDb juga terbaca.{" "}
                        <strong>Dikosongkan = kembali ikut IMDb/Playly.</strong>{" "}
                        Perubahan tampil di situs dalam waktu sekitar 2 menit.
                      </p>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          </ul>
        </div>
      )}

      {/* SATU-SATUNYA kontrol halaman, di bawah daftar (owner 2026-11-06:
          "yang di atas kamu hapus"). Sebelumnya dipasang dua kali; owner
          menilai yang atas cuma menambah baris tanpa menambah guna. */}
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
    </section>
  );
}
