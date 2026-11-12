// Penjaga ISI MASSAL data video — owner 2026-11-11: "bisa kamu buatkan agar
// saya bisa mengisinya sekali jalan agar tidak perlu isi persatu film".
//
// Yang dijaga di sini semuanya kerusakan SENYAP — tak satu pun memunculkan
// error di layar:
//   • salah ketik di satu baris diam-diam MENGHAPUS nilai yang sudah benar
//     (perilaku jalur satuan yang sengaja tidak dibawa ke jalur massal);
//   • kolom yang tidak dikirim ikut terhapus karena peta ditulis ulang utuh;
//   • entri meta kosong (`{}`) tertinggal lalu terbaca sebagai "sudah
//     dikoreksi jadi tanpa apa-apa" oleh pembaca berikutnya;
//   • laporan "38 video tersimpan" menghitung video yang nilainya tidak
//     berubah sama sekali.
import { describe, it, expect } from "vitest";
import {
  bacaKirimanMassal,
  terapkanIsianMassal,
  hitungVideoBerubah,
  MAKS_VIDEO_PER_KIRIM,
  KOLOM_MASSAL,
  type PetaIsian,
} from "../lib/isian-massal-video";

const petaKosong = (): PetaIsian => ({
  jenis: {},
  kategori: {},
  kualitas: {},
  rating: {},
  meta: {},
});

