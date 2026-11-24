// Isi panel Video Playly — diambil SETELAH menu sudah tergambar.
//
// page.tsx membungkus komponen ini dengan <Suspense>. Selama fungsi di bawah
// masih menunggu Playly / database, yang tampil adalah KerangkaIsiPlayly
// (judul IMDb + "Daftar film sedang diambil"), bukan layar abu-abu penuh.
import Link from "next/link";
import {
  getPlaylyKeyStatus,
  readPlaylyConfig,
} from "@/lib/playly";
import { ambilDaftarPlaylyAdmin } from "@/lib/playly-daftar-admin";
import { getAllDramas } from "@/lib/dramas";
import {
  getPlaylyEmbeds,
  getPlaylyGenres,
  getPlaylyHiddenIds,
  getPlaylyImdb,
  getPlaylyJenis,
  getPlaylyKualitas,
  getPlaylyLinkUnduhan,
  getPlaylyRating,
  getPlaylyMetaManual,
} from "@/lib/store";
import { bacaDomainUnduhan } from "@/lib/playly-unduhan-domain";
import { ringkasImdbUntukAdmin } from "@/lib/playly-imdb";
import PlaylyVideoPicker from "@/app/components/admin/PlaylyVideoPicker";
import { getPlaylyVideosGabunganCached } from "@/lib/playly-gabungan";
import PlaylyVisibilityManager from "@/app/components/admin/PlaylyVisibilityManager";
import KeteranganSumberPlayly from "@/app/components/admin/KeteranganSumberPlayly";
import PlaylyIsiCepat from "@/app/components/admin/PlaylyIsiCepat";
import PlaylyUnduhanManager from "@/app/components/admin/PlaylyUnduhanManager";
import PlaylyBagianAktif from "@/app/components/admin/PlaylyBagianAktif";
import BantuanSingkat from "@/app/components/admin/BantuanSingkat";
import { Button } from "@/components/ui/button";
import { AlertTriangle, KeyRound } from "lucide-react";

export default async function IsiPanelPlayly() {
  try {
    return await muatIsiPanelPlayly();
  } catch (err) {
    // Database yang tidak menjawab jangan mengganti seluruh layar jadi error.
    // Menu sudah tergambar di page.tsx; di sini cukup kalimat yang bisa ditindak.
    console.warn(
      "[admin] panel Playly gagal dibaca:",
      err instanceof Error ? err.name : "unknown",
    );
    return (
      <p role="alert" className="text-sm text-rose-300">
        Daftar film belum terbaca. Muat ulang halaman ini.
      </p>
    );
  }
}

