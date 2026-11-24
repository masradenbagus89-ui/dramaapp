// KONTRAK NONTON BARENG — bentuk event + aturan validasi + hitungan sinkron.
//
// Satu berkas dipakai DUA pihak: server Socket.IO (nobar-server) dan browser
// (halaman /watch-room di Next). Kenapa satu: kalau batas panjang chat atau
// rumus posisi ditulis dua kali, cepat atau lambat keduanya menyimpang dan
// penonton melihat video "loncat-loncat" tanpa ada yang error.
//
// ⚠️ Berkas ini SENGAJA tanpa import apa pun (bukan node:crypto, bukan
// socket.io): ia ikut terbundel ke browser, dan Next mengimpornya dari luar
// folder nobar-server.

// ---------------------------------------------------------------- batas ----

/** Panjang maksimal satu pesan chat (karakter, sesudah dirapikan). */
export const MAKS_PANJANG_PESAN = 300;
/** Panjang maksimal nama tampilan peserta. */
export const MAKS_PANJANG_NAMA = 24;
/** Batas peserta per Room — menjaga satu Room tak bisa menghabiskan server. */
export const MAKS_PESERTA = 20;
/** Jumlah pesan lama yang dikirim ke peserta yang baru masuk. */
export const RIWAYAT_PESAN = 50;
/** Posisi video terbesar yang masuk akal (detik) — 12 jam, jauh di atas film terpanjang. */
export const MAKS_POSISI_DETIK = 12 * 60 * 60;

/** Host mengirim posisi aktualnya tiap sekian ms → sumber koreksi selisih penonton. */
export const INTERVAL_LAPORAN_HOST_MS = 4000;
/** Selisih (detik) yang masih ditoleransi sebelum penonton dipaksa loncat ke posisi Host. */
export const TOLERANSI_SELISIH_DETIK = 1.5;

// ----------------------------------------------------------------- tipe ----

export type Peran = "host" | "penonton";

/** Status pemutaran milik Room. `pada` = jam SERVER (ms) saat `posisi` dicatat. */
export type StatusPemutaran = {
  main: boolean;
  posisi: number;
  pada: number;
  /** Naik tiap perubahan dari Host → klien bisa membuang status yang datang terlambat. */
  seq: number;
};

/** Data peserta yang BOLEH dilihat peserta lain — tanpa email, tanpa kunci. */
export type PesertaPublik = {
  id: string;
  nama: string;
  peran: Peran;
  online: boolean;
};

export type PesanPublik = {
  id: string;
  pesertaId: string;
  nama: string;
  isi: string;
  /** ISO 8601 dari server. */
  dikirim: string;
};

export type RuangPublik = {
  judul: string;
  videoId: string;
  poster: string | null;
};

export type Snapshot = {
  ruang: RuangPublik;
  saya: { id: string; nama: string; peran: Peran };
  status: StatusPemutaran;
  peserta: PesertaPublik[];
  pesan: PesanPublik[];
  waktuServer: number;
};

export type AksiKontrol = "putar" | "jeda" | "geser";

/** Event klien → server. Nama event ditulis di SATU tempat ini. */
export const EVENT = {
  kontrol: "kontrol",
  laporan: "laporan",
  chat: "chat",
  waktu: "waktu",
  serahkanHost: "serahkan_host",
  akhiri: "akhiri",
  // server → klien
  snapshot: "snapshot",
  status: "status",
  peserta: "peserta",
  pesan: "pesan",
  ditolak: "ditolak",
  berakhir: "berakhir",
} as const;

// ------------------------------------------------------------- validasi ----
// Semua payload dari klien diperlakukan sebagai DATA TAK TEPERCAYA: bentuknya
// diperiksa satu per satu, field asing dibuang. Fungsi mengembalikan `null`
// kalau tidak sah — pemanggil tinggal menolak.

function objek(x: unknown): Record<string, unknown> | null {
  return typeof x === "object" && x !== null && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : null;
}

function posisiSah(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= MAKS_POSISI_DETIK
    ? x
    : null;
}

export function validasiKontrol(x: unknown): { aksi: AksiKontrol; posisi: number } | null {
  const o = objek(x);
  if (!o) return null;
  const aksi = o.aksi;
  if (aksi !== "putar" && aksi !== "jeda" && aksi !== "geser") return null;
  const posisi = posisiSah(o.posisi);
  return posisi === null ? null : { aksi, posisi };
}

export function validasiLaporan(x: unknown): { posisi: number; main: boolean } | null {
  const o = objek(x);
  if (!o || typeof o.main !== "boolean") return null;
  const posisi = posisiSah(o.posisi);
  return posisi === null ? null : { posisi, main: o.main };
}

export function validasiIdPeserta(x: unknown): string | null {
  const o = objek(x);
  const id = o?.pesertaId;
  return typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

/**
 * Rapikan teks bebas dari pengguna: buang karakter kendali (termasuk baris
 * baru, penanda arah teks RTL yang bisa membalik tampilan), satukan spasi.
 *
 * Ini BUKAN pertahanan XSS — pertahanannya adalah teks selalu ditampilkan
 * sebagai teks (React meng-escape otomatis, tak pernah dangerouslySetInnerHTML).
 * Yang dicegah di sini adalah pesan yang merusak tata letak atau menipu mata.
 */
export function rapikanTeks(x: unknown, maks: number): string | null {
  if (typeof x !== "string") return null;
  const bersih = x
    .normalize("NFC")
    // C0/C1 control + zero-width + penanda arah (bidi) — tak punya arti di chat.
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!bersih) return null;
  // Dihitung per code point, bukan per unit UTF-16: satu emoji = satu huruf.
  // Kepanjangan DITOLAK, bukan dipotong diam-diam — pengirim harus tahu.
  return Array.from(bersih).length > maks ? null : bersih;
}

export const rapikanNama = (x: unknown) => rapikanTeks(x, MAKS_PANJANG_NAMA);

export function validasiChat(x: unknown): string | null {
  return rapikanTeks(objek(x)?.isi, MAKS_PANJANG_PESAN);
}

// -------------------------------------------------------- hitungan sinkron ----

/** Posisi video Host yang SEHARUSNYA pada jam server `sekarang`. */
export function posisiSeharusnya(status: StatusPemutaran, sekarang: number): number {
  if (!status.main) return status.posisi;
  const berjalan = Math.max(0, (sekarang - status.pada) / 1000);
  return Math.min(status.posisi + berjalan, MAKS_POSISI_DETIK);
}

export type Koreksi =
  | { jenis: "diam" }
  | { jenis: "loncat"; ke: number };

/**
 * Perlu tidak penonton dikoreksi? Selisih kecil dibiarkan — memaksa loncat tiap
 * 0,2 detik membuat video tersendat terus, lebih buruk daripada telat sedikit.
 */
export function putuskanKoreksi(posisiLokal: number, seharusnya: number): Koreksi {
  return Math.abs(posisiLokal - seharusnya) > TOLERANSI_SELISIH_DETIK
    ? { jenis: "loncat", ke: seharusnya }
    : { jenis: "diam" };
}

/**
 * Selisih jam browser terhadap jam server dari satu kali tanya-jawab.
 * Asumsi: waktu pergi ≈ waktu pulang, jadi jam server dicatat di tengahnya.
 */
export function selisihJam(kirim: number, terima: number, jamServer: number): number {
  return jamServer - (kirim + terima) / 2;
}
