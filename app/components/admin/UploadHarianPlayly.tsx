"use client";

// Saringan "siapa upload hari ini, berapa banyak" untuk panel IMDb
// (owner 2026-11-21: "bisa kamu buat filternya agar ketahuan hari ini siapa
// saja yang upload dan berapa banyak film").
//
// BENTUKNYA DIUBAH setelah owner melihat versi pertama di localhost
// ("sudah ada, cuma kamu letakan sejejer dengan isi manual agar layar tidak
// penuh sekali lalu tambahkan juga filter nama yang upload jadi saya bisa tahu
// hari ini coklat upload berapa film"). Yang berubah dan kenapa:
//
//  1. Kotak tersendiri setinggi ±100px DIBUANG, diganti DUA dropdown yang
//     duduk di baris saringan yang sudah ada. Panel itu sudah memuat empat
//     kartu angka + dua panel massal + ringkasan kualitas sebelum daftarnya
//     mulai; satu kotak lagi mendorong tabel keluar layar.
//  2. Nama pengunggah jadi DROPDOWN berisi seluruh nama di katalog, bukan
//     deretan tombol berisi nama yang aktif hari itu. Sebabnya terlihat di
//     layar owner: hari itu nol upload, jadi deretan tombolnya kosong — dan
//     pertanyaannya ("coklat hari ini berapa") tidak bisa diajukan sama
//     sekali. Sekarang "coklat (0)" tetap ada untuk dipilih.
//
// Dipecah jadi DUA export karena keduanya harus duduk di tempat berbeda dalam
// susunan halaman: kontrolnya di DALAM baris saringan (sejajar "Isi manual"),
// keterangannya di BAWAH baris itu. Satu komponen tidak bisa merender ke dua
// tempat sekaligus; satu berkas menjaga keduanya tetap sepakat.
//
// Aturan hitungnya TIDAK di sini — semuanya di lib/upload-harian.ts yang murni
// dan diuji tests/upload-harian.test.ts. Angka yang salah di sini tidak
// memunculkan error apa pun, jadi aturannya harus di tempat yang bisa diuji.
import { CalendarDays, Users } from "lucide-react";
import type { PlaylyVideo } from "@/lib/playly";
import DropdownSaringan from "./DropdownSaringan";
import {
  FRASA_RENTANG,
  KUNCI_SEMUA_ORANG,
  LABEL_RENTANG,
  URUTAN_RENTANG,
  formatTanggalWIB,
  hitungRentangPerPengunggah,
  hitungTanpaTanggal,
  ringkasPengunggahSemua,
  saringPengunggah,
  saringRentangUpload,
  tanggalUploadTerakhir,
  type RentangUpload,
} from "@/lib/upload-harian";

/** Nilai <option> yang berarti "jangan saring nama siapa pun". */
const SEMUA_ORANG = "";

/**
 * DUA dropdown pendek: waktu, lalu nama.
 *
 * 🪤 SEMPAT digabung jadi satu dropdown berisi kombinasi waktu × nama
 * (owner 2026-11-21: "gabung jadi satu kolom agar hemat tempat"), lalu
 * DIKEMBALIKAN jadi dua pada hari yang sama. Alasannya terlihat begitu dicoba:
 * 5 nama × 4 rentang = 20 baris, dan owner melaporkan "ketika di klik terlalu
 * panjang" — daftarnya perlu digulung untuk mencapai nama terakhir, dan akan
 * makin parah tiap ada pengunggah baru. Dua dropdown pendek (4 dan 5 baris)
 * tidak pernah perlu digulung. Ruang yang hilang karenanya ditebus di tempat
 * lain: saringan IMDb di sebelahnya ikut jadi dropdown (±350px dihemat), yang
 * justru lebih dari cukup.
 *
 * Pelajarannya: "hemat tempat" dan "cepat dipakai" bisa berlawanan, dan yang
 * menentukan bukan hitungan piksel melainkan mencobanya di layar sungguhan.
 */
export function KontrolUploadPlayly({
  videos,
  hariIni,
  rentang,
  pengunggah,
  onPilih,
}: {
  /** SELURUH video di panel — termasuk yang berkasnya belum siap. */
  videos: PlaylyVideo[];
  /** Tanggal hari ini menurut WIB ("2026-11-21"); dihitung di pemanggil. */
  hariIni: string;
  rentang: RentangUpload;
  /** Kunci pengunggah terpilih (huruf kecil), atau null = semua orang. */
  pengunggah: string | null;
  /** Keduanya dikabarkan bersama supaya pemanggil punya satu jalur saja. */
  onPilih: (rentang: RentangUpload, pengunggah: string | null) => void;
}) {
  const angka = hitungRentangPerPengunggah(videos, hariIni);
  const kosong: Record<RentangUpload, number> = {
    "hari-ini": 0,
    kemarin: 0,
    "7-hari": 0,
    semua: 0,
  };
  const angkaSemua = angka.get(KUNCI_SEMUA_ORANG) ?? kosong;
  // Nama diambil dari SELURUH katalog supaya yang hari ini menganggur tetap
  // bisa dipilih — lihat alasannya di ringkasPengunggahSemua.
  const daftarOrang = ringkasPengunggahSemua(
    videos,
    saringRentangUpload(videos, rentang, hariIni),
  );

  return (
    <>
      <DropdownSaringan
        label="Saring menurut waktu upload"
        ikon={CalendarDays}
        nilai={rentang}
        onNilai={(v) => onPilih(v as RentangUpload, pengunggah)}
        aktif={rentang !== "semua"}
      >
        {/* Label + angka dalam SATU teks: dropdown yang tertutup cuma
            memperlihatkan baris terpilih, jadi angkanya harus menempel di
            labelnya — kalau dipisah, admin harus membuka dulu untuk tahu
            ada berapa. */}
        {URUTAN_RENTANG.map((r) => (
          <option key={r} value={r}>
            {LABEL_RENTANG[r]} ({angkaSemua[r]})
          </option>
        ))}
      </DropdownSaringan>

      <DropdownSaringan
        label="Saring menurut nama pengunggah"
        ikon={Users}
        nilai={pengunggah ?? SEMUA_ORANG}
        onNilai={(v) => onPilih(rentang, v || null)}
        aktif={pengunggah !== null}
      >
        <option value={SEMUA_ORANG}>Semua orang ({angkaSemua[rentang]})</option>
        {daftarOrang.map((orang) => (
          <option key={orang.kunci} value={orang.kunci}>
            {orang.nama} ({orang.jumlah})
          </option>
        ))}
      </DropdownSaringan>
    </>
  );
}