describe("bacaKirimanMassal — menyaring kiriman browser", () => {
  it("menerima enam kolom sekaligus untuk satu video", () => {
    const { bersih, ditolak } = bacaKirimanMassal([
      {
        videoId: "v1",
        jenis: "series",
        kategori: "Action",
        kualitas: "HD",
        rating: "7,4",
        tahun: "2024",
        durasi: "1:47:00",
      },
    ]);

    expect(ditolak).toEqual([]);
    expect(bersih).toEqual([
      {
        videoId: "v1",
        jenis: "series",
        kategori: "Action",
        kualitas: "HD",
        // Koma diterima sebagai pemisah desimal lalu dibakukan jadi titik —
        // yang mengetik orang Indonesia.
        rating: "7.4",
        tahun: "2024",
        // 1 jam 47 menit. Bentuk inilah yang paling mungkin diketik karena
        // persis itu yang tergambar di kartu film.
        durasiDetik: 6420,
      },
    ]);
  });

  it("kolom yang TIDAK dikirim tidak ikut masuk hasil", () => {
    // 🪤 Pagar terpenting berkas ini. Layar mengirim hanya kolom yang disentuh;
    // kalau kolom yang absen ikut terbaca sebagai "kosongkan", membetulkan
    // durasi saja akan menghapus tahun, rating, dan kategori yang sudah benar —
    // tanpa satu pun error.
    const { bersih } = bacaKirimanMassal([{ videoId: "v1", durasi: "95 min" }]);
    expect(bersih).toEqual([{ videoId: "v1", durasiDetik: 5700 }]);
    expect(bersih[0]).not.toHaveProperty("tahun");
    expect(bersih[0]).not.toHaveProperty("rating");
  });

  it("kotak yang DIKOSONGKAN berarti hapus, bukan ditolak", () => {
    const { bersih, ditolak } = bacaKirimanMassal([
      { videoId: "v1", rating: "", tahun: null, kualitas: "   " },
    ]);
    expect(ditolak).toEqual([]);
    expect(bersih[0]).toEqual({
      videoId: "v1",
      rating: null,
      tahun: null,
      kualitas: null,
    });
  });

  it("nilai BERISI tapi tak terbaca DITOLAK — tidak diam-diam menghapus", () => {
    // 🪤 Inilah beda sengaja jalur massal dari jalur satuan. Di endpoint satuan
    // "abc" berarti "kosongkan" — aman karena orangnya sedang memandangi kotak
    // itu. Di sini 40 baris dikirim sekaligus: menghapus diam-diam berarti
    // nilai yang sudah benar lenyap tanpa ada yang tahu.
    const { bersih, ditolak } = bacaKirimanMassal([
      { videoId: "v1", rating: "abc", tahun: "24", kualitas: "hd" },
    ]);

    // Nol yang tersimpan: ketiganya ditolak, jadi barisnya tidak punya isi.
    expect(bersih).toEqual([]);
    expect(ditolak.map((d) => d.kolom).sort()).toEqual([
      "kualitas",
      "rating",
      "tahun",
    ]);
    // Laporan menyebut apa yang diketik, supaya admin tahu baris mana yang
    // harus dibetulkan.
    expect(ditolak.find((d) => d.kolom === "rating")?.diketik).toBe("abc");
  });

  it("satu kolom ditolak tidak menggugurkan kolom lain di baris yang sama", () => {
    const { bersih, ditolak } = bacaKirimanMassal([
      { videoId: "v1", rating: "8.1", tahun: "dua ribu" },
    ]);
    expect(bersih).toEqual([{ videoId: "v1", rating: "8.1" }]);
    expect(ditolak).toHaveLength(1);
    expect(ditolak[0].kolom).toBe("tahun");
  });

  it("kualitas disaring PERSIS huruf besarnya", () => {
    // Database punya CHECK constraint yang persis juga — membetulkan "hd" jadi
    // "HD" di sini berarti kode & database punya dua aturan yang menyimpang.
    expect(bacaKirimanMassal([{ videoId: "v", kualitas: "HD" }]).bersih).toEqual(
      [{ videoId: "v", kualitas: "HD" }],
    );
    expect(
      bacaKirimanMassal([{ videoId: "v", kualitas: "hd" }]).ditolak,
    ).toHaveLength(1);
  });

  it("jenis di luar film/series ditolak", () => {
    expect(
      bacaKirimanMassal([{ videoId: "v", jenis: "sinetron" }]).ditolak[0].kolom,
    ).toBe("jenis");
    expect(bacaKirimanMassal([{ videoId: "v", jenis: "film" }]).bersih).toEqual([
      { videoId: "v", jenis: "film" },
    ]);
  });

  it("durasi 1:70:00 ditolak, bukan ditebak jadi angka lain", () => {
    // Menit 70 mustahil = admin salah ketik. Menebak maksudnya berarti memajang
    // durasi karangan ke penonton.
    expect(
      bacaKirimanMassal([{ videoId: "v", durasi: "1:70:00" }]).ditolak,
    ).toHaveLength(1);
  });

  it("baris tanpa videoId dibuang, bukan membuat entri hantu", () => {
    const { bersih } = bacaKirimanMassal([
      { videoId: "", rating: "7.0" },
      { rating: "8.0" },
      "bukan objek",
      null,
      { videoId: "v2", rating: "9.0" },
    ]);
    expect(bersih).toEqual([{ videoId: "v2", rating: "9.0" }]);
  });

  it("videoId yang muncul dua kali digabung jadi SATU baris", () => {
    // Dua baris untuk video yang sama membuat hitungan "berapa video
    // tersimpan" menghitungnya dua kali.
    const { bersih } = bacaKirimanMassal([
      { videoId: "v1", rating: "7.0" },
      { videoId: "v1", tahun: "2020" },
    ]);
    expect(bersih).toEqual([{ videoId: "v1", rating: "7.0", tahun: "2020" }]);
  });

  it("kiriman yang kelewat panjang dipotong di batas", () => {
    const banyak = Array.from({ length: MAKS_VIDEO_PER_KIRIM + 50 }, (_, i) => ({
      videoId: `v${i}`,
      rating: "7.0",
    }));
    expect(bacaKirimanMassal(banyak).bersih).toHaveLength(MAKS_VIDEO_PER_KIRIM);
  });

  it("body yang bukan array memulangkan hasil kosong, bukan melempar", () => {
    expect(bacaKirimanMassal(null)).toEqual({ bersih: [], ditolak: [] });
    expect(bacaKirimanMassal({ videoId: "v" })).toEqual({
      bersih: [],
      ditolak: [],
    });
  });

  it("keenam kolom punya penyaring — tak ada yang lolos tanpa diperiksa", () => {
    // Penjaga terhadap kolom baru yang ditambahkan ke KOLOM_MASSAL tapi lupa
    // diberi penyaring: tanpa tes ini, nilainya akan masuk database apa adanya.
    for (const kolom of Object.keys(KOLOM_MASSAL)) {
      const { bersih, ditolak } = bacaKirimanMassal([
        { videoId: "v", [kolom]: "###tidak-mungkin-sah###" },
      ]);
      expect(
        ditolak.length === 1 || bersih.length === 0,
        `kolom "${kolom}" meloloskan nilai ngawur`,
      ).toBe(true);
    }
  });
});

