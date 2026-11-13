import { KATEGORI_ISI } from "./types";

const ACCENT: Record<string, { text: string; chip: string; bar: string }> = {
  Semua: {
    text: "text-amber-300",
    chip: "border-amber-500/40 bg-amber-950/40 text-amber-200 hover:bg-amber-900/50",
    bar: "bg-amber-400",
  },
  Romance: {
    text: "text-rose-400",
    chip: "border-rose-500/40 bg-rose-950/50 text-rose-200 hover:bg-rose-900/60",
    bar: "bg-rose-400",
  },
  Action: {
    text: "text-orange-400",
    chip: "border-orange-500/40 bg-orange-950/50 text-orange-200 hover:bg-orange-900/60",
    bar: "bg-orange-400",
  },
  Comedy: {
    text: "text-lime-400",
    chip: "border-lime-500/40 bg-lime-950/50 text-lime-200 hover:bg-lime-900/60",
    bar: "bg-lime-400",
  },
  Fantasy: {
    text: "text-violet-400",
    chip: "border-violet-500/40 bg-violet-950/50 text-violet-200 hover:bg-violet-900/60",
    bar: "bg-violet-400",
  },
  Tycoon: {
    text: "text-amber-400",
    chip: "border-amber-500/40 bg-amber-950/50 text-amber-200 hover:bg-amber-900/60",
    bar: "bg-amber-400",
  },
  Harem: {
    text: "text-fuchsia-400",
    chip: "border-fuchsia-500/40 bg-fuchsia-950/50 text-fuchsia-200 hover:bg-fuchsia-900/60",
    bar: "bg-fuchsia-400",
  },
  "Time Travel": {
    text: "text-cyan-400",
    chip: "border-cyan-500/40 bg-cyan-950/50 text-cyan-200 hover:bg-cyan-900/60",
    bar: "bg-cyan-400",
  },

  // ---- Genre film & serial, ditambahkan 2026-11-13 bersama CATEGORIES ----
  //
  // 🪤 Ditulis UTUH, bukan dirakit `text-${w}-400`. Tailwind v4 (terpasang
  // 4.2.4) memindai kode sebagai TEKS: kelas yang baru terbentuk saat program
  // jalan tidak pernah ikut dibangun, jadi chip-nya diam-diam jatuh ke abu-abu
  // FALLBACK di bawah — tanpa satu pun pesan error yang memberi tahu.
  //
  // Utang kecil yang disengaja: Tailwind cuma punya 22 hue, sementara kategori
  // sudah 24. Dua yang terakhir (Musical, Sport) memakai ulang hue milik Harem
  // dan Comedy dengan shade berbeda. Dampaknya kosmetik saja — keduanya tak
  // pernah tampil berdampingan di satu baris. Kalau kelak mengganggu,
  // naikkan dengan warna kustom di CSS, bukan dengan merakit nama kelas.
  Adventure: {
    text: "text-teal-400",
    chip: "border-teal-500/40 bg-teal-950/50 text-teal-200 hover:bg-teal-900/60",
    bar: "bg-teal-400",
  },
  Drama: {
    text: "text-sky-400",
    chip: "border-sky-500/40 bg-sky-950/50 text-sky-200 hover:bg-sky-900/60",
    bar: "bg-sky-400",
  },
  "Sci-Fi": {
    text: "text-indigo-400",
    chip: "border-indigo-500/40 bg-indigo-950/50 text-indigo-200 hover:bg-indigo-900/60",
    bar: "bg-indigo-400",
  },
  Horror: {
    text: "text-red-400",
    chip: "border-red-500/40 bg-red-950/50 text-red-200 hover:bg-red-900/60",
    bar: "bg-red-400",
  },
  Thriller: {
    text: "text-purple-400",
    chip: "border-purple-500/40 bg-purple-950/50 text-purple-200 hover:bg-purple-900/60",
    bar: "bg-purple-400",
  },
  Mystery: {
    text: "text-slate-400",
    chip: "border-slate-500/40 bg-slate-950/50 text-slate-200 hover:bg-slate-900/60",
    bar: "bg-slate-400",
  },
  Crime: {
    text: "text-zinc-400",
    chip: "border-zinc-500/40 bg-zinc-950/50 text-zinc-200 hover:bg-zinc-900/60",
    bar: "bg-zinc-400",
  },
  War: {
    text: "text-stone-400",
    chip: "border-stone-500/40 bg-stone-950/50 text-stone-200 hover:bg-stone-900/60",
    bar: "bg-stone-400",
  },
  Western: {
    text: "text-yellow-400",
    chip: "border-yellow-500/40 bg-yellow-950/50 text-yellow-200 hover:bg-yellow-900/60",
    bar: "bg-yellow-400",
  },
  Animation: {
    text: "text-green-400",
    chip: "border-green-500/40 bg-green-950/50 text-green-200 hover:bg-green-900/60",
    bar: "bg-green-400",
  },
  Anime: {
    text: "text-pink-400",
    chip: "border-pink-500/40 bg-pink-950/50 text-pink-200 hover:bg-pink-900/60",
    bar: "bg-pink-400",
  },
  Family: {
    text: "text-emerald-400",
    chip: "border-emerald-500/40 bg-emerald-950/50 text-emerald-200 hover:bg-emerald-900/60",
    bar: "bg-emerald-400",
  },
  History: {
    text: "text-neutral-400",
    chip: "border-neutral-500/40 bg-neutral-950/50 text-neutral-200 hover:bg-neutral-900/60",
    bar: "bg-neutral-400",
  },
  Biography: {
    text: "text-blue-400",
    chip: "border-blue-500/40 bg-blue-950/50 text-blue-200 hover:bg-blue-900/60",
    bar: "bg-blue-400",
  },
  Documentary: {
    text: "text-gray-400",
    chip: "border-gray-500/40 bg-gray-950/50 text-gray-200 hover:bg-gray-900/60",
    bar: "bg-gray-400",
  },
  Musical: {
    text: "text-fuchsia-300",
    chip: "border-fuchsia-400/40 bg-fuchsia-900/50 text-fuchsia-100 hover:bg-fuchsia-800/60",
    bar: "bg-fuchsia-300",
  },
  Sport: {
    text: "text-lime-300",
    chip: "border-lime-400/40 bg-lime-900/50 text-lime-100 hover:bg-lime-800/60",
    bar: "bg-lime-300",
  },

  // ---- Enam genre IMDb terakhir (owner 2026-11-13, katalog jadi 30) ----
  // Sama seperti Musical & Sport di atas: hue dipakai ulang dengan shade yang
  // berbeda, karena 30 kategori melampaui 22 hue yang disediakan Tailwind.
  Music: {
    text: "text-pink-300",
    chip: "border-pink-400/40 bg-pink-900/50 text-pink-100 hover:bg-pink-800/60",
    bar: "bg-pink-300",
  },
  "Film-Noir": {
    text: "text-stone-300",
    chip: "border-stone-400/40 bg-stone-900/50 text-stone-100 hover:bg-stone-800/60",
    bar: "bg-stone-300",
  },
  Short: {
    text: "text-teal-300",
    chip: "border-teal-400/40 bg-teal-900/50 text-teal-100 hover:bg-teal-800/60",
    bar: "bg-teal-300",
  },
  "Reality-TV": {
    text: "text-sky-300",
    chip: "border-sky-400/40 bg-sky-900/50 text-sky-100 hover:bg-sky-800/60",
    bar: "bg-sky-300",
  },
  "Game-Show": {
    text: "text-orange-300",
    chip: "border-orange-400/40 bg-orange-900/50 text-orange-100 hover:bg-orange-800/60",
    bar: "bg-orange-300",
  },
  "Talk-Show": {
    text: "text-blue-300",
    chip: "border-blue-400/40 bg-blue-900/50 text-blue-100 hover:bg-blue-800/60",
    bar: "bg-blue-300",
  },
};

