import type { MetadataRoute } from "next";
import { getAllDramasCached } from "@/lib/dramas";
import { SITE_URL } from "@/lib/site";

/** Sitemap dibangun ulang tiap jam supaya drama baru ikut terdaftar tanpa deploy. */
export const revalidate = 3600;

/** Halaman tetap yang selalu ada, terlepas dari isi katalog. */
const STATIC_PATHS = [
  { path: "/", priority: 1 },
  { path: "/beranda", priority: 0.9 },
  { path: "/discover", priority: 0.8 },
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

  return [...staticEntries, ...dramaEntries];
}
