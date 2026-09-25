// Penjaga permanen untuk penggabungan DUA sumber video Playly (2026-09-15).
//
// Halaman /playly dulu cuma menampilkan katalog yang kita JEMPUT dari API
// Playly. Video yang didorong Playly lewat webhook tersimpan rapi di database
// tapi tidak pernah muncul di halaman mana pun. Sejak lib/playly-gabungan.ts
// keduanya jadi satu daftar, dan empat hal di bawah harus TETAP benar:
//
// 1) SATU VIDEO = SATU KARTU. videoId yang sama ada di kedua sumber adalah
//    keadaan NORMAL (video mitra yang juga dikabarkan lewat webhook), bukan
//    kelainan. Kalau dedup-nya jebol, penonton melihat video kembar.
// 2) SATU SUMBER MATI, YANG LAIN TETAP TAMPIL. Halaman kosong karena satu
//    sumber bermasalah = kerusakan yang jauh lebih besar dari masalah aslinya.
// 3) VIDEO YANG DISEMBUNYIKAN ADMIN TIDAK BOLEH MUNCUL LEWAT PINTU WEBHOOK.
//    Bug "video sembunyi tetap tayang" sudah pernah lolos ke produksi sekali
//    (tests/playly-publik.test.ts); sumber kedua membuka jalan yang sama lagi.
// 4) GAGAL-AMAN. Kalau daftar sembunyi tak terbaca, jalur webhook ditahan —
//    bukan diloloskan (skills/owasp/SKILL.md §1 A10, jangan fail-open).
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PlaylyVideoPublik } from "../lib/playly-publik";
import type { PlaylyWebhookVideo } from "../lib/store";

/** Keadaan palsu kedua sumber, diatur per-tes tanpa menyentuh jaringan/Supabase. */
const state = {
  katalog: { videos: [] as PlaylyVideoPublik[], hiddenCount: 0, error: null as string | null },
  webhook: [] as PlaylyWebhookVideo[],
  hidden: [] as string[],
  /** Dinyalakan untuk meniru Supabase yang tidak bisa dihubungi. */
  webhookGagal: false,
  hiddenGagal: false,
  /**
   * Berapa kali tiap JALUR baca webhook dipakai. Inilah yang membedakan kedua
   * pintu keluar: keduanya menghasilkan daftar yang sama, jadi isi daftar saja
   * tidak bisa membuktikan halaman memakai jalur ber-cache.
   */
  dibaca: { segar: 0, cached: 0 },
};

vi.mock("../lib/playly-publik", () => ({
  // Sumber ini memang TIDAK PERNAH melempar — kegagalannya dilaporkan lewat
  // field `error`, jadi tiruannya pun begitu.
  getPlaylyVideosPublik: async () => state.katalog,
}));

vi.mock("../lib/store", () => ({
  getPublishedPlaylyWebhookVideos: async () => {
    state.dibaca.segar += 1;
    if (state.webhookGagal) throw new Error("supabase tidak bisa dihubungi");
    return state.webhook;
  },
  // Jalur ber-cache. Di produksi bedanya cuma opsi `revalidate` yang dioper ke
  // Supabase — yang tak bisa dilihat dari hasilnya, makanya dihitung di sini.
  getPublishedPlaylyWebhookVideosCached: async () => {
    state.dibaca.cached += 1;
    if (state.webhookGagal) throw new Error("supabase tidak bisa dihubungi");
    return state.webhook;
  },
  getPlaylyHiddenIdsCached: async () => {
    if (state.hiddenGagal) throw new Error("supabase tidak bisa dihubungi");
    return state.hidden;
  },
}));

const {
  gabungVideoPlayly,
  getPlaylyVideosGabungan,
  getPlaylyVideosGabunganCached,
  webhookKeKartu,
} = await import("../lib/playly-gabungan");

/** Satu baris katalog, sudah berbentuk kartu siap tampil. */
function kartuKatalog(id: string, ubah: Partial<PlaylyVideoPublik> = {}): PlaylyVideoPublik {
  return {
    id,
    title: `Katalog ${id}`,
    durationSeconds: 140,
    durationLabel: "2:20",
    creator: "coklat",
    embedUrl: `https://playly-dashboard.vercel.app/id/${id}/embed`,
    thumbnail: null,
    dramaTitle: null,
    dramaHref: null,
    episode: null,
    year: null,
    genre: null,
    rating: null,
    contentRating: null,
    quality: null,
    ...ubah,
  };
}

