"use client";

// Menu titik tiga di pemutar video: popup gelap di kanan bawah.
//
// KENAPA ADA: video Playly dulu diputar <iframe> milik mereka, jadi tombol
// titik tiga yang dilihat penonton adalah menu bawaan Chrome dan isinya cuma
// "Playback speed" + "Picture in picture". Menu di dalam iframe beda domain
// tidak bisa kita ubah, jadi satu-satunya jalan adalah memutar sendiri lalu
// menyediakan menu sendiri -- berkas ini bagian "menu sendiri"-nya.
//
// Berkas ini MURNI TAMPILAN: ia tidak menyentuh elemen <video> sama sekali.
// Semua nilai + aksi disuplai pemutar lewat prop (pola yang sama dipakai
// PlayerControls). Alasannya supaya menu ini bisa dipakai ulang pemutar lain
// tanpa menyeret ikut cara satu pemutar mengelola videonya.
import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  Captions,
  Check,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Gauge,
  MonitorPlay,
  Sun,
  Type,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Satu pilihan di dalam submenu (Subtitle / Kecepatan / Kualitas). */
export type OpsiMenu = { nilai: string; label: string };

/**
 * Sakelar hidup-mati. `alasanMati` yang terisi berarti fitur ini TIDAK bisa
 * dipakai untuk video yang sedang diputar — barisnya tetap tampil supaya
 * penonton tahu fiturnya ada, tapi tidak bisa dinyalakan dan alasannya ditulis
 * apa adanya. Menyembunyikannya justru membingungkan: penonton yang pernah
 * melihatnya di video lain akan mengira menunya rusak.
 */
export type SakelarMenu = {
  aktif: boolean;
  onUbah: (aktif: boolean) => void;
  alasanMati?: string;
};

/**
 * Submenu berisi daftar pilihan. `catatan` dipakai saat pilihannya tinggal satu
 * (mis. sumber video tidak menyediakan varian resolusi) — supaya submenu yang
 * isinya cuma "Auto" tidak terbaca seperti fitur yang gagal dimuat.
 */
export type PilihanMenu = {
  nilai: string;
  opsi: OpsiMenu[];
  onPilih: (nilai: string) => void;
  catatan?: string;
};

/**
 * Subtitle + gayanya. `alasanMati` terisi = video ini tidak punya berkas
 * subtitle: halamannya tetap bisa dibuka supaya penonton membaca alasannya,
 * tapi "Gaya subtitle" dikunci — mengatur gaya teks yang tidak pernah tampil
 * sama saja tombol yang diklik lalu tidak terjadi apa-apa.
 */
export type SubtitleMenu = {
  bahasa: PilihanMenu;
  ukuran: PilihanMenu;
  latar: PilihanMenu;
  alasanMati?: string;
};

// Susunan menu (permintaan 2026-11-06): Subtitle & Kecepatan KEMBALI masuk menu dan
// tombol langsungnya di baris kontrol dihapus — tetap satu jalan ke tiap
// pengaturan. Volume Stabil SENGAJA dipertahankan: mesinnya baru dibangun owner
// 2026-11-03 dan menyala sendiri begitu sumber video memberi izin CORS. PiP
// tetap tombol langsung, bukan di sini.
export type PlayerMenuProps = {
  subtitle: SubtitleMenu;
  kecepatan: PilihanMenu;
  volumeStabil: SakelarMenu;
  penguatSuara: SakelarMenu;
  sinematik: SakelarMenu;
  kualitas: PilihanMenu;
  /**
   * Dipanggil tiap menu dibuka/ditutup. Pemutar memakainya untuk menahan baris
   * kontrol supaya tidak ikut menghilang otomatis sementara menu terbuka.
   */
  onTerbukaChange?: (terbuka: boolean) => void;
};

/** Halaman yang sedang ditampilkan di dalam popup. */
type Laman = "utama" | "subtitle" | "gayaSubtitle" | "kecepatan" | "kualitas";

