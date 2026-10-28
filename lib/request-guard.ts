// -------------------------------------------------------------------------
// Penjaga yang dipasang PALING ATAS di route handler. Dua penjaga, dua tugas:
//
// `guardMutation` — untuk endpoint yang MENGUBAH data (POST koin):
//   1. Tolak permintaan lintas-domain (anti-CSRF) → 403.
//   2. Batasi laju per-IP (anti banjir/panen massal) → 429.
//
//   const blocked = guardMutation(req, { bucket: "coins:checkin", limit: 10, windowMs: 60_000 });
//   if (blocked) return blocked;
//
// `guardFitur` — untuk endpoint milik fitur yang sedang DIJEDA lewat saklar di
// `lib/saklar-fitur.ts` (GET maupun POST) → 404.
//
//   const mati = guardFitur(PAYWALL_ENABLED, "koin");
//   if (mati) return mati;
// -------------------------------------------------------------------------
import { NextResponse } from "next/server";
import { isSameOrigin, clientIp } from "@/lib/origin";
import { rateLimit } from "@/lib/rate-limit";

export type GuardOptions = {
  /** Nama "ember" pembatas laju, mis. "coins:checkin" (dipisah per endpoint). */
  bucket: string;
  /** Maksimum permintaan per IP dalam satu jendela. */
  limit: number;
  /** Panjang jendela dalam milidetik. */
  windowMs: number;
};

/**
 * Jalankan penjaga asal + pembatas laju. Kembalikan `NextResponse` (403/429)
 * kalau permintaan ditolak, atau `null` kalau lolos (boleh lanjut).
 */
/**
 * Gerbang SAKLAR FITUR. `aktif` palsu → balas 404; `aktif` benar → `null`
 * (boleh lanjut). Dipakai route milik fitur yang sedang dijeda.
 *
 * KENAPA 404, bukan 403: 403 berarti "fiturnya ada, kamu tak berhak" — itu
 * salah di sini dan membuat penonton merasa dituduh. Saat dijeda, fiturnya
 * memang tidak ada.
 *
 * KENAPA `no-store` WAJIB: tanpa itu, balasan 404 bisa tersimpan di CDN atau
 * browser lalu TERUS disajikan sesudah saklarnya dinyalakan kembali — fitur
 * yang sudah hidup akan terlihat masih mati, tanpa satu pun pesan error.
 */
export function guardFitur(aktif: boolean, nama: string): NextResponse | null {
  if (aktif) return null;
  return NextResponse.json(
    { error: `Fitur ${nama} sedang tidak aktif.` },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

export function guardMutation(
  req: Request,
  opts: GuardOptions,
): NextResponse | null {
  const h = req.headers;

  // 1. Anti-CSRF: harus dari domain kita sendiri.
  if (!isSameOrigin(h.get("origin"), h.get("host"))) {
    return NextResponse.json(
      { error: "Permintaan ditolak: asal tidak dikenal." },
      { status: 403 },
    );
  }

  // 2. Pembatas laju per-IP per-endpoint.
  const decision = rateLimit(
    `${opts.bucket}:${clientIp(h)}`,
    opts.limit,
    opts.windowMs,
  );
  if (!decision.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." },
      {
        status: 429,
        headers: { "Retry-After": String(decision.retryAfterSec) },
      },
    );
  }

  return null;
}