/** Satu baris webhook, bentuk mentah seperti yang tersimpan di database. */
function barisWebhook(
  videoId: string,
  ubah: Partial<PlaylyWebhookVideo> = {},
): PlaylyWebhookVideo {
  return {
    videoId,
    title: `Webhook ${videoId}`,
    description: null,
    year: null,
    genre: null,
    creator: "coklat",
    durationSeconds: 140,
    embedUrl: `https://playly-dashboard.vercel.app/id/${videoId}/embed`,
    thumbnailUrl: null,
    status: "published",
    receivedAt: "2026-09-15T10:00:00.000Z",
    ...ubah,
  };
}

beforeEach(() => {
  state.katalog = { videos: [], hiddenCount: 0, error: null };
  state.webhook = [];
  state.hidden = [];
  state.webhookGagal = false;
  state.hiddenGagal = false;
  state.dibaca = { segar: 0, cached: 0 };
});

// =====================  (a) KEDUA SUMBER ADA ISINYA  ======================

describe("(a) kedua sumber ada video, tidak ada yang duplikat", () => {
  it("semua video dari KEDUA sumber ikut tampil", async () => {
    state.katalog.videos = [kartuKatalog("k1"), kartuKatalog("k2")];
    state.webhook = [barisWebhook("w1"), barisWebhook("w2")];

    const { videos, error } = await getPlaylyVideosGabungan();

    expect(videos).toHaveLength(4);
    expect(videos.map((v) => v.id).sort()).toEqual(["k1", "k2", "w1", "w2"]);
    expect(error).toBeNull();
  });

  it("video webhook di ATAS, katalog di bawah dengan urutan aslinya utuh", async () => {
    // Urutan katalog TIDAK boleh diacak: itu urutan yang dikirim Playly, dan
    // satu-satunya urutan yang kita punya untuk sisi katalog (tipe PlaylyVideo
    // tidak membawa tanggal sama sekali).
    state.katalog.videos = [kartuKatalog("k1"), kartuKatalog("k2"), kartuKatalog("k3")];
    state.webhook = [barisWebhook("w1")];

    const { videos } = await getPlaylyVideosGabungan();

    expect(videos.map((v) => v.id)).toEqual(["w1", "k1", "k2", "k3"]);
  });

  it("antar sesama video webhook: yang notifikasinya PALING BARU di paling atas", () => {
    const videos = gabungVideoPlayly(
      [kartuKatalog("k1")],
      [
        barisWebhook("lama", { receivedAt: "2026-09-13T08:00:00.000Z" }),
        barisWebhook("paling-baru", { receivedAt: "2026-09-15T21:30:00.000Z" }),
        barisWebhook("tengah", { receivedAt: "2026-09-14T09:00:00.000Z" }),
      ],
    );

    expect(videos.map((v) => v.id)).toEqual(["paling-baru", "tengah", "lama", "k1"]);
  });

  it("menggabungkan TIDAK mengubah daftar milik pemanggil", () => {
    // Pengurutan yang memutasi masukan adalah kerusakan senyap: pemanggil
    // memakai daftar yang sama untuk hal lain dan urutannya diam-diam berubah.
    const katalog = [kartuKatalog("k1")];
    const webhook = [
      barisWebhook("w1", { receivedAt: "2026-09-13T08:00:00.000Z" }),
      barisWebhook("w2", { receivedAt: "2026-09-15T08:00:00.000Z" }),
    ];

    gabungVideoPlayly(katalog, webhook);

    expect(katalog.map((v) => v.id)).toEqual(["k1"]);
    expect(webhook.map((v) => v.videoId)).toEqual(["w1", "w2"]);
  });
});

// =====================  (b) videoId SAMA DI DUA SUMBER  ===================

