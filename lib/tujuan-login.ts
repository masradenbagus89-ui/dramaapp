/**
 * Alamat balik sesudah login, dan kode kesalahan yang BOLEH tampil di URL.
 *
 * Kenapa dipisah dari route: form login harus jalan walau JavaScript halaman
 * belum menempel. Browser lalu mengirim form biasa, dan server membalas dengan
 * pindah halaman. Password TIDAK BOLEH ikut di alamat — yang ikut cuma kode
 * pendek di bawah, lalu kalimatnya disusun di sini.
 */

const KODE_GALAT = [
  "kosong",
  "format",
  "admin",
  "akun",
  "asal",
  "limit",
  "config",
  "sesi",
  "database",
  "server",
] as const;

export type KodeGalatLogin = (typeof KODE_GALAT)[number];

export function pesanGalatLogin(kode: string | undefined): string | null {
  switch (kode) {
    case "kosong":
      return "Email dan password wajib diisi.";
    case "format":
      return "Format email tidak valid.";
    case "admin":
      return "Password admin salah. Pakai password admin — bukan password akun penonton. Kalau belum punya password pribadi, tanya admin yang menambahkan akun ini.";
    case "akun":
      return "Email atau password salah.";
    case "asal":
      return "Permintaan ditolak: asal tidak dikenal. Buka lagi halaman login dari alamat yang sama, lalu coba sekali lagi.";
    case "limit":
      return "Terlalu banyak permintaan. Coba lagi sebentar lagi.";
    case "config":
      return "Login admin belum dikonfigurasi (ADMIN_PASSWORD / AUTH_SECRET belum di-set di server).";
    case "sesi":
      return "Login belum aktif (AUTH_SECRET belum di-set di server).";
    case "database":
      return "Server database sedang tidak merespons, jadi login belum bisa diproses. Ini BUKAN karena email atau password kamu salah — coba lagi beberapa menit lagi.";
    case "server":
      return "Login gagal diproses karena gangguan di server. Coba lagi beberapa saat lagi.";
    default:
      return null;
  }
}

/**
 * Hanya alamat di dalam situs ini. Menolak situs lain, alamat protokol
 * (`//evil`), dan lompatan folder (`..`) supaya parameter `next` tidak
 * dipakai memindahkan orang ke luar Layarindo.
 */
export function nextAman(raw: unknown): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (s.length < 2 || s.length > 200) return null;
  if (!s.startsWith("/") || s.startsWith("//")) return null;
  if (s.startsWith("/login")) return null;
  if (s.includes("\\") || s.includes("://") || s.includes("..")) return null;
  if (/[\u0000-\u001f]/.test(s)) return null;
  return s;
}

/** Admin yang datang dari panel kembali ke panel. Selain itu ke Beranda. */
export function tujuanSetelahMasuk(
  role: "admin" | "viewer",
  next: string | null,
): string {
  if (role === "admin" && next?.startsWith("/admin")) return next;
  return "/beranda";
}
