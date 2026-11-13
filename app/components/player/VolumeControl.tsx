"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

// Tombol volume pemutar drama — duduk SEBARIS dengan angka durasi di panel
// bawah. Diketuk, ia membuka GARIS GESER TEGAK berbentuk kapsul tepat di
// atasnya: jalur tipis + bagian terisi berwarna amber + bulatan penggeser.
//
// 🪤 TIGA PUTARAN PERMINTAAN OWNER — dua jebakan yang SUDAH terbukti, jangan
// dibuka lagi:
//
// 1) 2026-11-12 — versi pertama memakai `<input type="range">` yang DIPUTAR
//    `-rotate-90` supaya berdiri. Rusak SENYAP di HP: diukur di Chrome
//    headless pada layar 393px (iPhone 14 Pro), garisnya berdiri di x=391
//    selebar 16px — praktis SELURUHNYA di luar layar. Sebabnya `transform`
//    TIDAK mengubah ruang yang DIPESAN elemen: kotak asli input selebar 96px
//    meluber ~48px dari wadahnya yang 24px, LALU diputar, sehingga pusat hasil
//    putarannya ikut terlempar sejauh itu.
//    → ATURAN TETAP: nol elemen diputar di panel ini. Yang tegak di sini tegak
//      karena memang DIGAMBAR tegak (tinggi > lebar), bukan karena diputar.
//      Dijaga tes `tests/pemutar-eps-volume.test.ts`.
//
// 2) 2026-11-13 pagi — penggantinya dua tombol + / − dengan angka persen. Itu
//    memang utuh di dalam layar, tapi owner menolak bentuknya ("volume berdiri
//    jangan seperti itu") dan mengirim contoh yang diinginkan: kapsul hitam
//    ramping berisi garis geser + bulatan. Bentuk itulah yang dibangun di sini,
//    TANPA mengembalikan rotasi — kapsulnya 36px dan dirapatkan ke tepi kanan
//    tombolnya, jadi mustahil menggantung keluar layar HP.
//
// 🪤 `touch-none` pada jalur geser WAJIB. Feed drama berpindah episode lewat
// gulir-sentuh asli browser (`snap-y snap-mandatory overflow-y-scroll`,
// FeedPlayer.tsx:645). Tanpa `touch-action: none`, jari yang menggeser volume
// ke atas malah melompatkan penonton ke episode berikutnya — nol error.
//
// Catatan lama yang masih berlaku: Safari iPhone mengabaikan `video.volume`
// (hanya tombol fisik HP yang mengubah kerasnya), jadi di sana yang efektif
// cuma bisu/tidak — digeser sampai 0 = bisu.

/** Satu tekan panah papan ketik = 10%. Sentuhan & tetikus TIDAK memakai angka
 *  ini — keduanya mendarat persis di titik yang disentuh. */
const LANGKAH_PANAH = 0.1;

/** Lebar "zona jepit" di kedua ujung jalur: 4% teratas dibulatkan jadi penuh,
 *  4% terbawah jadi bisu. Lihat alasannya di `dariSentuhan`. */
const ZONA_JEPIT = 0.04;

