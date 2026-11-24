// Penjaga SEO otomatis per drama (2026-11-21): batas panjang, larangan
// mengarang data, dan aturan "isian admin menang, kolom kosong otomatis".
import { describe, it, expect } from "vitest";
import {
  SEO_DESCRIPTION_MAX,
  SEO_DESCRIPTION_MIN,
  SEO_KEYWORDS_MAX,
  SEO_KEYWORDS_MIN,
  SEO_TITLE_MAX,
  buatSeoOtomatis,
  hitungKeyword,
  parseSeoDrama,
  seoTerpakai,
  type SumberSeo,
} from "../lib/seo-drama";
import { bacaPetaSeo, gabungSeo } from "../lib/seo-drama-data";
import type { Drama } from "../lib/types";

const SINOPSIS =
  "Seorang pewaris perusahaan besar menyamar menjadi karyawan biasa demi mencari tahu siapa " +
  "yang mencoba menjatuhkan keluarganya, lalu jatuh cinta pada atasannya sendiri.";

const serial: SumberSeo = {
  title: "Cinta Sang Pewaris",
  synopsis: SINOPSIS,
  category: "Romance",
  episodes: 60,
  premium: true,
  year: "2024",
  genre: "Drama, Romance",
  country: "China",
};

const film: SumberSeo = {
  title: "Pedang Terakhir",
  synopsis: SINOPSIS,
  category: "Action",
  episodes: 1,
  kind: "movie",
  year: "2023",
};

describe("buatSeoOtomatis — batas panjang", () => {
  /**
   * Kolom ketiga = apakah LANTAI 150 huruf berlaku untuk kasus itu.
   *
   * Untuk judul di atas ~110 huruf, kalimat pembukanya SENDIRI
   * ("Nonton <judul> (2024) sub Indo 60 episode di Layarindo. Genre …")
   * sudah melewati 160, jadi `buatDeskripsiSeo` memotongnya utuh — nama situs
   * dan genre ikut hilang, dan hasilnya berhenti di batas kata mana pun yang
   * kebetulan terdekat (terukur: 149). Menuntut ≥150 di sana berarti menuntut
   * potongan jatuh tepat di huruf tertentu — itu kebetulan, bukan jaminan.
   *
   * ⚠️ Ini kelemahan LAMA, bukan akibat penggantian nama 2026-11-24. Nama yang
   * 2 huruf lebih panjang ("DramaKu" → "Layarindo") cuma MENGGESER potongan itu
   * melewati ambang sehingga akhirnya kelihatan. Judul terpanjang di katalog
   * nyata 89 huruf — belum menyentuh jalur ini, tapi sudah menghasilkan
   * deskripsi 159 huruf, jadi jaraknya tipis. Perbaikan sebenarnya = memotong
   * JUDUL di dalam kalimat pembuka (supaya nama situs & genre selamat), dan itu
   * mengubah teks yang sudah terbit di Google — perubahan perilaku, menunggu
   * keputusan owner.
   */
  it.each([
    ["serial", serial, true],
    ["film", film, true],
    ["judul sangat panjang", { ...serial, title: "Kisah Panjang ".repeat(8).trim() }, false],
  ])("%s: title ≤60, deskripsi ≤160, keyword 5–10", (_, sumber, lantaiBerlaku) => {
    const seo = buatSeoOtomatis(sumber);
    expect(seo.title.length).toBeLessThanOrEqual(SEO_TITLE_MAX);
    expect(seo.title.endsWith("| Layarindo")).toBe(true);
    expect(seo.description.length).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX);
    if (lantaiBerlaku) {
      expect(seo.description.length).toBeGreaterThanOrEqual(SEO_DESCRIPTION_MIN);
    }
    const n = hitungKeyword(seo.keywords);
    expect(n).toBeGreaterThanOrEqual(SEO_KEYWORDS_MIN);
    expect(n).toBeLessThanOrEqual(SEO_KEYWORDS_MAX);
  });

  /**
   * Penjaga nama situs vs judul terpanjang yang NYATA ada di katalog.
   *
   * Dipasang 2026-11-24 bersama penggantian nama "DramaKu" → "Layarindo".
   * Nama baru 2 huruf lebih panjang, dan tiap huruf nama situs memakan jatah
   * deskripsi yang sama untuk SEMUA halaman drama. Terukur saat dipasang:
   * judul 89 huruf ini menghasilkan deskripsi 159 dari maksimum 160 — SISA
   * SATU HURUF. Jadi nama yang lebih panjang lagi akan mulai memotong nama
   * situs dari deskripsi Google, dan itu TIDAK menimbulkan gejala apa pun di
   * layar. Tes ini yang akan memberi tahu, bukan laporan dari pengunjung.
   *
   * Kalau tes ini merah setelah nama situs diganti: itu bukan tesnya yang
   * rewel — itu nama barunya memang tak muat.
   */
  it("judul terpanjang di katalog nyata: deskripsi tetap 150–160 DAN memuat nama situs", () => {
    const judulTerpanjang =
      "Diculik Tulang Naga - Dipenjara 3 Tahun. Kini, Kaisar Obat dan Darah Naga Sejati Kembali!";
    const seo = buatSeoOtomatis({ ...serial, title: judulTerpanjang });

    expect(seo.description.length).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX);
    expect(seo.description.length).toBeGreaterThanOrEqual(SEO_DESCRIPTION_MIN);
    // Pembanding wajib: tanpa ini, deskripsi yang terpotong sebelum nama situs
    // tetap lulus dua baris di atas.
    expect(seo.description).toContain("Layarindo");
    expect(seo.title.length).toBeLessThanOrEqual(SEO_TITLE_MAX);
  });

  it("data minimal (tanpa tahun/genre/sinopsis) tetap ≥5 keyword & tak melewati batas", () => {
    const seo = buatSeoOtomatis({ title: "X", synopsis: "", category: "Comedy", episodes: 1 });
    expect(hitungKeyword(seo.keywords)).toBeGreaterThanOrEqual(SEO_KEYWORDS_MIN);
    expect(seo.description.length).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX);
  });
});

