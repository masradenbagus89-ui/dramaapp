// -------------------------------------------------------------------------
// Pembatas laju (rate limit) sederhana berbasis jendela-tetap (fixed window).
//
// Tujuan: cegah penyalahgunaan massal endpoint koin (mis. 1 alat memanggil
// /coins/checkin ribuan kali dengan banyak email palsu untuk panen koin).
//
// CATATAN JUJUR soal server Vercel: penyimpanan hitungan ini ada di MEMORI tiap
// instance serverless. Vercel bisa menjalankan beberapa instance + mereset saat
// "dingin", jadi batas ini bersifat BEST-EFFORT (cukup memblokir banjir naif
// dari satu klien yang sama). Untuk batas yang ketat lintas-instance perlu
// penyimpanan bersama (mis. Upstash/Redis atau tabel Supabase) — itu langkah
// pengetatan berikutnya, bukan bagian "langkah ringan" ini.
// -------------------------------------------------------------------------

type Hit = { count: number; resetAt: number };

export type RateDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

/**
 * Keputusan pembatas laju MURNI atas `store` yang diberikan (mudah dites:
 * suntik Map + waktu `now` sendiri, tanpa bergantung jam nyata).
 *
 * @param store    peta kunci→hitungan (dimutasi di tempat)
 * @param key      kunci unik (mis. "coins:checkin:1.2.3.4")
 * @param now      waktu sekarang dalam milidetik
 * @param limit    maksimum permintaan per jendela
 * @param windowMs panjang jendela dalam milidetik
 */
export function checkRate(
  store: Map<string, Hit>,
  key: string,
  now: number,
  limit: number,
  windowMs: number,
): RateDecision {
  const hit = store.get(key);

  // Jendela baru (belum ada catatan / jendela lama sudah lewat).
  if (!hit || now >= hit.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  // Sudah mentok di jendela ini → tolak.
  if (hit.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((hit.resetAt - now) / 1000),
    };
  }

  // Masih di bawah batas → naikkan hitungan.
  hit.count += 1;
  return { allowed: true, remaining: limit - hit.count, retryAfterSec: 0 };
}

// --- Pembungkus runtime: pakai jam nyata + penyimpanan tingkat-modul. ---
const store = new Map<string, Hit>();

/** Pembatas laju runtime untuk satu kunci. Lihat catatan best-effort di atas. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateDecision {
  // Pangkas ringan supaya peta tak tumbuh tanpa batas di instance yang awet.
  if (store.size > 10_000) store.clear();
  return checkRate(store, key, Date.now(), limit, windowMs);
}