const FALLBACK = {
  text: "text-white",
  chip: "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700",
  bar: "bg-amber-400",
};

// -------------------------------------------------------------------------
// PALET CADANGAN untuk kategori resmi yang belum punya entri manual di atas.
//
// KENAPA ADA (2026-11-13): owner menaikkan katalog jadi 67 kategori. Mendata
// warna satu per satu berarti 67 entri DI SINI plus 67 lagi di
// app/admin/constants.ts — 134 baris ketikan tangan untuk sesuatu yang tak
// punya makna khusus, dan tiap salah ketik membuat satu kategori diam-diam
// kehilangan warnanya. Palet menghapus seluruh kelas kesalahan itu: kategori
// baru otomatis kebagian, tanpa ada yang perlu ingat mendaftarkannya.
//
// Yang SUDAH tercantum manual di atas sengaja tidak ikut diacak — warnanya
// sudah dilihat penonton, dan menggesernya berarti mengubah tampilan yang
// tidak diminta siapa pun.
//
// 🪤 Kelas tetap DITULIS UTUH. Tailwind v4 memindai kode sebagai teks, jadi
// `text-${warna}-400` tidak akan pernah ikut dibangun.
// -------------------------------------------------------------------------
const PALET: { text: string; chip: string; bar: string }[] = [
  { text: "text-rose-300", chip: "border-rose-400/40 bg-rose-900/50 text-rose-100 hover:bg-rose-800/60", bar: "bg-rose-300" },
  { text: "text-orange-200", chip: "border-orange-300/40 bg-orange-900/50 text-orange-100 hover:bg-orange-800/60", bar: "bg-orange-200" },
  { text: "text-amber-300", chip: "border-amber-400/40 bg-amber-900/50 text-amber-100 hover:bg-amber-800/60", bar: "bg-amber-300" },
  { text: "text-yellow-300", chip: "border-yellow-400/40 bg-yellow-900/50 text-yellow-100 hover:bg-yellow-800/60", bar: "bg-yellow-300" },
  { text: "text-lime-400", chip: "border-lime-500/40 bg-lime-950/50 text-lime-200 hover:bg-lime-900/60", bar: "bg-lime-400" },
  { text: "text-green-300", chip: "border-green-400/40 bg-green-900/50 text-green-100 hover:bg-green-800/60", bar: "bg-green-300" },
  { text: "text-emerald-300", chip: "border-emerald-400/40 bg-emerald-900/50 text-emerald-100 hover:bg-emerald-800/60", bar: "bg-emerald-300" },
  { text: "text-teal-200", chip: "border-teal-300/40 bg-teal-900/50 text-teal-100 hover:bg-teal-800/60", bar: "bg-teal-200" },
  { text: "text-cyan-300", chip: "border-cyan-400/40 bg-cyan-900/50 text-cyan-100 hover:bg-cyan-800/60", bar: "bg-cyan-300" },
  { text: "text-sky-200", chip: "border-sky-300/40 bg-sky-900/50 text-sky-100 hover:bg-sky-800/60", bar: "bg-sky-200" },
  { text: "text-blue-200", chip: "border-blue-300/40 bg-blue-900/50 text-blue-100 hover:bg-blue-800/60", bar: "bg-blue-200" },
  { text: "text-indigo-300", chip: "border-indigo-400/40 bg-indigo-900/50 text-indigo-100 hover:bg-indigo-800/60", bar: "bg-indigo-300" },
  { text: "text-violet-300", chip: "border-violet-400/40 bg-violet-900/50 text-violet-100 hover:bg-violet-800/60", bar: "bg-violet-300" },
  { text: "text-purple-300", chip: "border-purple-400/40 bg-purple-900/50 text-purple-100 hover:bg-purple-800/60", bar: "bg-purple-300" },
  { text: "text-fuchsia-400", chip: "border-fuchsia-500/40 bg-fuchsia-950/50 text-fuchsia-200 hover:bg-fuchsia-900/60", bar: "bg-fuchsia-400" },
  { text: "text-pink-200", chip: "border-pink-300/40 bg-pink-900/50 text-pink-100 hover:bg-pink-800/60", bar: "bg-pink-200" },
  { text: "text-red-300", chip: "border-red-400/40 bg-red-900/50 text-red-100 hover:bg-red-800/60", bar: "bg-red-300" },
  { text: "text-slate-300", chip: "border-slate-400/40 bg-slate-900/50 text-slate-100 hover:bg-slate-800/60", bar: "bg-slate-300" },
];

