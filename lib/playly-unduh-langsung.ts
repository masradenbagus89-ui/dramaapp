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
// SUMBER KONTRAK (penting untuk sesi berikutnya): bentuknya berasal dari
// potongan kode yang DISERAHKAN OWNER 2026-11-06, BUKAN dari
// balasan Playly yang pernah terlihat terisi. Owner mengirim DUA putaran:
//   putaran 1  `{ url, resolusi: string[] }`         -- tetap didukung
//   putaran 2  `{ url, pilihan: {res,label}[] }`      -- dipakai kalau ada
// Bedanya penting: di putaran 2 TULISAN tombol (`label`) boleh berbeda dari
// NILAI yang dikirim balik ke Playly (`res`) -- mis. res "orig" tapi tulisannya
// "1080p (Asli)". Keduanya diperiksa ulang 2026-11-06 sesudah putaran 2 masuk:
// `unduh` masih null di 40 video yang diprobe lagi, dan kata "pilihan" tak
// muncul di halaman Playly mana pun, jadi KEDUA bentuk itu masih
// belum pernah terlihat terisi. Alamat tombol = `url` + `?res=<res>`. Bukan dari
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

/** Satu tombol unduhan: nilai yang dikirim ke Playly + tulisan untuk penonton. */
export type PilihanUnduhPlayly = {
  /**
   * Nilai untuk `?res=`. DIKIRIM BALIK ke Playly apa adanya — cuma dipangkas
   * spasinya lalu divalidasi, dan SENGAJA tidak diubah huruf besar/kecilnya.
   * Sampai 2026-11-06 nilai ini di-lowercase di sini; itu dibatalkan karena
   * mengubah nilai yang akan dikirim balik berarti meminta sesuatu yang mungkin
   * tidak dikenali Playly — dan kegagalannya baru terasa penonton saat mengklik,
   * bukan saat kodenya ditulis.
   */
  res: string;
  /**
   * Tulisan di tombol. Boleh BERBEDA dari `res` (bentuk putaran 2 owner), jadi
   * jangan disatukan: `res` untuk mesin, `label` untuk mata penonton.
   */
  label: string;
};

