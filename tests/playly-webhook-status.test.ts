// Tes pengunci untuk halaman pantau webhook Playly (lib/playly-webhook-status.ts).
//
// Fokusnya SATU hal: admin harus bisa membedakan "kosong karena kunci belum
// dipasang" dari "kosong karena Playly belum pernah mengirim". Keduanya
// menghasilkan daftar kosong di layar, tapi langkah perbaikannya berbeda total
// — kalau pembedaan ini hilang, halamannya kehilangan seluruh gunanya dan
// owner akan menunggu kiriman yang tak akan pernah datang.
import { describe, it, expect } from "vitest";
import {
  formatDurasi,
  formatWaktuWIB,
  keBentukTampil,
  ringkasWebhookPlayly,
} from "../lib/playly-webhook-status";
import type { PlaylyWebhookVideo } from "../lib/store";

/** Pembuat baris uji; hanya field yang diuji yang perlu disebut pemanggil. */
function video(p: Partial<PlaylyWebhookVideo> & { videoId: string }): PlaylyWebhookVideo {
  return {
    title: `Judul ${p.videoId}`,
    description: null,
    year: null,
    genre: null,
    creator: null,
    durationSeconds: null,
    embedUrl: `https://playly-dashboard.vercel.app/id/${p.videoId}/embed`,
    thumbnailUrl: null,
    status: "published",
    receivedAt: "2026-09-16T07:00:00.000Z",
    ...p,
  };
}

describe("ringkasWebhookPlayly — membedakan dua sebab daftar kosong", () => {
  it("kunci belum dipasang = status khusus, BUKAN 'belum ada kiriman'", () => {
    const r = ringkasWebhookPlayly(false, [], []);
    expect(r.status).toBe("kunci-belum-dipasang");
    expect(r.pesan).toContain("PLAYLY_WEBHOOK_SECRET");
  });

  it("kunci terpasang tapi nol kiriman = 'belum ada kiriman'", () => {
    const r = ringkasWebhookPlayly(true, [], []);
    expect(r.status).toBe("belum-ada-kiriman");
    expect(r.terakhirLabel).toBeNull();
  });

  // Urutan periksa: kunci DULU, baru jumlah video. Kalau dibalik, keadaan
  // "kunci dicabut padahal video lama masih tersimpan" akan dilaporkan sebagai
  // sehat — padahal notifikasi baru sedang ditolak 503 satu per satu.
  it("kunci dicabut padahal video lama masih ada = tetap lapor kunci belum dipasang", () => {
    const r = ringkasWebhookPlayly(false, [video({ videoId: "a" })], []);
    expect(r.status).toBe("kunci-belum-dipasang");
  });

  it("kunci terpasang + ada kiriman = menerima", () => {
    const r = ringkasWebhookPlayly(true, [video({ videoId: "a" })], []);
    expect(r.status).toBe("menerima");
    expect(r.pesan).toBe("");
  });
});

