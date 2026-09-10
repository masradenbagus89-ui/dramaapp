// Tes pengunci untuk jalur PUBLIK video Playly.
//
// Dua bug nyata yang sudah pernah lolos ke produksi dijaga di sini, supaya
// kalau kambuh tesnya MERAH lebih dulu — bukan owner yang menemukannya:
//
//   1. Kunci mitra yang SAH tidak terbaca karena tersimpan di env bernama
//      DASHBOARD_API_KEY, sedangkan kode hanya mencari PLAYLY_API_KEY.
//      Akibatnya halaman admin menulis "kunci belum dipasang" dan daftar video
//      selalu kosong, padahal kuncinya benar.
//   2. Video yang disembunyikan admin tetap ikut tampil ke penonton — kesalahan
//      yang tak terlihat dari sisi admin, jadi bisa berlarut-larut.
//   3. Video yang BERKASNYA tidak pernah sampai di Playly (upload putus) tetap
//      ditampilkan, jadi penonton mengkliknya lalu dapat layar hitam "Video
//      belum tersedia". Dilaporkan owner 2026-08-29 untuk dua video 35 menit.
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchPlaylyDetailPublik,
  filterVideoMilikKreator,
  punyaFileVideo,
  readPlaylyConfig,
  readPlaylyKeyFromEnv,
} from "../lib/playly";
import { bolehTampilKePenonton, rakitVideoPublik } from "../lib/playly-publik";
import type { PlaylyVideo } from "../lib/playly";

function video(id: string, judul = `Video ${id}`, creator = "coklat"): PlaylyVideo {
  return {
    id,
    title: judul,
    durationSeconds: 140,
    durationLabel: "2:20",
    creator,
    embedUrl: `https://playly-dashboard.vercel.app/id/${id}/embed`,
    thumbnail: null,
  };
}

describe("readPlaylyKeyFromEnv — kunci boleh datang dari dua nama env", () => {
  it("membaca PLAYLY_API_KEY kalau ada", () => {
    expect(readPlaylyKeyFromEnv({ PLAYLY_API_KEY: "plyk_abcdef123456" })).toBe(
      "plyk_abcdef123456",
    );
  });

  it("BUG YANG PERNAH LOLOS: kunci di DASHBOARD_API_KEY tetap terbaca", () => {
    expect(readPlaylyKeyFromEnv({ DASHBOARD_API_KEY: "plyk_abcdef123456" })).toBe(
      "plyk_abcdef123456",
    );
  });

  it("PLAYLY_API_KEY didahulukan kalau keduanya diisi", () => {
    expect(
      readPlaylyKeyFromEnv({
        PLAYLY_API_KEY: "plyk_benar123456",
        DASHBOARD_API_KEY: "plyk_lama123456",
      }),
    ).toBe("plyk_benar123456");
  });

  it("mengabaikan nilai yang jelas bukan kunci Playly", () => {
    // DASHBOARD_API_KEY bisa saja diisi kunci layanan LAIN; mengirimnya ke
    // Playly hanya menghasilkan 401 dan menyesatkan saat mencari penyebabnya.
    expect(readPlaylyKeyFromEnv({ DASHBOARD_API_KEY: "sk_live_rahasia" })).toBeNull();
  });

  it("spasi/baris baru di ujung tidak membuat kunci ditolak", () => {
    expect(readPlaylyKeyFromEnv({ PLAYLY_API_KEY: "  plyk_abcdef123456\n" })).toBe(
      "plyk_abcdef123456",
    );
  });

  it("env kosong -> null (bukan string kosong yang lolos sebagai 'ada kunci')", () => {
    expect(readPlaylyKeyFromEnv({})).toBeNull();
    expect(readPlaylyKeyFromEnv({ PLAYLY_API_KEY: "   " })).toBeNull();
  });
});

