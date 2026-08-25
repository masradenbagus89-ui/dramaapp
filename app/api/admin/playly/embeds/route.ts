import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, getAdminEmail } from "@/lib/session";
import { guardMutation } from "@/lib/request-guard";
import { getDrama } from "@/lib/dramas";
import {
  getPlaylyEmbeds,
  upsertPlaylyEmbed,
  removePlaylyEmbed,
  type PlaylyEmbed,
} from "@/lib/store";
import {
  PlaylyError,
  fetchPlaylyVideos,
  isAllowedPlaylyEmbedUrl,
  readPlaylyConfig,
} from "@/lib/playly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kaitan "video Playly -> drama DramaKu". Semua jalur wajib sesi admin.
 *
 * PENTING soal cara kerja POST: browser admin HANYA mengirim videoId +
 * dramaId. Alamat player (embedUrl), judul, durasi, dan kreator diambil ULANG
 * dari Playly di server ini.
 *
 * Kenapa tidak menerima embedUrl dari browser saja (lebih hemat)? Karena apa
 * pun yang datang dari browser bisa diubah orang sebelum sampai ke server.
 * Kalau alamatnya dipercaya mentah, seseorang bisa menitipkan halaman palsu
 * ke dalam <iframe> di situs kita, dan pengunjung mengira itu halaman kita.
 * Dengan mengambil ulang dari Playly, alamat yang tersimpan selalu berasal
 * dari sumber resmi — dan tetap diperiksa lagi terhadap daftar domain.
 */

/** GET — daftar kaitan yang sudah tersimpan (untuk tabel di halaman admin). */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const embeds = await getPlaylyEmbeds();
    return NextResponse.json({ ok: true, count: embeds.length, embeds });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membaca daftar kaitan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST — kaitkan satu video Playly ke satu drama. Body: { videoId, dramaId, episode? } */
export async function POST(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "playly:embeds",
    limit: 30,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  const email = await getAdminEmail(req);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      videoId?: string;
      dramaId?: string;
      episode?: number | string | null;
    };

    const videoId = String(body.videoId ?? "").trim();
    const dramaId = String(body.dramaId ?? "").trim();
    if (!videoId) {
      return NextResponse.json({ error: "Video belum dipilih." }, { status: 400 });
    }
    if (!dramaId) {
      return NextResponse.json(
        { error: "Pilih dulu drama DramaKu yang mau dikaitkan." },
        { status: 400 },
      );
    }

    // Drama tujuan harus benar-benar ada — cegah kaitan menggantung yang
    // nanti muncul di halaman publik tanpa induk.
    const drama = await getDrama(dramaId);
    if (!drama) {
      return NextResponse.json(
        { error: `Drama "${dramaId}" tidak ada di katalog DramaKu.` },
        { status: 404 },
      );
    }

    // Nomor episode opsional; kalau diisi harus bilangan bulat >= 1.
    let episode: number | null = null;
    if (body.episode !== null && body.episode !== undefined && body.episode !== "") {
      const n = Number(body.episode);
      if (!Number.isFinite(n) || n < 1) {
        return NextResponse.json(
          { error: "Nomor episode harus angka minimal 1 (atau dikosongkan)." },
          { status: 400 },
        );
      }
      episode = Math.floor(n);
    }

    // Ambil detail video dari SUMBER RESMI (Playly), bukan dari browser.
    const { videos } = await fetchPlaylyVideos();
    const video = videos.find((v) => v.id === videoId);
    if (!video) {
      return NextResponse.json(
        {
          error:
            "Video itu tidak ada lagi di daftar Playly (mungkin sudah dihapus). Muat ulang daftarnya.",
        },
        { status: 404 },
      );
    }

    // Sabuk pengaman kedua: alamat dari Playly pun tetap diperiksa terhadap
    // daftar domain yang boleh masuk <iframe>.
    const { allowedHosts } = readPlaylyConfig();
    if (!isAllowedPlaylyEmbedUrl(video.embedUrl, allowedHosts)) {
      return NextResponse.json(
        {
          error:
            "Alamat player video ini bukan dari domain Playly yang diizinkan, jadi tidak dipasang. " +
            "Kalau Playly memang memakai domain baru, tambahkan di setelan PLAYLY_EMBED_HOSTS.",
        },
        { status: 400 },
      );
    }

    const embed: PlaylyEmbed = {
      videoId: video.id,
      dramaId: drama.id,
      episode,
      embedUrl: video.embedUrl,
      title: video.title,
      durationLabel: video.durationLabel,
      creator: video.creator,
      addedAt: new Date().toISOString(),
      addedBy: email,
    };
    await upsertPlaylyEmbed(embed);

    return NextResponse.json({ ok: true, embed, dramaTitle: drama.title });
  } catch (err) {
    if (err instanceof PlaylyError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Gagal menyimpan kaitan video.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE — lepas kaitan satu video. Body: { videoId } */
export async function DELETE(req: NextRequest) {
  const blocked = guardMutation(req, {
    bucket: "playly:embeds",
    limit: 30,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { videoId } = (await req.json()) as { videoId?: string };
    const id = String(videoId ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "videoId wajib diisi." }, { status: 400 });
    }
    const terhapus = await removePlaylyEmbed(id);
    if (!terhapus) {
      return NextResponse.json({ error: "Kaitan itu sudah tidak ada." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, removed: id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal melepas kaitan video.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
