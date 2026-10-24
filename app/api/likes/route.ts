import { NextRequest, NextResponse } from "next/server";
import { getLikes, changeLike } from "@/lib/store";
import { getDramaCached } from "@/lib/dramas";
import { guardMutation } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pola id drama. Sama dengan yang dipakai app/api/admin/hardlink/route.ts:19 —
// satu konsep, satu pola, supaya tak ada endpoint yang lebih longgar dari
// saudaranya tanpa alasan.
const ID_RE = /^[a-z0-9-]{1,100}$/i;

export async function GET() {
  const likes = await getLikes();
  return NextResponse.json({ likes });
}

// POST /api/likes { dramaId, action } — naik/turunkan jumlah like satu judul.
//
// SENGAJA TANPA LOGIN, dan itu bukan kelalaian: tombol like dipakai pengunjung
// yang belum punya akun (app/components/LikeButton.tsx:39,
// ActionRail.tsx:69, FeedPlayer.tsx:483). Mewajibkan sesi di sini akan
// mematikan fitur untuk mayoritas pengunjung. Yang DULU hilang dan sekarang
// dipasang adalah pagar penyalahgunaan, bukan pagar identitas:
//   1. `guardMutation` — tolak permintaan dari domain lain + batasi laju.
//   2. Validasi `dramaId` + cek keberadaannya di katalog.
//
// Temuan audit 2026-10-24: tanpa keduanya, siapa pun bisa memalsukan jumlah
// like judul mana pun tanpa batas, DAN menumbuhkan baris sampah tanpa batas —
// `changeLike` memanggil fungsi database `like_change` (lib/store.ts:217) yang
// membuat baris untuk id APA PUN tanpa memeriksa judulnya ada.
export async function POST(req: NextRequest) {
  // Batas laju longgar DENGAN SENGAJA. Kuncinya IP, dan di Indonesia banyak
  // pengunjung berbagi satu IP di belakang NAT operator seluler — batas ketat
  // akan memblokir orang yang tak melakukan apa-apa salah. 120/menit cukup
  // untuk menahan banjir skrip (ribuan per menit) tanpa menyentuh pemakaian
  // manusia. Catatan jujur: penyimpanannya di memori per-instance
  // (lib/rate-limit.ts:7-12), jadi best-effort.
  const blocked = guardMutation(req, {
    bucket: "likes:post",
    limit: 120,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  let body: { dramaId?: string; action?: "like" | "unlike" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const dramaId = body.dramaId?.trim() ?? "";
  if (!ID_RE.test(dramaId)) {
    return NextResponse.json({ error: "dramaId tidak valid." }, { status: 400 });
  }

  try {
    // Judulnya WAJIB ada di katalog. Tanpa ini id karangan apa pun membuat
    // baris baru, dan tabel `likes` tumbuh selamanya tanpa ada yang menyadari.
    // Pembacaannya ber-cache (`getDramaCached`), jadi ini bukan query baru tiap
    // klik — mayoritas panggilan dijawab dari cache katalog yang sama dengan
    // yang dipakai halaman publik.
    const drama = await getDramaCached(dramaId);
    if (!drama) {
      return NextResponse.json(
        { error: "Drama tidak ditemukan." },
        { status: 404 },
      );
    }

    const count = await changeLike(
      dramaId,
      body.action === "unlike" ? "unlike" : "like",
    );
    return NextResponse.json({ ok: true, dramaId, count });
  } catch {
    // Pesan error asli TIDAK diteruskan ke browser: isinya bisa memuat detail
    // Supabase (nama tabel, bentuk query). Pola ini mengikuti perbaikan yang
    // sudah dilakukan di app/api/auth/login/route.ts:143-168 sesudah insiden
    // 2026-09-16 — di sana alasannya ditulis lengkap.
    return NextResponse.json(
      { error: "Gagal menyimpan like. Coba lagi sebentar lagi." },
      { status: 503 },
    );
  }
}
