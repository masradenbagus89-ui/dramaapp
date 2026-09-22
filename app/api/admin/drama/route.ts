import { NextRequest, NextResponse } from "next/server";
import {
  parseDramaQuality,
  parseDramaStatus,
  resolveKindRules,
  type Drama,
} from "@/lib/types";
import { isAdminRequest } from "@/lib/session";
import {
  getDrama,
  upsertDrama,
  removeDrama,
  slugify,
  pickRandomGradient,
} from "@/lib/dramas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DramaBody = Partial<{
  id: string;
  title: string;
  category: string;
  synopsis: string;
  views: string;
  episodes: number;
  kind: string;
  status: string;
  quality: string;
  posterImage: string;
  heroImage: string;
  gradient: string;
  exclusive: boolean;
  subtitles: string[];
  premium: boolean;
  imdbId: string;
  year: string;
  contentRating: string;
  runtime: string;
  imdbRating: string;
  imdbVotes: string;
  genre: string;
  director: string;
  writer: string;
  stars: string;
  country: string;
  language: string;
}>;

const IMDB_META_KEYS = [
  "imdbId",
  "year",
  "contentRating",
  "runtime",
  "imdbRating",
  "imdbVotes",
  "genre",
  "director",
  "writer",
  "stars",
  "country",
  "language",
] as const;

type ImdbMetaKey = (typeof IMDB_META_KEYS)[number];

/**
 * Kolom yang ditambahkan belakangan + berkas SQL-nya. Tiap kali salah satunya
 * belum dijalankan di Supabase, PostgREST menolak SELURUH penyimpanan drama —
 * bukan cuma drama yang memakai kolom itu — dan admin cuma melihat pesan mentah
 * yang tidak menyebutkan apa yang harus dilakukan.
 */
const KOLOM_MIGRASI = [
  {
    kolom: "kind",
    arti: "jenis tayangan: serial/film",
    berkas: "supabase_migrations/add_kind_to_dramas.sql",
  },
  {
    kolom: "status",
    arti: "status tayang: masih tayang/tamat",
    berkas: "supabase_migrations/add_status_to_dramas.sql",
  },
  {
    kolom: "quality",
    arti: "kualitas video: CAM/HD/WEB-DL/BluRay",
    berkas: "supabase_migrations/add_quality_to_dramas.sql",
  },
] as const;

/**
 * Terjemahkan error mentah database ke bahasa yang bisa ditindaklanjuti admin.
 */
function explainSaveError(raw: string): string {
  const kolomHilang = /(column|schema cache|does not exist)/i.test(raw);
  if (kolomHilang) {
    // "\\b" (batas kata) ditulis sebagai string biasa, BUKAN di dalam template
    // literal: di template literal `\b` berarti karakter backspace, bukan batas
    // kata — polanya jadi tak pernah cocok dan pesan ramahnya tak pernah muncul.
    const cocok = KOLOM_MIGRASI.find((m) =>
      new RegExp("\\b" + m.kolom + "\\b", "i").test(raw),
    );
    if (cocok) {
      return (
        `Kolom '${cocok.kolom}' (${cocok.arti}) belum ada di database. ` +
        `Buka Supabase → SQL Editor, jalankan isi berkas ${cocok.berkas}, ` +
        `lalu simpan lagi. Detail teknis: ${raw}`
      );
    }
  }
  return raw;
}

/** Ambil field metadata IMDb dari body (string ter-trim; kosong = tidak diisi). */
function pickImdbMeta(body: DramaBody): Partial<Pick<Drama, ImdbMetaKey>> {
  const out: Partial<Pick<Drama, ImdbMetaKey>> = {};
  for (const key of IMDB_META_KEYS) {
    const raw = body[key];
    if (typeof raw !== "string") continue;
    const v = raw.trim();
    if (v) out[key] = v;
  }
  return out;
}

/** Terapkan metadata IMDb ke drama; string kosong menghapus field (saat update). */
function applyImdbMeta(drama: Drama, body: DramaBody, replaceEmpty: boolean) {
  for (const key of IMDB_META_KEYS) {
    if (typeof body[key] !== "string") continue;
    const v = body[key]!.trim();
    if (v) drama[key] = v;
    else if (replaceEmpty) delete drama[key];
  }
}

