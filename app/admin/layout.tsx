import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSessionToken } from "@/lib/session";
import AdminAccessDenied from "@/app/components/admin/AdminAccessDenied";

/**
 * Halaman admin tak boleh muncul di hasil pencarian. robots.txt sudah melarang
 * penelusuran, tapi itu tidak menghapus halaman yang terlanjur ter-index —
 * penanda noindex di bawah yang melakukannya.
 */
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// `nodejs` karena pemeriksaan sesi memakai `node:crypto` (HMAC). Seragam dengan
// halaman admin lain yang sudah dijaga di server.
export const runtime = "nodejs";

// Dinyatakan EKSPLISIT walau `cookies()` di bawah sudah memaksanya dinamis.
// Alasannya bukan gaya: sebelum penjaga ini dipasang, `/admin` muncul sebagai
// `○ (Static)` di keluaran `npm run build` — kerangka halaman admin DICETAK saat
// build lalu disajikan dari cache ke siapa pun yang memintanya. Penanda ini
// membuat niatnya terbaca, sehingga refactor berikutnya tidak diam-diam
// menghidupkan kembali pencetakan statis untuk halaman admin.
export const dynamic = "force-dynamic";

/**
 * GERBANG AKSES SATU PINTU untuk SELURUH /admin/* — dijaga di SERVER.
 *
 * KENAPA ADA (temuan audit 2026-10-24, T-3): halaman `/admin` dulu dijaga HANYA
 * oleh pemeriksaan di browser — `app/admin/page.tsx:85-93` membaca
 * `localStorage["dramaku:user"]` lalu mempercayai field `role` apa adanya
 * (`lib/auth.ts:34`). Siapa pun bisa menjalankan satu baris di console
 * browsernya sendiri untuk menanam `{"role":"admin"}`, dan seluruh panel
 * terbuka: formulir drama, manajer admin, setelan 2FA, manajer iklan.
 *
 * Yang sudah meredamnya sejak awal — dan sebabnya ini TINGGI, bukan KRITIS:
 * ke-12 route API admin memverifikasi cookie HMAC di server, jadi tombolnya
 * membalas 401. Yang bocor adalah ISI & STRUKTUR panel, bukan kendali penuh.
 * Tetap harus ditutup: struktur panel memberi tahu penyerang persis endpoint
 * apa saja yang ada dan bentuk datanya.
 *
 * KENAPA DI LAYOUT, bukan ditambal per-halaman: inilah yang diminta TODO di
 * `app/admin/settings/playly/page.tsx:11-13` — "satukan penjagaan semua halaman
 * /admin lewat satu middleware, supaya tidak ada halaman baru yang lupa
 * dijaga". Satu gerbang di sini menjaga `/admin` DAN setiap halaman admin yang
 * dibuat di kemudian hari, tanpa penulisnya perlu ingat memasang penjaga.
 *
 * KENAPA BUKAN `middleware.ts`: project ini SENGAJA tidak memakai middleware
 * sebagai penjaga otorisasi — lihat catatan CVE-2025-29927 di
 * `app/api/admin/playly/unduhan/route.ts:25`. Celah itu membuat satu header
 * buatan penyerang bisa melewati SELURUH cek yang hanya ada di middleware.
 * Layout adalah Server Component biasa: tidak ada header ajaib yang bisa
 * melewatinya.
 *
 * Pemeriksaan per-halaman di `settings/playly`, `videos/playly`, dan
 * `webhooks/playly` SENGAJA DIBIARKAN — pertahanan berlapis (rak owasp §1).
 * Kalau layout ini suatu hari dihapus atau salah di-refactor, ketiganya masih
 * berdiri sendiri.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const jar = await cookies();
  // `verifyAdminSessionToken` memeriksa EMPAT hal sekaligus (lib/session.ts:122):
  // tanda tangan HMAC, masa berlaku, role harus "admin", DAN email masih
  // terdaftar di daftar admin. Butir terakhir penting: admin yang dihapus
  // kehilangan akses seketika, tidak menunggu sesi 7 harinya kedaluwarsa.
  const email = await verifyAdminSessionToken(jar.get(ADMIN_COOKIE)?.value);

  // Default-deny (rak auth §2 butir 5): tak ada sesi admin yang sah = tolak.
  // Yang dikirim ke browser hanya layar penolakan — isi panelnya tidak pernah
  // ikut terkirim, jadi ini bukan "disembunyikan sesudah sampai".
  if (!email) return <AdminAccessDenied />;

  return <>{children}</>;
}
