import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, getAdminEmail } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { getPlaylyRating, setPlaylyVideoRating } from "@/lib/store";
import { parseRatingManual } from "@/lib/rating-video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RATING video yang DIKETIK admin (owner 2026-11-06: "kalau yang belum ada
 * ratingnya bisa kita edit kan?").
 *
 * Kenapa endpoint ini ada: rating selama ini HANYA ikut terbawa saat sebuah
 * video dicocokkan ke IMDb (/api/admin/playly/imdb). Dua keadaan tidak
 * terlayani — video yang belum dicocokkan sama sekali, dan film yang memang
 * tidak punya nilai di IMDb. Nilai yang masuk lewat sini SELALU menang atas
 * angka IMDb (lib/rating-video.ts `ratingTampil`).
 *
 * ⚠️ Isinya BUKAN data internal: rating tampil di kartu video di beranda
 * (lib/playly-publik.ts), jadi endpoint ini mengubah apa yang dilihat seluruh
 * pengunjung. Pagarnya sengaja disalin dari /api/admin/playly/kualitas supaya
 * pintu-pintu ke data Playly tidak berbeda kekuatannya.
 *
 * Catatan rak owasp (skills/owasp/SKILL.md) + backend (skills/backend/SKILL.md):
 *   owasp §1 broken access — otorisasi dicek DI DALAM route handler, bukan
 *     mengandalkan middleware saja (CVE-2025-29927: header
 *     `x-middleware-subrequest` bisa melewati cek yang cuma ada di sana).
 *   owasp §1 A10 gagal-aman — blok `catch` membalas error dan TIDAK menyimpan
 *     apa pun; tak ada jalan yang meloloskan perubahan saat penyimpanan gagal.
 *   owasp §4 mass assignment — yang dibaca dari body hanya dua field, dan
 *     nilainya lewat penyaring `parseRatingManual`, bukan disimpan apa adanya.
 *     Kotak isian di layar BUKAN pagar: siapa pun bisa mengirim body apa saja
 *     ke alamat ini, dan angka ngawur ikut tayang ke penonton.
 *   owasp §4 anti-ReDoS — penyaringnya memakai regex tanpa quantifier
 *     bersarang, jadi teks panjang kiriman orang tak bisa menggantung server.
 *   backend §1 status code — 401 belum login · 400 body tak terbaca ATAU video
 *     belum dipilih · 429 lewat `guardMutation` (ber-`Retry-After`) · 500
 *     kegagalan simpan, tanpa detail internal yang bocor ke klien.
 *     SENGAJA tidak ada 422: nilai yang tak lolos saring bukan penolakan,
 *     melainkan perintah "kembalikan ke angka IMDb" — lihat catatan di POST.
 *   backend §1 rahasia — balasan hanya memuat peta rating; tak ada email,
 *     token, atau jejak internal apa pun.
 *
 * Kontrak:
 *   GET  -> { ok: true, rating: Record<videoId, "7.4"> }
 *   POST { videoId: string, rating: string | number | null } -> { ok: true, rating }
 *
 * POST mengembalikan peta TERBARU supaya layar admin tidak perlu memanggil GET
 * lagi, dan tidak ada jendela waktu di mana layar menampilkan keadaan usang.
 */

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const rating = await getPlaylyRating();
    return NextResponse.json({ ok: true, rating });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal membaca daftar rating.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "playly:rating",
    limit: 60,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  // Identitas dari cookie sesi yang ditandatangani server, BUKAN dari body —
  // supaya pemanggil tidak bisa mengaku jadi admin dengan mengarang isi.
  const email = await getAdminEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { videoId?: unknown; rating?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Isi permintaan tidak bisa dibaca." },
      { status: 400 },
    );
  }

  const videoId = String(body.videoId ?? "").trim();
  if (!videoId) {
    return NextResponse.json({ error: "Video belum dipilih." }, { status: 400 });
  }

  // null / "" / angka di luar 0-10 / teks ngawur semuanya berarti HAPUS rating
  // ketikan, sehingga video kembali memakai angka IMDb. Sengaja tidak dibalas
  // 422: "kembalikan ke IMDb" adalah aksi yang sah dan justru keadaan
  // bawaannya — mengosongkan kotak isian adalah caranya. Yang dijaga di sini
  // bukan "tolak yang salah", melainkan "nilai ngawur tak pernah tersimpan
  // lalu tayang ke penonton".
  const nilai = parseRatingManual(body.rating);

  try {
    const rating = await setPlaylyVideoRating(videoId, nilai);
    return NextResponse.json({ ok: true, rating });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menyimpan perubahan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