/** Tawaran unduhan Playly untuk SATU video, sesudah lolos penyaring. */
export type UnduhLangsungPlayly = {
  /** Alamat halaman unduhan Playly — sudah dipastikan https + domain Playly. */
  url: string;
  /** Tombol yang ditawarkan. Urutan dari Playly DIPERTAHANKAN. */
  pilihan: PilihanUnduhPlayly[];
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
 * `res` dari pihak luar berakhir di ATRIBUT `href` penonton, jadi bentuknya
 * dibatasi di pintu masuk: huruf, angka, titik, garis bawah, garis pisah —
 * cukup untuk "480p", "asli", "4k", "1080p-hdr", "orig", sekaligus menutup
 * spasi, tanda petik, dan karakter yang bisa dipakai menyelundupkan sesuatu ke
 * dalam URL. Huruf BESAR ikut diterima karena nilainya tidak kita ubah lagi
 * (lihat catatan di `PilihanUnduhPlayly.res`).
 */
const RES_RE = /^[A-Za-z0-9._-]{1,24}$/;

/**
 * Panjang maksimum TULISAN tombol. Tulisannya teks bebas dari Playly dan duduk
 * di dalam satu baris tabel yang sempit di layar HP — tanpa batas ini satu label
 * panjang bisa mendorong tabelnya melebar. Tidak perlu disaring dari HTML:
 * React menggambar teks sebagai teks, bukan markup.
 */
const LABEL_MAKS = 24;

/**
 * Tombol per baris dibatasi supaya satu baris tabel tidak bisa diledakkan dari
 * sisi Playly. Mereka mengolah 360p/480p/720p/1080p + berkas asli = 5; 8 memberi
 * ruang tumbuh tanpa merusak tata letak di layar HP.
 */
export const PILIHAN_MAKS = 8;

/** Nilai/tulisan untuk "berkas aslinya, tanpa diolah ulang". */
const RESOLUSI_ASLI = "asli";

/**
 * Dicocokkan TANPA peduli huruf besar/kecil: putaran 1 owner mengirim "asli",
 * putaran 2 mengirim label "Asli". Membandingkan persis berarti salah satunya
 * lolos tanpa diterjemahkan dan tombolnya bertulisan "DOWNLOAD Asli".
 */
function adalahAsli(teks: string): boolean {
  return teks.trim().toLowerCase() === RESOLUSI_ASLI;
}

/** Nilai `res` yang sah, apa adanya (tanpa diubah huruf besar/kecilnya). */
function bersihkanRes(mentah: unknown): string | null {
  if (typeof mentah !== "string") return null;
  const r = mentah.trim();
  return RES_RE.test(r) ? r : null;
}

/** Tulisan tombol; kosong/bukan teks -> pakai `res` supaya tombol tak pernah kosong. */
function bersihkanLabel(mentah: unknown, res: string): string {
  if (typeof mentah !== "string") return res;
  const l = mentah.trim().replace(/\s+/g, " ");
  if (!l) return res;
  return l.length > LABEL_MAKS ? l.slice(0, LABEL_MAKS) : l;
}

/**
 * Kembar diperiksa tanpa peduli huruf besar/kecil ("480P" = "480p") supaya tak
 * ada dua tombol yang terbaca sama, TAPI yang disimpan tetap ejaan asli dari
 * Playly — yang pertama datang yang dipakai.
 */
function sudahAda(kumpulan: PilihanUnduhPlayly[], res: string): boolean {
  const r = res.toLowerCase();
  return kumpulan.some((p) => p.res.toLowerCase() === r);
}

/** Bentuk putaran 2: daftar objek {res,label}. */
function bacaDaftarPilihan(daftar: unknown[]): PilihanUnduhPlayly[] {
  const hasil: PilihanUnduhPlayly[] = [];
  for (const item of daftar) {
    const rec = asRecord(item);
    if (!rec) continue;
    const res = bersihkanRes(rec.res);
    if (!res || sudahAda(hasil, res)) continue;
    hasil.push({ res, label: bersihkanLabel(rec.label, res) });
    if (hasil.length === PILIHAN_MAKS) break;
  }
  return hasil;
}

/** Bentuk putaran 1: daftar teks resolusi; tulisan tombol = nilainya sendiri. */
function bacaDaftarResolusi(daftar: unknown[]): PilihanUnduhPlayly[] {
  const hasil: PilihanUnduhPlayly[] = [];
  for (const item of daftar) {
    const res = bersihkanRes(item);
    if (!res || sudahAda(hasil, res)) continue;
    hasil.push({ res, label: res });
    if (hasil.length === PILIHAN_MAKS) break;
  }
  return hasil;
}

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
 * Mendukung DUA bentuk isi: `pilihan: {res,label}[]` (putaran 2, dipakai kalau
 * menghasilkan minimal satu tombol) dan `resolusi: string[]` (putaran 1, jalur
 * cadangan). Keduanya dinormalkan ke SATU bentuk `PilihanUnduhPlayly[]` di sini,
 * supaya tampilan tak perlu tahu Playly mengirim versi yang mana.
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

  const mentahPilihan = unduh.pilihan;
  const mentahResolusi = unduh.resolusi;

  // `pilihan` ADA tapi bukan array = kontrak di luar dugaan, jangan diam-diam
  // dilewati: contoh kode owner memanggil .forEach di atasnya dan akan meledak.
  const adaPilihan = mentahPilihan !== undefined && mentahPilihan !== null;
  if (adaPilihan && !Array.isArray(mentahPilihan)) {
    return { alasan: "bentuk-tak-dikenali", unduh: null };
  }
  // Tak satu pun dari dua bentuk yang dikenal -> laporkan, jangan samakan dengan
  // "tidak ada unduhan".
  if (!Array.isArray(mentahPilihan) && !Array.isArray(mentahResolusi)) {
    return { alasan: "bentuk-tak-dikenali", unduh: null };
  }

  // `pilihan` MENANG kalau isinya terpakai, sisanya turun ke `resolusi`.
  // Satu beda yang disengaja dari contoh owner (`v.unduh.pilihan ||
  // v.unduh.resolusi.map(...)`): array KOSONG itu "truthy" di JavaScript, jadi
  // `pilihan: []` membuat contoh aslinya menggambar baris Playly TANPA satu pun
  // tombol. Di sini keadaan itu turun ke `resolusi`.
  const dariPilihan = Array.isArray(mentahPilihan) ? bacaDaftarPilihan(mentahPilihan) : [];
  const pilihan =
    dariPilihan.length > 0
      ? dariPilihan
      : Array.isArray(mentahResolusi)
        ? bacaDaftarResolusi(mentahResolusi)
        : [];

  // Alamatnya sah tapi nol tombol yang bisa ditawarkan = tidak ada yang bisa
  // diunduh. Bukan kesalahan bentuk, jadi jangan dilaporkan sebagai kontrak
  // rusak — hasilnya bagi penonton sama: barisnya tidak digambar.
  if (pilihan.length === 0) return { alasan: "tidak-diizinkan", unduh: null };

  return { alasan: "ada", unduh: { url, pilihan } };
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
 * Tulisan tombol, dari `label` (bukan dari `res`): itu yang dibaca penonton.
 * "asli"/"Asli" ditulis "ASLI" supaya terbaca sebagai pilihan, bukan nama
 * berkas; tulisan lain dibiarkan APA ADANYA ("480p" tetap "480p", bukan
 * "480P") — mengikuti contoh yang diserahkan owner.
 */
export function labelTombolUnduhPlayly(label: string): string {
  return `DOWNLOAD ${adalahAsli(label) ? "ASLI" : label}`;
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
 *
 * Dinilai dari `label`, bukan `res`, dengan alasan yang sama seperti tulisannya:
 * `res` boleh berupa kode yang tak berarti apa pun bagi mata ("orig"), dan warna
 * ada untuk mata.
 */
export function warnaTombolUnduhPlayly(label: string): DownloadButtonColor {
  if (adalahAsli(label)) return "blue";
  const t = label.trim().toLowerCase();
  // "4k"/"2k" ditulis dengan satuan, bukan jumlah baris: parseInt("4k") = 4 dan
  // akan dinilai sebagai resolusi TERENDAH padahal justru yang paling tajam.
  if (/^[0-9]+k$/.test(t)) return "blue";
  const angka = parseInt(t, 10);
  return Number.isFinite(angka) && angka >= 720 ? "blue" : "orange";
}