export default function PlayerMenu({
  subtitle,
  kecepatan,
  volumeStabil,
  penguatSuara,
  sinematik,
  kualitas,
  onTerbukaChange,
}: PlayerMenuProps) {
  const [terbuka, setTerbuka] = useState(false);
  const [laman, setLaman] = useState<Laman>("utama");
  const wadahRef = useRef<HTMLDivElement | null>(null);

  const ubahTerbuka = (nilai: boolean) => {
    setTerbuka(nilai);
    if (!nilai) setLaman("utama"); // buka lagi selalu mulai dari halaman utama
    onTerbukaChange?.(nilai);
  };

  // Tutup saat menekan Escape atau menyentuh di luar popup. Tanpa ini menu
  // menempel di layar dan menutupi video — di HP tidak ada tombol "keluar".
  useEffect(() => {
    if (!terbuka) return;

    const padaTekan = (e: KeyboardEvent) => {
      if (e.key === "Escape") ubahTerbuka(false);
    };
    const padaSentuhLuar = (e: PointerEvent) => {
      if (!wadahRef.current?.contains(e.target as Node)) ubahTerbuka(false);
    };

    document.addEventListener("keydown", padaTekan);
    document.addEventListener("pointerdown", padaSentuhLuar);
    return () => {
      document.removeEventListener("keydown", padaTekan);
      document.removeEventListener("pointerdown", padaSentuhLuar);
    };
    // ubahTerbuka sengaja tidak jadi dependensi: isinya hanya setState +
    // callback prop, dan memasukkannya membuat listener dipasang ulang tiap
    // render tanpa manfaat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terbuka]);

  const kembaliUtama = () => setLaman("utama");

  // Isi popup per halaman. Gaya subtitle kembali ke halaman Subtitle (asalnya),
  // bukan ke utama, supaya penonton tidak kehilangan jejak.
  const isiLaman: Record<Laman, React.ReactNode> = {
    utama: (
      <>
        <BarisSubmenu
          ikon={<Captions className="size-4" />}
          label="Subtitle"
          nilai={labelNilai(subtitle.bahasa)}
          onBuka={() => setLaman("subtitle")}
        />
        <BarisSubmenu
          ikon={<Gauge className="size-4" />}
          label="Kecepatan pemutar"
          nilai={labelNilai(kecepatan)}
          onBuka={() => setLaman("kecepatan")}
        />

        <div className="my-1 h-px bg-white/10" />

        <BarisSakelar
          ikon={<AudioLines className="size-4" />}
          label="Volume Stabil"
          sakelar={volumeStabil}
        />
        <BarisSakelar
          ikon={<Volume2 className="size-4" />}
          label="Penguat suara"
          sakelar={penguatSuara}
        />
        <BarisSakelar
          ikon={<Sun className="size-4" />}
          label="Pencahayaan sinematik"
          sakelar={sinematik}
        />

        <div className="my-1 h-px bg-white/10" />

        <BarisSubmenu
          ikon={<MonitorPlay className="size-4" />}
          label="Kualitas video"
          nilai={labelNilai(kualitas)}
          onBuka={() => setLaman("kualitas")}
        />
      </>
    ),
    subtitle: (
      <>
        <KepalaLaman judul="Subtitle" onKembali={kembaliUtama} />
        <DaftarOpsi pilihan={subtitle.bahasa} />
        <Catatan teks={subtitle.alasanMati ?? subtitle.bahasa.catatan} />
        <div className="my-1 h-px bg-white/10" />
        <BarisSubmenu
          ikon={<Type className="size-4" />}
          label="Gaya subtitle"
          nilai={`${labelNilai(subtitle.ukuran)} · ${labelNilai(subtitle.latar)}`}
          onBuka={() => setLaman("gayaSubtitle")}
          alasanMati={subtitle.alasanMati && "terkunci — video ini tidak punya subtitle"}
        />
      </>
    ),
    gayaSubtitle: (
      <>
        <KepalaLaman judul="Gaya subtitle" onKembali={() => setLaman("subtitle")} />
        <SubJudul teks="Ukuran teks" />
        <DaftarOpsi pilihan={subtitle.ukuran} />
        <SubJudul teks="Latar teks" />
        <DaftarOpsi pilihan={subtitle.latar} />
      </>
    ),
    kecepatan: (
      <>
        <KepalaLaman judul="Kecepatan pemutar" onKembali={kembaliUtama} />
        <DaftarOpsi pilihan={kecepatan} />
      </>
    ),
    kualitas: (
      <>
        <KepalaLaman judul="Kualitas video" onKembali={kembaliUtama} />
        <DaftarOpsi pilihan={kualitas} />
        <Catatan teks={kualitas.catatan} />
      </>
    ),
  };

  return (
    <div ref={wadahRef} className="relative">
      <button
        type="button"
        onClick={() => ubahTerbuka(!terbuka)}
        aria-label="Menu pemutar"
        aria-haspopup="menu"
        aria-expanded={terbuka}
        className={cn(
          "flex size-9 items-center justify-center rounded-full transition-colors",
          terbuka ? "bg-white/25 text-white" : "text-white/90 hover:bg-white/15 hover:text-white",
        )}
      >
        <EllipsisVertical className="size-5" />
      </button>

      {terbuka && (
        <div
          role="menu"
          aria-label="Pengaturan pemutar"
          className="absolute bottom-full right-0 z-40 mb-2 w-72 max-w-[calc(100vw-2rem)] origin-bottom-right overflow-hidden rounded-2xl border border-white/10 bg-black/80 py-1 shadow-2xl ring-1 ring-black/40 backdrop-blur-md duration-150 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2"
        >
          {isiLaman[laman]}
        </div>
      )}
    </div>
  );
}

/** Label yang ditampilkan di kanan baris submenu, mis. "Normal" / "Auto". */
function labelNilai(pilihan: PilihanMenu): string {
  return pilihan.opsi.find((o) => o.nilai === pilihan.nilai)?.label ?? "-";
}

const KELAS_BARIS =
  "flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] text-white/90 transition-colors";

/** Teks kecil di bawah label yang menjelaskan kenapa sebuah baris dikunci. */
function Alasan({ teks }: { teks?: string }) {
  if (!teks) return null;
  return (
    <span className="mt-0.5 block whitespace-normal text-[11px] leading-tight text-white/40">
      {teks}
    </span>
  );
}

function BarisSakelar({
  ikon,
  label,
  sakelar,
}: {
  ikon: React.ReactNode;
  label: string;
  sakelar: SakelarMenu;
}) {
  const nonaktif = Boolean(sakelar.alasanMati);

  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={sakelar.aktif}
      disabled={nonaktif}
      onClick={() => sakelar.onUbah(!sakelar.aktif)}
      className={cn(KELAS_BARIS, nonaktif ? "opacity-40" : "hover:bg-white/10")}
    >
      <span className="shrink-0 text-white/70">{ikon}</span>
      <span className="flex-1 truncate">
        {label}
        <Alasan teks={sakelar.alasanMati} />
      </span>
      <Sakelar aktif={sakelar.aktif && !nonaktif} />
    </button>
  );
}

function BarisSubmenu({
  ikon,
  label,
  nilai,
  onBuka,
  alasanMati,
}: {
  ikon: React.ReactNode;
  label: string;
  nilai: string;
  onBuka: () => void;
  alasanMati?: string;
}) {
  const nonaktif = Boolean(alasanMati);

  return (
    <button
      type="button"
      role="menuitem"
      disabled={nonaktif}
      onClick={onBuka}
      className={cn(KELAS_BARIS, nonaktif ? "opacity-40" : "hover:bg-white/10")}
    >
      <span className="shrink-0 text-white/70">{ikon}</span>
      <span className="flex-1 truncate">
        {label}
        <Alasan teks={alasanMati} />
      </span>
      {/* Baris terkunci tidak menampilkan nilai: nilai yang tak bisa diubah
          cuma memakan tempat yang dibutuhkan teks alasannya. */}
      {!nonaktif && (
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-white/50">
          {nilai}
        </span>
      )}
      <ChevronRight className="size-4 shrink-0 text-white/40" />
    </button>
  );
}

function KepalaLaman({ judul, onKembali }: { judul: string; onKembali: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onKembali}
        className={cn(KELAS_BARIS, "font-medium hover:bg-white/10")}
      >
        <ChevronLeft className="size-4 shrink-0 text-white/60" />
        <span className="flex-1">{judul}</span>
      </button>
      <div className="my-1 h-px bg-white/10" />
    </>
  );
}