describe("terapkanIsianMassal — menulis ke kelima peta", () => {
  it("menulis nilai baru dan melaporkan dokumen mana yang berubah", () => {
    const lama = petaKosong();
    const { baru, berubah } = terapkanIsianMassal(lama, [
      { videoId: "v1", kualitas: "HD", rating: "7.4" },
    ]);

    expect(baru.kualitas).toEqual({ v1: "HD" });
    expect(baru.rating).toEqual({ v1: "7.4" });
    expect(berubah.sort()).toEqual(["kualitas", "rating"]);
    // Dokumen yang tidak disentuh TIDAK ikut ditulis ulang — menulis dokumen
    // tanpa perubahan cuma menambah peluang bentrok dengan admin lain.
    expect(berubah).not.toContain("jenis");
  });

  it("peta masukan TIDAK disentuh (fungsi murni)", () => {
    // Kalau peta lama ikut berubah, pemanggil yang GAGAL menyimpan tetap
    // terlanjur punya peta setengah berubah di memori — layar lalu menampilkan
    // nilai yang sebenarnya tidak pernah masuk database.
    const lama = petaKosong();
    lama.rating = { v1: "5.0" };
    terapkanIsianMassal(lama, [{ videoId: "v1", rating: "9.9" }]);
    expect(lama.rating).toEqual({ v1: "5.0" });
  });

  it("nilai null MENGHAPUS kunci, bukan menyimpan teks kosong", () => {
    // Entri kosong terbaca pembaca berikutnya sebagai "sudah dikoreksi jadi
    // tanpa label", sehingga turunan otomatis tidak pernah jalan lagi.
    const lama = petaKosong();
    lama.kualitas = { v1: "CAM" };
    const { baru } = terapkanIsianMassal(lama, [
      { videoId: "v1", kualitas: null },
    ]);
    expect(baru.kualitas).toEqual({});
    expect("v1" in baru.kualitas).toBe(false);
  });

  it("meta: field yang tidak dikirim tidak tersentuh", () => {
    const lama = petaKosong();
    lama.meta = { v1: { tahun: "2020", durasiDetik: 3600 } };
    const { baru } = terapkanIsianMassal(lama, [
      { videoId: "v1", durasiDetik: 7200 },
    ]);
    expect(baru.meta.v1).toEqual({ tahun: "2020", durasiDetik: 7200 });
  });

  it("meta: entri yang kedua fieldnya habis DIHAPUS seluruhnya", () => {
    const lama = petaKosong();
    lama.meta = { v1: { tahun: "2020" } };
    const { baru } = terapkanIsianMassal(lama, [
      { videoId: "v1", tahun: null },
    ]);
    expect(baru.meta).toEqual({});
  });

  it("menyimpan nilai yang SAMA persis tidak dihitung sebagai perubahan", () => {
    const lama = petaKosong();
    lama.rating = { v1: "7.4" };
    const { berubah } = terapkanIsianMassal(lama, [
      { videoId: "v1", rating: "7.4" },
    ]);
    expect(berubah).toEqual([]);
  });

  it("banyak video dalam satu terapan", () => {
    const lama = petaKosong();
    const { baru } = terapkanIsianMassal(lama, [
      { videoId: "a", kualitas: "HD" },
      { videoId: "b", kualitas: "HD" },
      { videoId: "c", kualitas: "4K" },
    ]);
    expect(baru.kualitas).toEqual({ a: "HD", b: "HD", c: "4K" });
  });
});

describe("hitungVideoBerubah — angka yang dilaporkan ke admin", () => {
  it("hanya menghitung video yang nilainya benar-benar berbeda", () => {
    const lama = petaKosong();
    lama.rating = { v1: "7.4" };
    const perubahan = [
      { videoId: "v1", rating: "7.4" }, // sama -> tidak dihitung
      { videoId: "v2", rating: "8.0" }, // baru -> dihitung
    ];
    const { baru } = terapkanIsianMassal(lama, perubahan);
    expect(hitungVideoBerubah(lama, baru, perubahan)).toBe(1);
  });

  it("perubahan di meta ikut terhitung", () => {
    const lama = petaKosong();
    const perubahan = [{ videoId: "v1", durasiDetik: 6420 }];
    const { baru } = terapkanIsianMassal(lama, perubahan);
    expect(hitungVideoBerubah(lama, baru, perubahan)).toBe(1);
  });
});
