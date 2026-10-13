// Penjaga permanen untuk `periksaSumberKatalog` (lib/dramas.ts).
//
// KENAPA ADA (2026-10-13): fungsi ini dulu bernama `periksaKatalogHidup` dan
// memulangkan `boolean`. Saat env Supabase kosong ia memulangkan `true` —
// jawaban yang sama persis dengan "database sehat". Akibatnya kartu status di
// Dashboard admin menampilkan hijau "Dari database" untuk aplikasi yang
// sebenarnya berjalan TANPA database sama sekali.
//
// Di Vercel itu nyaris tak berakibat (filesystem read-only, tulisan gagal
// keras). Di hosting berbasis container (Railway/VPS) folder data/ BISA
// ditulis, jadi akun penonton, saldo koin, komentar, dan rahasia 2FA tersimpan
// ke disk container lalu LENYAP tiap redeploy — tanpa satu pun error, dengan
// kartu admin tetap hijau.
//
// Yang dikunci di sini adalah satu hal: ketiga keadaan WAJIB punya jawaban
// yang berbeda. Begitu dua di antaranya bertabrakan lagi, bug-nya kembali.
import { describe, it, expect, vi } from "vitest";

/** Muat ulang lib/dramas dengan `useSupabase` + perilaku sbSelect yang diatur tes. */
async function muatDramas(opsi: {
  useSupabase: boolean;
  sbSelectGagal?: boolean;
}) {
  vi.resetModules();
  const sbSelect = vi.fn(async () => {
    if (opsi.sbSelectGagal) throw new Error("HTTP 522 — database tak menjawab");
    return [{ id: "x" }];
  });
  vi.doMock("@/lib/supabase", () => ({
    useSupabase: opsi.useSupabase,
    eq: (v: string) => `eq.${v}`,
    sbSelect,
    sbUpsert: vi.fn(async () => {}),
    sbDelete: vi.fn(async () => {}),
    sbRpc: vi.fn(async () => null),
  }));
  const mod = await import("../lib/dramas");
  return { periksaSumberKatalog: mod.periksaSumberKatalog, sbSelect };
}

describe("periksaSumberKatalog", () => {
  it("Supabase dipakai & menjawab = database", async () => {
    const { periksaSumberKatalog } = await muatDramas({ useSupabase: true });
    expect(await periksaSumberKatalog()).toBe("database");
  });

  it("Supabase dipakai tapi tidak menjawab = database-mati (gagal-AMAN)", async () => {
    const diam = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { periksaSumberKatalog } = await muatDramas({
      useSupabase: true,
      sbSelectGagal: true,
    });
    expect(await periksaSumberKatalog()).toBe("database-mati");
    // Menelan error itu tugasnya, tapi menelan TANPA JEJAK tidak: sebab
    // aslinya cuma utuh di sini, dan hanya boleh ke log server (bukan ke
    // balasan API — pesan Supabase bisa memuat alamat dalam server).
    expect(diam).toHaveBeenCalled();
    diam.mockRestore();
  });

  it("env Supabase kosong = mode-berkas, BUKAN database (bug 2026-10-13)", async () => {
    const { periksaSumberKatalog } = await muatDramas({ useSupabase: false });
    const hasil = await periksaSumberKatalog();
    expect(hasil).toBe("mode-berkas");
    // Pengunci sebenarnya. Inilah baris yang MERAH kalau bug lama kambuh.
    expect(hasil).not.toBe("database");
  });

  it("mode berkas TIDAK menyentuh database sama sekali", async () => {
    // Bukan sekadar efisiensi. Kalau cabang ini sampai memanggil Supabase,
    // artinya seseorang menghapus penjaga `!useSupabase` dan keadaan
    // "tak ada database" kembali dinilai lewat jalur yang sama dengan
    // "database sehat" — jalan pulang menuju bug lama.
    const { periksaSumberKatalog, sbSelect } = await muatDramas({
      useSupabase: false,
    });
    await periksaSumberKatalog();
    expect(sbSelect).not.toHaveBeenCalled();
  });

  it("ketiga keadaan punya jawaban yang saling berbeda", async () => {
    const diam = vi.spyOn(console, "warn").mockImplementation(() => {});
    const a = await (await muatDramas({ useSupabase: true })).periksaSumberKatalog();
    const b = await (
      await muatDramas({ useSupabase: true, sbSelectGagal: true })
    ).periksaSumberKatalog();
    const c = await (await muatDramas({ useSupabase: false })).periksaSumberKatalog();
    diam.mockRestore();
    expect(new Set([a, b, c]).size).toBe(3);
  });
});
