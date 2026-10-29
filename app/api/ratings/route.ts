import { NextRequest, NextResponse } from "next/server";
import {
  getRatingsFor,
  setRating,
  summarizeRatings,
  RATING_MIN,
  RATING_MAX,
} from "@/lib/store";
import {
  identitasInteraksi,
  opsiCookieTamu,
  TAMU_COOKIE,
  terbitkanTamu,
  type IdentitasInteraksi,
} from "@/lib/tamu";
import { guardMutation } from "@/lib/request-guard";
import { balasanGagal } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ringkasan rating satu drama + suara milik pemanggil (kalau ada). */
export async function GET(req: NextRequest) {
  const dramaId = req.nextUrl.searchParams.get("dramaId");
  if (!dramaId) {
    return NextResponse.json({ error: "dramaId wajib." }, { status: 400 });
  }
  const map = await getRatingsFor(dramaId);
  // Identitas tamu TIDAK diterbitkan di jalur BACA — menerbitkan cookie pada
  // GET berarti tiap pengunjung yang cuma melihat halaman ikut dapat nomor,
  // dan halaman ini di-cache. Nomor lahir saat orangnya benar-benar menilai.
  const id = await identitasInteraksi(req);
  return NextResponse.json({
    ...summarizeRatings(map),
    mine: id ? (map[id.kunci] ?? null) : null,
  });
}

export async function POST(req: NextRequest) {
  // Otorisasi sudah benar (identitas dari sesi, satu rating per email per
  // judul). Yang ditambahkan audit 2026-10-24 adalah pagar penyalahgunaan:
  // tanpa batas laju, satu skrip bisa mengganti-ganti nilai rating tanpa henti
  // dan membebani database, walau hasil akhirnya tetap satu baris per orang.
  const blocked = guardMutation(req, {
    bucket: "ratings:post",
    limit: 30,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  try {
    const body = (await req.json()) as {
      dramaId?: string;
      email?: string;
      stars?: number;
    };
    const dramaId = String(body.dramaId ?? "").trim();
    if (!dramaId) {
      return NextResponse.json({ error: "dramaId wajib." }, { status: 400 });
    }

    // Identitas dari cookie — sesi akun kalau ada, kalau tidak nomor tamu
    // bertanda tangan. Nilai yang dikirim klien TIDAK pernah dipercaya sebagai
    // identitas; `body.email` di tipe di atas sudah tidak dibaca sama sekali.
    //
    // ⚠️ BATAS JUJUR, lebih longgar sejak 2026-10-29: tanpa akun, "satu suara"
    // berarti satu BROWSER, bukan satu orang. Rinciannya + larangan memakai
    // angka ini sebagai structured data Google ada di lib/tamu.ts.
    let id: IdentitasInteraksi | null = await identitasInteraksi(req);
    let cookieTamuBaru: string | null = null;
    if (!id) {
      const tamu = terbitkanTamu();
      if (!tamu) {
        return NextResponse.json(
          { error: "Rating sedang tidak bisa dikirim. Coba lagi nanti." },
          { status: 503 },
        );
      }
      cookieTamuBaru = tamu.token;
      id = { kunci: tamu.kunci, isAdmin: false, tamu: true };
    }

    // Tolak nilai di luar rentang, bukan diam-diam dipotong — supaya klien
    // yang salah kirim tahu penyebabnya.
    const stars = Number(body.stars);
    if (!Number.isInteger(stars) || stars < RATING_MIN || stars > RATING_MAX) {
      return NextResponse.json(
        { error: `Rating harus bilangan bulat ${RATING_MIN}-${RATING_MAX}.` },
        { status: 400 },
      );
    }

    const map = await setRating(dramaId, id.kunci, stars);
    const res = NextResponse.json({
      ok: true,
      ...summarizeRatings(map),
      mine: stars,
    });
    // Hanya saat nomor tamu baru lahir. Memasangnya tiap kali = nomor baru tiap
    // klik bintang, dan satu orang bisa menggeser rata-rata sesukanya.
    if (cookieTamuBaru) {
      res.cookies.set(TAMU_COOKIE, cookieTamuBaru, opsiCookieTamu());
    }
    return res;
  } catch (err) {
    return balasanGagal("api/ratings POST", err, "Rating gagal disimpan. Coba lagi sebentar lagi.");
  }
}