describe("rakitVideoPublik — video mana yang boleh dilihat penonton", () => {
  const dramas = [{ id: "drama-a", title: "Drama A" }];

  it("tanpa daftar sembunyi, SEMUA video mitra tampil (otomatis)", () => {
    const { tampil } = rakitVideoPublik([video("1"), video("2")], [], [], dramas);
    expect(tampil.map((v) => v.id)).toEqual(["1", "2"]);
  });

  it("video yang disembunyikan admin TIDAK ikut tampil", () => {
    const { tampil } = rakitVideoPublik(
      [video("1"), video("2"), video("3")],
      ["2"],
      [],
      dramas,
    );
    expect(tampil.map((v) => v.id)).toEqual(["1", "3"]);
  });

  it("menyembunyikan semua -> daftar kosong, bukan error", () => {
    const { tampil } = rakitVideoPublik([video("1")], ["1"], [], dramas);
    expect(tampil).toEqual([]);
  });

  it("id yang disembunyikan tapi videonya sudah tidak ada = diabaikan diam-diam", () => {
    const { tampil } = rakitVideoPublik([video("1")], ["sudah-dihapus"], [], dramas);
    expect(tampil.map((v) => v.id)).toEqual(["1"]);
  });

  it("video tanpa kaitan drama tetap tampil, labelnya kosong", () => {
    // Inti perbaikan 2026-08-26: dulu video WAJIB dikaitkan ke drama dulu,
    // sehingga trailer film yang tak punya drama padanan tak pernah bisa masuk.
    const { tampil, labelUntuk } = rakitVideoPublik([video("1")], [], [], dramas);
    expect(tampil).toHaveLength(1);
    expect(labelUntuk("1")).toEqual({
      dramaTitle: null,
      dramaHref: null,
      episode: null,
      year: null,
      genre: null,
      rating: null,
    });
  });

  it("video yang dikaitkan mendapat label judul drama + episode", () => {
    const { labelUntuk } = rakitVideoPublik(
      [video("1")],
      [],
      [{ videoId: "1", dramaId: "drama-a", episode: 3 }],
      dramas,
    );
    expect(labelUntuk("1")).toEqual({
      dramaTitle: "Drama A",
      dramaHref: "/drama/drama-a",
      episode: 3,
      year: null,
      genre: null,
      rating: null,
    });
  });

  // Kartu video menampilkan "2026 · Action, Sci-Fi" di bawah judul. Playly TIDAK
  // mengirim tahun/genre/rating sama sekali (lihat PlaylyVideo di lib/playly.ts),
  // jadi satu-satunya sumbernya drama yang dikaitkan admin. Tiga tes di bawah
  // menjaga jalur itu tetap tersambung.
  it("tahun, genre, dan rating ikut terbawa dari drama yang dikaitkan", () => {
    const { labelUntuk } = rakitVideoPublik(
      [video("1")],
      [],
      [{ videoId: "1", dramaId: "drama-b", episode: 1 }],
      [
        {
          id: "drama-b",
          title: "Drama B",
          year: "2026",
          genre: "Action, Sci-Fi",
          imdbRating: "8.1",
          category: "Action",
        },
      ],
    );
    expect(labelUntuk("1")).toMatchObject({
      year: "2026",
      genre: "Action, Sci-Fi",
      rating: "8.1",
    });
  });

  it("genre OMDb kosong -> pakai category katalog sebagai cadangan", () => {
    const { labelUntuk } = rakitVideoPublik(
      [video("1")],
      [],
      [{ videoId: "1", dramaId: "drama-c", episode: null }],
      [{ id: "drama-c", title: "Drama C", category: "Romance" }],
    );
    expect(labelUntuk("1").genre).toBe("Romance");
  });

  it("video tanpa kaitan drama -> tahun/genre/rating null, bukan teks kosong", () => {
    // Kartu memakai null sebagai tanda "sembunyikan barisnya". String kosong
    // akan lolos pengecekan dan menyisakan baris hampa di bawah judul.
    const { labelUntuk } = rakitVideoPublik([video("1")], [], [], dramas);
    expect(labelUntuk("1")).toMatchObject({ year: null, genre: null, rating: null });
  });

  it("kaitan ke drama yang sudah DIHAPUS tidak menghasilkan tautan menggantung", () => {
    const { tampil, labelUntuk } = rakitVideoPublik(
      [video("1")],
      [],
      [{ videoId: "1", dramaId: "drama-sudah-dihapus", episode: 1 }],
      dramas,
    );
    // Videonya tetap tampil — yang gugur hanya labelnya.
    expect(tampil).toHaveLength(1);
    expect(labelUntuk("1").dramaHref).toBeNull();
  });
});

