// Penjaga LABEL GENRE BAHASA INDONESIA — owner 2026-10-30
// ("ubah bagian genre ke bahasa indonesia agar sinkron semua").
//
// Yang dijaga di sini BUKAN "terjemahannya enak dibaca" (itu selera owner),
// melainkan dua kegagalan SENYAP yang mustahil terlihat dari layar:
//
//   1. Label ikut masuk ke ALAMAT penyaring (`?cat=Aksi`). Menu tergambar
//      rapi, diklik, lalu memulangkan halaman hampa — tanpa satu pun pesan
//      error. Pelajaran yang sama sudah pernah ditulis untuk nama negara
//      (lib/negara.ts) dan terbukti nyata di sana.
//   2. Label ikut dipakai mencari WARNA genre (lib/genre-accent.ts) atau
//      mencocokkan "drama terkait". Keduanya memakai kunci bahasa Inggris:
//      diberi "Aksi" mereka tidak error, cuma diam-diam jatuh ke warna
//      cadangan / skor kemiripan nol.
//
// Tes render dipakai (bukan grep atas sumber) karena pelajaran 2026-10-29:
// berkas yang BENAR isinya tetap bisa tak pernah tergambar di layar.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { labelGenre, labelGenreGabungan } from "../lib/genre";
import { genreTextClass } from "../lib/genre-accent";
import { CATEGORIES } from "../lib/types";
import DramaCard from "../app/components/DramaCard";
import FooterSitus from "../app/components/beranda/FooterSitus";
import type { Drama } from "../lib/types";

function stub(partial: Partial<Drama> = {}): Drama {
  return {
    id: "d",
    title: "Drama",
    category: "Action",
    episodes: 10,
    views: "0",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

describe("labelGenre — nilai data Inggris jadi label Indonesia", () => {
  it("menerjemahkan genre yang BENAR-BENAR ada di katalog produksi", () => {
    // Dihitung dari GET /api/dramas 2026-10-30 (40 judul): kategori kurasi
    // Action/Romance/Tycoon/Harem/Time Travel/Comedy + genre OMDb
    // Adventure/Horror. Inilah yang penonton lihat di menu pada gambar owner.
    expect(labelGenre("Action")).toBe("Aksi");
    expect(labelGenre("Romance")).toBe("Romantis");
    expect(labelGenre("Tycoon")).toBe("CEO");
    expect(labelGenre("Harem")).toBe("Kerajaan");
    expect(labelGenre("Comedy")).toBe("Komedi");
    expect(labelGenre("Time Travel")).toBe("Lintas Waktu");
    expect(labelGenre("Adventure")).toBe("Petualangan");
    expect(labelGenre("Horror")).toBe("Horor");
  });

  it("SETIAP kategori kurasi punya label — tak ada yang tertinggal Inggris", () => {
    // Pagar paling berguna di berkas ini: begitu owner menambah kategori baru
    // di lib/types.ts, tes ini MERAH sampai labelnya didaftarkan. Tanpa ini,
    // kategori baru muncul di menu dalam bahasa Inggris dan tak ada yang tahu.
    //
    // Sejak owner mengubah "Harem" jadi "Kerajaan" (2026-10-30), TIDAK ADA
    // lagi kategori yang dikecualikan selain "Semua" — yang memang sudah kata
    // Indonesia. Pagarnya jadi lebih ketat daripada versi pagi ini.
    const belumDiterjemahkan = CATEGORIES.filter(
      (k) => k !== "Semua" && labelGenre(k) === k,
    );
    expect(belumDiterjemahkan).toEqual([]);
  });

  it("nama di luar daftar dipulangkan apa adanya, bukan dibuang", () => {
    // Genre OMDb itu teks bebas. Memulangkan "" akan membuat chip-nya hilang
    // dari layar tanpa sebab yang bisa ditelusuri.
    expect(labelGenre("Steampunk")).toBe("Steampunk");
  });

  it("labelGenreGabungan memecah teks OMDb berkoma, bukan menyerah utuh", () => {
    // `drama.genre` tersimpan sebagai "Action, Adventure, Horror". Teks utuh
    // itu tak akan pernah cocok dengan kunci mana pun, jadi tanpa pemecahan
    // seluruh barisnya lolos tanpa diterjemahkan — gagal diam-diam.
    expect(labelGenreGabungan("Action, Adventure, Horror")).toBe(
      "Aksi, Petualangan, Horor",
    );
    expect(labelGenreGabungan(null)).toBe("");
    expect(labelGenreGabungan("")).toBe("");
  });
});

describe("label TIDAK boleh menggantikan nilai asli", () => {
  it("warna genre tetap dicari pakai nilai Inggris", () => {
    // genreTextClass("Action") punya warna sendiri; "Aksi" tidak ada di
    // tabelnya dan jatuh ke warna cadangan putih. Kalau suatu saat ada yang
    // memberi label ke fungsi ini, kedua kelas ini jadi sama dan tes merah.
    expect(genreTextClass("Action")).not.toBe(genreTextClass("Aksi"));
  });

  it("kartu drama: teks Indonesia, warna & alamat tetap dari nilai asli", () => {
    const html = renderToStaticMarkup(
      createElement(DramaCard, { drama: stub({ id: "x", category: "Action" }) }),
    );

    expect(html).toContain("Aksi");
    expect(html).not.toContain(">Action<");
    // Warna aksen genre masih yang milik "Action".
    expect(html).toContain(genreTextClass("Action"));
  });

  it("kaki situs: tulisannya Indonesia, alamat penyaringnya ejaan katalog", () => {
    const html = renderToStaticMarkup(
      createElement(FooterSitus, { genres: ["Action", "Time Travel"] }),
    );

    expect(html).toContain("Aksi");
    expect(html).toContain("Lintas Waktu");
    // Inilah pagarnya: alamat WAJIB memakai nilai yang tersimpan di katalog.
    expect(html).toContain('href="/discover?cat=Action"');
    expect(html).toContain('href="/discover?cat=Time%20Travel"');
    expect(html).not.toContain("cat=Aksi");
  });
});
