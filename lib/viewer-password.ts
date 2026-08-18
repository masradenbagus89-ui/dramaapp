/**
 * Aturan password akun PENONTON — satu sumber kebenaran.
 *
 * Dipakai bersama oleh: API daftar, API reset password, dan form di browser.
 * Sebelumnya angka ini ditulis ulang di beberapa berkas, jadi mudah berbeda
 * tanpa ada yang sadar (form menolak 6, server menolak 8 → penonton bingung).
 */
export const MIN_VIEWER_PASSWORD_LEN = 8;
