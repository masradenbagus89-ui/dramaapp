// /api/admin/chat — Live Chat dari sisi ADMIN.
//
// GET                  200 { utas: UtasUntukAdmin[] }          kotak masuk
// GET ?utas=<id>       200 { utas: UtasChat, pesan: PesanChat[] } · 404 tak ada
// POST  { utasId, teks }  201 { ok, pesan }   balas member
// PATCH { utasId }        200 { ok }          tandai utas sudah dibaca admin
// 401 = bukan sesi admin · 422 = isian salah.
//
// Membuka utas (GET) sengaja tidak otomatis menandai dibaca: tampilan admin
// memanggil PATCH sendiri saat utasnya benar-benar dibuka di layar.
import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { namaAkun } from "@/lib/nama-akun";
import { idUtasSah, validasiTeksChat } from "@/lib/live-chat";
import {
  ambilUtas,
  daftarPesan,
  daftarUtasAdmin,
  kirimPesan,
  tandaiDibaca,
} from "@/lib/live-chat-simpan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tolak = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

async function bacaBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!(await getAdminEmail(req))) return tolak();
  const utasId = req.nextUrl.searchParams.get("utas");

  try {
    if (utasId === null) return NextResponse.json({ utas: await daftarUtasAdmin() });
    if (!idUtasSah(utasId)) {
      return NextResponse.json({ error: "ID percakapan tidak sah." }, { status: 422 });
    }
    const utas = await ambilUtas(utasId);
    if (!utas) return NextResponse.json({ error: "Percakapan tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ utas, pesan: await daftarPesan(utas) });
  } catch (err) {
    console.error("[admin/chat] gagal membaca", err);
    return NextResponse.json({ error: "Percakapan gagal dimuat." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, { bucket: "admin:chat:kirim", limit: 60, windowMs: 60_000 });
  if (blocked) return blocked;
  const adminEmail = await getAdminEmail(req);
  if (!adminEmail) return tolak();

  const body = await bacaBody(req);
  if (!body) return NextResponse.json({ error: "Isian tidak terbaca." }, { status: 400 });
  if (!idUtasSah(body.utasId)) {
    return NextResponse.json({ error: "ID percakapan tidak sah." }, { status: 422 });
  }
  const teks = validasiTeksChat(body.teks);
  if (!teks.ok) return NextResponse.json({ error: teks.pesan }, { status: 422 });

  try {
    // Admin hanya bisa MEMBALAS utas yang sudah dibuka member — tidak bisa
    // memulai percakapan ke email sembarang (bukan alat kirim pesan massal).
    const utas = await ambilUtas(body.utasId);
    if (!utas) return NextResponse.json({ error: "Percakapan tidak ditemukan." }, { status: 404 });
    const pesan = await kirimPesan({
      emailMember: utas.email,
      namaMember: utas.namaMember,
      dari: "admin",
      namaPengirim: await namaAkun(adminEmail, true),
      teks: teks.data,
    });
    return NextResponse.json({ ok: true, pesan }, { status: 201 });
  } catch (err) {
    console.error("[admin/chat] gagal mengirim", err);
    return NextResponse.json({ error: "Balasan gagal terkirim." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const blocked = guardMutation(req, { bucket: "admin:chat:baca", limit: 120, windowMs: 60_000 });
  if (blocked) return blocked;
  if (!(await getAdminEmail(req))) return tolak();

  const body = await bacaBody(req);
  if (!body) return NextResponse.json({ error: "Isian tidak terbaca." }, { status: 400 });
  if (!idUtasSah(body.utasId)) {
    return NextResponse.json({ error: "ID percakapan tidak sah." }, { status: 422 });
  }
  try {
    await tandaiDibaca("admin", body.utasId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/chat] gagal menandai dibaca", err);
    return NextResponse.json({ error: "Gagal menandai dibaca." }, { status: 500 });
  }
}