describe("ringkasWebhookPlayly — hitungan yang ditampilkan ke admin", () => {
  it("video yang disembunyikan admin tidak dihitung sebagai tampil", () => {
    const r = ringkasWebhookPlayly(
      true,
      [video({ videoId: "a" }), video({ videoId: "b" })],
      ["b"],
    );
    expect(r.jumlahTampil).toBe(1);
    expect(r.jumlahDisembunyikan).toBe(1);
  });

  it("video yang ditarik Playly dihitung terpisah, bukan sebagai tampil", () => {
    const r = ringkasWebhookPlayly(
      true,
      [video({ videoId: "a" }), video({ videoId: "b", status: "unpublished" })],
      [],
    );
    expect(r.jumlahTampil).toBe(1);
    expect(r.jumlahDitarik).toBe(1);
  });

  // Video bisa ditarik Playly DAN disembunyikan admin sekaligus. Kalau
  // jumlahDisembunyikan ikut menghitung baris unpublished, angka di layar bisa
  // melebihi jumlah video yang benar-benar ada.
  it("baris unpublished tidak ikut dihitung sebagai 'disembunyikan'", () => {
    const r = ringkasWebhookPlayly(
      true,
      [video({ videoId: "a", status: "unpublished" })],
      ["a"],
    );
    expect(r.jumlahDisembunyikan).toBe(0);
    expect(r.jumlahDitarik).toBe(1);
    expect(r.jumlahTampil).toBe(0);
  });

  it("id di daftar sembunyi yang videonya tak ada tidak membuat hitungan minus", () => {
    const r = ringkasWebhookPlayly(true, [video({ videoId: "a" })], ["entah-siapa"]);
    expect(r.jumlahTampil).toBe(1);
    expect(r.jumlahDisembunyikan).toBe(0);
  });

  it("notifikasi terakhir = receivedAt TERBESAR, bukan baris pertama", () => {
    const r = ringkasWebhookPlayly(
      true,
      [
        video({ videoId: "lama", receivedAt: "2026-09-01T00:00:00.000Z" }),
        video({ videoId: "baru", receivedAt: "2026-09-15T10:30:00.000Z" }),
      ],
      [],
    );
    expect(r.terakhirLabel).toContain("15 Sep 2026");
  });

  // Notifikasi unpublish juga bukti pintunya hidup — kalau baris unpublished
  // diabaikan, admin bisa mengira webhook mati padahal baru saja menerima kabar.
  it("baris unpublished tetap dihitung saat mencari notifikasi terakhir", () => {
    const r = ringkasWebhookPlayly(
      true,
      [
        video({ videoId: "a", receivedAt: "2026-09-01T00:00:00.000Z" }),
        video({
          videoId: "b",
          status: "unpublished",
          receivedAt: "2026-09-14T03:00:00.000Z",
        }),
      ],
      [],
    );
    expect(r.terakhirLabel).toContain("14 Sep 2026");
  });
});

describe("format waktu & durasi", () => {
  // Zona dipaku ke WIB: 07:00 UTC = 14.00 WIB. Kalau paku ini lepas, jam yang
  // dibaca admin meleset 7 jam tanpa ada error apa pun yang muncul.
  it("waktu ditampilkan dalam WIB, bukan UTC mesin server", () => {
    expect(formatWaktuWIB("2026-09-16T07:00:00.000Z")).toContain("14");
    expect(formatWaktuWIB("2026-09-16T07:00:00.000Z")).toContain("WIB");
  });

  it("tanggal rusak atau kosong -> null, bukan tulisan 'Invalid Date'", () => {
    expect(formatWaktuWIB("bukan-tanggal")).toBeNull();
    expect(formatWaktuWIB(null)).toBeNull();
    expect(formatWaktuWIB("")).toBeNull();
  });

  it("durasi diformat mm:ss dan h:mm:ss", () => {
    expect(formatDurasi(754)).toBe("12:34");
    expect(formatDurasi(3723)).toBe("1:02:03");
  });

  it("durasi kosong/ngawur -> null, jangan mengarang '0:00'", () => {
    expect(formatDurasi(null)).toBeNull();
    expect(formatDurasi(0)).toBeNull();
    expect(formatDurasi(-5)).toBeNull();
    expect(formatDurasi(Number.NaN)).toBeNull();
  });
});

describe("keBentukTampil — gerbang kolom ke browser", () => {
  // 🔒 Inti tes ini: field yang tidak digambar TIDAK BOLEH ikut menyeberang.
  // Apa pun yang terkirim tetap terbaca di network tab walau tak tampil.
  it("description, embedUrl, dan thumbnailUrl tidak ikut terkirim", () => {
    const hasil = keBentukTampil(
      video({
        videoId: "a",
        description: "sinopsis panjang",
        thumbnailUrl: "https://contoh/sampul.jpg",
      }),
    );
    expect(hasil).not.toHaveProperty("description");
    expect(hasil).not.toHaveProperty("embedUrl");
    expect(hasil).not.toHaveProperty("thumbnailUrl");
    expect(Object.keys(hasil).sort()).toEqual(
      ["creator", "diterimaLabel", "durasiLabel", "status", "title", "videoId"].sort(),
    );
  });

  it("waktu tak terbaca tetap menghasilkan label, bukan null yang bocor ke layar", () => {
    const hasil = keBentukTampil(video({ videoId: "a", receivedAt: "ngawur" }));
    expect(hasil.diterimaLabel).toBe("waktu tidak terbaca");
  });
});
