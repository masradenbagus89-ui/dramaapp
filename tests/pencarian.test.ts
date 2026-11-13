// Penjaga fitur pencarian judul (owner 2026-09-12).
//
// Lima kegagalan di bawah ini BENAR-BENAR terjadi di produksi dan dibuktikan
// dengan menjalankan fungsi asli terhadap 42 judul katalog sungguhan. Tes ini
// menguncinya supaya tidak kambuh: kalau ada yang "merapikan" pencocokan teks
// kembali ke `includes` mentah, berkas ini MERAH.
import { describe, it, expect } from "vitest";
import {
  cocokSemuaKata,
  diawaliKetikan,
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

describe("PREFIX SEARCH — ketikan harus MENGAWALI kata (owner 2026-11-13)", () => {
  it("potongan dari DEPAN kata cocok", () => {
    expect(cocokSemuaKata(["fan"], "Fantasy")).toBe(true);
    expect(cocokSemuaKata(["kni"], "The Dark Knight")).toBe(true);
    // Termasuk kata PERTAMA — ia juga butuh pembatas kiri, dan itulah sebab
    // `cocokSemuaKata` menempelkan satu spasi di depan teks gabungan.
    expect(cocokSemuaKata(["the"], "The Dark Knight")).toBe(true);
  });

  it("potongan dari TENGAH kata TIDAK lagi cocok — inilah perubahannya", () => {
    // Sebelum 2026-11-13 ketiganya `true`, karena dulu dicari sebagai
    // potongan bebas di mana saja. Itu yang membuat ketikan pendek menyeret
    // judul yang cuma kebetulan mengandung huruf-huruf itu di tengah.
    expect(cocokSemuaKata(["ight"], "The Dark Knight")).toBe(false);
    expect(cocokSemuaKata(["antasy"], "Fantasy")).toBe(false);
    expect(cocokSemuaKata(["ormers"], "Transformers")).toBe(false);
  });

  it("ketikan sepanjang kata utuh tetap cocok (bukan cuma potongan)", () => {
    // Prefix "sepanjang katanya sendiri" adalah kasus batas yang gampang
    // terlewat kalau pencocokannya ditulis dengan `>` alih-alih `>=`.
    expect(cocokSemuaKata(["knight"], "The Dark Knight")).toBe(true);
    expect(cocokSemuaKata(["fantasy"], "Fantasy")).toBe(true);
  });

  it("tiap kata dinilai sendiri-sendiri, semuanya wajib mengawali", () => {
    // "dark" mengawali "Dark" ✓ tapi "ight" tak mengawali apa pun ✗
    // -> keseluruhannya gagal, karena syaratnya SEMUA kata.
    expect(cocokSemuaKata(["dark", "ight"], "The Dark Knight")).toBe(false);
    expect(cocokSemuaKata(["dark", "kni"], "The Dark Knight")).toBe(true);
  });

  it("pencarian lama yang sudah bekerja TIDAK ikut rusak", () => {
    // Keempat baris ini kegagalan produksi yang dulu diperbaiki
    // (lihat describe di bawah). Prefix search tidak boleh menghidupkannya
    // kembali — semuanya mengetik kata utuh dari depan, jadi tetap aman.
    expect(cocokSemuaKata(["spider", "man"], "Spider-Man: Brand New Day")).toBe(true);
    expect(
      cocokSemuaKata(["transformers", "last", "knight"], "Transformers: The Last Knight"),
    ).toBe(true);
    expect(cocokSemuaKata(["knight", "dark"], "The Dark Knight")).toBe(true);
    expect(cocokSemuaKata(["ceo"], "Pembantu Miskin Taklukkan Hati CEO!")).toBe(true);
  });
});

describe("KESERAGAMAN — semua kotak cari situs memakai SATU aturan", () => {
  // Owner 2026-11-13, putaran terakhir: "dua search ini belum seragam",
  // disertai gambar kotak cari PENONTON (ketik "ha") dan kotak cari ADMIN
  // (ketik "sp") yang dua-duanya memunculkan judul dengan kata cocok di
  // TENGAH. Yang dikunci di sini bukan sekadar hasil satu fungsi, tapi bahwa
  // SEMUA permukaan cari memberi jawaban yang sama untuk ketikan yang sama.

  const JUDUL_UJI = [
    "Pria Nakal Menembus Waktu, Menguasai Harem Kaisar", // "Harem" di TENGAH
    "Halloween Ends (2022)", // diawali "Ha"
    "The Guardians of the Galaxy Holiday Special", // "Special" di TENGAH
    "Spirited (2022)", // diawali "Sp"
  ];

  it("ketik 'ha' hanya memunculkan judul yang DIAWALI ha", () => {
    const cocok = JUDUL_UJI.filter((j) => diawaliKetikan("ha", j));
    expect(cocok).toEqual(["Halloween Ends (2022)"]);
  });

  it("ketik 'sp' hanya memunculkan judul yang DIAWALI sp", () => {
    const cocok = JUDUL_UJI.filter((j) => diawaliKetikan("sp", j));
    expect(cocok).toEqual(["Spirited (2022)"]);
  });

  it("katalog drama & daftar admin memberi jawaban yang SAMA", () => {
    // Keduanya lewat jalur kode berbeda — `filterAndSortDramas` untuk
    // halaman penonton, `saringDenganKetikan` untuk daftar di panel admin.
    // Kalau salah satunya kelak diubah sendirian, baris ini merah.
    const lewatKatalog = filterAndSortDramas(
      JUDUL_UJI.map((t, i) => drama({ id: String(i), title: t })),
      { query: "ha" },
    ).map((d) => d.title);

    const lewatDaftarAdmin = saringDenganKetikan(
      JUDUL_UJI.map((t) => ({ title: t })),
      "ha",
      (v) => [v.title],
    ).map((v) => v.title);

    expect(lewatKatalog).toEqual(lewatDaftarAdmin);
    expect(lewatKatalog).toEqual(["Halloween Ends (2022)"]);
  });

  it("kotak cari kosong tetap memulangkan semuanya di KEDUA jalur", () => {
    // Kasus batas yang gampang rusak saat aturan diganti: "belum mengetik"
    // harus berarti "jangan menyaring", bukan "tidak ada yang cocok".
    expect(
      saringDenganKetikan(JUDUL_UJI.map((t) => ({ title: t })), "", (v) => [v.title]),
    ).toHaveLength(JUDUL_UJI.length);
    expect(
      filterAndSortDramas(
        JUDUL_UJI.map((t, i) => drama({ id: String(i), title: t })),
        { query: "" },
      ),
    ).toHaveLength(JUDUL_UJI.length);
  });
});

describe("diawaliKetikan — prefix dari AWAL NAMA (dipakai kolom genre)", () => {
  it("cocok hanya kalau NAMA-nya diawali ketikan", () => {
    expect(diawaliKetikan("s", "Sport")).toBe(true);
    expect(diawaliKetikan("sci", "Sci-Fi")).toBe(true);
    expect(diawaliKetikan("s", "Horror")).toBe(false);
  });

  it("awal KATA KEDUA tidak dihitung — inilah bedanya dengan cocokSemuaKata", () => {
    // Keluhan owner 2026-11-13. "Talk-Show" dan "Game-Show" punya kata kedua
    // yang diawali "s", dan aturan pencarian JUDUL menganggap itu cocok —
    // benar untuk judul film, salah untuk nama genre.
    expect(diawaliKetikan("s", "Talk-Show")).toBe(false);
    expect(diawaliKetikan("s", "Game-Show")).toBe(false);
    // Dibandingkan langsung supaya bedanya tak bisa disalahpahami:
    expect(cocokSemuaKata(["s"], "Talk-Show")).toBe(true);
  });

  it("salah satu teks saja sudah cukup — nama Inggris ATAU label Indonesia", () => {
    // "Horror" tidak diawali "horor", tapi labelnya iya. Owner mengetik
    // bahasa yang terlintas duluan; memaksanya menebak ejaan mana yang
    // "benar" adalah hambatan yang tak perlu ada.
    expect(diawaliKetikan("horor", "Horror", "Horor")).toBe(true);
    expect(diawaliKetikan("hor", "Horror", "Horor")).toBe(true);
  });

  it("tanda baca diratakan sama seperti pencarian lain", () => {
    // "Sci-Fi" dinormalisasi jadi "sci fi", jadi ketikan dengan atau tanpa
    // tanda hubung sama-sama bekerja.
    expect(diawaliKetikan("sci-fi", "Sci-Fi")).toBe(true);
    expect(diawaliKetikan("SCI", "Sci-Fi")).toBe(true);
  });

  it("ketikan kosong berarti JANGAN menyaring, bukan nol hasil", () => {
    expect(diawaliKetikan("", "apa pun")).toBe(true);
    expect(diawaliKetikan("   ", "apa pun")).toBe(true);
  });

  it("teks kosong/null tidak bikin error", () => {
    expect(diawaliKetikan("s", null, undefined, "")).toBe(false);
    expect(diawaliKetikan("s", null, "Sport")).toBe(true);
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

  it("⚠️ kata yang terlewat KINI membatalkan hasil — keputusan owner 2026-11-13", () => {
    // ⚠️ TES INI DIBALIK, dan itu disengaja. Bunyinya dulu "kata yang terlewat
    // tidak membatalkan hasil": "transformers last knight" (penonton melewatkan
    // "The") harus menemukan "Transformers: The Last Knight". Itu perbaikan
    // 2026-09-12 yang juga diminta owner.
    //
    // Owner membalikkannya 2026-11-13 sesudah empat putaran, dengan gambar dua
    // kotak cari yang memunculkan judul berkata-cocok di TENGAH: "dua search
    // ini belum seragam". Permintaannya: satu aturan untuk seluruh situs —
    // yang TAMPIL harus DIAWALI yang DIKETIK.
    //
    // Kedua contoh di bawah DISAMPAIKAN ke owner sebagai harga yang dibayar
    // SEBELUM ia memutuskan. Dibiarkan hidup di sini sebagai tes, bukan
    // dihapus, supaya kerugiannya tetap terlihat hitam di atas putih dan
    // sesi berikutnya tidak mengira ini bug yang perlu "diperbaiki".
    expect(judulUntuk("transformers last knight")).toEqual([]);
    // Yang BEKERJA sekarang: mengetik dari depan judulnya.
    expect(judulUntuk("transformers")).toEqual(["Transformers: The Last Knight"]);
  });

  it("⚠️ urutan kata TIDAK lagi boleh tertukar — keputusan owner yang sama", () => {
    // Dulu: "knight dark" menemukan "The Dark Knight". Sekarang tidak —
    // judulnya diawali "The", bukan "knight".
    expect(judulUntuk("knight dark")).toEqual([]);
    expect(judulUntuk("knight")).toEqual([]);
    // Yang bekerja: dari huruf pertama judulnya.
    expect(judulUntuk("the dark")).toEqual(["The Dark Knight"]);
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
      kategori: null,
      rating: null,
      contentRating: null,
      country: null,
      quality: null,
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

  it("huruf besar-kecil tidak berpengaruh (urutan kata KINI berpengaruh)", () => {
    // Huruf besar-kecil tetap diratakan — itu tidak ikut berubah.
    expect(cariVideoPlayly(VIDEO, "BEYOND the").map((v) => v.id)).toEqual(["v1"]);
    // ⚠️ Tapi urutan kini menentukan (keputusan owner 2026-11-13, lihat
    // describe di atas): "SIGNAL beyond" tak lagi menemukan apa pun.
    expect(cariVideoPlayly(VIDEO, "SIGNAL beyond")).toEqual([]);
  });

  it("spasi ganda di judul Playly tidak menghalangi", () => {
    // Judul aslinya "MOVIE_TITAN WAR  THE LAST KING" — garis bawah jadi
    // spasi, spasi ganda dirapatkan. Yang diuji di sini perataan BENTUK
    // teksnya, jadi ketikannya ikut dimulai dari awal judul.
    expect(cariVideoPlayly(VIDEO, "movie titan war the last king").map((v) => v.id)).toEqual([
      "v2",
    ]);
  });

  it("judul beraksen bisa diketik TANPA aksen", () => {
    // Papan ketik penonton Indonesia tidak punya tombol "í". Tanpa perataan
    // aksen, video ini mustahil ditemukan dari kotak cari.
    // Ketikannya kini dari awal judul, tapi yang DIUJI tetap sama: "í" di
    // "Alienígena" harus cocok dengan "i" yang diketik penonton.
    expect(
      cariVideoPlayly(VIDEO, "me ordenaron matar a la reina alienigena").map((v) => v.id),
    ).toEqual(["v4"]);
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
