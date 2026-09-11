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
  PictureInPicture2,
  Sun,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Satu pilihan di dalam submenu (Terjemahan / Kecepatan / Kualitas). */
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

export type PlayerMenuProps = {
  pip: { didukung: boolean; aktif: boolean; onToggle: () => void };
  volumeStabil: SakelarMenu;
  penguatSuara: SakelarMenu;
  sinematik: SakelarMenu;
  terjemahan: PilihanMenu;
  kecepatan: PilihanMenu;
  kualitas: PilihanMenu;
  /**
   * Dipanggil tiap menu dibuka/ditutup. Pemutar memakainya untuk menahan baris
   * kontrol supaya tidak ikut menghilang otomatis sementara menu terbuka.
   */
  onTerbukaChange?: (terbuka: boolean) => void;
};

/** Halaman yang sedang ditampilkan di dalam popup. */
type Laman = "utama" | "terjemahan" | "kecepatan" | "kualitas";

const JUDUL_LAMAN: Record<Exclude<Laman, "utama">, string> = {
  terjemahan: "Terjemahan",
  kecepatan: "Kecepatan",
  kualitas: "Kualitas",
};

export default function PlayerMenu({
  pip,
  volumeStabil,
  penguatSuara,
  sinematik,
  terjemahan,
  kecepatan,
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

  const submenu = laman === "utama" ? null : { terjemahan, kecepatan, kualitas }[laman];

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
          className="absolute bottom-full right-0 z-40 mb-2 w-60 origin-bottom-right overflow-hidden rounded-2xl border border-white/10 bg-black/80 py-1 shadow-2xl ring-1 ring-black/40 backdrop-blur-md duration-150 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2"
        >
          {submenu ? (
            <HalamanPilihan
              judul={JUDUL_LAMAN[laman as Exclude<Laman, "utama">]}
              pilihan={submenu}
              onKembali={() => setLaman("utama")}
            />
          ) : (
            <>
              <BarisAksi
                ikon={<PictureInPicture2 className="size-4" />}
                // Label ikut keadaan: penonton bisa menutup jendela PiP lewat
                // tombol browser, jadi menu harus menunjukkan keadaan saat ini,
                // bukan mengajak masuk PiP yang sudah menyala.
                label={pip.aktif ? "Keluar dari PiP" : "PiP / Picture in Picture"}
                nonaktif={!pip.didukung}
                keterangan={pip.didukung ? undefined : "tidak didukung browser ini"}
                onClick={() => {
                  pip.onToggle();
                  ubahTerbuka(false);
                }}
              />
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
                ikon={<Captions className="size-4" />}
                label="Terjemahan"
                pilihan={terjemahan}
                onBuka={() => setLaman("terjemahan")}
              />
              <BarisSubmenu
                ikon={<Gauge className="size-4" />}
                label="Kecepatan"
                pilihan={kecepatan}
                onBuka={() => setLaman("kecepatan")}
              />
              <BarisSubmenu
                ikon={<MonitorPlay className="size-4" />}
                label="Kualitas"
                pilihan={kualitas}
                onBuka={() => setLaman("kualitas")}
              />
            </>
          )}
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

function BarisAksi({
  ikon,
  label,
  keterangan,
  nonaktif,
  onClick,
}: {
  ikon: React.ReactNode;
  label: string;
  keterangan?: string;
  nonaktif?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={nonaktif}
      onClick={onClick}
      className={cn(KELAS_BARIS, nonaktif ? "opacity-40" : "hover:bg-white/10")}
    >
      <span className="shrink-0 text-white/70">{ikon}</span>
      <span className="flex-1 truncate">
        {label}
        {keterangan && (
          <span className="mt-0.5 block text-[11px] leading-tight text-white/40">
            {keterangan}
          </span>
        )}
      </span>
      {!nonaktif && <ChevronRight className="size-4 shrink-0 text-white/40" />}
    </button>
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
        {sakelar.alasanMati && (
          <span className="mt-0.5 block whitespace-normal text-[11px] leading-tight text-white/40">
            {sakelar.alasanMati}
          </span>
        )}
      </span>
      <Sakelar aktif={sakelar.aktif && !nonaktif} />
    </button>
  );
}

function BarisSubmenu({
  ikon,
  label,
  pilihan,
  onBuka,
}: {
  ikon: React.ReactNode;
  label: string;
  pilihan: PilihanMenu;
  onBuka: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onBuka}
      className={cn(KELAS_BARIS, "hover:bg-white/10")}
    >
      <span className="shrink-0 text-white/70">{ikon}</span>
      <span className="flex-1 truncate">{label}</span>
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-white/50">
        {labelNilai(pilihan)}
      </span>
      <ChevronRight className="size-4 shrink-0 text-white/40" />
    </button>
  );
}

function HalamanPilihan({
  judul,
  pilihan,
  onKembali,
}: {
  judul: string;
  pilihan: PilihanMenu;
  onKembali: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onKembali}
        className={cn(KELAS_BARIS, "font-medium hover:bg-white/10")}
      >
        <ChevronLeft className="size-4 shrink-0 text-white/60" />
        <span className="flex-1">{judul}</span>
      </button>

      <div className="my-1 h-px bg-white/10" />

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

      {pilihan.catatan && (
        <p className="px-3 pb-2 pt-1 text-[11px] leading-snug text-white/40">
          {pilihan.catatan}
        </p>
      )}
    </div>
  );
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
