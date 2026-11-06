// -------------------------------------------------------------------------
// UNDUH LANGSUNG DARI PLAYLY — aturan murninya (tanpa jaringan, tanpa env).
//
// BEDA TEGAS dengan lib/playly-unduhan.ts, dan keduanya sengaja TIDAK disatukan:
//   - `playly-unduhan.ts`  = link provider PIHAK LUAR (Google Share, Telegram,
//     Cast, Mega, Sendcm) yang alamatnya DIISI ADMIN sendiri, kualitasnya daftar
//     tertutup (1080p|480p).
//   - berkas INI            = unduhan dari server PLAYLY sendiri, datanya datang
//     dari Playly (bukan diisi manusia), dan resolusinya teks BEBAS dari mereka
//     ("480p", "720p", "asli", ...).
// Memaksa keduanya ke satu tipe berarti tiap resolusi baru dari Playly menjadi
// error tsc di tempat yang tak berhubungan — atau lebih buruk, ditambal dengan
// melonggarkan daftar kualitas provider yang memang harus tertutup.
//
// SUMBER KONTRAK (penting untuk sesi berikutnya): bentuk `{ url, resolusi[] }`
// dan alamat tombol `url + "?res=<resolusi>"` berasal dari potongan kode yang
// DISERAHKAN OWNER 2026-11-06 ("code to push link provider.txt"), BUKAN dari
// balasan Playly yang pernah terlihat terisi. Diperiksa langsung hari itu: field
// `unduh` memang ADA di /api/public-video, tapi nilainya `null` pada 200 dari 200
// video kita — izin unduh adalah saklar per-video milik pengunggah di Playly
// (halaman /unduh/<id> mereka menyatakannya sendiri). Karena itu penyaring di
// bawah membedakan "Playly bilang tidak boleh" dari "bentuknya tak saya kenali":
// kalau kelak kontraknya berubah, kita melihat alasannya, bukan baris yang
// hilang diam-diam.
//
// Bebas env & bebas modul server supaya komponen popup di browser boleh
// mengimpor label & warnanya dari sini (pola yang sama dengan
// lib/playly-unduhan.ts).
// -------------------------------------------------------------------------
import type { DownloadButtonColor } from "./types";

/** Tawaran unduhan Playly untuk SATU video, sesudah lolos penyaring. */
export type UnduhLangsungPlayly = {
  /** Alamat halaman unduhan Playly — sudah dipastikan https + domain Playly. */
  url: string;
  /** Resolusi yang ditawarkan. Urutan dari Playly DIPERTAHANKAN. */
  resolusi: string[];
};

/**
 * Kenapa sebuah video punya / tidak punya baris Playly. Dikirim apa adanya di
 * balasan endpoint supaya owner bisa membedakan "fitur kita belum jalan" dari
 * "Playly belum mengizinkan" tanpa membaca kode.
 */
export const ALASAN_UNDUH_LANGSUNG = [
  "ada",
  /** Playly menjawab, dan jawabannya: video ini tidak boleh diunduh. */
  "tidak-diizinkan",
  /** Playly menjawab, tapi bentuk `unduh`-nya di luar kontrak yang kita kenal. */
  "bentuk-tak-dikenali",
  /**
   * Tidak ada jawaban yang bisa dipakai. Ditetapkan PENGAMBILNYA, bukan
   * penyaring di bawah. Mencakup tiga hal sekaligus: Playly tak terjangkau,
   * balasannya bukan JSON, DAN Playly menjawab dengan status gagal — termasuk
   * 404 "video itu tidak ada di Playly", yang terbukti terjadi 2026-11-06
   * untuk id yang masih tercatat di salinan daftar kita tapi sudah hilang di
   * sisi mereka. Ketiganya digabung karena akibatnya bagi penonton sama dan
   * tak satu pun bisa dia perbaiki.
   */
  "playly-tak-terjawab",
] as const;

export type AlasanUnduhLangsung = (typeof ALASAN_UNDUH_LANGSUNG)[number];

/**
 * Union, bukan satu objek ber-field opsional: dengan bentuk ini tsc sendiri yang
 * memaksa `unduh` hanya terisi saat alasannya "ada" — pemanggil tak bisa lupa
 * memeriksanya lebih dulu.
 */
