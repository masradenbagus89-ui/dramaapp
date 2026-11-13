"use client";

// -------------------------------------------------------------------------
// KOLOM CARI KATEGORI — pengganti dropdown <select> di panel admin.
//
// KENAPA ADA (owner 2026-11-13): "katagori kamu rubah menjadi kolom search
// ketika di klik keluar genre nya". Pemicunya langsung: kategori naik dari 7
// jadi 30, dan <select> berisi 30 baris memaksa owner menggulung mencari satu
// nama. Mengetik 3 huruf jauh lebih cepat daripada memindai 30 baris.
//
// Pencariannya memanggil `diawaliKetikan` dari lib/pencarian.ts — PREFIX dari
// huruf pertama nama.
//
// ⚠️ Sempat memakai `cocokSemuaKata` (aturan kotak cari penonton) demi
// konsistensi, dan itu KELIRU — owner langsung menemukannya: aturan judul film
// mengizinkan tiap KATA jadi titik awal, jadi mengetik "s" ikut memunculkan
// "Talk-Show" dan "Game-Show". Benar untuk judul film yang panjang dan
// diingat sepotong-sepotong; salah untuk nama genre yang pendek dan diketik
// dari huruf pertamanya. Keduanya tetap tinggal di lib/pencarian.ts sebagai
// dua fungsi bersebelahan, dengan alasan pemisahannya ditulis di sana.
//
// Bisa dicari dalam DUA bahasa: nama tersimpan (Inggris, "Horror") maupun
// label yang dibaca manusia (Indonesia, "Horor"). Owner mengetik dalam bahasa
// yang terlintas duluan; memaksanya menebak bahasa mana yang "benar" adalah
// hambatan yang tidak perlu ada.
// -------------------------------------------------------------------------
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { KATEGORI_ISI } from "@/lib/types";
import { labelGenre } from "@/lib/genre";
import { diawaliKetikan } from "@/lib/pencarian";
import { cn } from "@/lib/utils";

/** Teks untuk pilihan "kosongkan kategori". Satu tempat — dipakai tombol & daftar. */
export const TEKS_TANPA_KATEGORI = "Tanpa kategori";

type Props = {
  /** Nama kategori tersimpan (Inggris). String kosong = belum berkategori. */
  nilai: string;
  onPilih: (nilai: string) => void;
  /** Dibacakan pembaca layar, mis. "Kategori untuk Morbius (2022)". */
  label: string;
  /** Kelas kotak dari pemanggil, supaya penanda "belum disimpan" tetap jalan. */
  className?: string;
  disabled?: boolean;
  /**
   * Teks baris pertama (nilainya selalu string kosong).
   *
   * Ada karena string kosong punya DUA arti berbeda di panel ini, dan
   * keduanya benar: di kotak per-baris ia berarti "video ini tanpa kategori",
   * sedangkan di kotak borongan ia berarti "kolom ini jangan diubah"
   * (`LEWATI` di PlaylyIsiCepat.tsx). Memakai satu teks untuk keduanya akan
   * membuat tombol borongan berbohong tentang apa yang akan terjadi.
   */
  teksKosong?: string;
};

