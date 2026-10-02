import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, getAdminEmail } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { getPlaylyUnduhan, setPlaylyUnduhanVideo } from "@/lib/store";
import { parseDownloadProviders } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Provider unduhan per video Playly (Google Share / Telegram / Mega / ...).
 *
 * Dijaga sesi admin karena ia MENGUBAH apa yang dilihat seluruh pengunjung —
 * dan lebih dari itu: isinya berakhir di atribut `href` halaman penonton, jadi
 * siapa pun yang bisa menulis ke sini bisa menaruh alamat di situs kita.
 * Otorisasinya ada DI DALAM route ini, bukan menumpang middleware saja
 * (skills/owasp/SKILL.md §1 — CVE-2025-29927: cek yang hanya ada di middleware
 * bisa dilewati lewat satu header).
 *
 * Kontrak:
 *   GET  -> { ok: true, unduhan: { [videoId]: DownloadProvider[] } }
 *   POST { videoId: string, providers: DownloadProvider[] }
 *        -> { ok: true, unduhan, disimpan: number, dibuang: number }
 *
 * POST mengembalikan peta TERBARU (pola yang sama dengan route hidden) supaya
 * layar admin tidak perlu memanggil GET lagi dan tak ada jendela waktu di mana
 * layarnya menampilkan keadaan usang.
 *
 * `disimpan`/`dibuang` dikirim APA ADANYA supaya admin tahu kalau ada baris
 * yang ditolak penyaring (alamat bukan http/https, nama kosong). Tanpa angka
 * ini, baris yang dibuang hilang diam-diam dan admin mengira sudah tersimpan.
 *
 * Catatan status: kegagalan validasi dibalas 400, mengikuti route Playly
 * tetangganya (app/api/admin/playly/hidden/route.ts:66). Rak backend
 * menganjurkan 422 untuk "terbaca tapi isinya salah", tapi yang lebih mahal
 * adalah DUA konvensi berbeda di satu keluarga endpoint — konsistensi kode yang
 * sudah ada menang (§4.3).
 */

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const unduhan = await getPlaylyUnduhan();
    return NextResponse.json({ ok: true, unduhan });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal membaca daftar provider unduhan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "playly:unduhan",
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

  let body: { videoId?: unknown; providers?: unknown };
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
  // Harus array ASLI. Daftar kosong SAH (artinya "hapus semua provider video
  // ini"), tapi field yang hilang/salah bentuk bukan — itu tanda pemanggilnya
  // keliru, dan menganggapnya "kosong" akan MENGHAPUS data yang sudah ada.
  if (!Array.isArray(body.providers)) {
    return NextResponse.json(
      { error: "Daftar provider harus berupa array." },
      { status: 400 },
    );
  }

  // Disaring di sini, BUKAN disimpan mentah: penyaring hanya memungut field
  // yang dikenalnya (nama/kualitas/alamat/warna/catatan/tutorial), jadi field
  // asing yang diselipkan ke body tidak pernah ikut tersimpan (anti mass
  // assignment), dan alamat non-http/https ditolak (anti XSS lewat `href`).
  const diminta = body.providers.length;
  const bersih = parseDownloadProviders(body.providers, { kualitasOpsional: true });

  try {
    const unduhan = await setPlaylyUnduhanVideo(videoId, bersih);
    return NextResponse.json({
      ok: true,
      unduhan,
      disimpan: bersih.length,
      dibuang: diminta - bersih.length,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menyimpan perubahan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
