import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, getAdminEmail } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { getPlaylyMetaManual, setPlaylyVideoMetaManual } from "@/lib/store";
import { parseDurasiManual, parseTahunManual } from "@/lib/meta-video-manual";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TAHUN & DURASI video yang DIKETIK admin (owner 2026-11-09: "kalau yang tidak
 * ada gimana cara isi manualnya").
 *
 * KENAPA ADA: keduanya selama ini HANYA bisa datang dari IMDb atau Playly.
 * Film yang tidak ada di IMDb — film lokal, rilisan sangat baru, judul yang
 * tidak ketemu — kedua pojok posternya kosong permanen. Empat kolom lain
 * (kategori, kualitas, jenis, rating) sudah punya isian manual; dua ini
 * tertinggal.
 *
 * Bentuknya MENGIKUTI app/api/admin/playly/rating/route.ts — endpoint saudara
 * terdekatnya. Dua endpoint yang mengerjakan hal sejenis dengan bentuk berbeda
 * memaksa sesi berikutnya membaca keduanya untuk tahu mana yang benar.
 *
 * KEAMANAN (rak backend + owasp, dibuka sebelum berkas ini ditulis):
 *   • admin-only; identitas dari cookie sesi yang DITANDATANGANI server, bukan
 *     dari body — supaya pemanggil tak bisa mengaku admin dengan mengarang isi;
 *   • `guardMutation` membatasi laju tulis (429 ber-`Retry-After`);
 *   • nilai disaring lewat `parseTahunManual` / `parseDurasiManual`, BUKAN
 *     disimpan apa adanya — angka ini tergambar di pojok poster yang dilihat
 *     penonton, dan UI bukan pagar;
 *   • balasan hanya memuat peta meta: nol email, token, atau jejak internal.
 *
 * Status (rak backend §1): 400 body tak terbaca / video belum dipilih ·
 * 401 bukan admin · 429 lewat guardMutation · 500 kegagalan simpan.
 *
 * Kontrak:
 *   GET  -> { ok: true, meta: Record<videoId, { tahun?, durasiDetik? }> }
 *   POST { videoId, tahun?, durasi? } -> { ok: true, meta }
 *
 * SENGAJA tidak ada 422: nilai yang tak lolos saring bukan penolakan,
 * melainkan perintah "kembalikan ke sumber otomatis" — mengosongkan kotak
 * isian adalah caranya. Alasan yang sama persis di endpoint rating.
 *
 * POST mengembalikan peta TERBARU supaya layar admin tak perlu memanggil GET
 * lagi, dan tak ada jendela waktu di mana layar menampilkan keadaan usang.
 */

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const meta = await getPlaylyMetaManual();
    return NextResponse.json({ ok: true, meta });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal membaca daftar meta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "playly:meta",
    limit: 60,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  const email = await getAdminEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { videoId?: unknown; tahun?: unknown; durasi?: unknown };
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

  // 🪤 `undefined` DIBEDAKAN dari `null`, dan itu bukan kerewelan: field yang
  // TIDAK dikirim tidak disentuh, sedangkan yang dikirim kosong berarti hapus.
  // Tanpa pembedaan ini, panel yang cuma mengubah durasi akan ikut menghapus
  // tahun yang sudah benar — nol error, dan baru ketahuan saat posternya
  // kehilangan tahun.
  const tahun =
    body.tahun === undefined ? undefined : parseTahunManual(body.tahun);
  const durasiDetik =
    body.durasi === undefined ? undefined : parseDurasiManual(body.durasi);

  try {
    const meta = await setPlaylyVideoMetaManual(videoId, { tahun, durasiDetik });
    return NextResponse.json({ ok: true, meta });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menyimpan perubahan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