/**
 * Satu baris keterangan di bawah baris saringan.
 *
 * Hanya muncul saat ada yang disaring — baris yang selalu ada tapi sering
 * tidak mengatakan apa-apa cuma memakan tempat yang justru sedang dihemat.
 */
export function RingkasUploadPlayly({
  videos,
  hariIni,
  rentang,
  pengunggah,
  belumSiap,
}: {
  videos: PlaylyVideo[];
  hariIni: string;
  rentang: RentangUpload;
  pengunggah: string | null;
  /**
   * id video yang berkasnya belum sampai di Playly. Owner 2026-11-21 memilih
   * video begini TETAP dihitung ("jumlahnya jujur apa adanya"), dengan catatan
   * kecil supaya tetap ketahuan ada yang perlu diulang. Set-nya bisa kosong
   * selagi pemeriksaan berjalan — itu normal, bukan "semuanya aman".
   */
  belumSiap: Set<string>;
}) {
  if (rentang === "semua" && !pengunggah) return null;

  const dalamRentang = saringRentangUpload(videos, rentang, hariIni);
  const terpilih = saringPengunggah(dalamRentang, pengunggah);
  const daftarOrang = ringkasPengunggahSemua(videos, dalamRentang).filter(
    (o) => o.jumlah > 0,
  );
  const putus = terpilih.filter((v) => belumSiap.has(v.id)).length;
  const tanpaTanggal = hitungTanpaTanggal(videos);
  const namaTerpilih = pengunggah
    ? (ringkasPengunggahSemua(videos, videos).find((o) => o.kunci === pengunggah)?.nama ??
      pengunggah)
    : null;
  // Tanggal terakhir dihitung dari SELURUH katalog milik orang itu, bukan dari
  // rentangnya: di dalam rentang yang hasilnya nol, menurut definisi tidak ada
  // tanggal apa pun untuk dilaporkan.
  const terakhir = tanggalUploadTerakhir(saringPengunggah(videos, pengunggah));
  // Bentuk PANJANG di kalimat — label dropdown sudah dipendekkan demi muat
  // satu baris, dan "belum ada upload di 7 hari" terbaca seperti terpotong.
  const labelRentang = FRASA_RENTANG[rentang];

  return (
    <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
      {terpilih.length > 0 ? (
        <>
          <strong className="text-zinc-400">
            {namaTerpilih ? `${namaTerpilih}: ` : ""}
            {terpilih.length} film
          </strong>{" "}
          di {labelRentang}
          {/* Rincian per orang hanya saat BELUM disaring ke satu nama —
              kalau sudah, angkanya sudah disebut di depan dan mengulangnya
              cuma menambah teks. */}
          {!pengunggah && daftarOrang.length > 0 && (
            <>
              {" — "}
              {daftarOrang.map((o, i) => (
                <span key={o.kunci}>
                  {i > 0 && " · "}
                  {o.nama} <strong className="text-zinc-400">{o.jumlah}</strong>
                </span>
              ))}
            </>
          )}
          .
          {putus > 0 && (
            <>
              {" "}
              <strong className="text-rose-500">{putus}</strong> di antaranya belum
              siap — file videonya tidak sampai di Playly, perlu di-upload ulang di
              sana.
            </>
          )}
        </>
      ) : (
        // Nol itu keadaan SAH (hari libur), bukan kerusakan — tapi angka nol
        // sendirian tidak bisa membedakan keduanya. Menyebut tanggal terakhir
        // membuat bedanya kelihatan tanpa owner memeriksa apa pun.
        <>
          <strong className="text-zinc-400">
            {namaTerpilih ? `${namaTerpilih}: ` : ""}belum ada upload
          </strong>{" "}
          di {labelRentang}.
          {terakhir && (
            <>
              {" "}
              Terakhir{namaTerpilih ? "" : " ada upload"}:{" "}
              <strong className="text-zinc-400">{formatTanggalWIB(terakhir)}</strong>.
            </>
          )}
        </>
      )}
      {tanpaTanggal > 0 && (
        <>
          {" "}
          ({tanpaTanggal} video tidak punya tanggal upload dari Playly, hanya muncul
          di <em>{LABEL_RENTANG.semua}</em>.)
        </>
      )}
    </p>
  );
}
