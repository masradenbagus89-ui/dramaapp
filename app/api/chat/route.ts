// /api/chat — Live Chat dari sisi MEMBER (percakapan miliknya sendiri saja).
//
// GET              200 { pesan: PesanChat[], adaBaru }   (utas belum ada = pesan [])
// GET ?ringkas=1   200 { adaBaru }   — untuk lencana; tak memuat isi pesan
// POST { teks }    201 { ok, pesan } · 422 teks salah · 429 terlalu sering
// PATCH            200 { ok }  — tandai pesan admin sudah dibaca
// 401 = belum login (semua method).
//
// 🔒 Tak ada parameter "utas mana": utas SELALU diturunkan dari email sesi
// (idUtas), jadi member mustahil membuka percakapan orang lain (anti-IDOR).
// Membaca (GET) sengaja TIDAK menandai dibaca — itu perintah terpisah (PATCH),
// supaya lencana yang sekadar bertanya tak ikut menghapus tanda "pesan baru".
import { NextRequest, NextResponse } from "next/server";
import { resolveUserEmail } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { rateLimit } from "@/lib/rate-limit";
import { namaAkun } from "@/lib/nama-akun";
import { adaPesanBaru, validasiTeksChat } from "@/lib/live-chat";
import {
  ambilUtas,
  dibacaSampai,
  daftarPesan,
  idUtas,
  kirimPesan,
  tandaiDibaca,
} from "@/lib/live-chat-simpan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Per akun per menit: mengetik cepat tetap lolos, skrip banjir tidak. */
const BATAS_PESAN_PER_MENIT = 15;
const SATU_MENIT = 60_000;

const belumLogin = () =>
  NextResponse.json({ error: "Masuk dulu untuk memakai Live Chat." }, { status: 401 });

export async function GET(req: NextRequest) {
  const sesi = await resolveUserEmail(req);
  if (!sesi) return belumLogin();

  try {
    const utasId = idUtas(sesi.email);
    const [utas, baca] = await Promise.all([ambilUtas(utasId), dibacaSampai("member", utasId)]);
    const adaBaru = adaPesanBaru(utas, "member", baca);
    if (req.nextUrl.searchParams.get("ringkas") === "1") {
      return NextResponse.json({ adaBaru });
    }
    return NextResponse.json({ pesan: utas ? await daftarPesan(utas) : [], adaBaru });
  } catch (err) {
    console.error("[chat] gagal membaca", err);
    return NextResponse.json({ error: "Percakapan gagal dimuat." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, { bucket: "chat:kirim", limit: 30, windowMs: SATU_MENIT });
  if (blocked) return blocked;

  const sesi = await resolveUserEmail(req);
  if (!sesi) return belumLogin();

  let body: { teks?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Pesan tidak terbaca." }, { status: 400 });
  }
  const teks = validasiTeksChat(body.teks);
  if (!teks.ok) return NextResponse.json({ error: teks.pesan }, { status: 422 });

  const laju = rateLimit(`chat:akun:${sesi.email}`, BATAS_PESAN_PER_MENIT, SATU_MENIT);
  if (!laju.allowed) {
    return NextResponse.json(
      { error: "Terlalu cepat. Tunggu sebentar sebelum mengirim lagi." },
      { status: 429, headers: { "Retry-After": String(laju.retryAfterSec) } },
    );
  }

  try {
    const nama = await namaAkun(sesi.email, sesi.isAdmin);
    const pesan = await kirimPesan({
      emailMember: sesi.email,
      namaMember: nama,
      dari: "member",
      namaPengirim: nama,
      teks: teks.data,
    });
    return NextResponse.json({ ok: true, pesan }, { status: 201 });
  } catch (err) {
    console.error("[chat] gagal mengirim", err);
    return NextResponse.json({ error: "Pesan gagal terkirim. Coba lagi." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const blocked = guardMutation(req, { bucket: "chat:baca", limit: 60, windowMs: SATU_MENIT });
  if (blocked) return blocked;

  const sesi = await resolveUserEmail(req);
  if (!sesi) return belumLogin();

  try {
    await tandaiDibaca("member", idUtas(sesi.email));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[chat] gagal menandai dibaca", err);
    return NextResponse.json({ error: "Gagal menandai dibaca." }, { status: 500 });
  }
}
