// -------------------------------------------------------------------------
// Penjaga gabungan untuk endpoint yang MENGUBAH data (POST koin):
//   1. Tolak permintaan lintas-domain (anti-CSRF) → 403.
//   2. Batasi laju per-IP (anti banjir/panen massal) → 429.
//
// Pemakaian di route handler (paling atas, sebelum baca body):
//   const blocked = guardMutation(req, { bucket: "coins:checkin", limit: 10, windowMs: 60_000 });
//   if (blocked) return blocked;
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
