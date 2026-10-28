import { NextRequest, NextResponse } from "next/server";
import { incrementAdStat } from "@/lib/store";
import { guardFitur, guardMutation } from "@/lib/request-guard";
import { ADS_ENABLED } from "@/lib/saklar-fitur";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/ads/event { id, type: "view" | "click" } — catat impresi/klik iklan.
//
// SENGAJA TANPA LOGIN: penghitung ini dipicu saat iklan tampil ke pengunjung
// mana pun (app/components/AdBanner.tsx:99 untuk "view", :127 untuk "click",
// RewardedAdModal.tsx:48). Mewajibkan sesi berarti impresi hanya terhitung dari
// pengunjung yang login — angkanya jadi salah, bukan jadi aman.
//
// ⚠️ KOREKSI atas komentar lama di berkas ini: angka ini DULU disebut "cuma
// penghitung vanity". Itu meremehkan — impresi & klik adalah dasar tagihan ke
// sponsor, jadi memalsukannya berarti sengketa uang, bukan angka hiasan.
// Temuan audit 2026-10-24: sebelum ini endpoint-nya bisa dipanggil berulang
// tanpa batas dari situs mana pun.
//
// Yang dipasang: `guardMutation` (tolak lintas-domain + batasi laju). Yang
// TIDAK perlu ditambahkan: pemeriksaan keberadaan iklan — `incrementAdStat`
// sudah melakukannya di lib/store.ts:726-727 (`if (!ad) return`), jadi id
// karangan tidak pernah membuat baris baru. Jangan ditambah lagi di sini.
export async function POST(req: NextRequest) {
  // Fitur ini sedang DIJEDA lewat saklar di lib/saklar-fitur.ts. Digerbang di
  // route juga — bukan cuma disembunyikan di layar — karena alamat API tetap
  // bisa dipanggil langsung oleh siapa pun yang tahu namanya.
  const mati = guardFitur(ADS_ENABLED, "iklan");
  if (mati) return mati;
  // Batasnya tinggi DENGAN SENGAJA: "view" terpicu pada hampir setiap
  // pemuatan halaman beriklan, dan banyak pengunjung Indonesia berbagi satu IP
  // di belakang NAT operator seluler. 600/menit menahan banjir skrip tanpa
  // membuang impresi sah. Nilai utama pagar ini memang ada di cek asal-domain,
  // bukan di angka batasnya.
  const blocked = guardMutation(req, {
    bucket: "ads:event",
    limit: 600,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  let body: { id?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  const id = (body.id ?? "").trim();
  const type = body.type === "click" ? "clicks" : body.type === "view" ? "views" : null;
  if (!id || !type) {
    return NextResponse.json({ error: "id & type wajib." }, { status: 400 });
  }
  await incrementAdStat(id, type);
  return NextResponse.json({ ok: true });
}
