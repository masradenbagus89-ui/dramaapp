// -------------------------------------------------------------------------
// ISI OTOMATIS link unduhan GOOGLE DRIVE dari folder Drive publik.
//
// Aturan nama file + pencocokannya: lib/playly-unduhan-cocok.ts (sama dengan Mega).
//
// Kenapa daftar seluruh folder lalu dicocokkan di sini, bukan `name contains`:
// operator itu di Drive hanya mencocokkan AWAL nama (dok resmi "Search query
// terms"), jadi `Judul_abc123_1080p.mp4` tak akan ketemu lewat `abc123`.
//
// Server-only: membaca env berisi API key. JANGAN diimpor komponen browser.
//   GOOGLE_DRIVE_API_KEY         API key Google Cloud (Drive API aktif).
//   PLAYLY_UNDUHAN_DRIVE_FOLDER  ID folder Drive; boleh lebih dari satu, pisah koma.
// Folder wajib dibagikan "Siapa saja yang memiliki link" — API key hanya bisa
// membaca berkas publik.
// -------------------------------------------------------------------------
import { cocokkanFileUnduhan, type SaranUnduhan } from "./playly-unduhan-cocok";

export type FileDrive = { id: string; name: string };

export type SaranDrive = SaranUnduhan;

export type HasilCariDrive =
  | ({ ok: true } & SaranDrive)
  | { ok: false; alasan: string };

const API_DRIVE = "https://www.googleapis.com/drive/v3/files";
const MIME_FOLDER = "application/vnd.google-apps.folder";
/** Batas Drive per halaman (dok resmi files.list). */
const UKURAN_HALAMAN = 1000;
/** 20 × 1000 = 20.000 file per folder; lebih dari itu dianggap salah folder. */
const MAKS_HALAMAN = 20;
/** Satu klik admin tak boleh menggantung lama kalau Google lambat. */
const BATAS_WAKTU_MS = 15_000;
/** ID folder & file Drive hanya huruf, angka, `-`, `_` — sekaligus mencegah suntikan ke `q`. */
const POLA_ID_DRIVE = /^[A-Za-z0-9_-]{10,200}$/;

export function urlFileDrive(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/** Murni: pilih file milik `videoId` per kualitas. ID file Drive yang tak sah dibuang dulu. */
export function cocokkanFileDrive(videoId: string, files: FileDrive[]): SaranDrive {
  return cocokkanFileUnduhan(
    videoId,
    files.filter((f) => POLA_ID_DRIVE.test(f.id)),
    (f) => urlFileDrive(f.id),
  );
}

export function bacaFolderDrive(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => POLA_ID_DRIVE.test(s));
}

type FetchFn = typeof fetch;

class GagalDrive extends Error {
  constructor(readonly status: number) {
    super(`Google Drive membalas HTTP ${status}`);
  }
}

/** Ambil seluruh file (bukan subfolder) satu folder, halaman demi halaman. */
async function daftarFileFolder(
  folderId: string,
  apiKey: string,
  fetchFn: FetchFn,
): Promise<FileDrive[]> {
  const hasil: FileDrive[] = [];
  let pageToken: string | undefined;
  for (let halaman = 0; halaman < MAKS_HALAMAN; halaman++) {
    const params = new URLSearchParams({
      // folderId sudah lolos POLA_ID_DRIVE, jadi tak mungkin memuat kutip.
      q: `'${folderId}' in parents and trashed = false and mimeType != '${MIME_FOLDER}'`,
      fields: "nextPageToken,files(id,name)",
      pageSize: String(UKURAN_HALAMAN),
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      key: apiKey,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetchFn(`${API_DRIVE}?${params}`, {
      signal: AbortSignal.timeout(BATAS_WAKTU_MS),
      cache: "no-store",
    });
    if (!res.ok) throw new GagalDrive(res.status);

    const data = (await res.json()) as { files?: unknown; nextPageToken?: unknown };
    for (const f of Array.isArray(data.files) ? data.files : []) {
      const r = f as Record<string, unknown>;
      if (typeof r?.id === "string" && typeof r.name === "string") {
        hasil.push({ id: r.id, name: r.name });
      }
    }
    pageToken = typeof data.nextPageToken === "string" ? data.nextPageToken : undefined;
    if (!pageToken) return hasil;
  }
  throw new Error(`folder ${folderId} memuat lebih dari ${MAKS_HALAMAN * UKURAN_HALAMAN} file`);
}

/** Status HTTP Google -> alasan yang bisa ditindaklanjuti admin. */
function alasanGagal(err: unknown): string {
  if (err instanceof GagalDrive) {
    if (err.status === 400 || err.status === 403) {
      return "Google menolak permintaan. Cek GOOGLE_DRIVE_API_KEY benar dan Google Drive API sudah diaktifkan di Google Cloud.";
    }
    if (err.status === 404) {
      return "Folder tidak ditemukan. Cek ID folder di PLAYLY_UNDUHAN_DRIVE_FOLDER dan pastikan folder dibagikan \"Siapa saja yang memiliki link\".";
    }
    if (err.status === 429) return "Kuota Google Drive sedang habis. Coba lagi beberapa menit lagi.";
    return "Google Drive sedang bermasalah. Coba lagi sebentar lagi.";
  }
  if (err instanceof Error && err.name === "TimeoutError") {
    return "Google Drive terlalu lama membalas. Coba lagi sebentar lagi.";
  }
  return "Gagal membaca folder Google Drive. Coba lagi sebentar lagi.";
}

/**
 * Cari link Drive untuk satu video. TIDAK menyimpan apa pun — hasilnya hanya
 * mengisi kotak di panel admin; penyimpanan tetap lewat tombol Simpan (jalur
 * validasi yang sama dengan isian manual).
 */
export async function cariLinkDrive(
  videoId: string,
  env: Record<string, string | undefined> = process.env,
  fetchFn: FetchFn = fetch,
): Promise<HasilCariDrive> {
  const hasil = await ambilFileDrive(env, fetchFn);
  if (!hasil.ok) return hasil;
  return { ok: true, ...cocokkanFileDrive(videoId, hasil.files) };
}

export const ALASAN_DRIVE_BELUM_DIATUR =
  "Isi otomatis Google Drive belum diatur (env GOOGLE_DRIVE_API_KEY dan PLAYLY_UNDUHAN_DRIVE_FOLDER).";

/**
 * Seluruh file di folder Drive yang diatur (dipakai juga "Cocokkan semua").
 * Hanya MEMBACA. `belumDiatur` membedakan "env kosong" dari "Google gagal".
 */
export async function ambilFileDrive(
  env: Record<string, string | undefined> = process.env,
  fetchFn: FetchFn = fetch,
): Promise<{ ok: true; files: FileDrive[] } | { ok: false; alasan: string; belumDiatur?: true }> {
  const apiKey = env.GOOGLE_DRIVE_API_KEY?.trim();
  const folders = bacaFolderDrive(env.PLAYLY_UNDUHAN_DRIVE_FOLDER);
  if (!apiKey || folders.length === 0) {
    return { ok: false, alasan: ALASAN_DRIVE_BELUM_DIATUR, belumDiatur: true };
  }
  try {
    const files = (
      await Promise.all(folders.map((f) => daftarFileFolder(f, apiKey, fetchFn)))
    ).flat();
    return { ok: true, files: files.filter((f) => POLA_ID_DRIVE.test(f.id)) };
  } catch (err) {
    // Rincian (status, pesan) ke log server; API key tak pernah ikut tercetak.
    console.error(
      `[playly-unduhan-drive] gagal: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { ok: false, alasan: alasanGagal(err) };
  }
}
