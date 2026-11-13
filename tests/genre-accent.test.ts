import { describe, it, expect } from "vitest";
import {
  genreTextClass,
  genreChipClass,
  genreBarClass,
} from "../lib/genre-accent";
import { CATEGORIES, KATEGORI_ISI } from "../lib/types";
import { CATEGORY_OPTIONS, warnaKategori } from "@/app/admin/constants";

describe("genre accent", () => {
  it("Romance pakai aksen merah-muda, bukan emas default", () => {
    expect(genreTextClass("Romance")).toContain("rose");
    expect(genreChipClass("Romance")).toContain("rose");
    expect(genreBarClass("Romance")).toContain("rose");
  });

  it("Action pakai aksen oranye", () => {
    expect(genreTextClass("Action")).toContain("orange");
  });

  it("nama tak dikenal jatuh ke putih/emas, bukan crash", () => {
    // Contohnya dulu "Western" — sampai 2026-11-13, saat Western justru jadi
    // kategori resmi dan punya warnanya sendiri. Tes ini lalu merah, dan
    // merahnya BENAR: yang diuji di sini perilaku untuk nama ASING, jadi
    // contohnya harus nama yang memang tak akan pernah jadi kategori.
    expect(genreTextClass("Steampunk")).toBe("text-white");
    expect(genreBarClass("Steampunk")).toContain("amber");
  });

  it("contoh 'nama asing' di atas BENAR-BENAR asing", () => {
    // Penjaga untuk tes di atasnya. Kalau "Steampunk" kelak jadi kategori
    // resmi, tes sebelumnya berhenti menguji apa pun yang berarti — ia akan
    // "lolos" dengan memeriksa warna milik kategori sungguhan. Lebih baik
    // merah di sini, dengan pesan yang menyebut persis apa yang harus
    // diganti, daripada diam-diam kehilangan penjaganya.
    expect(
      CATEGORIES,
      "'Steampunk' kini kategori resmi — ganti contoh di tes di atas dengan nama lain yang asing",
    ).not.toContain("Steampunk");
  });
});

describe("kelengkapan warna — tiap kategori wajib punya warnanya sendiri", () => {
  // KENAPA penjaga ini ada (2026-11-13): owner menambah 17 kategori sekaligus,
  // dan tiap kategori butuh warna DIKETIK TANGAN di DUA tempat terpisah
  // (ACCENT di lib/genre-accent.ts + CATEGORY_COLORS di app/admin/constants.ts).
  // Satu nama yang salah ketik tidak melempar error apa pun: chip-nya cuma
  // jatuh ke abu-abu FALLBACK, dan lencananya di panel admin jadi kelabu.
  // Tidak ada yang melapor — persis jenis kerusakan yang tak pernah ketahuan
  // sampai ada yang kebetulan memperhatikan.

  it("tiap kategori punya aksen sendiri, bukan jatuh ke FALLBACK putih", () => {
    const tanpaWarna = KATEGORI_ISI.filter(
      (k) => genreTextClass(k) === "text-white",
    );
    expect(
      tanpaWarna,
      `kategori ini belum didaftarkan di ACCENT (lib/genre-accent.ts): ${tanpaWarna.join(", ")}`,
    ).toEqual([]);
  });

  it("tiap kategori punya lencana sendiri di panel admin", () => {
    // Sejak katalog jadi 67 kategori (2026-11-13), lencana tak lagi didata
    // satu per satu — `warnaKategori` jatuh ke palet untuk yang tak punya
    // entri manual. Yang dijaga BERGESER, bukan hilang: dulu "sudah
    // didaftarkan?", sekarang "benar-benar dapat warna, bukan kelabu?".
    const kelabu = KATEGORI_ISI.filter((k) => {
      const w = warnaKategori(k);
      return !w || w === "bg-zinc-500";
    });
    expect(
      kelabu,
      `kategori ini tidak kebagian warna lencana: ${kelabu.join(", ")}`,
    ).toEqual([]);
  });

  it("warna kategori STABIL — tidak bergeser antar pemanggilan", () => {
    // Palet memilih warna dari huruf namanya, bukan dari urutan daftar.
    // Kalau suatu saat diganti jadi berbasis indeks, SEMUA warna bergeser
    // begitu satu kategori disisipkan di tengah — dan tak ada yang merah.
    for (const k of KATEGORI_ISI.slice(0, 10)) {
      expect(warnaKategori(k)).toBe(warnaKategori(k));
      expect(genreTextClass(k)).toBe(genreTextClass(k));
    }
  });

  it("warna kategori LAMA tidak ikut bergeser oleh palet", () => {
    // Warna ini sudah dilihat penonton sejak lama. Palet hanya boleh mengisi
    // kategori yang BELUM punya entri manual — kalau ia ikut menimpa yang
    // lama, tampilan situs berubah tanpa ada yang memintanya.
    expect(warnaKategori("Romance")).toBe("bg-rose-500");
    expect(warnaKategori("Action")).toBe("bg-orange-500");
    expect(genreTextClass("Romance")).toContain("rose");
    expect(genreTextClass("Action")).toContain("orange");
  });

  it("dropdown admin menawarkan SELURUH kategori, bukan salinan yang tertinggal", () => {
    // Inilah bug yang owner laporkan sebagai "pilihan genrenya sedikit":
    // app/admin/constants.ts dulu menyimpan salinan ketikan tangan berisi 7
    // kategori, jadi daftar yang bertambah di lib/types.ts tidak pernah
    // sampai ke dropdown. Dua daftar yang sama-sama sah tidak pernah
    // bertabrakan — karena itu tak ada error, dan karena itu pula butuh tes.
    expect(CATEGORY_OPTIONS).toEqual(KATEGORI_ISI);
  });
});
