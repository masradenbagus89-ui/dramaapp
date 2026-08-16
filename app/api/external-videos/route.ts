import { NextRequest, NextResponse } from "next/server";
import { ExternalVideoError, fetchExternalVideos } from "@/lib/external-video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Jalur penerima data video dari API pihak lain (player di-hosting mereka).
 *
 * Browser TIDAK memanggil API penyedia langsung — selalu lewat sini. Alasannya:
 *   1. Kunci API tetap di server, tidak terbaca pengunjung dari tab Network.
 *   2. Alamat embed disaring dulu (wajib https + domain yang diizinkan).
 *   3. Kalau penyedia tidak mengizinkan CORS (aturan situs domain mana yang
 *      boleh memanggil API mereka), panggilan dari server tetap jalan — CORS
 *      hanya ditegakkan di browser.
 *
 * Query opsional: ?q=judul&page=2&id=abc  (hanya 3 ini yang diteruskan)
 * Balasan sukses: { ok: true, count, videos: [...], skipped: n }
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q");
    const page = sp.get("page");
    const id = sp.get("id");

    // Validasi di gerbang: parameter dari luar dibatasi bentuknya dulu,
    // jangan diteruskan mentah ke server penyedia.
    if (q && q.length > 100) {
      return NextResponse.json(
        { error: "Kata kunci terlalu panjang (maksimal 100 karakter)." },
        { status: 400 },
      );
    }
    if (page && !/^\d{1,4}$/.test(page)) {
      return NextResponse.json(
        { error: "Nomor halaman harus angka." },
        { status: 400 },
      );
    }
    if (id && !/^[\w.:@-]{1,200}$/.test(id)) {
      return NextResponse.json(
        { error: "Format id video tidak valid." },
        { status: 400 },
      );
    }

    const { videos, rejected } = await fetchExternalVideos({ q, page, id });

    // Item yang dibuang tidak dikirim mentah ke browser, tapi alasannya
    // dicatat di log server supaya kalau daftarnya kosong kita tahu SEBABNYA
    // (paling sering: domain penyedia belum ditulis di EXTERNAL_VIDEO_EMBED_HOSTS).
    if (rejected.length > 0) {
      console.warn(
        `[external-videos] ${rejected.length} item dibuang:`,
        rejected.slice(0, 5),
      );
    }

    return NextResponse.json({
      ok: true,
      count: videos.length,
      videos,
      skipped: rejected.length,
    });
  } catch (err) {
    // Gagal-aman: error apa pun -> balas status yang benar + pesan jelas,
    // JANGAN diam-diam mengembalikan daftar kosong seolah "tidak ada video".
    if (err instanceof ExternalVideoError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message =
      err instanceof Error ? err.message : "Gagal mengambil data video.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
