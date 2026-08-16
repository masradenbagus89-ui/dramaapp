// Tes pengunci perilaku ("characterization test") untuk lib/format.ts.
// Tujuan: merekam cara kerja parseViews / formatViews / slugify SAAT INI,
// supaya kalau nanti kode dipecah/dirapikan dan perilakunya berubah tanpa
// sengaja, tes ini langsung gagal (jadi rem darurat otomatis).
import { describe, it, expect } from "vitest";
import { parseViews, formatViews, slugify, fmtTime, parseRating } from "../lib/format";

describe("parseViews — ubah teks views jadi angka", () => {
  it("membaca satuan K/M/B (huruf besar)", () => {
    expect(parseViews("1.2M")).toBe(1_200_000);
    expect(parseViews("850K")).toBe(850_000);
    expect(parseViews("1.5B")).toBe(1_500_000_000);
  });

  it("membaca satuan huruf kecil juga", () => {
    expect(parseViews("1.2m")).toBe(1_200_000);
    expect(parseViews("3k")).toBe(3_000);
  });

  it("angka polos tanpa satuan tetap apa adanya", () => {
    expect(parseViews("1200")).toBe(1200);
    expect(parseViews("0")).toBe(0);
  });

  it("toleran spasi sekitar angka & sebelum satuan", () => {
    expect(parseViews("  1.2M  ")).toBe(1_200_000);
    expect(parseViews("1.2 M")).toBe(1_200_000);
  });

  it("teks tak valid / kosong jadi 0", () => {
    expect(parseViews("")).toBe(0);
    expect(parseViews("abc")).toBe(0);
  });
});

describe("formatViews — ubah angka jadi teks ringkas", () => {
  it("memberi satuan B/M/K dengan 1 angka di belakang koma", () => {
    expect(formatViews(1_500_000_000)).toBe("1.5B");
    expect(formatViews(1_200_000)).toBe("1.2M");
    expect(formatViews(1200)).toBe("1.2K");
  });

  it("ribuan bulat tetap menampilkan '.0' (perilaku saat ini)", () => {
    expect(formatViews(850_000)).toBe("850.0K");
    expect(formatViews(1000)).toBe("1.0K");
  });

  it("di bawah 1000 ditampilkan sebagai angka apa adanya", () => {
    expect(formatViews(999)).toBe("999");
    expect(formatViews(0)).toBe("0");
  });
});

describe("slugify — judul jadi potongan URL aman", () => {
  it("huruf kecil, spasi & simbol jadi tanda hubung", () => {
    expect(slugify("Drama Keren!")).toBe("drama-keren");
    expect(slugify("Halo  Dunia")).toBe("halo-dunia");
  });

  it("membuang tanda baca di ujung", () => {
    expect(slugify("  Hello  ")).toBe("hello");
    expect(slugify("!!!Judul!!!")).toBe("judul");
  });

  it("menghapus tanda aksen (é -> e)", () => {
    expect(slugify("Café Latte")).toBe("cafe-latte");
  });

  it("teks tanpa huruf/angka jadi string kosong", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("")).toBe("");
  });

  it("dipotong maksimal 60 karakter", () => {
    const panjang = "a".repeat(100);
    expect(slugify(panjang).length).toBeLessThanOrEqual(60);
  });
});

describe("fmtTime — detik jadi waktu tampilan m:ss", () => {
  it("memformat menit:detik dengan detik 2 digit", () => {
    expect(fmtTime(83)).toBe("1:23");
    expect(fmtTime(5)).toBe("0:05");
    expect(fmtTime(60)).toBe("1:00");
    expect(fmtTime(125)).toBe("2:05");
  });

  it("membuang pecahan detik (dibulatkan ke bawah)", () => {
    expect(fmtTime(9.9)).toBe("0:09");
  });

  it("tidak menggulung ke jam (menit boleh lebih dari 60)", () => {
    expect(fmtTime(3661)).toBe("61:01");
  });

  it("nilai tak wajar (negatif/NaN/tak hingga) jadi 0:00", () => {
    expect(fmtTime(0)).toBe("0:00");
    expect(fmtTime(-3)).toBe("0:00");
    expect(fmtTime(NaN)).toBe("0:00");
    expect(fmtTime(Infinity)).toBe("0:00");
  });
});

describe("parseRating — teks IMDb jadi angka", () => {
  it("membaca angka biasa dan koma", () => {
    expect(parseRating("7.8")).toBe(7.8);
    expect(parseRating("7,8")).toBe(7.8);
  });

  it("kosong atau tidak valid jadi 0", () => {
    expect(parseRating()).toBe(0);
    expect(parseRating("")).toBe(0);
    expect(parseRating("N/A")).toBe(0);
  });
});
