// Tes pengunci: SETIAP handler admin yang mengubah data wajib punya penjaga
// asal permintaan (anti-CSRF).
//
// Lahir dari audit keamanan 2026-11-14 (SEC-003). Saat itu 15 route admin
// memakai `guardMutation` (yang di dalamnya ada cek asal), tapi empat route —
// admin/ads, admin/drama, admin/durasi, admin/hardlink — tidak memakai penjaga
// apa pun selain `isAdminRequest`. Jadi cek asalnya hilang di keempatnya, dan
// tidak ada yang memberi tahu: route yang lupa penjaga tetap jalan normal di
// layar.
//
// Tes ini menutup bocornya ke DEPAN. Route admin BARU yang mengubah data tapi
// lupa penjaga asal akan membuat tes ini merah, bukan lolos diam-diam.
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const AKAR_ADMIN = "app/api/admin";
const METODE_MUTASI = ["POST", "PUT", "DELETE", "PATCH"];

/**
 * Buang komentar `//` dan `/* *\/` dari TypeScript.
 *
 * WAJIB: komentar yang disisipkan audit ini menyebut nama `guardAsal` dan
 * `guardMutation`. Tanpa dibuang, tes akan LULUS hanya karena nama penjaganya
 * tertulis di komentar — padahal perintahnya tak pernah dipanggil. Penjaga yang
 * tak pernah bisa merah = hiasan (rak auth §2 RBAC #5); jebakan ini benar-benar
 * menipu versi pertama tests/koin-kunci-baris.test.ts di sesi audit yang sama.
 */
function tanpaKomentar(ts: string): string {
  return ts
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((baris) => {
      const i = baris.indexOf("//");
      return i < 0 ? baris : baris.slice(0, i);
    })
    .join("\n");
}

/** Semua route.ts di bawah app/api/admin, rekursif. */
function daftarRoute(dir: string): string[] {
  const hasil: string[] = [];
  for (const nama of readdirSync(dir)) {
    const p = join(dir, nama);
    if (statSync(p).isDirectory()) hasil.push(...daftarRoute(p));
    else if (nama === "route.ts") hasil.push(p);
  }
  return hasil;
}

/** Pecah isi berkas jadi blok per handler yang diekspor. */
function handlerMutasi(isi: string): { nama: string; badan: string }[] {
  return isi
    .split(/(?=export async function )/)
    .map((blok) => {
      const m = blok.match(/^export async function (\w+)/);
      return m ? { nama: m[1], badan: blok } : null;
    })
    .filter((x): x is { nama: string; badan: string } => x !== null)
    .filter((x) => METODE_MUTASI.includes(x.nama));
}

describe("route admin — penjaga asal permintaan (SEC-003)", () => {
  const routes = daftarRoute(AKAR_ADMIN);

  it("menemukan route admin untuk diperiksa", () => {
    expect(routes.length).toBeGreaterThan(10);
  });

  it("tiap handler pengubah data memanggil guardAsal atau guardMutation", () => {
    const bolong: string[] = [];

    for (const berkas of routes) {
      const isi = tanpaKomentar(readFileSync(berkas, "utf-8"));
      for (const h of handlerMutasi(isi)) {
        const dijaga =
          /guardAsal\s*\(\s*req\s*\)/.test(h.badan) ||
          /guardMutation\s*\(\s*req\s*,/.test(h.badan);
        if (!dijaga) bolong.push(`${berkas} -> ${h.nama}`);
      }
    }

    expect(bolong, `handler admin tanpa penjaga asal:\n${bolong.join("\n")}`).toEqual([]);
  });
});

describe("guardAsal — perilaku", () => {
  it("tolak 403 kalau Origin beda host; lolos kalau sama atau tak ada", async () => {
    const { guardAsal } = await import("../lib/request-guard");

    const asing = guardAsal(
      new Request("http://situs-kita.test/api/admin/drama", {
        method: "POST",
        headers: { origin: "https://penyerang.test", host: "situs-kita.test" },
      }),
    );
    expect(asing?.status).toBe(403);

    const sama = guardAsal(
      new Request("http://situs-kita.test/api/admin/drama", {
        method: "POST",
        headers: { origin: "http://situs-kita.test", host: "situs-kita.test" },
      }),
    );
    expect(sama).toBeNull();

    // Tanpa Origin = klien non-browser (mis. agent PC backup). Sengaja
    // DILOLOSKAN — serangan CSRF dari browser selalu membawa Origin
    // (lib/origin.ts:18-19), jadi ini bukan celah.
    const tanpaOrigin = guardAsal(
      new Request("http://situs-kita.test/api/admin/drama", {
        method: "POST",
        headers: { host: "situs-kita.test" },
      }),
    );
    expect(tanpaOrigin).toBeNull();
  });
});
