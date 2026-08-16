// Tes pengunci perilaku untuk jalur video eksternal (lib/external-video.ts).
// Fokusnya 2 hal: (1) penerjemah JSON macam-macam bentuk, (2) PAGAR DOMAIN —
// bagian keamanan yang tidak boleh longgar diam-diam saat kode diubah nanti.
import { describe, it, expect } from "vitest";
import {
  extractEmbedUrl,
  isAllowedEmbedUrl,
  normalizeExternalVideos,
  parseAllowedHosts,
  readExternalVideoConfig,
} from "../lib/external-video";

const IZIN = ["player.contoh.com"];

describe("parseAllowedHosts — baca daftar domain dari env", () => {
  it("pisah pakai koma/spasi + huruf kecil", () => {
    expect(parseAllowedHosts("A.com, b.com  c.com")).toEqual([
      "a.com",
      "b.com",
      "c.com",
    ]);
  });

  it("tahan kalau ditulis lengkap dengan https:// dan garis miring", () => {
    expect(parseAllowedHosts("https://player.contoh.com/embed")).toEqual([
      "player.contoh.com",
    ]);
  });

  it("kosong/undefined -> daftar kosong", () => {
    expect(parseAllowedHosts("")).toEqual([]);
    expect(parseAllowedHosts(undefined)).toEqual([]);
  });
});

describe("extractEmbedUrl — ambil alamat dari URL polos atau kode <iframe>", () => {
  it("URL polos dipakai apa adanya", () => {
    expect(extractEmbedUrl("https://player.contoh.com/v/1")).toBe(
      "https://player.contoh.com/v/1",
    );
  });

  it("kode tempel iframe -> diambil src-nya saja", () => {
    const html = `<iframe src="https://player.contoh.com/v/9" allowfullscreen></iframe>`;
    expect(extractEmbedUrl(html)).toBe("https://player.contoh.com/v/9");
  });

  it("teks biasa / bukan alamat -> null", () => {
    expect(extractEmbedUrl("belum tersedia")).toBeNull();
    expect(extractEmbedUrl(123)).toBeNull();
  });
});

describe("isAllowedEmbedUrl — PAGAR DOMAIN (default tolak)", () => {
  it("domain diizinkan -> lolos", () => {
    expect(isAllowedEmbedUrl("https://player.contoh.com/v/1", IZIN)).toBe(true);
  });

  it("subdomain dari yang diizinkan -> lolos", () => {
    expect(isAllowedEmbedUrl("https://cdn.player.contoh.com/v/1", IZIN)).toBe(true);
  });

  it("domain lain -> ditolak", () => {
    expect(isAllowedEmbedUrl("https://situs-jahat.com/v/1", IZIN)).toBe(false);
  });

  it("domain yang cuma MIRIP (akhiran nempel) -> ditolak", () => {
    expect(isAllowedEmbedUrl("https://jahatplayer.contoh.com.evil.id/v", IZIN)).toBe(
      false,
    );
  });

  it("bukan https (http / javascript / data) -> ditolak", () => {
    expect(isAllowedEmbedUrl("http://player.contoh.com/v/1", IZIN)).toBe(false);
    expect(isAllowedEmbedUrl("javascript:alert(1)", IZIN)).toBe(false);
    expect(isAllowedEmbedUrl("data:text/html,<h1>x", IZIN)).toBe(false);
  });

  it("daftar izin kosong -> TOLAK SEMUA (gagal-aman)", () => {
    expect(isAllowedEmbedUrl("https://player.contoh.com/v/1", [])).toBe(false);
  });
});

