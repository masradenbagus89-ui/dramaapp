import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { getPlaylyImdb, setPlaylyVideoImdb } from "@/lib/store";
import {
  cariJudulOmdb,
  fetchImdbDraft,
  isValidImdbId,
  ImdbLookupError,
} from "@/lib/imdb-tool";
import { posterAman, type PlaylyImdbMeta } from "@/lib/playly-imdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * METADATA IMDb untuk video Playly (owner 2026-10-08).
 *
 * KENAPA ADA: video dari Playly tampil tanpa poster, sinopsis, genre, maupun
 * rating — Playly tidak pernah mengirimnya (diukur: 186 video, field itu null
 * semua). Endpoint ini pintu masuk datanya, diambil dari OMDb.
 *
 * KENAPA CARI PAKAI JUDUL, BUKAN ID: imdb.com DIBLOKIR dari jaringan owner
 * (CloudFront 403, dilaporkan hari itu), jadi ia tak punya cara mencari ID
 * `tt…` sendiri. OMDb tetap terjangkau, dan ia bisa mencari lewat judul.
 *
 * KONTRAK
 *   GET                         -> { ok, imdb: Record<videoId, PlaylyImdbMeta> }
 *   GET ?cari=<judul>&tahun=    -> { ok, kandidat: KandidatOmdb[] }   (boleh kosong)
 *   POST { videoId, imdbId }    -> { ok, imdb }   (ambil dari OMDb lalu simpan)
 *   DELETE { videoId }          -> { ok, imdb }   (lepas kecocokan)
 *
 *   401 belum login · 400 body/permintaan tak terbaca · 422 isi tak lolos
 *   validasi · 404 ID tak ada di OMDb · 429 terlalu sering · 502/503 OMDb
 *   bermasalah atau kuncinya belum dipasang · 500 lainnya.
 *
 *   Rahasia: OMDB_API_KEY tidak pernah ikut di respons maupun log.
 *
 * Catatan rak owasp (skills/owasp/SKILL.md) + backend (skills/backend/SKILL.md):
 *   §1 broken access — otorisasi dicek DI DALAM tiap handler, bukan menumpang
 *     middleware (CVE-2025-29927: header `x-middleware-subrequest` bisa melewati
 *     cek yang hanya ada di sana). `next` di project ini 16.2.9, di atas ambang
 *     patch, tapi lapisannya tetap dipasang — defense-in-depth.
 *   §1 A10 gagal-aman — tiap `catch` membalas error dan TIDAK menyimpan apa pun;
 *     tak ada jalan yang meloloskan perubahan saat pengambilan gagal.
 *   §4 mass assignment — yang dibaca dari body hanya `videoId` + `imdbId`, dan
 *     keduanya lewat validasi bentuk. Balasan OMDb TIDAK disimpan apa adanya:
 *     tiap field dipetakan satu per satu di `keMeta()` di bawah.
 *   poster — host-nya wajib lolos `posterAman`. Alamat gambar dari pihak luar
 *     akan dirender ke halaman publik, jadi hostnya tidak boleh sembarangan.
 */

/** Pengenal video Playly: angka panjang, tapi diterima alfanumerik+dash. */
const POLA_VIDEO_ID = /^[A-Za-z0-9_-]{1,100}$/;
/** Batas panjang kata pencarian — menahan query raksasa ke OMDb. */
const MAKS_PANJANG_CARI = 200;

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cari = req.nextUrl.searchParams.get("cari")?.trim() ?? "";

  // Tanpa ?cari= -> kembalikan peta tersimpan (dipakai layar admin saat dimuat).
  if (!cari) {
    try {
      return NextResponse.json({ ok: true, imdb: await getPlaylyImdb() });
    } catch (err) {
      return balasError(err, "Gagal membaca data IMDb tersimpan.");
    }
  }

  if (cari.length > MAKS_PANJANG_CARI) {
    return NextResponse.json(
      { error: `Kata pencarian terlalu panjang (maks ${MAKS_PANJANG_CARI} huruf).` },
      { status: 422 },
    );
  }

  const tahun = req.nextUrl.searchParams.get("tahun")?.trim() ?? "";
  if (tahun && !/^(19|20)\d{2}$/.test(tahun)) {
    return NextResponse.json(
      { error: "Tahun harus 4 angka, contoh: 2024." },
      { status: 422 },
    );
  }

  try {
    const kandidat = await cariJudulOmdb(cari, tahun);
    // Daftar kosong BUKAN error: "filmnya memang tidak ada di OMDb" adalah
    // jawaban sah yang harus bisa ditampilkan apa adanya ke admin.
    return NextResponse.json({ ok: true, kandidat });
  } catch (err) {
    return balasError(err, "Gagal mencari judul di OMDb.");
  }
}