/**
 * Nama kategori -> indeks palet. Murni dari huruf namanya, jadi hasilnya
 * STABIL: satu kategori selalu kebagian warna yang sama di tiap halaman dan
 * tiap kali halaman dibangun ulang. Memakai urutan daftar akan membuat SEMUA
 * warna bergeser begitu satu kategori disisipkan di tengah.
 */
function indeksPalet(nama: string): number {
  let h = 0;
  for (let i = 0; i < nama.length; i++) h = (h * 31 + nama.charCodeAt(i)) >>> 0;
  return h % PALET.length;
}

/**
 * Aksen untuk sebuah nama. Tiga lapis, dari yang paling spesifik:
 *   1. entri manual di ACCENT  — warna yang sudah tayang, tak boleh bergeser
 *   2. palet, untuk kategori RESMI yang belum didata manual
 *   3. FALLBACK putih, untuk nama yang bukan kategori kita sama sekali
 *
 * Lapis 3 sengaja dipertahankan: `drama.genre` dari OMDb itu teks bebas
 * ("Steampunk", "Sports"), dan memberinya warna acak berarti mengubah
 * tampilan yang tak diminta siapa pun.
 */
function aksen(genre: string): { text: string; chip: string; bar: string } {
  const manual = ACCENT[genre];
  if (manual) return manual;
  if ((KATEGORI_ISI as readonly string[]).includes(genre)) {
    return PALET[indeksPalet(genre)];
  }
  return FALLBACK;
}

export function genreTextClass(genre: string): string {
  return aksen(genre).text;
}

export function genreChipClass(genre: string): string {
  return aksen(genre).chip;
}

export function genreBarClass(genre: string): string {
  return aksen(genre).bar;
}
