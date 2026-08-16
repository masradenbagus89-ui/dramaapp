// -------------------------------------------------------------------------
// Helper CORS untuk dashboard. Salin ke: lib/cors.ts
//
// CORS (Cross-Origin Resource Sharing) = aturan browser tentang situs domain
// mana yang boleh memanggil API ini. Ini HANYA berlaku di browser; panggilan
// dari server ke server tidak terpengaruh sama sekali.
//
// Daftar domain diambil dari env CORS_ALLOWED_ORIGINS (dipisah koma), mis:
//   CORS_ALLOWED_ORIGINS=https://dramaapp.vercel.app,http://localhost:3000
//
// SENGAJA TIDAK memakai wildcard "*": kalau suatu saat endpoint ini ikut
// mengirim cookie/token, wildcard membuat browser menyerahkan sesi login ke
// domain mana pun — jalan pintas pencurian sesi.
// -------------------------------------------------------------------------

function daftarDomain(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

/**
 * Header CORS untuk satu permintaan.
 * Kalau asal permintaan tidak terdaftar, header izin TIDAK dikirim
 * (browser otomatis menolak) — default-nya menolak, bukan mengizinkan.
 */
export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    // Beri tahu cache/CDN bahwa balasan berbeda-beda tergantung asal permintaan.
    Vary: "Origin",
  };

  const izin = daftarDomain();
  const asal = (origin ?? "").replace(/\/+$/, "");
  if (asal && izin.includes(asal)) {
    headers["Access-Control-Allow-Origin"] = asal;
    headers["Access-Control-Allow-Methods"] = "GET,OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization";
    headers["Access-Control-Max-Age"] = "86400"; // simpan izin 1 hari
  }
  return headers;
}

/**
 * Jawaban untuk permintaan "izin dulu" (preflight) yang dikirim browser
 * sebelum permintaan sebenarnya. Pasang sebagai handler OPTIONS di tiap route.
 */
export function handlePreflight(req: Request): Response {
  return new Response(null, {
    status: 204, // 204 = berhasil, memang tidak ada isi
    headers: corsHeaders(req.headers.get("origin")),
  });
}