describe("normalizeExternalVideos — penerjemah JSON ke bentuk standar", () => {
  it("array di akar + nama field 'embed_url'", () => {
    const raw = [
      { id: "a1", title: "Ep 1", embed_url: "https://player.contoh.com/1", episode: 1 },
    ];
    const { videos, rejected } = normalizeExternalVideos(raw, IZIN);
    expect(rejected).toHaveLength(0);
    expect(videos[0]).toEqual({
      id: "a1",
      title: "Ep 1",
      embedUrl: "https://player.contoh.com/1",
      poster: null,
      episode: 1,
      provider: "player.contoh.com",
    });
  });

  it("daftar dibungkus { data: [...] } + field bernama 'url'", () => {
    const raw = { data: [{ name: "Judul", url: "https://player.contoh.com/2" }] };
    const { videos } = normalizeExternalVideos(raw, IZIN);
    expect(videos).toHaveLength(1);
    expect(videos[0].title).toBe("Judul");
  });

  it("daftar bersarang { result: { items: [...] } }", () => {
    const raw = { result: { items: [{ embed: "https://player.contoh.com/3" }] } };
    expect(normalizeExternalVideos(raw, IZIN).videos).toHaveLength(1);
  });

  it("satu video langsung di akar (bukan daftar)", () => {
    const raw = { title: "Solo", playerUrl: "https://player.contoh.com/4" };
    const { videos } = normalizeExternalVideos(raw, IZIN);
    expect(videos).toHaveLength(1);
    expect(videos[0].title).toBe("Solo");
  });

  it("item berupa string kode iframe langsung", () => {
    const raw = [`<iframe src='https://player.contoh.com/5'></iframe>`];
    const { videos } = normalizeExternalVideos(raw, IZIN);
    expect(videos[0].embedUrl).toBe("https://player.contoh.com/5");
    expect(videos[0].title).toBe("Video 1"); // judul cadangan kalau tak dikirim
  });

  it("episode berupa teks '12' tetap terbaca jadi angka", () => {
    const raw = [{ ep: "12", url: "https://player.contoh.com/6" }];
    expect(normalizeExternalVideos(raw, IZIN).videos[0].episode).toBe(12);
  });

  it("&amp; yang terbawa dari HTML dikembalikan jadi &", () => {
    const raw = [{ url: "https://player.contoh.com/7?a=1&amp;b=2" }];
    expect(normalizeExternalVideos(raw, IZIN).videos[0].embedUrl).toBe(
      "https://player.contoh.com/7?a=1&b=2",
    );
  });

  it("judul ber-entitas HTML dikembalikan ke karakter asli", () => {
    const raw = [{ title: "Drama &amp; Cinta &quot;Musim 2&quot;", url: "https://player.contoh.com/e1" }];
    expect(normalizeExternalVideos(raw, IZIN).videos[0].title).toBe(
      'Drama & Cinta "Musim 2"',
    );
  });

  it("alamat tanpa skema (//host) dilengkapi jadi https", () => {
    const raw = [{ url: "//player.contoh.com/8" }];
    expect(normalizeExternalVideos(raw, IZIN).videos[0].embedUrl).toBe(
      "https://player.contoh.com/8",
    );
  });

  it("domain tak diizinkan -> dibuang + alasannya dicatat", () => {
    const raw = [{ url: "https://situs-jahat.com/x" }];
    const { videos, rejected } = normalizeExternalVideos(raw, IZIN);
    expect(videos).toHaveLength(0);
    expect(rejected[0].reason).toBe("domain belum diizinkan");
    expect(rejected[0].value).toBe("situs-jahat.com");
  });

  it("poster dari domain mana pun boleh, asal https; http dibuang jadi null", () => {
    const raw = [
      { url: "https://player.contoh.com/9", poster: "http://gambar.com/a.jpg" },
    ];
    expect(normalizeExternalVideos(raw, IZIN).videos[0].poster).toBeNull();
  });

  it("JSON tak dikenal (bukan daftar video) -> hasil kosong, tidak error", () => {
    expect(normalizeExternalVideos({ pesan: "halo" }, IZIN).videos).toHaveLength(0);
    expect(normalizeExternalVideos(null, IZIN).videos).toHaveLength(0);
  });
});

describe("readExternalVideoConfig — baca setelan dari env", () => {
  it("ambil nilai + rapikan daftar domain", () => {
    const cfg = readExternalVideoConfig({
      EXTERNAL_VIDEO_API_URL: " https://api.contoh.com/videos ",
      EXTERNAL_VIDEO_API_KEY: "rahasia",
      EXTERNAL_VIDEO_EMBED_HOSTS: "player.contoh.com, cdn.contoh.com",
    });

    expect(cfg.apiUrl).toBe("https://api.contoh.com/videos");
    expect(cfg.apiKey).toBe("rahasia");
    expect(cfg.allowedHosts).toEqual(["player.contoh.com", "cdn.contoh.com"]);
  });

  it("env kosong -> semua kosong (dan daftar domain kosong = tolak semua)", () => {
    const cfg = readExternalVideoConfig({});
    expect(cfg.apiUrl).toBe("");
    expect(cfg.allowedHosts).toEqual([]);
  });
});