export default function VolumeControl({
  volume,
  muted,
  hidden,
  onChange,
}: {
  volume: number;
  muted: boolean;
  /** Kontrol sedang memudar → tutup panelnya supaya tidak tertinggal terbuka. */
  hidden: boolean;
  onChange: (next: { volume: number; muted: boolean }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menggeser, setMenggeser] = useState(false);
  const jalurRef = useRef<HTMLDivElement>(null);
  const silent = muted || volume === 0;
  const nilai = silent ? 0 : volume;
  const persen = Math.round(nilai * 100);

  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

  /** Pasang volume ke `baru`, dijepit di 0..1.
   *  Pembulatan 2 desimal mencegah 0.30000000000000004 bocor ke layar. */
  const setKe = (baru: number) => {
    const dijepit = Math.min(1, Math.max(0, Math.round(baru * 100) / 100));
    // `muted` ikut dinyalakan/dimatikan mengikuti angkanya. Kalau tidak, bulatan
    // bergerak naik di layar tapi suaranya tetap diam, dan tak ada yang memberi
    // tahu kenapa.
    onChange({ volume: dijepit, muted: dijepit === 0 });
  };

  /** Ubah posisi jari/kursor jadi volume. ATAS = keras, bawah = bisu —
   *  koordinat layar tumbuh ke bawah, jadi rasionya dibalik. */
  const dariSentuhan = (clientY: number) => {
    const kotak = jalurRef.current?.getBoundingClientRect();
    // Tinggi 0 = belum tergambar (atau jsdom, yang tidak menghitung tata letak
    // sama sekali). Membaginya akan menghasilkan Infinity lalu volume melompat
    // ke salah satu ujung tanpa ada yang menyentuhnya.
    if (!kotak || kotak.height === 0) return;
    const rasio = 1 - (clientY - kotak.top) / kotak.height;
    // Zona jepit di dua ujung. Diukur di Chrome headless (layar 393px): jari
    // yang mentok di tepi kapsul mendarat ~2px dari ujung jalur, jadi hasilnya
    // 98% / 2% — bukan penuh, dan yang lebih membingungkan BUKAN bisu (ikon
    // speaker tetap menyala padahal suaranya praktis diam). Mengejar piksel
    // terakhir dengan jempol itu mustahil, jadi ujungnya dibulatkan.
    setKe(rasio <= ZONA_JEPIT ? 0 : rasio >= 1 - ZONA_JEPIT ? 1 : rasio);
  };

  const turun = (e: React.PointerEvent<HTMLDivElement>) => {
    setMenggeser(true);
    // Pointer capture = jari boleh keluar dari kapsul yang ramping ini tanpa
    // geserannya putus di tengah jalan.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dariSentuhan(e.clientY);
  };

  const gerak = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!menggeser) return;
    dariSentuhan(e.clientY);
  };

  const lepas = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!menggeser) return;
    setMenggeser(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  /** Panah atas/bawah untuk yang memakai papan ketik (TV box, laptop tanpa
   *  sentuh). `preventDefault` menahan halaman ikut tergulir saat ditekan. */
  const papanKetik = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const aksi: Record<string, number> = {
      ArrowUp: nilai + LANGKAH_PANAH,
      ArrowRight: nilai + LANGKAH_PANAH,
      ArrowDown: nilai - LANGKAH_PANAH,
      ArrowLeft: nilai - LANGKAH_PANAH,
      Home: 0,
      End: 1,
    };
    if (!(e.key in aksi)) return;
    e.preventDefault();
    setKe(aksi[e.key]);
  };

  return (
    <div className="relative shrink-0">
      {/* 🪤 `pointer-events-auto` WAJIB. Panel bawah pemutar memasang
          `pointer-events-none` permanen di pembungkus terluarnya supaya ketukan
          di area kosong tetap tembus ke video; anak yang tidak menyalakannya
          sendiri jadi tombol yang terlihat normal tapi TIDAK BISA DIKLIK —
          nol error, dan satu-satunya gejalanya "kok tidak ngapa-ngapain". */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Volume"
        /* 36px, bukan 44px: ia duduk sebaris dengan garis geser posisi video
           yang tingginya 24px, dan memaksakan 44px di sini menebalkan seluruh
           baris bawah. */
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] transition-transform hover:bg-white/10 active:scale-95"
      >
        {silent ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>

      {open && (
        <div
          /* `bottom-full` = berdiri tepat DI ATAS ikonnya; `right-0` (BUKAN
             `left-1/2 -translate-x-1/2`) karena tombol ini elemen paling kanan
             di barisnya — merapatkan kapsul ke tepi kanan tombol membuatnya
             mustahil meluber keluar layar di HP. Lebar total kapsul 36px
             (4px padding × 2 + 28px jalur sentuh). */
          /* 🪤 LATAR PEKAT (bukan /85) + blur. Kapsul ini berdiri tepat di jalur
             rail ikon kanan — tak terhindarkan, keduanya menempel di sisi yang
             sama. Dengan latar tembus, tulisan "Simpan"/"Bagikan" di belakang
             menembus ke tengah garis volume, dan hasilnya terbaca seperti
             tampilan rusak. Terlihat di potret layar 393px, TIDAK terlihat dari
             angka pengukuran mana pun. */
          className="pointer-events-auto absolute bottom-full right-0 z-10 mb-1 flex justify-center rounded-full bg-black/95 px-1 py-3 ring-1 ring-white/15 backdrop-blur-sm"
        >
          <div
            ref={jalurRef}
            role="slider"
            tabIndex={0}
            aria-label="Atur volume"
            aria-orientation="vertical"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={persen}
            /* Pembaca layar mengucapkan ini, bukan angkanya — "0%" dan "Bisu"
               terdengar sama saja padahal hanya salah satunya menjelaskan. */
            aria-valuetext={silent ? "Bisu" : `${persen}%`}
            onPointerDown={turun}
            onPointerMove={gerak}
            onPointerUp={lepas}
            onPointerCancel={lepas}
            onKeyDown={papanKetik}
            /* 28px lebar: jalur gesernya sendiri cuma 6px, sisanya ruang
               TOLERANSI jempol. Jangan dikecilkan — jari yang meleset 5px dari
               garis tipis terasa seperti kontrol yang rusak. */
            className="flex h-24 w-7 cursor-pointer touch-none select-none justify-center outline-none"
          >
            <div className="relative h-full w-1.5 rounded-full bg-white/25">
              {/* Bagian terisi tumbuh dari BAWAH — arah yang sama dengan
                  bulatannya, supaya keduanya tidak pernah terbaca berlawanan. */}
              <div
                className="absolute inset-x-0 bottom-0 rounded-full bg-amber-400"
                style={{ height: `${persen}%` }}
              />
              <div
                className="absolute left-1/2 size-3.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-amber-400 shadow"
                style={{ bottom: `${persen}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
