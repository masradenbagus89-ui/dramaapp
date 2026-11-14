import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { simpanIsianMassalPlayly } from "@/lib/store";
import {
  bacaKirimanMassal,
  MAKS_VIDEO_PER_KIRIM,
} from "@/lib/isian-massal-video";
import { segarkanCachePublik } from "@/lib/cache-publik";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ISI MASSAL enam kolom video Playly dalam SATU permintaan (owner 2026-11-11:
 * "bisa kamu buatkan agar saya bisa mengisinya sekali jalan agar tidak perlu
 * isi persatu film").
 *
 * KENAPA ENDPOINT BARU, bukan memanggil enam endpoint lama berkali-kali — dua
 * alasan, keduanya kerusakan SENYAP:
 *   1. guardMutation membatasi 60 permintaan/menit per endpoint per IP.
 *      Mengisi 100 film lewat jalur satuan = 400 permintaan, tertolak 429 di
 *      tengah jalan dengan sebagian tersimpan dan sebagian tidak — dan layar
 *      tidak punya cara menyatukan kembali keadaan itu.
 *   2. tiap set satuan di lib/store.ts membaca SELURUH dokumen lalu menulisnya
 *      utuh. Puluhan tulisan beruntun ke dokumen yang sama = tulisan belakangan
 *      menimpa yang duluan (lost update), nol error.
 *
 * KEAMANAN (rak owasp + backend + admin-panel, dibuka sebelum berkas ini ditulis):
 *   owasp §1 broken access (#1 dunia) — otorisasi dicek DI DALAM route handler,
 *     bukan mengandalkan middleware saja (CVE-2025-29927: header
 *     `x-middleware-subrequest` bisa melewati cek yang cuma ada di sana).
 *     Identitas dari cookie sesi yang DITANDATANGANI server, bukan dari body —
 *     pemanggil tak bisa mengaku admin dengan mengarang isi.
 *   owasp §1 A10 gagal-aman — blok catch membalas error dan TIDAK menyimpan
 *     apa pun; tak ada jalan yang meloloskan perubahan saat penyimpanan gagal.
 *   owasp §4 mass assignment — SELURUH nilai lewat penyaring yang sama dengan
 *     jalur satuan (lib/isian-massal-video.ts), bukan disimpan apa adanya.
 *     Keenam kolom ini tergambar di kartu video yang dilihat penonton, dan
 *     kotak isian di layar BUKAN pagar: siapa pun bisa mengirim body apa saja
 *     ke alamat ini.
 *   admin-panel §2.5 aksi massal — jumlah baris DIBATASI MAKS_VIDEO_PER_KIRIM
 *     (body tanpa batas bisa menggantung server), dan balasannya menyebut
 *     ANGKA PASTI berapa video berubah supaya aksi borongan tidak pernah
 *     "selesai" tanpa bisa diperiksa.
 *   backend §1 rahasia — balasan hanya memuat kelima peta + angka: nol email,
 *     token, atau jejak internal.
 *   backend §1 status code — 400 body tak terbaca ATAU nol baris yang bisa
 *     dikerjakan · 401 bukan admin · 429 lewat guardMutation (ber-Retry-After)
 *     · 500 kegagalan simpan, tanpa detail internal yang bocor ke klien.
 *     SENGAJA tidak ada 422 untuk nilai yang tak lolos saring — nilai begitu
 *     TIDAK menggugurkan permintaan, melainkan dilaporkan balik lewat
 *     `ditolak` supaya layar bisa menandai baris yang perlu dibetulkan. Admin
 *     mengirim puluhan baris sekaligus; menolak semuanya gara-gara satu salah
 *     ketik berarti membuang kerja yang sudah benar.
 *
 * Batas lajunya lebih kecil dari endpoint satuan (20/menit): satu permintaan di
 * sini memindahkan sampai 1000 baris, jadi yang pantas dibatasi adalah jumlah
 * BORONGANNYA, bukan jumlah klik.
 *
 * Kontrak:
 *   POST { perubahan: [{ videoId, jenis?, kategori?, kualitas?, rating?, tahun?, durasi? }] }
 *     -> { ok: true, tersimpan, peta: { jenis, kategori, kualitas, rating, meta }, ditolak: [...] }
 *
 * Field yang TIDAK dikirim tidak disentuh; yang dikirim kosong berarti
 * "kembalikan ke sumber otomatis". Tanpa pembedaan itu, menyimpan perubahan
 * durasi saja akan ikut menghapus tahun yang sudah benar.
 *
 * Balasan memuat peta TERBARU supaya layar admin tak perlu memanggil GET lagi,
 * dan tak ada jendela waktu di mana layar menampilkan keadaan usang.
 */

export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "playly:massal",
    limit: 20,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  const email = await getAdminEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { perubahan?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Isi permintaan tidak bisa dibaca." },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.perubahan)) {
    return NextResponse.json(
      { error: "Daftar perubahan tidak dikirim." },
      { status: 400 },
    );
  }

  if (body.perubahan.length > MAKS_VIDEO_PER_KIRIM) {
    // Dikatakan apa adanya, bukan dipotong diam-diam: kiriman yang terpotong
    // membuat admin mengira semuanya tersimpan padahal sebagian tertinggal.
    return NextResponse.json(
      {
        error: `Terlalu banyak video sekaligus (maksimal ${MAKS_VIDEO_PER_KIRIM}). Simpan bertahap.`,
      },
      { status: 400 },
    );
  }

  const { bersih, ditolak } = bacaKirimanMassal(body.perubahan);

  // Nol baris sah TAPI ada yang ditolak = kiriman terbaca, isinya yang tak
  // lolos. Itu diteruskan ke jalur normal di bawah supaya layar menerima daftar
  // `ditolak` dan bisa menunjukkan baris mana yang salah — 400 "permintaan
  // rusak" tidak memberi tahu apa pun tentang baris mana yang bermasalah.
  if (bersih.length === 0 && ditolak.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada perubahan yang bisa disimpan." },
      { status: 400 },
    );
  }

  try {
    const { peta, jumlahVideo } = await simpanIsianMassalPlayly(bersih);
    segarkanCachePublik();
    return NextResponse.json({
      ok: true,
      tersimpan: jumlahVideo,
      peta,
      ditolak,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menyimpan perubahan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
