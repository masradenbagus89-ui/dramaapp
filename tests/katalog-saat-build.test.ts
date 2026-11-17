// Penjaga: `next build` tidak boleh menghubungi Supabase lewat katalog publik.
//
// KENAPA (2026-11-17). Railway membatalkan image f47ccbb karena Supabase
// membalas error saat prerender /discover. Stack-nya: ensureOk →
// getAllDramasCached → app/discover/page.tsx, lalu npm run build exit 1.
// Try/catch di getAllDramasCachedSafe tidak menahan itu. Satu-satunya cara
// yang tidak melempar error sama sekali: saat fase build, baca berkas lokal.
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getAllDramasCached } from "../lib/dramas";

const FASE_BUILD = "phase-production-build";

function badanGetAllDramasCached(): string {
  const sumber = readFileSync(
    fileURLToPath(new URL("../lib/dramas.ts", import.meta.url)),
    "utf8",
  );
  const mulai = sumber.indexOf("export async function getAllDramasCached(");
  expect(mulai).toBeGreaterThan(-1);
  const sb = sumber.indexOf("sbSelect", mulai);
  expect(sb).toBeGreaterThan(mulai);
  return sumber.slice(mulai, sb);
}

describe("katalog publik saat next build", () => {
  const faseAwal = process.env.NEXT_PHASE;

  afterEach(() => {
    if (faseAwal === undefined) delete process.env.NEXT_PHASE;
    else process.env.NEXT_PHASE = faseAwal;
    vi.restoreAllMocks();
  });

  it("sumbernya kembali ke berkas lokal SEBELUM sbSelect", () => {
    const kepala = badanGetAllDramasCached();
    expect(kepala).toContain(FASE_BUILD);
    expect(kepala).toContain("readLocalDramas()");
  });

  it("tidak memanggil fetch", async () => {
    process.env.NEXT_PHASE = FASE_BUILD;
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dramas = await getAllDramasCached();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(Array.isArray(dramas)).toBe(true);
  });
});
