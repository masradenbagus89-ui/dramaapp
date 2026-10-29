// -------------------------------------------------------------------------
// IDENTITAS TAMU — supaya penonton bisa berkomentar & memberi bintang TANPA
// punya akun.
//
// KENAPA ADA (owner, arahan Kang Dedi 2026-10-29): login & daftar dihapus untuk
// penonton, TAPI owner tetap meminta "viewer masih bisa kasih rating komen".
// Sebelum ini kedua endpoint itu menolak 401 tanpa sesi login — jadi membuang
// login tanpa pengganti berarti keduanya mati total, bukan sekadar kehilangan
// tombol masuk.
//
// APA ISINYA: satu nomor acak yang lahir sendiri di browser penonton, disimpan
// di cookie HttpOnly yang DITANDATANGANI dengan kunci yang sama dengan sesi
// (AUTH_SECRET). Nomor itu bukan identitas orang — ia cuma pembeda, supaya
// "satu suara per orang" pada rating masih berarti sesuatu dan supaya penonton
// bisa menghapus komentarnya sendiri.
//
// ⚠️ BATAS JUJUR — BACA SEBELUM MENGANDALKAN ANGKANYA.
// Nomor tamu hidup di browser. Menghapus cookie, membuka jendela samaran, atau
// pindah perangkat = dapat nomor BARU, dan orang yang sama bisa menilai lagi.
// Jadi rating di sini artinya "satu BROWSER satu suara", bukan "satu ORANG satu
// suara". Itu LEBIH longgar daripada sebelumnya (dulu satu akun satu suara).
// Konsekuensinya, dan ini tidak boleh dilupakan:
//   • Rating penonton TETAP DILARANG jadi structured data Google — larangan yang
//     sudah berlaku sejak catatan BATAS JUJUR di lib/store.ts:317 dan sekarang
//     makin penting. `lib/structured-data.ts` memakai rating IMDb asli; jangan
//     ditukar.
//   • Angkanya cukup untuk "suara penonton", tidak cukup untuk keputusan uang.
// Cara menutupnya kalau suatu saat perlu: nyalakan kembali akun penonton
// (`AKUN_PENONTON_ENABLED` di lib/saklar-fitur.ts) — jalur sesi lamanya masih
// utuh dan didahulukan oleh `identitasInteraksi` di bawah.
//
// YANG TIDAK IKUT LONGGAR — sengaja, dan jangan disamakan:
// `resolveUserEmail` (lib/session.ts) TIDAK disentuh sama sekali. Koin, paywall,
// kode pemulihan, dan daftar admin tetap mensyaratkan sesi bertanda tangan yang
// sungguhan. Berkas ini HANYA dipakai komentar & rating.
// -------------------------------------------------------------------------
import crypto from "node:crypto";
import {
  bacaPayloadBertandaTangan,
  readCookie,
  resolveUserEmail,
  tandaTanganiPayload,
} from "@/lib/session";

/** Cookie penyimpan nomor tamu. Terpisah dari cookie sesi admin & penonton. */
export const TAMU_COOKIE = "dramaku_tamu";

/**
 * Umur cookie tamu: 1 tahun.
 *
 * Jauh lebih panjang daripada sesi login (7 hari) DENGAN SENGAJA — ini bukan
 * kunci masuk ke apa pun, isinya cuma nomor pembeda. Umur pendek justru
 * merugikan penonton: begitu kedaluwarsa, komentar yang pernah ia tulis tak
 * lagi bisa ia hapus sendiri.
 */
export const TAMU_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Awalan kunci tamu. Dipilih supaya MUSTAHIL bertabrakan dengan email asli —
 * ":" tidak sah di bagian lokal email yang tidak dikutip.
 */
const AWALAN = "tamu:";

type PayloadTamu = { tid: string; exp: number };

/** Nama tampilan kalau penonton tidak mengisi apa-apa. */
export const NAMA_TAMU_BAWAAN = "Penonton";

/** Batas panjang nama tampilan tamu. */
export const MAKS_NAMA_TAMU = 24;

/**
 * Nomor acak 16 byte dalam HEX.
 *
 * HEX, bukan base64url, DAN ITU WAJIB: kunci rating dilewatkan `normEmail` di
 * lib/store.ts yang menurunkannya jadi huruf kecil. Base64url memuat huruf
 * besar, jadi nomor yang sama akan berubah bentuk saat disimpan dan penonton
 * kehilangan suaranya sendiri. Hex cuma 0-9a-f — kebal terhadap itu.
 */