describe("(b) videoId yang sama muncul di kedua sumber — tidak boleh dobel", () => {
  it("hanya SATU kartu yang tampil untuk videoId yang sama", async () => {
    state.katalog.videos = [kartuKatalog("sama"), kartuKatalog("k2")];
    state.webhook = [barisWebhook("sama"), barisWebhook("w1")];

    const { videos } = await getPlaylyVideosGabungan();

    expect(videos).toHaveLength(3);
    expect(videos.filter((v) => v.id === "sama")).toHaveLength(1);
  });

  it("yang MENANG adalah versi katalog, bukan versi webhook", async () => {
    // Alasannya ada di komentar gabungVideoPlayli: baris katalog sudah lolos
    // saringan "disembunyikan admin" + "berkasnya ada di Playly", baris webhook
    // belum. Kalau suatu saat ini dibalik, video yang sengaja disembunyikan
    // admin bisa muncul lagi lewat pintu webhook.
    state.katalog.videos = [kartuKatalog("sama", { title: "Judul dari katalog" })];
    state.webhook = [barisWebhook("sama", { title: "Judul dari webhook" })];

    const { videos } = await getPlaylyVideosGabungan();

    expect(videos).toHaveLength(1);
    expect(videos[0].title).toBe("Judul dari katalog");
  });

  it("video yang HANYA ada di webhook tetap masuk (bukan ikut terbuang)", async () => {
    // Pagar arah sebaliknya: dedup yang kebablasan membuang seluruh sumber
    // kedua, dan gejalanya persis sama dengan "webhook tidak jalan".
    state.katalog.videos = [kartuKatalog("sama")];
    state.webhook = [barisWebhook("sama"), barisWebhook("khusus-webhook")];

    const { videos } = await getPlaylyVideosGabungan();

    expect(videos.map((v) => v.id)).toEqual(["khusus-webhook", "sama"]);
  });
});

// =====================  (c) SATU SUMBER GAGAL  ============================

describe("(c) satu sumber gagal — sumber yang lain TETAP tampil", () => {
  it("katalog Playly bermasalah -> video webhook tetap tampil", async () => {
    state.katalog = { videos: [], hiddenCount: 0, error: "Playly tidak bisa dihubungi." };
    state.webhook = [barisWebhook("w1"), barisWebhook("w2")];

    const { videos, error } = await getPlaylyVideosGabungan();

    expect(videos.map((v) => v.id)).toEqual(["w1", "w2"]);
    // error tetap dilaporkan apa adanya, TAPI halaman hanya memakainya saat
    // daftarnya kosong — jadi yang dilihat pengunjung tetap videonya.
    expect(error).toBe("Playly tidak bisa dihubungi.");
  });

  it("daftar webhook tak terbaca (Supabase mati) -> video katalog tetap tampil", async () => {
    state.katalog.videos = [kartuKatalog("k1"), kartuKatalog("k2")];
    state.webhookGagal = true;

    const { videos, error } = await getPlaylyVideosGabungan();

    expect(videos.map((v) => v.id)).toEqual(["k1", "k2"]);
    expect(error).toBe("Daftar video dari notifikasi Playly tidak bisa dibaca.");
  });

  it("KEDUANYA bermasalah -> daftar kosong + alasan, BUKAN melempar", async () => {
    state.katalog = { videos: [], hiddenCount: 0, error: "Playly tidak bisa dihubungi." };
    state.webhookGagal = true;

    const { videos, error } = await getPlaylyVideosGabungan();

    // Melempar di sini berarti seluruh halaman /playly berubah jadi layar error
    // Next.js, bukan kotak "video sedang tidak bisa dimuat" yang sudah ada.
    expect(videos).toEqual([]);
    expect(error).toBe("Playly tidak bisa dihubungi.");
  });
});

// =====================  (d) KEDUA SUMBER KOSONG  ==========================

describe("(d) kedua sumber kosong", () => {
  it("daftar kosong TANPA error — 'belum ada video', bukan 'sedang rusak'", async () => {
    const { videos, error } = await getPlaylyVideosGabungan();

    expect(videos).toEqual([]);
    // Bedanya menentukan kalimat di layar: error null -> "Belum ada video dari
    // Playly."; error terisi -> "Video Playly sedang tidak bisa dimuat."
    // (app/playly/page.tsx). Menyamakan keduanya membuat fitur rusak tak bisa
    // dibedakan dari fitur yang memang belum ada isinya.
    expect(error).toBeNull();
  });
});

