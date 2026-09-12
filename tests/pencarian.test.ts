// Penjaga fitur pencarian judul (owner 2026-09-12).
//
// Lima kegagalan di bawah ini BENAR-BENAR terjadi di produksi dan dibuktikan
// dengan menjalankan fungsi asli terhadap 42 judul katalog sungguhan. Tes ini
// menguncinya supaya tidak kambuh: kalau ada yang "merapikan" pencocokan teks
// kembali ke `includes` mentah, berkas ini MERAH.
import { describe, it, expect } from "vitest";
import {
  cocokSemuaKata,
  normalisasiTeks,
  pecahKataKunci,
  saringDenganKetikan,
} from "../lib/pencarian";
import { filterAndSortDramas } from "../lib/discover";
import { cariVideoPlayly } from "../app/components/beranda/HasilPlayly";
import type { Drama } from "../lib/types";
import type { PlaylyVideoPublik } from "../lib/playly-publik";

function drama(partial: Partial<Drama> & Pick<Drama, "id" | "title">): Drama {
  return {
    category: "Action",
    episodes: 1,
    views: "0",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

/** Judul ASLI dari katalog produksi — bukan contoh karangan. */
const KATALOG: Drama[] = [
  drama({ id: "1", title: "Spider-Man: Brand New Day" }),
  drama({ id: "2", title: "Transformers: The Last Knight" }),
  drama({ id: "3", title: "The Dark Knight" }),
  drama({ id: "4", title: "CEO Miliarder Kembali ke Desa Demi Gadis Sederhana!" }),
  drama({ id: "5", title: "Pembantu Miskin Taklukkan Hati CEO!", category: "Romance" }),
];

function judulUntuk(ketikan: string): string[] {
  return filterAndSortDramas(KATALOG, { query: ketikan }).map((d) => d.title);
}

describe("normalisasiTeks", () => {
  it("meratakan huruf besar-kecil", () => {
    expect(normalisasiTeks("CEO Miliarder")).toBe("ceo miliarder");
  });

  it("membuang aksen tapi menyisakan hurufnya", () => {
    expect(normalisasiTeks("Reina Alienígena")).toBe("reina alienigena");
  });

  it("mengubah tanda baca jadi SPASI, bukan menghapusnya", () => {
    // Kalau dihapus, hasilnya "spiderman" dan ketikan "spider man" tetap meleset.
    expect(normalisasiTeks("Spider-Man: Brand New Day")).toBe(
      "spider man brand new day",
    );
  });

  it("membuang emoji tanpa menempelkan kata di kiri-kanannya", () => {
    expect(normalisasiTeks("SINBAD 🔥 TERJEBAK")).toBe("sinbad terjebak");
  });
});

describe("pecahKataKunci", () => {
  it("kotak cari kosong = daftar kata kosong (bukan satu kata kosong)", () => {
    expect(pecahKataKunci("")).toEqual([]);
    expect(pecahKataKunci("   ")).toEqual([]);
    expect(pecahKataKunci("!!!")).toEqual([]);
  });

  it("spasi berlebih tidak menghasilkan kata hantu", () => {
    expect(pecahKataKunci("  dark   knight  ")).toEqual(["dark", "knight"]);
  });
});

describe("cocokSemuaKata", () => {
  it("tanpa ketikan, semuanya cocok", () => {
    expect(cocokSemuaKata([], "apa pun")).toBe(true);
  });

  it("menuntut SEMUA kata, bukan salah satu", () => {
    expect(cocokSemuaKata(["dark", "knight"], "The Dark Knight")).toBe(true);
    expect(cocokSemuaKata(["dark", "naga"], "The Dark Knight")).toBe(false);
  });

  it("field kosong/null diabaikan, bukan bikin error", () => {
    expect(cocokSemuaKata(["ceo"], null, undefined, "Hati CEO")).toBe(true);
  });

  it("tidak merangkai kata palsu dari dua field yang bersebelahan", () => {
    // "...ce" + "o..." TIDAK boleh terbaca jadi "ceo".
    expect(cocokSemuaKata(["ceo"], "Sepotong Roti Ce", "Oleh Siapa")).toBe(false);
  });
});

describe("pencarian katalog drama — kegagalan nyata yang dikunci", () => {
  it("huruf besar-kecil tidak berpengaruh (sudah jalan sebelumnya, jangan sampai hilang)", () => {
    expect(judulUntuk("ceo")).toEqual(judulUntuk("CEO"));
    expect(judulUntuk("Ceo MiLiArDeR")).toEqual([
      "CEO Miliarder Kembali ke Desa Demi Gadis Sederhana!",
    ]);
  });

  it("tanda hubung di judul boleh diketik sebagai spasi", () => {
    // DULU 0 hasil: judulnya "Spider-Man", yang diketik "spider man".
    expect(judulUntuk("spider man")).toEqual(["Spider-Man: Brand New Day"]);
    expect(judulUntuk("spider-man")).toEqual(["Spider-Man: Brand New Day"]);
  });

  it("kata yang terlewat tidak membatalkan hasil", () => {
    // DULU 0 hasil: penonton melewatkan kata "The".
    expect(judulUntuk("transformers last knight")).toEqual([
      "Transformers: The Last Knight",
    ]);
  });

  it("urutan kata boleh tertukar", () => {
    // DULU 0 hasil: "knight dark" bukan substring "The Dark Knight".
    expect(judulUntuk("knight dark")).toEqual(["The Dark Knight"]);
  });

  it("kotak cari kosong TIDAK mengosongkan katalog", () => {
    expect(judulUntuk("")).toHaveLength(KATALOG.length);
    expect(judulUntuk("   ")).toHaveLength(KATALOG.length);
  });

  it("ketikan yang benar-benar asing tetap memulangkan nol", () => {
    expect(judulUntuk("kapal selam nuklir")).toEqual([]);
  });
});

describe("pencarian video Playly", () => {
  function video(partial: Partial<PlaylyVideoPublik> = {}): PlaylyVideoPublik {
    return {
      id: "v1",
      title: "Beyond The Last Signal",
      durationSeconds: 600,
      durationLabel: "10:00",
      creator: "coklat",
      embedUrl: "https://playly-dashboard.vercel.app/id/v1/embed",
      thumbnail: null,
      dramaTitle: null,
      dramaHref: null,
      episode: null,
      year: null,
      genre: null,
      rating: null,
      ...partial,
    };
  }

  const VIDEO = [
    video(),
    video({ id: "v2", title: "MOVIE_TITAN WAR  THE LAST KING" }),
    video({ id: "v3", title: "Rahasia Mesin Terbang", creator: "budi" }),
    video({
      id: "v4",
      title: "Me ordenaron matar a la Reina Alienígena",
    }),
  ];

  it("judul yang dicari owner ketemu — inilah keluhan aslinya", () => {
    expect(cariVideoPlayly(VIDEO, "beyond the last signal").map((v) => v.id)).toEqual([
      "v1",
    ]);
  });

  it("huruf besar-kecil & urutan kata tidak berpengaruh", () => {
    expect(cariVideoPlayly(VIDEO, "SIGNAL beyond").map((v) => v.id)).toEqual(["v1"]);
  });

  it("spasi ganda di judul Playly tidak menghalangi", () => {
    expect(cariVideoPlayly(VIDEO, "titan war the last king").map((v) => v.id)).toEqual([
      "v2",
    ]);
  });

  it("judul beraksen bisa diketik TANPA aksen", () => {
    // Papan ketik penonton Indonesia tidak punya tombol "í". Tanpa perataan
    // aksen, video ini mustahil ditemukan dari kotak cari.
    expect(cariVideoPlayly(VIDEO, "reina alienigena").map((v) => v.id)).toEqual([
      "v4",
    ]);
  });

  it("bisa dicari lewat nama kreator", () => {
    expect(cariVideoPlayly(VIDEO, "budi").map((v) => v.id)).toEqual(["v3"]);
  });

  it("kotak cari kosong memulangkan semuanya (mode jelajah)", () => {
    expect(cariVideoPlayly(VIDEO, "")).toHaveLength(VIDEO.length);
  });

  it("daftar kosong tetap aman", () => {
    expect(cariVideoPlayly([], "apa saja")).toEqual([]);
  });
});

describe("saringDenganKetikan", () => {
  it("hanya melihat field yang ditunjuk, bukan seluruh objek", () => {
    const data = [{ nama: "Alfa", rahasia: "zulu" }];
    expect(saringDenganKetikan(data, "zulu", (x) => [x.nama])).toEqual([]);
    expect(saringDenganKetikan(data, "alfa", (x) => [x.nama])).toHaveLength(1);
  });
});