function nomorAcak(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Terbitkan identitas tamu BARU: token untuk dipasang sebagai cookie, beserta
 * kunci yang langsung bisa dipakai menyimpan komentar/rating permintaan ini.
 *
 * Keduanya dipulangkan bersama DENGAN SENGAJA. Kalau hanya tokennya, pemanggil
 * harus membongkar token itu lagi untuk tahu kuncinya — dua jalan menghitung
 * hal yang sama, dan yang satu bisa menyimpang dari yang lain.
 *
 * `null` kalau AUTH_SECRET belum dipasang — gagal-mengunci, sama dengan jalur
 * sesi: lebih baik komentar ditolak daripada menerima identitas yang tak bisa
 * dibuktikan.
 */
export function terbitkanTamu(): { token: string; kunci: string } | null {
  const tid = nomorAcak();
  const payload: PayloadTamu = { tid, exp: Date.now() + TAMU_MAX_AGE * 1000 };
  const token = tandaTanganiPayload(payload);
  return token ? { token, kunci: `${AWALAN}${tid}` } : null;
}

/**
 * Opsi cookie tamu. `httpOnly` supaya JavaScript halaman tak bisa membacanya
 * (dan karena itu tak bisa dipakai sidik-jari lintas-situs oleh skrip pihak
 * ketiga); `sameSite: lax` supaya tidak ikut terkirim pada permintaan dari
 * situs lain.
 */
export function opsiCookieTamu() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TAMU_MAX_AGE,
  };
}

/**
 * Kunci tamu dari cookie permintaan ("tamu:<hex>"), atau `null` kalau belum
 * ada / tanda tangannya tidak sah / sudah kedaluwarsa.
 */
export function bacaKunciTamu(req: Request): string | null {
  const token = readCookie(req.headers.get("cookie"), TAMU_COOKIE);
  const payload = bacaPayloadBertandaTangan<PayloadTamu>(token);
  if (!payload) return null;
  if (typeof payload.tid !== "string" || !/^[0-9a-f]{32}$/.test(payload.tid)) {
    return null;
  }
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return `${AWALAN}${payload.tid}`;
}

/** True kalau kunci ini milik tamu (bukan email akun sungguhan). */
export function kunciTamu(kunci: string): boolean {
  return kunci.startsWith(AWALAN);
}

/**
 * Karakter yang DIBUANG dari nama tamu: kendali C0/C1, plus penanda arah teks
 * Unicode (U+200E…U+200F, U+202A…U+202E, U+2066…U+2069).
 *
 * Kenapa penanda arah ikut dibuang, padahal ia bukan karakter kendali biasa:
 * dengan U+202E sebuah nama bisa digambar TERBALIK di layar sehingga terbaca
 * seperti nama orang lain — menyamar tanpa satu pun karakter mencurigakan yang
 * terlihat. Nama tamu bebas diketik siapa saja, jadi celah itu nyata di sini.
 */
const KARAKTER_TERLARANG =
  /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

/**
 * Bersihkan nama tampilan yang diketik penonton.
 *
 * Tamu memilih namanya sendiri, jadi teks ini DATANG DARI LUAR dan tidak boleh
 * dipercaya mentah-mentah. Yang dilakukan di sini:
 *   • buang karakter kendali & penanda arah (lihat KARAKTER_TERLARANG);
 *   • rapatkan spasi beruntun — pagar terhadap nama yang "didorong" keluar
 *     layar dengan puluhan spasi;
 *   • potong di MAKS_NAMA_TAMU supaya satu nama tidak merusak tata letak.
 *
 * Tidak ada yang di-escape di sini: React yang menggambar namanya sudah
 * meng-escape sendiri, dan meng-escape dua kali justru menampilkan "&amp;".
 */
export function bersihkanNamaTamu(mentah: unknown): string {
  const teks = String(mentah ?? "")
    .replace(KARAKTER_TERLARANG, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAKS_NAMA_TAMU)
    .trim();
  return teks || NAMA_TAMU_BAWAAN;
}

/** Identitas yang berhak berkomentar / memberi bintang. */
export type IdentitasInteraksi = {
  /** Kunci penyimpanan: email akun, atau "tamu:<hex>". */
  kunci: string;
  /** Hak admin — HANYA dari sesi admin bertanda tangan, tak pernah dari tamu. */
  isAdmin: boolean;
  /** True kalau identitas ini tamu (belum/tanpa akun). */
  tamu: boolean;
};

