import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, getAdminEmail } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { getPlaylyLinkUnduhan, gantiPlaylyLinkUnduhanVideo } from "@/lib/store";
import {
  KUALITAS_UNDUHAN,
  PROVIDER_UNDUHAN,
  validasiLinkUnduhan,
  type LinkUnduhanMasuk,
} from "@/lib/playly-unduhan";
import { bacaDomainUnduhan } from "@/lib/playly-unduhan-domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 4 provider × 2 kualitas — lebih dari ini pasti kiriman yang keliru. */
const MAKS_LINK_PER_VIDEO = PROVIDER_UNDUHAN.length * KUALITAS_UNDUHAN.length;

/**
 * Link unduhan per video Playly — CADANGAN MANUAL di samping skrip impor &
 * webhook (owner 2026-10-05).
 *
 * Dijaga sesi admin karena isinya berakhir di atribut `href` halaman penonton.
 * Otorisasinya ada DI DALAM route ini, bukan menumpang middleware saja
 * (skills/owasp/SKILL.md §1 — CVE-2025-29927).
 *
 * Kontrak:
 *   GET  -> { ok: true, links: LinkUnduhan[] }
 *   POST { videoId, links: [{ provider, quality, url }] }
 *        -> 200 { ok: true, links, disimpan }            (link video itu DIGANTI seluruhnya)
 *        -> 400 { error, ditolak: [{ index, alasan }] }  (NOL yang disimpan)
 *
 * Satu link saja yang tak lolos = SELURUH simpanan ditolak, beda dengan
 * impor/webhook yang meneruskan yang sah. Alasannya: simpanan admin MENGGANTI
 * seluruh link video itu, jadi menyimpan sebagian berarti link lama di kotak
 * yang salah ketik ikut TERHAPUS diam-diam. Admin melihat alasannya per kotak
 * lalu membetulkannya.
 *
 * Kegagalan validasi dibalas 400, bukan 422 seperti saran rak backend: seluruh
 * keluarga route Playly memakai 400 (app/api/admin/playly/hidden/route.ts), dan
 * dua konvensi di satu keluarga endpoint lebih mahal daripada angkanya.
 */

/** Error tak terduga: rincian ke log server, layar admin cukup pesan umum. */
function gagalServer(tahap: string, err: unknown) {
  console.error(
    `[admin/playly/unduhan] gagal ${tahap}: ${err instanceof Error ? err.message : String(err)}`,
  );
  return NextResponse.json(
    { error: `Gagal ${tahap}. Coba lagi sebentar lagi.` },
    { status: 500 },
  );
}

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, links: await getPlaylyLinkUnduhan() });
  } catch (err) {
    return gagalServer("membaca link unduhan", err);
  }
}

export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "playly:unduhan",
    limit: 60,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  // Identitas dari cookie sesi yang ditandatangani server, BUKAN dari body.
  const email = await getAdminEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { videoId?: unknown; links?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Isi permintaan tidak bisa dibaca." }, { status: 400 });
  }

  const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
  if (!videoId) {
    return NextResponse.json({ error: "Video belum dipilih." }, { status: 400 });
  }
  // Harus array ASLI. Daftar kosong SAH ("hapus semua link video ini"), tapi
  // field yang hilang/salah bentuk bukan — menganggapnya kosong akan MENGHAPUS
  // link yang sudah ada.
  if (!Array.isArray(body.links)) {
    return NextResponse.json({ error: "Daftar link harus berupa array." }, { status: 400 });
  }
  if (body.links.length > MAKS_LINK_PER_VIDEO) {
    return NextResponse.json(
      { error: `Maksimal ${MAKS_LINK_PER_VIDEO} link per video.` },
      { status: 400 },
    );
  }

  // videoId diambil dari body UTAMA, bukan dari tiap item — satu simpanan
  // tidak boleh menulis link ke video lain. Hanya provider/quality/url yang
  // dipungut dari item (anti mass assignment).
  const domain = bacaDomainUnduhan();
  const sah: LinkUnduhanMasuk[] = [];
  const ditolak: { index: number; alasan: string }[] = [];
  body.links.forEach((item, index) => {
    const r = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const hasil = validasiLinkUnduhan(
      { videoId, provider: r.provider, quality: r.quality, url: r.url },
      domain,
    );
    if (hasil.ok) sah.push(hasil.link);
    else ditolak.push({ index, alasan: hasil.alasan });
  });
  if (ditolak.length) {
    return NextResponse.json(
      { error: "Ada link yang tidak lolos pemeriksaan. Tidak ada yang disimpan.", ditolak },
      { status: 400 },
    );
  }

  try {
    const links = await gantiPlaylyLinkUnduhanVideo(videoId, sah);
    return NextResponse.json({ ok: true, links, disimpan: sah.length });
  } catch (err) {
    return gagalServer("menyimpan link unduhan", err);
  }
}