export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "playly:imdb",
    limit: 60,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { videoId?: unknown; imdbId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Isi permintaan tidak bisa dibaca." },
      { status: 400 },
    );
  }

  const videoId = String(body.videoId ?? "").trim();
  if (!POLA_VIDEO_ID.test(videoId)) {
    return NextResponse.json({ error: "Video belum dipilih." }, { status: 422 });
  }

  const imdbId = String(body.imdbId ?? "").trim();
  if (!isValidImdbId(imdbId)) {
    return NextResponse.json(
      { error: "ID IMDb tidak sah — contoh yang benar: tt9224104." },
      { status: 422 },
    );
  }

  try {
    const draft = await fetchImdbDraft(imdbId);
    const imdb = await setPlaylyVideoImdb(videoId, keMeta(draft));
    return NextResponse.json({ ok: true, imdb });
  } catch (err) {
    return balasError(err, "Gagal mengambil data dari OMDb.");
  }
}

export async function DELETE(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "playly:imdb",
    limit: 60,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { videoId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Isi permintaan tidak bisa dibaca." },
      { status: 400 },
    );
  }

  const videoId = String(body.videoId ?? "").trim();
  if (!POLA_VIDEO_ID.test(videoId)) {
    return NextResponse.json({ error: "Video belum dipilih." }, { status: 422 });
  }

  try {
    const imdb = await setPlaylyVideoImdb(videoId, null);
    return NextResponse.json({ ok: true, imdb });
  } catch (err) {
    return balasError(err, "Gagal melepas data IMDb.");
  }
}

/**
 * Petakan draft OMDb jadi baris tersimpan — SATU PER SATU, bukan disebar.
 *
 * Sengaja tidak `{...draft}`: draft punya field yang tak dipakai kartu video
 * (banner TMDB, episodeCount, daftar writer) dan bentuknya bisa berubah saat
 * lib/imdb-tool.ts dikembangkan. Memetakan eksplisit membuat isi dokumen ini
 * tidak ikut berubah diam-diam (rak owasp §4 mass assignment).
 */
function keMeta(draft: Awaited<ReturnType<typeof fetchImdbDraft>>): PlaylyImdbMeta {
  return {
    imdbId: draft.imdbId,
    title: draft.title,
    year: draft.year,
    // Poster yang host-nya tak lolos pagar disimpan sebagai kosong, BUKAN
    // disimpan apa adanya: kartu sudah tahu cara diam saat poster kosong,
    // sedangkan alamat yang pasti ditolak next/image hanya akan membuat admin
    // mengira fiturnya rusak.
    poster: posterAman(draft.posterImage ?? ""),
    genre: draft.genre,
    rating: draft.imdbRating,
    contentRating: draft.contentRating,
    runtime: draft.runtime,
    synopsis: draft.synopsis,
    // Kredit & asal — dipakai halaman /tonton/[id] supaya setara halaman film
    // DramaKu. Tetap dipetakan satu per satu, bukan disebar dari draft.
    director: draft.director,
    writer: draft.writer,
    stars: draft.stars,
    country: draft.country,
    language: draft.language,
    imdbVotes: draft.imdbVotes,
    // Dipilih manusia dari daftar kandidat. Penanda ini yang kelak menahan
    // pencocokan massal (Tahap 2) menimpa koreksi yang dibuat dengan tangan.
    sumber: "manual",
    dicocokkanPada: new Date().toISOString(),
  };
}

/**
 * Satu penerjemah error di pintu keluar (skills/backend/SKILL.md §3).
 *
 * `ImdbLookupError` sudah membawa status yang tepat (503 kunci belum ada, 401
 * kunci ditolak, 404 tidak ketemu, 502 OMDb tak terjangkau) beserta kalimat
 * yang bisa ditindaklanjuti — diteruskan apa adanya. Sisanya dibalas generik:
 * pesan internal tidak ikut keluar.
 */
function balasError(err: unknown, pesanUmum: string): NextResponse {
  if (err instanceof ImdbLookupError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(`[playly:imdb] ${pesanUmum}`, err);
  return NextResponse.json({ error: pesanUmum }, { status: 500 });
}