// Simpan/ubah/hapus drama langsung ke database (Supabase). Update instan —
// tidak perlu commit GitHub / redeploy seperti versi lama.

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdminRequest(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as DramaBody;

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Judul wajib diisi." }, { status: 400 });
    }
    if (!body.category?.trim()) {
      return NextResponse.json({ error: "Kategori wajib diisi." }, { status: 400 });
    }
    // Jenis tayangan + akibatnya (jumlah video & gratis/berbayar) diputuskan di
    // satu tempat: lib/types.ts. Judul lama yang dikirim tanpa field ini tetap
    // dibaca sebagai serial.
    // Status tayang. UI admin cuma menyediakan dua pilihan, TAPI UI bukan pagar:
    // siapa pun bisa mengirim body apa saja ke endpoint ini, jadi nilainya
    // disaring ulang di server lewat satu tempat (lib/types.ts).
    // "dikirim" dibedakan dari "sah": kiriman string kosong = perintah
    // MENGOSONGKAN, bukan permintaan yang ditolak.
    const statusProvided = typeof body.status === "string";
    const status = parseDramaStatus(body.status);

    // Kualitas video: aturannya sama persis dengan status di atas — disaring
    // ulang di server lewat satu tempat (lib/types.ts), dan "dikirim" dibedakan
    // dari "sah" supaya alat lain yang mengirim body tanpa `quality` tidak
    // diam-diam menghapus nilai yang sudah benar.
    const qualityProvided = typeof body.quality === "string";
    const quality = parseDramaQuality(body.quality);

    const rules = resolveKindRules(body);
    const isFilm = rules.kind === "movie";
    if (rules.episodes === null) {
      return NextResponse.json({ error: "Jumlah episode minimal 1." }, { status: 400 });
    }
    const epNum = rules.episodes;

    const id = body.id?.trim() || slugify(body.title);
    if (!id) {
      return NextResponse.json({ error: "ID drama tidak valid." }, { status: 400 });
    }

    const existing = await getDrama(id);
    const isNew = !existing;

    // Film untuk sekarang SELALU gratis (keputusan owner 2026-08-25) — lihat
    // alasannya di resolveKindRules.
    const premium = rules.premium;

    // Subtitle: terima array kode bahasa, buang yang tidak valid/duplikat.
    // Kalau field dikirim (array) → dianggap sumber kebenaran (boleh dikosongkan).
    const subtitlesProvided = Array.isArray(body.subtitles);
    const subtitles = subtitlesProvided
      ? Array.from(
          new Set(
            body
              .subtitles!.map((c) => String(c).trim().toLowerCase())
              .filter((c) => /^[a-z]{2,5}$/.test(c)),
          ),
        )
      : [];

    let drama: Drama;
    if (isNew) {
      drama = {
        id,
        title: body.title.trim(),
        category: body.category as Drama["category"],
        episodes: epNum,
        ...(isFilm ? { kind: rules.kind } : {}),
        ...(status ? { status } : {}),
        ...(quality ? { quality } : {}),
        views: body.views?.trim() || "1.0K",
        synopsis: body.synopsis?.trim() || "",
        gradient: body.gradient?.trim() || pickRandomGradient(),
        ...(body.posterImage?.trim() ? { posterImage: body.posterImage.trim() } : {}),
        ...(body.heroImage?.trim() ? { heroImage: body.heroImage.trim() } : {}),
        ...(body.exclusive ? { exclusive: true } : {}),
        ...(subtitles.length ? { subtitles } : {}),
        ...(premium ? { premium: true } : {}),
        ...pickImdbMeta(body),
      };
    } else {
      drama = {
        ...existing!,
        title: body.title.trim(),
        category: body.category as Drama["category"],
        episodes: epNum,
        ...(body.views?.trim() ? { views: body.views.trim() } : {}),
        ...(body.synopsis?.trim() ? { synopsis: body.synopsis.trim() } : {}),
        ...(body.gradient?.trim() ? { gradient: body.gradient.trim() } : {}),
        ...(body.posterImage?.trim() ? { posterImage: body.posterImage.trim() } : {}),
        ...(body.heroImage?.trim() ? { heroImage: body.heroImage.trim() } : {}),
        ...(typeof body.exclusive === "boolean" ? { exclusive: body.exclusive } : {}),
      };
      // Field dikirim → timpa (termasuk pengosongan: hapus key kalau jadi kosong).
      if (subtitlesProvided) {
        if (subtitles.length) drama.subtitles = subtitles;
        else delete drama.subtitles;
      }
      // Jenis tayangan ikut ditimpa: serial boleh diubah jadi film & sebaliknya.
      if (isFilm) drama.kind = "movie";
      else delete drama.kind;
      // Status hanya disentuh kalau field-nya DIKIRIM — alat lain yang mengirim
      // body tanpa `status` tidak boleh diam-diam menghapus status yang sudah
      // benar. Dikirim tapi tidak sah/kosong = sengaja dikosongkan.
      if (statusProvided) {
        if (status) drama.status = status;
        else delete drama.status;
      }
      if (qualityProvided) {
        if (quality) drama.quality = quality;
        else delete drama.quality;
      }
      if (typeof premium === "boolean") {
        if (premium) drama.premium = true;
        else delete drama.premium;
      }
      applyImdbMeta(drama, body, true);
    }

    await upsertDrama(drama, isNew);

    const action = isNew ? "added" : "updated";
    return NextResponse.json({ ok: true, id: drama.id, action, drama });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal simpan drama";
    return NextResponse.json({ error: explainSaveError(message) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!(await isAdminRequest(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = (await req.json()) as { id?: string };
    if (!id?.trim()) {
      return NextResponse.json({ error: "ID wajib diisi." }, { status: 400 });
    }

    const drama = await getDrama(id.trim());
    if (!drama) {
      return NextResponse.json({ error: "Drama tidak ditemukan." }, { status: 404 });
    }
    await removeDrama(id.trim());

    return NextResponse.json({ ok: true, removed: { id: drama.id, title: drama.title } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal hapus drama";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