// ==========  VIDEO YANG TIDAK BOLEH TAMPIL LEWAT PINTU WEBHOOK  ===========

describe("saringan yang harus ikut berlaku untuk sumber webhook", () => {
  it("video yang sudah ditarik Playly (unpublished) tidak tampil", () => {
    const videos = gabungVideoPlayly(
      [],
      [barisWebhook("w1"), barisWebhook("w2", { status: "unpublished" })],
    );

    expect(videos.map((v) => v.id)).toEqual(["w1"]);
  });

  it("video yang DISEMBUNYIKAN ADMIN tidak muncul lagi lewat webhook", async () => {
    // Inti aturan 2: daftar sembunyi dibuat admin memakai id video Playly, dan
    // videoId webhook memakai ruang id yang sama. Tanpa ini, admin menyembunyikan
    // video -> hilang dari katalog -> muncul lagi dari webhook.
    state.katalog.videos = [kartuKatalog("k1")];
    state.webhook = [barisWebhook("disembunyikan"), barisWebhook("boleh")];
    state.hidden = ["disembunyikan"];

    const { videos } = await getPlaylyVideosGabungan();

    expect(videos.map((v) => v.id)).toEqual(["boleh", "k1"]);
  });

  it("GAGAL-AMAN: daftar sembunyi tak terbaca -> jalur webhook DITAHAN", async () => {
    // Kalau daftar sembunyi tidak terbaca, kita tidak tahu video mana yang
    // sengaja disembunyikan — meloloskan seluruh webhook di keadaan itu persis
    // pola fail-open yang dilarang skills/owasp/SKILL.md §1 (A10:2025).
    // Katalog sengaja TIDAK ikut ditahan: perilakunya sudah diputuskan di
    // lib/playly-publik.ts dan dipakai /beranda + /discover juga.
    state.katalog.videos = [kartuKatalog("k1")];
    state.webhook = [barisWebhook("w1")];
    state.hiddenGagal = true;

    const { videos } = await getPlaylyVideosGabungan();

    expect(videos.map((v) => v.id)).toEqual(["k1"]);
  });
});

// =====================  BENTUK DATA UNTUK KARTU  ==========================

describe("webhookKeKartu — baris webhook dipaskan ke bentuk yang dikenal kartu", () => {
  it("field inti dipetakan ke nama yang dipakai PlaylyVideoGrid", () => {
    const kartu = webhookKeKartu(
      barisWebhook("w1", {
        title: "Film Baru",
        thumbnailUrl: "https://contoh.test/sampul.jpg",
        year: 2026,
        genre: "Action",
      }),
    );

    expect(kartu.id).toBe("w1"); // videoId -> id, dipakai sebagai key + oleh pemutar
    expect(kartu.title).toBe("Film Baru");
    expect(kartu.thumbnail).toBe("https://contoh.test/sampul.jpg"); // thumbnailUrl -> thumbnail
    expect(kartu.year).toBe("2026"); // angka -> teks, seperti sisi katalog
    expect(kartu.genre).toBe("Action");
  });

  it("durasi dihitung jadi label siap tampil", () => {
    expect(webhookKeKartu(barisWebhook("w1", { durationSeconds: 1088 })).durationLabel).toBe(
      "18:08",
    );
    // Durasi tak dikirim Playly -> "-", dan kartu memakai nilai itu sebagai
    // tanda "jangan gambar badge durasinya".
    expect(webhookKeKartu(barisWebhook("w1", { durationSeconds: null })).durationLabel).toBe(
      "-",
    );
  });

  it("kreator kosong jadi string kosong, BUKAN null", () => {
    // Pemutar menggambar `{aktif.creator && ...}`; null lolos begitu saja, tapi
    // tipe kartu menjanjikan string — menyamakannya di sini mencegah "null"
    // tertulis di layar kalau kelak ada yang menggambarnya tanpa penjaga.
    expect(webhookKeKartu(barisWebhook("w1", { creator: null })).creator).toBe("");
  });

  it("label drama & rating null — tidak dikarang", () => {
    // Kaitan video->drama dibuat admin dari daftar katalog, jadi video yang
    // hanya masuk lewat webhook memang belum punya kaitan. Rating tidak pernah
    // dikirim Playly di jalur mana pun.
    const kartu = webhookKeKartu(barisWebhook("w1"));
    expect(kartu).toMatchObject({
      dramaTitle: null,
      dramaHref: null,
      episode: null,
      rating: null,
    });
  });
});