describe("filterVideoMilikKreator — katalog publik disaring ke akun kita", () => {
  // Latar: kunci mitra terbukti bisa dicabut sewaktu-waktu (2026-08-26 kunci
  // yang sama dibalas ok:true lalu invalid_key 20 menit kemudian). Saat itu
  // terjadi, daftar diambil dari katalog publik Playly yang isinya bercampur
  // video kreator lain — penyaring inilah satu-satunya yang menahan mereka.
  const katalogCampur = [
    video("1", "Punya kita", "coklat"),
    video("2", "Punya orang lain", "viozahra"),
    video("3", "Punya kita juga", "coklat"),
    video("4", "Punya orang lain lagi", "cantika"),
  ];

  it("hanya video milik kreator kita yang lolos", () => {
    const hasil = filterVideoMilikKreator(katalogCampur, "coklat");
    expect(hasil.map((v) => v.id)).toEqual(["1", "3"]);
  });

  it("video kreator lain TIDAK pernah lolos", () => {
    const hasil = filterVideoMilikKreator(katalogCampur, "coklat");
    expect(hasil.some((v) => v.creator !== "coklat")).toBe(false);
  });

  it("beda besar-kecil huruf & spasi tidak membuat video kita hilang", () => {
    expect(filterVideoMilikKreator(katalogCampur, "  CoKlAt ").map((v) => v.id)).toEqual([
      "1",
      "3",
    ]);
  });

  it("nama kreator kosong -> TIDAK menampilkan apa pun (gagal-aman)", () => {
    // Kalau nama pembandingnya hilang, menampilkan seluruh katalog berarti video
    // orang lain terbit di situs kita. Lebih baik kosong daripada salah tayang.
    expect(filterVideoMilikKreator(katalogCampur, "")).toEqual([]);
    expect(filterVideoMilikKreator(katalogCampur, "   ")).toEqual([]);
  });

  it("nama kreator yang tidak ada di katalog -> kosong, bukan error", () => {
    expect(filterVideoMilikKreator(katalogCampur, "tidak-ada")).toEqual([]);
  });
});


// Balasan ASLI /api/public-video Playly, dipangkas ke field yang menentukan.
// Diambil langsung dari Playly 2026-08-29 — jangan "dirapikan" jadi bentuk yang
// lebih masuk akal: nilai apa adanya itulah yang harus tertangani.
const BALASAN_TANPA_BERKAS = {
  ok: true,
  id: 1787977846374,
  title: "Diasingkan Ke Bumi‼️ Dianggap Dewa Oleh Manusia   Cerita Film Mas Of Steel",
  creator: "coklat",
  allowEmbed: true,
  thumb: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD",
  videoUrl: null,
  variants: {},
  duration: "35:07",
};

const BALASAN_SEHAT = {
  ok: true,
  id: 1787642113102,
  title: "Transformers 8 Rise of the Unicron (2027)",
  creator: "coklat",
  allowEmbed: true,
  thumb: "https://playly-videos.r2.cloudflarestorage.com/thumbs/1787642113102.jpg?X-Amz-Signature=abc",
  videoUrl: "https://playly-videos.r2.cloudflarestorage.com/videos/1787642113102.mp4?X-Amz-Signature=abc",
  variants: {
    "360p": "https://playly-videos.r2.cloudflarestorage.com/videos/1787642113102_360p.mp4?X-Amz-Signature=abc",
    "720p": "https://playly-videos.r2.cloudflarestorage.com/videos/1787642113102_720p.mp4?X-Amz-Signature=abc",
  },
  duration: "2:20",
};