export default function PilihKategori({
  nilai,
  onPilih,
  label,
  className,
  disabled,
  teksKosong = TEKS_TANPA_KATEGORI,
}: Props) {
  const [buka, setBuka] = useState(false);
  const [ketikan, setKetikan] = useState("");
  const [sorot, setSorot] = useState(0);

  const pembungkus = useRef<HTMLDivElement>(null);
  const kotakKetik = useRef<HTMLInputElement>(null);
  const idListbox = useId();

  // Baris "Tanpa kategori" ikut jadi pilihan SUNGGUHAN di daftar, bukan tombol
  // terpisah: mengosongkan kategori adalah aksi yang sah dan sering dipakai,
  // jadi ia pantas bisa dipilih dengan panah + Enter seperti yang lain.
  const semuaOpsi = useMemo(
    () => [
      { nilai: "", utama: teksKosong, dampingan: "" },
      ...KATEGORI_ISI.map((k) => ({
        nilai: k,
        utama: k,
        // Label Indonesia disembunyikan kalau sama persis dengan namanya
        // ("Drama", "Anime") — mengulang kata yang sama cuma jadi derau.
        dampingan: labelGenre(k) === k ? "" : labelGenre(k),
      })),
    ],
    [teksKosong],
  );

  const hasil = useMemo(
    () =>
      // Dicocokkan HANYA dengan `o.utama` — nama yang benar-benar TAMPIL
      // besar di baris itu. Label Indonesia (`o.dampingan`) sengaja TIDAK
      // ikut dicari.
      //
      // 🪤 Sempat ikut dicari, dan owner langsung menemukannya (2026-11-13):
      // mengetik "ro" memunculkan "Historical Romance", karena labelnya
      // "Romansa Sejarah" memang diawali "ro". Benar menurut aturan, tapi di
      // layar yang terbaca "Historical Romance" — diawali "Hi". Daftar yang
      // barisnya tidak terlihat nyambung dengan ketikan terbaca seperti
      // pencarian rusak, walau logikanya bisa dijelaskan.
      //
      // Aturannya sekarang sesederhana yang terlihat: APA YANG TAMPIL harus
      // diawali APA YANG DIKETIK. Harganya, dan owner sudah diberi tahu:
      // mengetik "silat" tak lagi menemukan "Martial Arts" — yang menemukan
      // cuma "mar". Label Indonesia tetap digambar sebagai keterangan.
      semuaOpsi.filter((o) => diawaliKetikan(ketikan, o.utama)),
    [ketikan, semuaOpsi],
  );

  // Sorot dijaga tetap di dalam daftar: tanpa ini, menyaring daftar jadi lebih
  // pendek meninggalkan sorot di indeks yang sudah tidak ada, dan Enter
  // memilih `undefined` — gagal diam-diam, tanpa error.
  useEffect(() => setSorot(0), [ketikan]);

  // Tutup saat klik di luar. `pointerdown`, bukan `click`: kalau menunggu
  // `click`, kotak ini masih terbuka saat kotak baris LAIN dibuka, dan dua
  // panel sempat tergambar bertumpuk.
  useEffect(() => {
    if (!buka) return;
    const diLuar = (e: PointerEvent) => {
      if (!pembungkus.current?.contains(e.target as Node)) tutup();
    };
    document.addEventListener("pointerdown", diLuar);
    return () => document.removeEventListener("pointerdown", diLuar);
  }, [buka]);

  const tutup = () => {
    setBuka(false);
    setKetikan("");
    setSorot(0);
  };

  const bukaPanel = () => {
    if (disabled) return;
    setBuka(true);
    setKetikan("");
    setSorot(0);
    // Fokus dipindah ke kotak ketik di frame berikutnya — saat ini dipanggil,
    // panelnya belum tergambar sehingga ref-nya masih null.
    requestAnimationFrame(() => kotakKetik.current?.focus());
  };

  const pilih = (v: string) => {
    onPilih(v);
    tutup();
  };

  const onTombol = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      tutup();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); // cegah halaman ikut tergulung
      setSorot((s) => {
        if (hasil.length === 0) return 0;
        const arah = e.key === "ArrowDown" ? 1 : -1;
        return (s + arah + hasil.length) % hasil.length;
      });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault(); // jangan kirim form induknya
      const terpilih = hasil[sorot];
      if (terpilih) pilih(terpilih.nilai);
    }
  };

  const tampil = nilai || teksKosong;

  return (
    <div ref={pembungkus} className="relative min-w-0">
      <button
        type="button"
        role="combobox"
        aria-expanded={buka}
        aria-controls={buka ? idListbox : undefined}
        aria-haspopup="listbox"
        aria-label={label}
        disabled={disabled}
        onClick={() => (buka ? tutup() : bukaPanel())}
        className={cn(
          className,
          "flex items-center justify-between gap-1 text-left",
        )}
      >
        <span className={cn("truncate", !nilai && "text-zinc-500")}>
          {tampil}
        </span>
        <ChevronDown className="size-3 shrink-0 text-zinc-500" />
      </button>

      {buka && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-56 max-w-[70vw] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl shadow-black/50"
          // Panel sengaja lebih lebar (224px) daripada kolomnya (104px):
          // nama seperti "Documentary" tak muat di lebar kolom, dan daftar
          // yang isinya terpotong semua tidak bisa dipakai memilih.
        >
          <div className="flex items-center gap-1.5 border-b border-zinc-800 px-2 py-1.5">
            <Search className="size-3.5 shrink-0 text-zinc-500" />
            <input
              ref={kotakKetik}
              value={ketikan}
              onChange={(e) => setKetikan(e.target.value)}
              onKeyDown={onTombol}
              placeholder="Ketik genre…"
              aria-label={`Cari genre — ${label}`}
              aria-autocomplete="list"
              aria-controls={idListbox}
              className="min-w-0 flex-1 bg-transparent text-xs text-zinc-100 outline-none placeholder:text-zinc-600"
            />
            {ketikan && (
              <button
                type="button"
                onClick={() => {
                  setKetikan("");
                  kotakKetik.current?.focus();
                }}
                aria-label="Hapus ketikan"
                className="shrink-0 text-zinc-500 hover:text-zinc-200"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <ul
            id={idListbox}
            role="listbox"
            aria-label={label}
            className="max-h-56 overflow-y-auto py-1"
          >
            {hasil.length === 0 && (
              // Daftar kosong WAJIB bersuara. Panel yang tiba-tiba kosong
              // terbaca seperti komponennya rusak, bukan seperti "tidak ada
              // yang cocok" — dan owner lalu mengira kategorinya hilang.
              <li className="px-3 py-2 text-xs text-zinc-500">
                Tidak ada genre yang diawali “{ketikan}”.
              </li>
            )}
            {hasil.map((o, i) => {
              const terpilih = o.nilai === nilai;
              return (
                <li key={o.nilai || "__kosong__"}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={terpilih}
                    onMouseEnter={() => setSorot(i)}
                    onClick={() => pilih(o.nilai)}
                    className={cn(
                      "flex w-full items-baseline gap-1.5 px-3 py-1.5 text-left text-xs transition",
                      i === sorot ? "bg-zinc-800" : "bg-transparent",
                      terpilih ? "text-amber-300" : "text-zinc-200",
                      !o.nilai && "italic text-zinc-500",
                    )}
                  >
                    <span className="truncate">{o.utama}</span>
                    {o.dampingan && (
                      <span className="truncate text-[10px] text-zinc-500">
                        {o.dampingan}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
