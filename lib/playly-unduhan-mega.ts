// -------------------------------------------------------------------------
// ISI OTOMATIS link unduhan MEGA dari folder Mega publik.
//
// Aturan nama file + pencocokannya: lib/playly-unduhan-cocok.ts (sama dengan
// Google Drive). Beda dengan Drive: SUBFOLDER IKUT dibaca — Mega memulangkan
// seluruh pohon folder publik dalam satu permintaan, jadi tak ada biaya tambahan.
//
// Kenapa paket `megajs`, bukan fetch biasa: Mega tidak punya REST API resmi.
// Nama file di Mega TERENKRIPSI dan hanya bisa dibuka dengan kunci di link
// folder (`#<kunci>`); megajs (MIT, dipakai luas) yang mengurus dekripsinya.
//
// Link yang dihasilkan = format resmi file-di-dalam-folder:
//   https://mega.nz/folder/<id-folder>#<kunci-folder>/file/<id-file>
// Bentuk itu persis yang dibaca balik `File.fromURL` milik megajs — bukan tebakan.
//
// Server-only: link folder berisi kunci. JANGAN diimpor komponen browser.
//   PLAYLY_UNDUHAN_MEGA_FOLDER  link folder publik Mega lengkap dengan `#kunci`;
//                               boleh lebih dari satu, pisah koma.
// -------------------------------------------------------------------------
import { File as FileMegajs } from "megajs";
import { cocokkanFileUnduhan, type SaranUnduhan } from "./playly-unduhan-cocok";

export type FolderMega = { handle: string; kunci: string };
export type FileMega = { handle: string; name: string };

export type HasilCariMega =
  | ({ ok: true } & SaranUnduhan)
  | { ok: false; alasan: string };

/** Pemuat isi folder; disuntikkan di tes supaya tak menyentuh server Mega. */
export type MuatFolderMega = (folder: FolderMega) => Promise<FileMega[]>;

/** Satu klik admin tak boleh menggantung lama kalau Mega lambat. */
const BATAS_WAKTU_MS = 20_000;
/** Lebih dari ini dianggap salah folder — mencegah respons raksasa membebani server. */
const MAKS_FILE = 20_000;
/** Id & kunci Mega = base64url. Rentang longgar, yang penting tak ada karakter asing. */
const POLA_HANDLE_MEGA = /^[A-Za-z0-9_-]{6,20}$/;
const POLA_KUNCI_MEGA = /^[A-Za-z0-9_-]{16,64}$/;
const HOST_MEGA = "mega.nz";

/** "https://mega.nz/folder/<id>#<kunci>" -> { handle, kunci }, atau null kalau bukan bentuk itu. */
export function uraiLinkFolderMega(raw: string): FolderMega | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== HOST_MEGA) return null;
  const handle = /^\/folder\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? "";
  const kunci = url.hash.slice(1);
  if (!POLA_HANDLE_MEGA.test(handle) || !POLA_KUNCI_MEGA.test(kunci)) return null;
  return { handle, kunci };
}

export function bacaFolderMega(raw: string | undefined): FolderMega[] {
  return (raw ?? "")
    .split(/[,\s]+/)
    .map(uraiLinkFolderMega)
    .filter((f): f is FolderMega => f !== null);
}

export function urlFileMega(folder: FolderMega, fileHandle: string): string {
  return `https://${HOST_MEGA}/folder/${folder.handle}#${folder.kunci}/file/${fileHandle}`;
}

type SimpulMega = { name?: unknown; directory?: unknown; downloadId?: unknown; children?: unknown };

/**
 * Kumpulkan seluruh file (bukan folder) di pohon. `downloadId` anak folder
 * publik berbentuk [id-folder, id-file] saat jalan — tipe bawaan megajs
 * menulisnya `string`, jadi bentuknya diperiksa sendiri di sini.
 */
function kumpulkanFile(simpul: SimpulMega, hasil: FileMega[]): void {
  for (const anak of Array.isArray(simpul.children) ? (simpul.children as SimpulMega[]) : []) {
    if (hasil.length > MAKS_FILE) throw new Error(`folder memuat lebih dari ${MAKS_FILE} file`);
    if (anak.directory) {
      kumpulkanFile(anak, hasil);
      continue;
    }
    const id = anak.downloadId;
    const handle = Array.isArray(id) ? id[1] : undefined;
    if (typeof handle === "string" && typeof anak.name === "string") {
      hasil.push({ handle, name: anak.name });
    }
  }
}