describe("punyaFileVideo — catatan video ada, tapi berkasnya belum tentu", () => {
  it("BUG YANG DILAPORKAN OWNER: videoUrl null + variants kosong -> tidak punya berkas", () => {
    expect(punyaFileVideo(BALASAN_TANPA_BERKAS)).toBe(false);
  });

  it("video yang tayang normal -> punya berkas", () => {
    expect(punyaFileVideo(BALASAN_SEHAT)).toBe(true);
  });

  it("cukup salah satu: variants terisi walau videoUrl kosong", () => {
    // Versi hasil olahan saja sudah bisa diputar, jadi jangan ikut dibuang.
    expect(
      punyaFileVideo({ ...BALASAN_TANPA_BERKAS, variants: { "480p": "https://a/b_480p.mp4" } }),
    ).toBe(true);
  });

  it("nilai kosong/spasi tidak dihitung sebagai berkas", () => {
    expect(punyaFileVideo({ ...BALASAN_TANPA_BERKAS, videoUrl: "" })).toBe(false);
    expect(punyaFileVideo({ ...BALASAN_TANPA_BERKAS, videoUrl: "   " })).toBe(false);
    expect(punyaFileVideo({ ...BALASAN_TANPA_BERKAS, variants: { "480p": "" } })).toBe(false);
  });
});

describe("fetchPlaylyDetailPublik — 'tidak tahu' TIDAK BOLEH sama dengan 'tidak ada'", () => {
  const konfigurasi = readPlaylyConfig({}); // default, tidak bergantung env mesin

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const balasDengan = (data: unknown, ok = true) => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok, json: async () => data })));
  };

  it("balasan asli tanpa berkas -> punyaFile false (video disembunyikan)", async () => {
    balasDengan(BALASAN_TANPA_BERKAS);
    const d = await fetchPlaylyDetailPublik("1787977846374", konfigurasi, 0);
    expect(d.punyaFile).toBe(false);
    expect(d.thumbnail).toContain("data:image/jpeg;base64,");
  });

  it("balasan asli lengkap -> punyaFile true + sampulnya ikut terbaca", async () => {
    balasDengan(BALASAN_SEHAT);
    const d = await fetchPlaylyDetailPublik("1787642113102", konfigurasi, 0);
    expect(d.punyaFile).toBe(true);
    expect(d.thumbnail).toContain("thumbs/1787642113102.jpg");
  });

  it("PAGAR: bentuk JSON Playly berubah -> null (tidak tahu), BUKAN false", async () => {
    // Kalau ini dijawab false, satu perubahan di pihak Playly menghapus SELURUH
    // video dari halaman penonton sekaligus — kerusakan jauh lebih parah
    // daripada masalah yang sedang diperbaiki.
    balasDengan({ data: BALASAN_SEHAT });
    expect((await fetchPlaylyDetailPublik("x", konfigurasi, 0)).punyaFile).toBeNull();
  });

  it("PAGAR: Playly tak bisa dihubungi -> null, video tetap tampil", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("timeout"); }));
    expect((await fetchPlaylyDetailPublik("x", konfigurasi, 0)).punyaFile).toBeNull();
  });

  it("PAGAR: balasan bukan 200 -> null", async () => {
    balasDengan(BALASAN_TANPA_BERKAS, false);
    expect((await fetchPlaylyDetailPublik("x", konfigurasi, 0)).punyaFile).toBeNull();
  });
});

describe("bolehTampilKePenonton — aturan yang menentukan video hilang atau tidak", () => {
  it("punya berkas -> tampil", () => {
    expect(bolehTampilKePenonton({ thumbnail: null, punyaFile: true })).toBe(true);
  });

  it("terbukti tidak punya berkas -> disembunyikan", () => {
    expect(bolehTampilKePenonton({ thumbnail: null, punyaFile: false })).toBe(false);
  });

  it("TIDAK TAHU -> tetap tampil (gagal ke sisi 'jangan hilangkan konten')", () => {
    expect(bolehTampilKePenonton({ thumbnail: null, punyaFile: null })).toBe(true);
    expect(bolehTampilKePenonton(undefined)).toBe(true);
  });
});
