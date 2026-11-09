"use client";

// Ringkasan: berapa video yang kualitas & rating-nya sudah terisi, dari mana
// asalnya, dan berapa yang masih buntu.
//
// KENAPA ADA (owner 2026-11-09): "sekarang buat juga kualitas dan rating agar
// bisa otomatis seperti kategori". Setelah diukur, KEDUANYA memang sudah
// otomatis dan hasilnya sudah tampil ke penonton. Yang tidak ada adalah cara
// MELIHATnya — dropdown kualitas cuma menulis "Otomatis" tanpa menyebut
// otomatisnya jadi apa, jadi satu-satunya cara tahu adalah membuka video satu
// per satu. Persis yang owner minta dihindari.
//
// 📐 BENTUKNYA DUA BARIS, bukan dua kotak (owner 2026-11-09: "rapikan agar
// tulisannya tidak memenuhi layar atau bikin dropdown"). Versi pertama memakai
// dua kartu bertumpuk berisi daftar + paragraf penjelasan, dan itu mendorong
// tabel video jauh ke bawah layar SETIAP kali halaman dibuka — padahal
// penjelasannya cuma perlu dibaca sekali. Angkanya tetap terlihat langsung;
// yang disembunyikan hanya kalimatnya, di balik tombol "?" (BantuanSingkat) —
// pola yang sama yang owner minta 2026-11-06 untuk keluhan yang sama persis.
//
// Panel ini sengaja TIDAK punya tombol aksi. Tidak ada yang bisa dikerjakan
// mesin di sini: kualitas yang kosong memang kehabisan sumber (video itu belum
// punya link unduhan), dan rating yang kosong ditolong tombol "Cocokkan semua"
// yang sudah ada di atas. Menambah tombol yang cuma mengulang keduanya akan
// menyesatkan — seolah ada jalan pintas yang belum ditempuh.
import { Gauge, Star } from "lucide-react";
import BantuanSingkat from "./BantuanSingkat";
import type { RingkasanIsian } from "@/lib/ringkasan-isian-video";

/**
 * Satu angka + keterangan pendeknya, dirangkai sebaris.
 *
 * Angkanya tebal & berwarna, keterangannya kecil: yang dicari mata saat panel
 * dibuka adalah ANGKA-nya. `tabular-nums` menjaga lebar digit tetap sama
 * supaya deretan angka tidak bergoyang saat salah satunya berubah.
 */
function Angka({
  nilai,
  label,
  nada = "netral",
}: {
  nilai: number;
  label: string;
  nada?: "baik" | "netral" | "perlu";
}) {
  const warna =
    nada === "baik"
      ? "text-emerald-600"
      : nada === "perlu"
        ? "text-amber-600"
        : "text-zinc-400";
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1">
      <span className={`text-sm font-bold tabular-nums ${warna}`}>{nilai}</span>
      <span className="text-[11px] text-zinc-500">{label}</span>
    </span>
  );
}

/** Pemisah titik antar angka — dekoratif, disembunyikan dari pembaca layar. */
function Titik() {
  return (
    <span aria-hidden="true" className="text-zinc-700">
      ·
    </span>
  );
}

export default function RingkasanIsianVideo({
  ringkasan,
}: {
  ringkasan: RingkasanIsian;
}) {
  const { kualitas, rating, ratingBisaDitolongImdb, total } = ringkasan;
  // Rating kosong yang TIDAK bisa ditolong pencocokan — film yang memang belum
  // punya nilai di IMDb. Dipisah supaya admin tidak mengklik "Cocokkan semua"
  // berulang kali untuk video yang hasilnya tak akan pernah berubah.
  const ratingBuntu = rating.kosong - ratingBisaDitolongImdb;

  if (total === 0) return null;

  return (
    <section className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <BantuanSingkat
        label="Apa arti angka kualitas & rating?"
        judul={
          // `flex-1` + `flex-wrap`: di layar sempit angkanya turun baris
          // sendiri, bukan memaksa tombol "?" keluar dari kotak.
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <Gauge className="size-3.5 text-emerald-400" aria-hidden="true" />
                Kualitas
              </span>
              <Angka nilai={kualitas.turunan} label="otomatis" nada="baik" />
              <Titik />
              <Angka nilai={kualitas.manual} label="kamu pilih" />
              <Titik />
              <Angka nilai={kualitas.kosong} label="belum ada sumber" nada="perlu" />
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <Star className="size-3.5 text-amber-400" aria-hidden="true" />
                Rating
              </span>
              <Angka nilai={rating.imdb} label="dari IMDb" nada="baik" />
              <Titik />
              <Angka nilai={rating.manual} label="kamu ketik" />
              <Titik />
              <Angka
                nilai={ratingBisaDitolongImdb}
                label="bisa dicocokkan"
                nada="perlu"
              />
              <Titik />
              <Angka nilai={ratingBuntu} label="buntu" />
            </div>
          </div>
        }
      >
        <p>
          <strong className="text-zinc-200">Kualitas</strong> diturunkan sendiri
          dari link unduhan: ada berkas 1080p → <strong>HD</strong>, hanya 480p →{" "}
          <strong>SD</strong>. Yang kamu pilih sendiri tidak pernah ditimpa.
        </p>
        <p>
          <strong className="text-amber-200">{kualitas.kosong} belum ada sumber</strong>{" "}
          berarti video itu belum punya link unduhan — dan tidak ada data lain
          yang bisa menebaknya, karena Playly cuma mengirim judul, durasi,
          kreator, dan sampul. Isi <strong>Link download</strong>-nya, kualitasnya
          ikut terisi sendiri.
        </p>
        <p>
          <strong className="text-zinc-200">Rating</strong> ikut terbawa saat
          video dicocokkan ke IMDb. Angka yang kamu ketik sendiri menang atas
          IMDb.
        </p>
        <p>
          Dua angka terakhir sengaja dipisah karena tindakannya berbeda:{" "}
          <strong className="text-amber-200">{ratingBisaDitolongImdb} bisa dicocokkan</strong>{" "}
          masih bisa terisi lewat tombol <strong>Cocokkan semua</strong> di atas,
          sedangkan <strong>{ratingBuntu} buntu</strong> sudah dicocokkan tapi
          IMDb-nya memang belum punya nilai — biasanya film baru atau yang jarang
          ditonton. Mencocokkannya lagi tidak akan mengubah apa pun.
        </p>
      </BantuanSingkat>
    </section>
  );
}
