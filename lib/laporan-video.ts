// -------------------------------------------------------------------------
// Laporan Video — member melaporkan video yang bermasalah, admin menanganinya.
//
// Berkas ini = aturan MURNI (tipe, daftar pilihan, validasi, saring) — aman
// diimpor browser. Penyimpanan ada di lib/laporan-video-simpan.ts (khusus
// server), dipisah supaya modul node:fs/node:crypto tak ikut ke bundle browser.
//
// Judul film TIDAK diterima dari browser: route mencarinya sendiri dari ID
// (app/api/laporan-video/route.ts), supaya laporan tak bisa diisi judul palsu.
// -------------------------------------------------------------------------
export const JENIS_MASALAH = [
  { id: "tidak-bisa-diputar", label: "Video tidak bisa diputar" },
  { id: "buffering", label: "Video buffering" },
  { id: "link-rusak", label: "Link video rusak" },
  { id: "subtitle", label: "Subtitle tidak muncul" },
  { id: "audio", label: "Audio bermasalah" },
  { id: "kualitas", label: "Kualitas video buruk" },
  { id: "lainnya", label: "Masalah lainnya" },
] as const;
export type JenisMasalah = (typeof JENIS_MASALAH)[number]["id"];

export const STATUS_LAPORAN = [
  { id: "pending", label: "Pending" },
  { id: "diproses", label: "Diproses" },
  { id: "selesai", label: "Selesai" },
] as const;
export type StatusLaporan = (typeof STATUS_LAPORAN)[number]["id"];

/** drama = episode di /feed · playly = video tunggal di /tonton. */
export type JenisKonten = "drama" | "playly";

export const MAKS_KETERANGAN = 500;
const MAKS_SERVER = 120;
const MAKS_ID_KONTEN = 200;
/** "Masalah lainnya" tanpa penjelasan tak bisa ditindaklanjuti admin. */
const MIN_KETERANGAN_LAINNYA = 5;

export type LaporanVideo = {
  id: string;
  jenisKonten: JenisKonten;
  kontenId: string;
  judul: string;
  /** null untuk video tunggal (Playly / film tanpa episode). */
  episode: number | null;
  /** Server/sumber video saat masalah terjadi — label informasi untuk admin. */
  server: string;
  masalah: JenisMasalah;
  keterangan: string;
  email: string;
  namaMember: string;
  status: StatusLaporan;
  dibuatPada: string;
  diperbaruiPada: string;
  /** Email admin terakhir yang mengubah status. */
  ditanganiOleh?: string;
};

/** Isian dari browser yang sudah lolos validasi (belum ada judul & identitas). */
export type LaporanMasuk = Pick<
  LaporanVideo,
  "jenisKonten" | "kontenId" | "episode" | "server" | "masalah" | "keterangan"
>;

export type HasilValidasi<T> = { ok: true; data: T } | { ok: false; pesan: string };

const ID_MASALAH = new Set<string>(JENIS_MASALAH.map((m) => m.id));
const ID_STATUS = new Set<string>(STATUS_LAPORAN.map((s) => s.id));

export function statusSah(nilai: unknown): nilai is StatusLaporan {
  return typeof nilai === "string" && ID_STATUS.has(nilai);
}

/** Buang karakter kendali (kecuali baris baru) supaya tampilan admin tak rusak. */
export function bersihkanTeks(nilai: unknown): string {
  return String(nilai ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
    .trim();
}

/** Periksa isian laporan dari browser. Semua field = data tak tepercaya. */
export function validasiLaporanMasuk(body: unknown): HasilValidasi<LaporanMasuk> {
  if (!body || typeof body !== "object") {
    return { ok: false, pesan: "Isian laporan tidak terbaca." };
  }
  const b = body as Record<string, unknown>;

  if (b.jenisKonten !== "drama" && b.jenisKonten !== "playly") {
    return { ok: false, pesan: "Jenis video tidak dikenal." };
  }
  const kontenId = bersihkanTeks(b.kontenId);
  if (!kontenId || kontenId.length > MAKS_ID_KONTEN) {
    return { ok: false, pesan: "ID video tidak sah." };
  }
  if (typeof b.masalah !== "string" || !ID_MASALAH.has(b.masalah)) {
    return { ok: false, pesan: "Pilih jenis masalahnya dulu." };
  }

  let episode: number | null = null;
  if (b.episode !== undefined && b.episode !== null) {
    const n = Number(b.episode);
    if (!Number.isInteger(n) || n < 1) {
      return { ok: false, pesan: "Nomor episode tidak sah." };
    }
    episode = n;
  }

  const keterangan = bersihkanTeks(b.keterangan);
  if (keterangan.length > MAKS_KETERANGAN) {
    return { ok: false, pesan: `Keterangan maksimal ${MAKS_KETERANGAN} karakter.` };
  }
  if (b.masalah === "lainnya" && keterangan.length < MIN_KETERANGAN_LAINNYA) {
    return { ok: false, pesan: "Untuk \"Masalah lainnya\", tulis keterangannya dulu." };
  }

  return {
    ok: true,
    data: {
      jenisKonten: b.jenisKonten,
      kontenId,
      episode,
      server: bersihkanTeks(b.server).slice(0, MAKS_SERVER) || "tidak diketahui",
      masalah: b.masalah as JenisMasalah,
      keterangan,
    },
  };
}

export function labelMasalah(id: JenisMasalah): string {
  return JENIS_MASALAH.find((m) => m.id === id)?.label ?? id;
}

export type SaringanLaporan = { status?: StatusLaporan; q?: string };

/** Saring daftar untuk dashboard admin: per status + kata kunci bebas. */
export function saringLaporan(
  daftar: LaporanVideo[],
  saringan: SaringanLaporan,
): LaporanVideo[] {
  const q = (saringan.q ?? "").trim().toLowerCase();
  return daftar.filter((l) => {
    if (saringan.status && l.status !== saringan.status) return false;
    if (!q) return true;
    return [l.judul, l.kontenId, l.namaMember, l.email, l.server, l.keterangan, labelMasalah(l.masalah)]
      .some((teks) => teks.toLowerCase().includes(q));
  });
}

export function hitungPerStatus(daftar: LaporanVideo[]): Record<StatusLaporan, number> {
  const jumlah: Record<StatusLaporan, number> = { pending: 0, diproses: 0, selesai: 0 };
  for (const l of daftar) jumlah[l.status] += 1;
  return jumlah;
}

const POLA_ID = /^[0-9a-f-]{36}$/;

export function idLaporanSah(id: unknown): id is string {
  return typeof id === "string" && POLA_ID.test(id);
}

/** Video yang sedang ditonton, dioper pemutar ke tombol Report Video. */
export type VideoDilaporkan = Pick<LaporanMasuk, "jenisKonten" | "kontenId" | "episode" | "server"> & {
  /** Hanya untuk ditampilkan di jendela laporan — server mencari judul resminya sendiri. */
  judul: string;
};

/**
 * Label "server video" untuk laporan pemutar drama: host sumber + resolusi.
 * Hanya host yang dicatat (bukan alamat lengkap) — cukup untuk admin tahu
 * server mana yang bermasalah, tanpa menyimpan jalur berkas.
 */
export function labelServer(alamatDasar: string | null, resolusi: string): string {
  let host: string;
  if (alamatDasar === null) host = "belum dimuat";
  else if (!alamatDasar) host = "lokal";
  else {
    try {
      host = new URL(alamatDasar).host;
    } catch {
      host = "tidak dikenal";
    }
  }
  return `${host} · ${resolusi || "asli"}`;
}