export type HasilUnduhLangsung =
  | { alasan: "ada"; unduh: UnduhLangsungPlayly }
  | { alasan: Exclude<AlasanUnduhLangsung, "ada">; unduh: null };

/**
 * Resolusi = teks pendek dari pihak luar yang berakhir di ATRIBUT `href`
 * penonton, jadi bentuknya dibatasi di pintu masuk: huruf kecil + angka saja
 * ("480p", "720p", "asli", "4k"). Pola ini sekaligus menutup spasi, tanda petik,
 * dan karakter yang bisa dipakai menyelundupkan apa pun ke dalam URL.
 */
const RESOLUSI_RE = /^[a-z0-9]{1,8}$/;

/**
 * Tombol per baris dibatasi supaya satu baris tabel tidak bisa diledakkan dari
 * sisi Playly. Mereka mengolah 360p/480p/720p/1080p + berkas asli = 5; 8 memberi
 * ruang tumbuh tanpa merusak tata letak di layar HP.
 */
export const RESOLUSI_MAKS = 8;

/** Nilai resolusi untuk "berkas aslinya, tanpa diolah ulang". */
const RESOLUSI_ASLI = "asli";

function asRecord(nilai: unknown): Record<string, unknown> | null {
  return typeof nilai === "object" && nilai !== null && !Array.isArray(nilai)
    ? (nilai as Record<string, unknown>)
    : null;
}

/**
 * Alamat dari Playly -> alamat yang boleh masuk `href`, atau null kalau ditolak.
 *
 * Sengaja TIDAK memakai `toHttpsUrl`/`hostAllowed` milik lib/playly.ts walau
 * aturannya sama: modul itu berisi kode jaringan + pembaca env, dan berkas ini
 * harus tetap aman diimpor komponen "use client". Yang disalin cuma 6 baris
 * aturan, dan keduanya diuji terpisah.
 *
 * `baseUrl` (alamat dasar Playly dari env KITA, bukan data luar) melengkapi
 * bentuk relatif — Playly memang mengirim alamat relatif di field lain
 * ("/id/{id}/embed"), jadi "/unduh/123" wajar muncul di sini. Hasilnya tetap
 * diperiksa ulang terhadap daftar domain, jadi melengkapi tidak membuka jalan
 * ke domain asing.
 */
