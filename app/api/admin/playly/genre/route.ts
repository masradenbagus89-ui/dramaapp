import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, getAdminEmail } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { getPlaylyGenres, setPlaylyVideoGenre } from "@/lib/store";
import { parseKategoriVideo } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * KATEGORI video untuk baris beranda (owner 2026-09-26).
 *
 * Kenapa endpoint ini ada: owner meminta video masuk beranda "sesuai genre",
 * dan ternyata datanya tidak pernah ada — Playly tidak mengirim genre sama
 * sekali (lib/playly.ts:398), dan diukur di produksi hari itu NOL dari 46
 * video punya kategori. Admin yang memilihnya; di sinilah pilihan itu masuk.
 *
 * Isinya bukan data rahasia, tapi tetap dijaga sesi admin karena ia MENGUBAH
 * apa yang dilihat seluruh pengunjung situs — alasan yang sama persis dengan
 * /api/admin/playly/hidden, dan pagarnya sengaja disalin dari sana supaya dua
 * pintu ke data Playly tidak berbeda kekuatannya.
 *
 * Catatan rak owasp (skills/owasp/SKILL.md):
 *   §1 broken access — otorisasi dicek DI DALAM route handler, bukan
 *     mengandalkan middleware saja (CVE-2025-29927: header
 *     `x-middleware-subrequest` bisa melewati cek yang cuma ada di sana).
 *   §1 A10 gagal-aman — blok `catch` membalas 500 dan TIDAK menyimpan apa pun;
 *     tak ada jalan yang meloloskan perubahan saat penyimpanan gagal.
 *   §4 mass assignment — yang dibaca dari body hanya dua field, dan nilainya
 *     lewat allowlist `parseKategoriVideo`, bukan disimpan apa adanya.
 *
 * Kontrak:
 *   GET  -> { ok: true, genres: Record<videoId, kategori> }
 *   POST { videoId: string, genre: string | null } -> { ok: true, genres }
 *
 * POST mengembalikan peta TERBARU supaya layar admin tidak perlu memanggil GET
 * lagi, dan tidak ada jendela waktu di mana layar menampilkan keadaan usang.
 */

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const genres = await getPlaylyGenres();
    return NextResponse.json({ ok: true, genres });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal membaca daftar kategori.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "playly:genre",
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

  let body: { videoId?: unknown; genre?: unknown };
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

  // null / "" / kategori asing semuanya berarti KOSONGKAN. Sengaja tidak
  // ditolak dengan 400: "kosongkan kategori" adalah aksi yang sah dan sering
  // dipakai, dan membedakan "kosong" dari "salah ketik" di sini cuma menambah
  // jalan tanpa menambah keamanan — yang penting nilai ngawur tak pernah
  // tersimpan (allowlist di lib/types.ts `parseKategoriVideo`).
  const kategori = parseKategoriVideo(body.genre);

  try {
    const genres = await setPlaylyVideoGenre(videoId, kategori);
    return NextResponse.json({ ok: true, genres });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menyimpan perubahan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
