import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Aturan untuk robot mesin pencari: halaman katalog boleh ditelusuri,
 * halaman admin/API/akun tidak — supaya tidak nyasar muncul di hasil Google.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/profile", "/history", "/my-list", "/login", "/daftar"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
