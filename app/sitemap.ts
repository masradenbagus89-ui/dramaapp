import type { MetadataRoute } from "next";
import { getAllDramasCached } from "@/lib/dramas";
import { getPlaylyVideosGabunganCached } from "@/lib/playly-gabungan";
import { alamatTonton } from "@/lib/tonton";
import { SITE_URL } from "@/lib/site";

/** Sitemap dibangun ulang tiap jam supaya drama baru ikut terdaftar tanpa deploy. */
export const revalidate = 3600;

/** Halaman tetap yang selalu ada, terlepas dari isi katalog. */
const STATIC_PATHS = [
  { path: "/", priority: 1 },
  { path: "/beranda", priority: 0.9 },
  { path: "/discover", priority: 0.8 },
  // Daftar lengkap film & video. Didaftarkan 2026-09-26 bersamaan dengan
  // pindahnya alamat /playly -> /film: halaman ini tak lagi punya tombol di
  // navbar, jadi tanpa sitemap ia praktis tak punya jalan masuk dari luar.
  { path: "/film", priority: 0.8 },
  { path: "/shorts", priority: 0.7 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "daily",
    priority,
  }));

  // Katalog diambil dari database. Kalau database sedang tak terjangkau, sitemap
  // tetap terbit berisi halaman tetap — lebih baik daripada build gagal total.
  let dramaEntries: MetadataRoute.Sitemap = [];
  try {
    const dramas = await getAllDramasCached();
    dramaEntries = dramas.map((d) => ({
      url: `${SITE_URL}/drama/${encodeURIComponent(d.id)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch (err) {
    console.error("[sitemap] gagal ambil katalog drama:", err);
  }

  // Halaman tonton per video (owner 2026-09-26). Dibungkus try/catch SENDIRI,
  // terpisah dari katalog di atas: kedua sumbernya beda (Supabase vs API
  // Playly), dan satu blok bersama berarti Playly yang bermasalah ikut
  // membuang seluruh daftar drama dari sitemap.
  let videoEntries: MetadataRoute.Sitemap = [];
  try {
    const { videos } = await getPlaylyVideosGabunganCached();
    videoEntries = videos.map((v) => ({
      url: `${SITE_URL}${alamatTonton(v)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
  } catch (err) {
    console.error("[sitemap] gagal ambil daftar video:", err);
  }

  return [...staticEntries, ...dramaEntries, ...videoEntries];
}
