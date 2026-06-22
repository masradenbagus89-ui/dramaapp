// Tes pengunci perilaku untuk helper murni di lib/dramas.ts & lib/types.ts.
// Catatan: lib/dramas.ts mengimpor node:fs & lib/supabase, tapi keduanya
// TIDAK menyentuh database/berkas saat diimpor (cuma membaca pengaturan),
// jadi fungsi murni generateUniqueId aman dites tanpa palsu-palsuan apa pun.
import { describe, it, expect } from "vitest";
import { generateUniqueId } from "../lib/dramas";
import { subtitleLabel } from "../lib/types";
import type { Drama } from "../lib/types";

/** Bikin objek Drama minimal — generateUniqueId hanya membaca `.id`. */
function drama(id: string): Drama {
  return {
    id,
    title: id,
    category: "Romance",
    episodes: 1,
    views: "0",
    synopsis: "",
    gradient: "",
  };
}

describe("generateUniqueId — bikin ID drama yang tidak bentrok", () => {
  it("memakai slug judul kalau belum dipakai", () => {
    expect(generateUniqueId("Drama Keren", [])).toBe("drama-keren");
  });

  it("menambah angka kalau slug sudah ada", () => {
    const existing = [drama("drama-keren")];
    expect(generateUniqueId("Drama Keren", existing)).toBe("drama-keren-2");
  });

  it("terus naik angka sampai menemukan yang kosong", () => {
    const existing = [drama("drama-keren"), drama("drama-keren-2")];
    expect(generateUniqueId("Drama Keren", existing)).toBe("drama-keren-3");
  });

  it("judul tanpa huruf/angka jatuh ke 'drama'", () => {
    expect(generateUniqueId("!!!", [])).toBe("drama");
  });
});

describe("subtitleLabel — kode bahasa jadi label tampil", () => {
  it("mengembalikan label yang sudah terdaftar", () => {
    expect(subtitleLabel("id")).toBe("Indonesia");
    expect(subtitleLabel("en")).toBe("English");
  });

  it("kode tak dikenal jadi huruf besar kodenya", () => {
    expect(subtitleLabel("xx")).toBe("XX");
  });
});