/** Pemuat sungguhan lewat megajs. */
export const muatFolderMegajs: MuatFolderMega = async (folder) => {
  const akar = FileMegajs.fromURL(`https://${HOST_MEGA}/folder/${folder.handle}#${folder.kunci}`);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const habisWaktu = new Promise<never>((_, tolak) => {
    timer = setTimeout(() => {
      const err = new Error("Mega tidak membalas dalam batas waktu");
      err.name = "TimeoutError";
      tolak(err);
    }, BATAS_WAKTU_MS);
  });
  try {
    await Promise.race([akar.loadAttributes(), habisWaktu]);
  } finally {
    clearTimeout(timer);
  }
  const hasil: FileMega[] = [];
  kumpulkanFile(akar as unknown as SimpulMega, hasil);
  return hasil;
};

/** Pesan error megajs ("ENOENT (-9): ...") -> alasan yang bisa ditindaklanjuti admin. */
function alasanGagal(err: unknown): string {
  if (err instanceof Error && err.name === "TimeoutError") {
    return "Mega terlalu lama membalas. Coba lagi sebentar lagi.";
  }
  const pesan = err instanceof Error ? err.message : "";
  if (/ENOENT|EBLOCKED/.test(pesan)) {
    return "Folder Mega tidak ditemukan atau sudah dihapus. Cek link di PLAYLY_UNDUHAN_MEGA_FOLDER.";
  }
  if (/decrypt|EKEY/i.test(pesan)) {
    return "Kunci folder Mega salah. Salin ulang link folder LENGKAP dengan bagian setelah tanda #.";
  }
  if (/EAGAIN|ERATELIMIT|ETOOMANY/.test(pesan)) {
    return "Mega sedang sibuk atau membatasi permintaan. Coba lagi beberapa menit lagi.";
  }
  return "Gagal membaca folder Mega. Coba lagi sebentar lagi.";
}

/**
 * Cari link Mega untuk satu video. TIDAK menyimpan apa pun — hasilnya hanya
 * mengisi kotak di panel admin; penyimpanan tetap lewat tombol Simpan (jalur
 * validasi domain yang sama dengan isian manual).
 */
export async function cariLinkMega(
  videoId: string,
  env: Record<string, string | undefined> = process.env,
  muat: MuatFolderMega = muatFolderMegajs,
): Promise<HasilCariMega> {
  const hasil = await ambilFileMega(env, muat);
  if (!hasil.ok) return hasil;
  // Semua folder digabung dulu lalu dicocokkan SEKALI: file kualitas sama di
  // dua folder ikut tercatat ganda, bukan diam-diam dipilih salah satunya.
  return { ok: true, ...cocokkanFileUnduhan(videoId, hasil.files, (f) => f.url) };
}

export const ALASAN_MEGA_BELUM_DIATUR =
  "Isi otomatis Mega belum diatur (env PLAYLY_UNDUHAN_MEGA_FOLDER berisi link folder Mega lengkap dengan #kunci).";

/**
 * Seluruh file (nama + link siap pakai) di folder Mega yang diatur — dipakai
 * juga "Cocokkan semua". Hanya MEMBACA. `belumDiatur` membedakan "env kosong"
 * dari "Mega gagal".
 */
export async function ambilFileMega(
  env: Record<string, string | undefined> = process.env,
  muat: MuatFolderMega = muatFolderMegajs,
): Promise<
  { ok: true; files: { name: string; url: string }[] } | { ok: false; alasan: string; belumDiatur?: true }
> {
  const folders = bacaFolderMega(env.PLAYLY_UNDUHAN_MEGA_FOLDER);
  if (folders.length === 0) return { ok: false, alasan: ALASAN_MEGA_BELUM_DIATUR, belumDiatur: true };
  try {
    const files = (
      await Promise.all(
        folders.map(async (folder) =>
          (await muat(folder))
            .filter((f) => POLA_HANDLE_MEGA.test(f.handle))
            .map((f) => ({ name: f.name, url: urlFileMega(folder, f.handle) })),
        ),
      )
    ).flat();
    return { ok: true, files };
  } catch (err) {
    // Hanya pesan error ke log; link folder (berisi kunci) tak pernah ikut tercetak.
    console.error(`[playly-unduhan-mega] gagal: ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, alasan: alasanGagal(err) };
  }
}