async function muatIsiPanelPlayly() {
  const konfigurasi = readPlaylyConfig();

  // Daftar film lewat ingatan proses (lib/playly-daftar-admin.ts): bukaan
  // berulang tidak mengunduh ulang seluruh katalog. Pembacaan database di
  // bawah tetap TANPA cache — isian yang baru disimpan admin harus kelihatan.
  const [
    status,
    dramas,
    embeds,
    mitra,
    hidden,
    genres,
    imdb,
    unduhan,
    kualitas,
    jenis,
    ratingManual,
    metaManual,
  ] = await Promise.all([
      getPlaylyKeyStatus(),
      getAllDramas(),
      getPlaylyEmbeds(),
      ambilDaftarPlaylyAdmin(konfigurasi),
      getPlaylyHiddenIds(),
      getPlaylyGenres(),
      getPlaylyImdb(),
      getPlaylyLinkUnduhan(),
      getPlaylyKualitas(),
      getPlaylyJenis(),
      getPlaylyRating(),
      getPlaylyMetaManual(),
    ]);

  // Jaring yang sama dengan halaman penonton: kalau Playly gagal DAN belum
  // ada salinan di ingatan proses, pakai salinan terakhir di database supaya
  // dropdown-nya tidak ikut hilang.
  const videoPanel =
    mitra.error && mitra.videos.length === 0
      ? await getPlaylyVideosGabunganCached()
          .then((r) => r.videos)
          .catch(() => mitra.videos)
      : mitra.videos;

  const imdbRingkas = ringkasImdbUntukAdmin(imdb);

  const pilihanDrama = dramas.map((d) => ({
    id: d.id,
    title: d.title,
    episodes: d.episodes,
  }));

  return (
    <div className="space-y-6">
      <PlaylyBagianAktif
        kategori="Konten"
        pengantar={
          <BantuanSingkat
            label="Apa itu video Playly?"
            judul={
              <h2 className="text-xl font-bold text-white">
                Video dari Playly
              </h2>
            }
          >
            <KeteranganSumberPlayly
              galat={mitra.error}
              dariKatalogPublik={mitra.source === "katalog-publik"}
              akun={konfigurasi.creators}
              adaDaftar={videoPanel.length > 0}
            />
            <p className="max-w-2xl">
              Video di akun Playly kita tampil{" "}
              <strong className="text-zinc-200">otomatis</strong> sebagai film
              biasa di{" "}
              <Link href="/beranda" className="text-amber-400 underline">
                Beranda
              </Link>
              , dan tiap video punya halaman tontonnya sendiri yang alamatnya
              bisa dibagikan. Penonton tidak melihat nama &quot;Playly&quot; di
              mana pun (owner 2026-09-26) — halaman{" "}
              <Link href="/film" className="text-amber-400 underline">
                daftar lengkapnya
              </Link>{" "}
              tetap ada tapi tidak lagi punya tombol di navbar.
            </p>
            <p className="max-w-2xl">
              Mengaitkan video ke drama (menu &quot;Daftar video Playly&quot;)
              sifatnya{" "}
              <strong className="text-zinc-200">opsional</strong> — hanya
              untuk memberi label &quot;bagian dari drama X&quot;. Yang
              menentukan video masuk baris genre beranda adalah{" "}
              <strong className="text-zinc-200">Kategori</strong> di menu{" "}
              <strong className="text-zinc-200">IMDb</strong>. Video Layarindo
              sendiri tetap berjalan seperti biasa.
            </p>
          </BantuanSingkat>
        }
        imdb={
          <PlaylyVisibilityManager
            videos={videoPanel}
            initialHidden={hidden}
            initialGenres={genres}
            initialImdb={imdbRingkas}
            initialKualitas={kualitas}
            initialJenis={jenis}
            initialRating={ratingManual}
            initialMetaManual={metaManual}
            linkUnduhan={unduhan}
            fetchError={mitra.error}
            source={mitra.source}
            creators={konfigurasi.creators}
          />
        }
        isiCepat={
          <PlaylyIsiCepat
            videos={videoPanel}
            imdb={imdbRingkas}
            awal={{
              jenis,
              kategori: genres,
              kualitas,
              rating: ratingManual,
              meta: metaManual,
            }}
            linkUnduhan={unduhan}
          />
        }
        unduhan={
          <PlaylyUnduhanManager
            videos={videoPanel}
            initialLinks={unduhan}
            domain={bacaDomainUnduhan()}
          />
        }
        daftar={
          status.configured ? (
            <PlaylyVideoPicker dramas={pilihanDrama} initialEmbeds={embeds} />
          ) : (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
              <p className="flex items-start gap-2 text-sm text-amber-100">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  Kunci API Playly belum dipasang, jadi daftar videonya belum
                  bisa diambil. Pasang kuncinya dulu, baru kembali ke halaman
                  ini.
                </span>
              </p>
              <Button
                asChild
                className="mt-4 min-h-11 rounded-full px-5 text-sm font-semibold"
              >
                <Link href="/admin/settings/playly">
                  <KeyRound className="size-4" aria-hidden="true" />
                  Pasang kunci Playly
                </Link>
              </Button>
            </div>
          )
        }
      />
    </div>
  );
}