function SubJudul({ teks }: { teks: string }) {
  return (
    <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-white/40">
      {teks}
    </p>
  );
}

/** Daftar pilihan berbentuk radio; centang kuning = pilihan yang berlaku. */
function DaftarOpsi({ pilihan }: { pilihan: PilihanMenu }) {
  return (
    <>
      {pilihan.opsi.map((o) => (
        <button
          key={o.nilai}
          type="button"
          role="menuitemradio"
          aria-checked={o.nilai === pilihan.nilai}
          onClick={() => pilihan.onPilih(o.nilai)}
          className={cn(KELAS_BARIS, "hover:bg-white/10")}
        >
          <span className="size-4 shrink-0">
            {o.nilai === pilihan.nilai && <Check className="size-4 text-amber-400" />}
          </span>
          <span className="flex-1 truncate">{o.label}</span>
        </button>
      ))}
    </>
  );
}

function Catatan({ teks }: { teks?: string }) {
  if (!teks) return null;
  return <p className="px-3 pb-2 pt-1 text-[11px] leading-snug text-white/40">{teks}</p>;
}

/** Sakelar kecil ala iOS. Sengaja bukan Radix Switch: di dalam popup pemutar
 *  yang dibutuhkan cuma penanda hidup/mati, bukan kontrol form. */
function Sakelar({ aktif }: { aktif: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative h-4 w-7 shrink-0 rounded-full transition-colors",
        aktif ? "bg-amber-400" : "bg-white/25",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-3 rounded-full bg-white transition-all",
          aktif ? "left-3.5" : "left-0.5",
        )}
      />
    </span>
  );
}