// ============  DUA PINTU KELUAR: SEGAR vs BER-CACHE (2026-09-18)  ==========
//
// KENAPA PENJAGA INI ADA. Halaman /playly diam-diam berubah dari static jadi
// dynamic antara 2026-09-15 dan 2026-09-18: satu pembacaan Supabase tanpa
// `revalidate` jatuh ke `cache: "no-store"`, dan satu saja pembacaan seperti itu
// membuat SELURUH halaman dibangun ulang untuk tiap pengunjung
// (lib/supabase.ts:204). Akibat nyatanya terbukti mahal — saat Supabase tidak
// menjawab (insiden 522, 2026-09-16), halaman static /beranda & /discover tetap
// melayani penonton sedangkan halaman dynamic ikut mati.
//
// Yang membuatnya lolos waktu itu: tak ada satu pun tes yang MERAH, karena
// kedua jalur menghasilkan DAFTAR YANG SAMA PERSIS. Bedanya cuma opsi yang
// dioper ke Supabase — tak terlihat dari hasilnya. Maka yang diperiksa di sini
// adalah JALUR MANA yang dibaca, bukan isi daftarnya.
describe("(e) dua pintu keluar — halaman wajib lewat jalur ber-cache", () => {
  it("getPlaylyVideosGabungan (gerbang izin) membaca jalur SEGAR, bukan cache", async () => {
    state.katalog.videos = [kartuKatalog("k1")];
    state.webhook = [barisWebhook("w1")];

    await getPlaylyVideosGabungan();

    expect(state.dibaca).toEqual({ segar: 1, cached: 0 });
  });

  it("getPlaylyVideosGabunganCached (halaman penonton) membaca jalur BER-CACHE", async () => {
    state.katalog.videos = [kartuKatalog("k1")];
    state.webhook = [barisWebhook("w1")];

    await getPlaylyVideosGabunganCached();

    expect(state.dibaca).toEqual({ segar: 0, cached: 1 });
  });

  it("kedua pintu menghasilkan daftar yang SAMA — aturan gabung tidak bercabang", async () => {
    // Kalau suatu saat keduanya berbeda, berarti perakitnya sudah tersalin jadi
    // dua dan salah satunya akan tertinggal saat aturannya diperbaiki.
    state.katalog.videos = [kartuKatalog("k1"), kartuKatalog("k2")];
    state.webhook = [barisWebhook("w1"), barisWebhook("w2", { status: "unpublished" })];
    state.hidden = ["k2"];

    const segar = await getPlaylyVideosGabungan();
    const cached = await getPlaylyVideosGabunganCached();

    expect(cached.videos.map((v) => v.id)).toEqual(segar.videos.map((v) => v.id));
    expect(cached.error).toBe(segar.error);
  });

  it("versi ber-cache ikut GAGAL-AMAN: daftar sembunyi tak terbaca -> webhook ditahan", async () => {
    // Aturan 4 harus berlaku di KEDUA pintu. Pintu ber-cache justru yang dipakai
    // halaman penonton, jadi kalau jaring ini cuma terpasang di pintu segar,
    // yang terlindungi malah bukan yang menghadap publik.
    state.katalog.videos = [kartuKatalog("k1")];
    state.webhook = [barisWebhook("w1")];
    state.hiddenGagal = true;

    const { videos } = await getPlaylyVideosGabunganCached();

    expect(videos.map((v) => v.id)).toEqual(["k1"]);
  });

  it("versi ber-cache tetap menampilkan katalog walau sumber webhook mati", async () => {
    state.katalog.videos = [kartuKatalog("k1")];
    state.webhookGagal = true;

    const { videos, error } = await getPlaylyVideosGabunganCached();

    expect(videos.map((v) => v.id)).toEqual(["k1"]);
    expect(error).toBeTruthy(); // dilaporkan, TIDAK dilempar
  });
});
