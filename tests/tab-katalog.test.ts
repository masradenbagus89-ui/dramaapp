// Penjaga deret tab halaman depan (permintaan owner 2026-09-22: TERBARU ·
// SERIES UNGGULAN · SERIES UPDATE · TERPOPULER · REKOMENDASI · <tahun>).
//
// Aturan project yang dijaga di sini (pelajaran 2026-09-21): TIAP TAB WAJIB
// BENAR-BENAR MENYARING. Tab yang isinya sama persis dengan tab sebelah terbaca
// seperti tombol rusak — dan kerusakannya SENYAP: tak ada error, cuma penonton
// yang mengklik lalu melihat layar yang sama.
import { describe, it, expect } from "vitest";
import {
  TAB_BAWAAN,
  daftarTab,
  isiTab,
  isiTabLengkap,
  isiTahun,
  parseTab,
  tahunTerbaru,
} from "../lib/tab-katalog";
import type { Drama } from "../lib/types";

function stub(partial: Partial<Drama> & Pick<Drama, "id">): Drama {
  return {
    title: partial.id,
    category: "Action",
    episodes: 10,
    views: "1.0K",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

/** Katalog kecil yang meniru bentuk katalog DramaKu sungguhan. */
function katalog(): Drama[] {
  return [
    stub({ id: "s1", views: "1.0K", imdbRating: "7.8", year: "2024" }),
    stub({ id: "s2", views: "1.0K", imdbRating: "7.8", year: "2024", premium: true }),
    stub({ id: "s3", views: "9.9M", imdbRating: "7.8", year: "2024", status: "Ongoing" }),
    stub({ id: "f1", kind: "movie", episodes: 1, views: "2.0K", imdbRating: "9.1", year: "2008" }),
    stub({ id: "f2", kind: "movie", episodes: 1, views: "1.0K", imdbRating: "8.1", year: "2026" }),
  ];
}

describe("parseTab — alamat tak dikenal jatuh ke tab bawaan", () => {
  it("menerima kunci yang sah", () => {
    for (const k of ["terbaru", "unggulan", "update", "terpopuler", "rekomendasi", "tahun"]) {
      expect(parseTab(k)).toBe(k);
    }
  });

  it("nilai ngawur / kosong TIDAK membuat halaman kosong", () => {
    // Alamat bisa diketik siapa saja. Halaman depan harus tetap berisi.
    for (const buruk of ["", "TERBARU", "drop table", null, undefined, "2026"]) {
      expect(parseTab(buruk)).toBe(TAB_BAWAAN);
    }
  });
});

describe("tahunTerbaru — label tab tahun dihitung, bukan ditulis tetap", () => {
  it("mengambil tahun paling baru yang benar-benar ada", () => {
    expect(tahunTerbaru(katalog())).toBe("2026");
  });

  it("mengabaikan tahun yang bentuknya bukan 4 digit", () => {
    expect(tahunTerbaru([stub({ id: "a", year: "besok" }), stub({ id: "b", year: "2025" })])).toBe(
      "2025",
    );
  });

  it("katalog tanpa tahun sama sekali memulangkan null", () => {
    expect(tahunTerbaru([stub({ id: "a" })])).toBeNull();
  });
});

describe("daftarTab", () => {
  it("tab tahun hanya digambar kalau katalog punya tahun", () => {
    expect(daftarTab(katalog()).map((t) => t.key)).toContain("tahun");
    expect(daftarTab([stub({ id: "a" })]).map((t) => t.key)).not.toContain("tahun");
  });

  it("label tab tahun memakai tahun asli katalog, bukan angka tetap", () => {
    const tab = daftarTab(katalog()).find((t) => t.key === "tahun");
    expect(tab?.label).toBe("2026");
  });
});

describe("tiap tab BENAR-BENAR menyaring — bukan daftar yang sama", () => {
  it("tidak ada dua tab yang isinya identik", () => {
    const k = katalog();
    const kunci = ["terbaru", "unggulan", "update", "terpopuler", "rekomendasi", "tahun"] as const;
    const hasil = kunci.map((t) => isiTabLengkap(k, t).map((d) => d.id).join(","));
    expect(new Set(hasil).size).toBe(kunci.length);
  });

  it("SERIES UNGGULAN & SERIES UPDATE hanya berisi serial, tanpa film", () => {
    for (const t of ["unggulan", "update"] as const) {
      expect(isiTab(katalog(), t).some((d) => d.kind === "movie")).toBe(false);
    }
  });
});

describe("SERIES UNGGULAN — penanda owner MENANG atas hitungan otomatis", () => {
  it("memakai drama yang ditandai unggulan kalau ada", () => {
    const k = [...katalog(), stub({ id: "s9", exclusive: true })];
    expect(isiTab(k, "unggulan").map((d) => d.id)).toEqual(["s9"]);
  });

  it("belum ada yang ditandai → jatuh ke serial berbayar koin", () => {
    expect(isiTab(katalog(), "unggulan").map((d) => d.id)).toEqual(["s2"]);
  });

  it("tak ada penanda DAN tak ada yang berbayar → tetap berisi, bukan kosong", () => {
    // Tab kosong terbaca seperti tombol rusak; ini penjaganya.
    const polos = [stub({ id: "a" }), stub({ id: "b" })];
    expect(isiTab(polos, "unggulan").length).toBe(2);
  });
});

describe("SERIES UPDATE — status owner MENANG atas hitungan otomatis", () => {
  it("memakai serial berstatus masih tayang kalau ada", () => {
    expect(isiTab(katalog(), "update").map((d) => d.id)).toEqual(["s3"]);
  });

  it("belum ada status → jatuh ke serial terbaru, bukan kosong", () => {
    const tanpaStatus = katalog().map((d) => ({ ...d, status: undefined }));
    const hasil = isiTab(tanpaStatus, "update");
    expect(hasil.length).toBe(3); // 3 serial, 0 film
    expect(hasil.some((d) => d.kind === "movie")).toBe(false);
  });
});

describe("TERPOPULER & REKOMENDASI", () => {
  it("terpopuler mengurutkan dari jumlah penonton terbanyak", () => {
    expect(isiTab(katalog(), "terpopuler")[0].id).toBe("s3"); // 9.9M
  });

  it("rekomendasi mengurutkan dari rating tertinggi", () => {
    expect(isiTab(katalog(), "rekomendasi").slice(0, 2).map((d) => d.id)).toEqual([
      "f1", // 9.1
      "f2", // 8.1
    ]);
  });

  it("rating seri dipecah oleh jumlah penonton, bukan urutan acak", () => {
    // Katalog DramaKu nyata: 34 serial ratingnya SERAGAM 7.8. Tanpa pemecah
    // seri, urutannya bisa berubah tiap render dan daftar terlihat tak stabil.
    const hasil = isiTab(katalog(), "rekomendasi").map((d) => d.id);
    expect(hasil.indexOf("s3")).toBeLessThan(hasil.indexOf("s1"));
  });
});

describe("tab tahun", () => {
  it("hanya memulangkan judul bertahun itu", () => {
    expect(isiTahun(katalog(), "2026").map((d) => d.id)).toEqual(["f2"]);
    expect(isiTahun(katalog(), "2008").map((d) => d.id)).toEqual(["f1"]);
  });

  it("tahun null memulangkan daftar kosong, bukan seluruh katalog", () => {
    // Memulangkan seluruh katalog akan membuat tabnya terlihat bekerja padahal
    // tidak menyaring apa pun — persis jenis kebohongan yang dilarang.
    expect(isiTahun(katalog(), null)).toEqual([]);
  });
});

describe("kemurnian — katalog pemanggil tidak boleh ikut berubah", () => {
  it("isiTab tidak mengurutkan ulang array aslinya", () => {
    const k = katalog();
    const urutanAwal = k.map((d) => d.id);
    isiTab(k, "terpopuler");
    isiTab(k, "rekomendasi");
    isiTab(k, "terbaru");
    expect(k.map((d) => d.id)).toEqual(urutanAwal);
  });
});