function alamatPlaylyAman(
  mentah: unknown,
  domainPlayly: string[],
  baseUrl?: string,
): string | null {
  if (typeof mentah !== "string") return null;
  const s = mentah.trim();
  if (!s) return null;
  if (domainPlayly.length === 0) return null; // daftar kosong = tolak semua

  let url: URL;
  try {
    url = s.startsWith("/") && !s.startsWith("//") && baseUrl
      ? new URL(s, baseUrl)
      : new URL(s);
  } catch {
    return null;
  }
  // https saja: halaman kita https, dan `javascript:`/`data:` di href = XSS.
  if (url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  // Dicocokkan PERSIS atau sebagai subdomain. Menulis induknya saja
  // ("up.railway.app") akan meloloskan aplikasi Railway milik siapa pun.
  if (!domainPlayly.some((d) => host === d || host.endsWith(`.${d}`))) return null;

  return url.toString();
}

/**
 * Baca field `unduh` dari balasan /api/public-video Playly.
 *
 * Menerima BALASAN UTUH, bukan cuma field `unduh`-nya, supaya bisa membedakan
 * dua keadaan yang artinya berbeda jauh:
 *   - field ADA bernilai null  -> "tidak-diizinkan" (keadaan NORMAL hari ini)
 *   - field HILANG sama sekali -> "bentuk-tak-dikenali" (kontrak Playly berubah;
 *     per 2026-11-06 field ini selalu ikut terkirim, 200 dari 200 video)
 *
 * Gagal-AMAN: apa pun yang tidak lolos jadi `unduh: null`, dan pemanggil tidak
 * menggambar baris Playly. Fungsi ini TIDAK PERNAH melempar.
 */
export function bacaUnduhLangsung(
  balasan: unknown,
  opsi: { domainPlayly: string[]; baseUrl?: string },
): HasilUnduhLangsung {
  const rec = asRecord(balasan);
  if (!rec || !("unduh" in rec)) {
    return { alasan: "bentuk-tak-dikenali", unduh: null };
  }

  const mentah = rec.unduh;
  if (mentah === null || mentah === undefined) {
    return { alasan: "tidak-diizinkan", unduh: null };
  }

  const unduh = asRecord(mentah);
  if (!unduh) return { alasan: "bentuk-tak-dikenali", unduh: null };

  const url = alamatPlaylyAman(unduh.url, opsi.domainPlayly, opsi.baseUrl);
  if (!url) return { alasan: "bentuk-tak-dikenali", unduh: null };

  if (!Array.isArray(unduh.resolusi)) {
    return { alasan: "bentuk-tak-dikenali", unduh: null };
  }

  const resolusi: string[] = [];
  for (const item of unduh.resolusi) {
    if (typeof item !== "string") continue;
    const r = item.trim().toLowerCase();
    if (!RESOLUSI_RE.test(r)) continue;
    if (resolusi.includes(r)) continue; // kembar = satu tombol saja
    resolusi.push(r);
    if (resolusi.length === RESOLUSI_MAKS) break;
  }

  // Alamatnya sah tapi nol resolusi yang bisa ditawarkan = tidak ada yang bisa
  // diunduh. Bukan kesalahan bentuk, jadi jangan dilaporkan sebagai kontrak
  // rusak — hasilnya bagi penonton sama: barisnya tidak digambar.
  if (resolusi.length === 0) return { alasan: "tidak-diizinkan", unduh: null };

  return { alasan: "ada", unduh: { url, resolusi } };
}

/**
 * Alamat satu tombol: alamat unduhan + resolusi yang dipilih.
 *
 * Memakai URLSearchParams, BUKAN `url + "?res=" + res` seperti contoh yang
 * diserahkan owner: kalau suatu saat Playly mengirim alamat yang SUDAH punya
 * query ("/unduh/123?v=2"), penyambungan polos menghasilkan "?v=2?res=480p" —
 * alamat rusak yang tetap terlihat normal di layar.
 */
export function urlUnduhResolusi(url: string, resolusi: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("res", resolusi);
    return u.toString();
  } catch {
    // Tak akan terjadi untuk alamat yang sudah lolos `alamatPlaylyAman`;
    // dijaga supaya fungsi ini tak pernah melempar di tengah penggambaran.
    return url;
  }
}

/**
 * Tulisan tombol. "asli" ditulis "ASLI" supaya terbaca sebagai pilihan, bukan
 * nama berkas; resolusi lain dibiarkan APA ADANYA ("480p" tetap "480p", bukan
 * "480P") — mengikuti contoh yang diserahkan owner.
 */
export function labelTombolUnduhPlayly(resolusi: string): string {
  return `DOWNLOAD ${resolusi === RESOLUSI_ASLI ? "ASLI" : resolusi}`;
}

/**
 * Warna tombol per resolusi.
 *
 * Hanya dua warna yang dipakai, dan itu BATAS YANG DISENGAJA: kelas warnanya
 * ditulis utuh di app/components/unduhan-kelas.ts karena Tailwind memindai kode
 * sumber untuk memutuskan kelas mana yang ikut dibundel — kelas yang dirakit
 * saat program berjalan tergambar tanpa warna sama sekali, tanpa error apa pun.
 *
 * Aturannya meneruskan pilihan owner di baris provider (1080p biru, 480p
 * oranye): yang lebih tajam biru, yang lebih ringan oranye, supaya penonton
 * membedakannya sebelum membaca tulisannya. "asli" = paling tajam -> biru.
 */
export function warnaTombolResolusi(resolusi: string): DownloadButtonColor {
  if (resolusi === RESOLUSI_ASLI) return "blue";
  // "4k"/"2k" ditulis dengan satuan, bukan jumlah baris: parseInt("4k") = 4 dan
  // akan dinilai sebagai resolusi TERENDAH padahal justru yang paling tajam.
  if (/^[0-9]+k$/.test(resolusi)) return "blue";
  const angka = parseInt(resolusi, 10);
  return Number.isFinite(angka) && angka >= 720 ? "blue" : "orange";
}