/**
 * Siapa yang sedang berinteraksi, untuk komentar & rating.
 *
 * URUTANNYA PENTING: sesi akun sungguhan DIDAHULUKAN. Kalau suatu saat
 * `AKUN_PENONTON_ENABLED` dinyalakan lagi, penonton yang login langsung kembali
 * memakai identitas akunnya — komentar & rating lamanya tetap miliknya, dan
 * cookie tamu yang masih nyangkut di browsernya tidak mengambil alih.
 *
 * Memulangkan `null` hanya kalau tidak ada sesi DAN tidak ada cookie tamu yang
 * sah. Pemanggil menjawabnya dengan menerbitkan cookie tamu baru lalu tetap
 * memproses permintaannya — lihat `app/api/comments/route.ts`.
 */
export async function identitasInteraksi(
  req: Request,
): Promise<IdentitasInteraksi | null> {
  const sesi = await resolveUserEmail(req);
  if (sesi) return { kunci: sesi.email, isAdmin: sesi.isAdmin, tamu: false };

  const tamu = bacaKunciTamu(req);
  if (tamu) return { kunci: tamu, isAdmin: false, tamu: true };

  return null;
}


/** Batas panjang email & website yang diketik penonton. */
export const MAKS_EMAIL_TAMU = 120;
export const MAKS_WEBSITE_TAMU = 200;

/**
 * Bersihkan EMAIL kontak yang diketik penonton. `null` = tidak disimpan.
 *
 * Kolomnya OPSIONAL (owner 2026-10-29), jadi kosong itu SAH — bukan kesalahan.
 * Yang ditolak cuma yang jelas-jelas bukan email, supaya kolomnya tidak jadi
 * tempat menitipkan teks sembarangan.
 *
 * Sengaja TIDAK memakai regex email yang "ketat": alamat email sah jauh lebih
 * liar daripada yang biasa diduga, dan penyaring ketat menolak orang sungguhan.
 * Kita juga tidak mengirim apa pun ke alamat ini, jadi tak ada yang rusak kalau
 * sebuah alamat tak terkirim — cukup pastikan bentuknya masuk akal.
 */
export function bersihkanEmailTamu(mentah: unknown): string | null {
  const teks = String(mentah ?? "").trim().slice(0, MAKS_EMAIL_TAMU);
  if (!teks) return null;
  // satu "@", ada isi di kedua sisi, ada titik di belakang, tanpa spasi.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teks)) return null;
  return teks.toLowerCase();
}

/**
 * Bersihkan WEBSITE yang diketik penonton. `null` = tidak disimpan.
 *
 * 🔒 PAGAR KEAMANAN — jangan dilonggarkan:
 *
 * 1. **Hanya `http:` dan `https:`.** Alamat seperti `javascript:alert(1)` yang
 *    lolos ke sini lalu digambar sebagai tautan = XSS yang tersimpan PERMANEN
 *    di database dan menyerang SETIAP pembaca komentar itu, bukan cuma satu
 *    orang. Ini jenis kerusakan yang paling mahal: ia menyebar sendiri dan
 *    tidak terlihat sampai ada yang mengklik.
 * 2. **Diurai dengan `new URL()`**, bukan dicocokkan regex. Penyaring berbasis
 *    teks berulang kali kalah oleh variasi penulisan (`JaVaScRiPt:`, spasi/tab
 *    di tengah skema, `javascript:`); pengurai bawaan platform mengikuti
 *    aturan yang sama dengan browser yang nanti membukanya.
 *
 * Penonton boleh mengetik "contoh.com" tanpa skema — itu kebiasaan wajar, jadi
 * `https://` ditambahkan sendiri, BUKAN ditolak.
 */
export function bersihkanWebsiteTamu(mentah: unknown): string | null {
  const teks = String(mentah ?? "").trim().slice(0, MAKS_WEBSITE_TAMU);
  if (!teks) return null;
  // Tanpa skema = anggap https. Yang BERSKEMA tetap diurai apa adanya, supaya
  // skema berbahaya tertangkap penyaring di bawah, bukan tersembunyi.
  const calon = /^[a-z][a-z0-9+.-]*:/i.test(teks) ? teks : `https://${teks}`;
  try {
    const url = new URL(calon);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null; // "https://localhost" dsb.
    return url.toString();
  } catch {
    return null;
  }
}