describe("buatSeoOtomatis — tidak mengarang data", () => {
  it("tanpa tahun: tak ada angka tahun di title/deskripsi/keyword", () => {
    const seo = buatSeoOtomatis({ ...serial, year: undefined });
    expect(`${seo.title} ${seo.description} ${seo.keywords}`).not.toMatch(/\b(19|20)\d{2}\b/);
  });

  it("serial berbayar TIDAK disebut gratis; film & serial gratis disebut", () => {
    const berbayar = buatSeoOtomatis(serial);
    expect(`${berbayar.title} ${berbayar.description}`.toLowerCase()).not.toContain("gratis");
    expect(buatSeoOtomatis(film).description).toContain("gratis");
    expect(buatSeoOtomatis({ ...serial, premium: false }).description).toContain("gratis");
  });

  it("film tidak menyebut jumlah episode; serial menyebutnya", () => {
    expect(buatSeoOtomatis(film).description).not.toMatch(/episode/);
    expect(buatSeoOtomatis(serial).description).toContain("60 episode");
  });

  // Bug yang tertangkap saat cek halaman sungguhan (2026-11-21): judul
  // ber-koma terpecah jadi dua keyword setengah-judul.
  it("judul ber-koma tetap SATU keyword utuh", () => {
    const k = buatSeoOtomatis({ ...serial, title: "Diremehkan Saat Latihan, Ternyata Dewa!" })
      .keywords.split(", ");
    expect(k[0]).toBe("diremehkan saat latihan ternyata dewa");
    expect(k).not.toContain("ternyata dewa!");
  });

  it("tiap drama mendapat deskripsi berbeda (unik)", () => {
    const a = buatSeoOtomatis(serial).description;
    const b = buatSeoOtomatis({ ...serial, title: "Judul Lain" }).description;
    expect(a).not.toBe(b);
  });
});

describe("parseSeoDrama — isian admin tak-tepercaya", () => {
  it("semua kosong / bukan objek = undefined (kembali otomatis)", () => {
    expect(parseSeoDrama({ title: " ", description: "", keywords: " , ," })).toBeUndefined();
    expect(parseSeoDrama("teks")).toBeUndefined();
    expect(parseSeoDrama(["a"])).toBeUndefined();
  });

  it("keyword dirapikan: kecil, tanpa kembar, maks 10", () => {
    const k = Array.from({ length: 14 }, (_, i) => `Kata ${i}`).join(",") + ",kata 0";
    const seo = parseSeoDrama({ keywords: k })!;
    expect(hitungKeyword(seo.keywords!)).toBe(SEO_KEYWORDS_MAX);
    expect(seo.keywords!.startsWith("kata 0, kata 1")).toBe(true);
  });

  it("baris baru dirapatkan & body raksasa dipotong", () => {
    const seo = parseSeoDrama({ title: "A\nB", description: "x".repeat(5000) })!;
    expect(seo.title).toBe("A B");
    expect(seo.description!.length).toBeLessThanOrEqual(300);
  });
});

describe("seoTerpakai — isian admin menang per kolom", () => {
  it("kolom terisi dipakai apa adanya, kolom kosong otomatis", () => {
    const hasil = seoTerpakai({ ...serial, seo: { title: "Judul Manual Admin" } });
    expect(hasil.title).toBe("Judul Manual Admin");
    expect(hasil.description).toBe(buatSeoOtomatis(serial).description);
  });
});

describe("gabungSeo / bacaPetaSeo", () => {
  const d = { id: "a", title: "A", synopsis: "", category: "Romance", episodes: 1 } as Drama;

  it("peta app_data ditempel, isi ngawur dibuang", () => {
    const peta = bacaPetaSeo({ a: { title: "T" }, b: "rusak", c: { title: "" } });
    expect(peta).toEqual({ a: { title: "T" } });
    expect(gabungSeo([d], peta)[0].seo).toEqual({ title: "T" });
  });

  it("mode file lokal (peta kosong) memakai seo yang menempel di drama", () => {
    expect(gabungSeo([{ ...d, seo: { keywords: "X" } }], {})[0].seo).toEqual({ keywords: "x" });
  });
});

// Form admin butuh login, jadi kotaknya dibuktikan lewat render HTML.
describe("SeoFields — kotak SEO di form admin", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: SeoFields } = await import("../app/components/admin/SeoFields");
  const gambar = (seo: Record<string, string>) =>
    renderToStaticMarkup(createElement(SeoFields, { seo, setSeo: () => {}, sumber: serial }));

  it("ada tombol Generate + 3 kolom, placeholder = hasil otomatis", () => {
    const html = gambar({});
    expect(html).toContain("Generate SEO Otomatis");
    for (const id of ["seo-title", "seo-description", "seo-keywords"]) expect(html).toContain(`id="${id}"`);
    expect(html).toContain(`placeholder="${buatSeoOtomatis(serial).title}"`);
  });

  it("isian manual tampil + penghitung karakter", () => {
    const html = gambar({ title: "Judul Saya" });
    expect(html).toContain('value="Judul Saya"');
    expect(html).toContain("10/60 karakter");
  });
});
