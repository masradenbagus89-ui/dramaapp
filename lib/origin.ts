// -------------------------------------------------------------------------
// Penjaga "asal permintaan" (anti-CSRF) + pembaca alamat IP klien.
//
// CSRF = situs jahat diam-diam memicu permintaan dari browser korban yang
// masih login. Pertahanan paling sederhana: pastikan permintaan yang mengubah
// data (POST) datang dari situs kita sendiri — bukan dari domain asing.
//
// Browser SELALU mengirim header `Origin` pada POST (baik sesama domain maupun
// lintas domain), jadi kita cukup bandingkan host `Origin` dengan host `Host`.
// Fungsi-fungsi di sini MURNI (tanpa dependency Next) supaya mudah dites.
// -------------------------------------------------------------------------

/**
 * True kalau permintaan berasal dari domain kita sendiri (atau tanpa Origin).
 *
 * - Origin ada & host-nya == host server → sesama domain (aman).
 * - Origin ada tapi host beda → lintas domain (kemungkinan CSRF) → false.
 * - Origin tidak ada (klien non-browser / server-to-server) → true (izinkan;
 *   serangan CSRF dari browser PASTI membawa Origin, jadi ini bukan celah).
 * - Origin tidak bisa di-parse → false (anggap mencurigakan).
 */
export function isSameOrigin(
  origin: string | null,
  host: string | null,
): boolean {
  if (!origin) return true;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Ambil alamat IP klien dari header proxy (Vercel mengisi `x-forwarded-for`).
 * Dipakai sebagai kunci pembatas laju. Kembalikan "unknown" kalau tak ada.
 */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
