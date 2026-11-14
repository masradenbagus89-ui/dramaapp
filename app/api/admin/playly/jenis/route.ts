import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, getAdminEmail } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { getPlaylyJenis, setPlaylyVideoJenis } from "@/lib/store";
import { parseJenisVideo } from "@/lib/jenis-video";
import { segarkanCachePublik } from "@/lib/cache-publik";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * JENIS TAYANGAN video Playly — film layar lebar atau episode serial
 * (owner 2026-11-05).
 *
 * Kenapa endpoint ini ada: rekan meng-upload drama berseri lewat Playly dan
 * judulnya mendarat di seksi "Film Terbaru". Playly tidak pernah mengirim
 * penanda jenis, dan tebakan otomatis dari judul/durasi sudah DIUKUR di 489
 * video produksi lalu ditolak — angkanya di lib/jenis-video.ts. Admin yang
 * menentukan; di sinilah pilihan itu masuk.
 *
 * Isinya bukan data rahasia, tapi tetap dijaga sesi admin karena ia MENGUBAH
 * apa yang dilihat seluruh pengunjung situs — alasan yang sama persis dengan
 * /api/admin/playly/genre, dan pagarnya sengaja disalin dari sana supaya dua
 * pintu ke data Playly tidak berbeda kekuatannya.
 *
 * Catatan rak backend (skills/backend/SKILL.md §1) + owasp (skills/owasp/SKILL.md):
 *   §1 kontrak — status dipakai sesuai artinya: 401 belum login · 400 permintaan
 *     tak terbaca · 500 kegagalan tak terduga dengan pesan generik. Tidak ada
 *     kegagalan yang dikirim sebagai 200.
 *   §1 broken access — otorisasi dicek DI DALAM route handler, bukan
 *     mengandalkan middleware saja (CVE-2025-29927: header
 *     `x-middleware-subrequest` bisa melewati cek yang cuma ada di sana).
 *   §1 A10 gagal-aman — blok `catch` membalas 500 dan TIDAK menyimpan apa pun;
 *     tak ada jalan yang meloloskan perubahan saat penyimpanan gagal.
 *   §4 mass assignment — yang dibaca dari body hanya dua field, dan nilainya
 *     lewat allowlist `parseJenisVideo`, bukan disimpan apa adanya.
 *
 * Kontrak:
 *   GET  -> { ok: true, jenis: Record<videoId, "film" | "series"> }
 *   POST { videoId: string, jenis: "film" | "series" | null } -> { ok: true, jenis }
 *
 * POST mengembalikan peta TERBARU supaya layar admin tidak perlu memanggil GET
 * lagi, dan tidak ada jendela waktu di mana layar menampilkan keadaan usang.
 */

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const jenis = await getPlaylyJenis();
    return NextResponse.json({ ok: true, jenis });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal membaca daftar jenis.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "playly:jenis",
    limit: 60,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  // Identitas diambil dari cookie sesi yang ditandatangani server, BUKAN dari
  // body — supaya pemanggil tidak bisa mengaku jadi admin dengan mengarang isi.
  const email = await getAdminEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { videoId?: unknown; jenis?: unknown };
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

  // null / "" / nilai asing semuanya berarti KEMBALIKAN KE BAWAAN (film).
  // Sengaja tidak ditolak dengan 400: "kembalikan ke bawaan" adalah aksi yang
  // sah, dan membedakan "kosong" dari "salah ketik" di sini cuma menambah jalan
  // tanpa menambah keamanan — yang penting nilai ngawur tak pernah tersimpan
  // (allowlist di lib/jenis-video.ts `parseJenisVideo`).
  const jenisTerpilih = parseJenisVideo(body.jenis);

  try {
    const jenis = await setPlaylyVideoJenis(videoId, jenisTerpilih);
    segarkanCachePublik();
    return NextResponse.json({ ok: true, jenis });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menyimpan perubahan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
