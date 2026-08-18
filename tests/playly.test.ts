// Tes pengunci perilaku untuk integrasi Playly (lib/playly.ts).
//
// Empat hal yang dijaga di sini, karena kalau longgar diam-diam akibatnya
// nyata (kunci bocor / halaman palsu ikut tampil di situs kita):
//   1. PENYAMARAN kunci — yang tampil tidak boleh cukup untuk dipakai orang.
//   2. ENKRIPSI — hasilnya harus bisa dibuka lagi, DAN harus gagal kalau
//      kunci pengacaknya berbeda (bukan diam-diam menghasilkan teks ngawur).
//   3. PAGAR DOMAIN — hanya domain Playly yang boleh masuk <iframe>.
//   4. PENERJEMAH JSON — bentuk balasan Playly belum pasti, jadi beberapa
//      bentuk yang lazim harus tetap terbaca.
import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import {
  PLAYLY_KEY_PREFIX,
  PlaylyError,
  decryptSecret,
  encryptSecret,
  formatDuration,
  isAllowedPlaylyEmbedUrl,
  isValidPlaylyKey,
  maskPlaylyKey,
  normalizePlaylyVideos,
  parseAllowedHosts,
  parseDurationSeconds,
  playlyKeyError,
  readEncryptionKey,
  readPlaylyConfig,
} from "../lib/playly";

const IZIN = ["playly-dashboard.vercel.app"];
const POLA = {
  baseUrl: "https://playly-dashboard.vercel.app",
  pattern: "/embed/{id}",
};

// Kunci pengacak khusus tes — TIDAK dibaca dari env, jadi tes tidak bergantung
// pada setelan mesin yang menjalankannya.
const KUNCI_TES = crypto.randomBytes(32);
const KUNCI_LAIN = crypto.randomBytes(32);

describe("isValidPlaylyKey / playlyKeyError — bentuk kunci", () => {
  it("kunci normal diterima", () => {
    expect(isValidPlaylyKey("plyk_a1b2c3d4e5f6json")).toBe(true);
    expect(playlyKeyError("plyk_a1b2c3d4e5f6json")).toBeNull();
  });

  it("tanda hubung dan garis bawah TETAP boleh (banyak kunci API memakainya)", () => {
    expect(isValidPlaylyKey("plyk_ab-cd_ef-gh12")).toBe(true);
  });

  it("tanpa awalan plyk_ ditolak, dengan pesan yang menyebut awalannya", () => {
    expect(isValidPlaylyKey("sk_live_abcdefgh")).toBe(false);
    expect(playlyKeyError("sk_live_abcdefgh")).toContain(PLAYLY_KEY_PREFIX);
  });

  it("kunci kepotong (terlalu pendek) ditolak", () => {
    expect(isValidPlaylyKey("plyk_abc")).toBe(false);
    expect(playlyKeyError("plyk_abc")).toContain("terlalu pendek");
  });

  it("ada spasi/baris baru ditolak — biasanya salah tempel", () => {
    expect(isValidPlaylyKey("plyk_abcdefgh ijkl")).toBe(false);
    expect(isValidPlaylyKey("plyk_abcdefgh\nijkl")).toBe(false);
  });

  it("kosong ditolak", () => {
    expect(isValidPlaylyKey("   ")).toBe(false);
    expect(playlyKeyError("")).toContain("belum diisi");
  });
});

describe("maskPlaylyKey — bentuk yang aman ditampilkan", () => {
  it("hanya 4 karakter terakhir yang terlihat", () => {
    expect(maskPlaylyKey("plyk_a1b2c3d4e5f6json")).toBe("plyk_••••••••json");
  });

  it("bagian tengah kunci tidak pernah ikut tampil", () => {
    const tersamar = maskPlaylyKey("plyk_rahasiabangetjangansampaibocor");
    expect(tersamar).not.toContain("rahasiabanget");
    expect(tersamar).not.toContain("jangansampai");
  });

  it("kunci pendek disamarkan seluruhnya (tanpa membocorkan ekor)", () => {
    expect(maskPlaylyKey("plyk_abc")).toBe("plyk_••••••••");
  });

  it("kunci kosong -> teks kosong", () => {
    expect(maskPlaylyKey("")).toBe("");
  });
});

describe("readEncryptionKey — kunci pengacak dari env", () => {
  it("terima 64 karakter hex", () => {
    const hex = crypto.randomBytes(32).toString("hex");
    expect(readEncryptionKey({ PLAYLY_ENCRYPTION_KEY: hex })?.length).toBe(32);
  });

  it("terima base64 yang panjangnya pas 32 byte", () => {
    const b64 = crypto.randomBytes(32).toString("base64");
    expect(readEncryptionKey({ PLAYLY_ENCRYPTION_KEY: b64 })?.length).toBe(32);
  });

  it("panjang salah / kosong -> null (bukan kunci setengah jadi)", () => {
    expect(readEncryptionKey({ PLAYLY_ENCRYPTION_KEY: "terlalupendek" })).toBeNull();
    expect(readEncryptionKey({ PLAYLY_ENCRYPTION_KEY: "" })).toBeNull();
    expect(readEncryptionKey({})).toBeNull();
  });
});

describe("encryptSecret / decryptSecret — simpan kunci dalam keadaan teracak", () => {
  const KUNCI_API = "plyk_a1b2c3d4e5f6json";

  it("hasil acakan bisa dibuka lagi jadi teks semula", () => {
    const teracak = encryptSecret(KUNCI_API, KUNCI_TES);
    expect(decryptSecret(teracak, KUNCI_TES)).toBe(KUNCI_API);
  });

  it("hasil acakan TIDAK memuat kunci aslinya", () => {
    const teracak = encryptSecret(KUNCI_API, KUNCI_TES);
    expect(teracak).not.toContain(KUNCI_API);
    expect(teracak).not.toContain("a1b2c3d4");
    expect(teracak.startsWith("v1.")).toBe(true);
  });

  it("dua kali mengacak teks yang sama menghasilkan teks berbeda (ada IV acak)", () => {
    expect(encryptSecret(KUNCI_API, KUNCI_TES)).not.toBe(
      encryptSecret(KUNCI_API, KUNCI_TES),
    );
  });

  it("kunci pengacak berbeda -> GAGAL, bukan menghasilkan teks ngawur", () => {
    const teracak = encryptSecret(KUNCI_API, KUNCI_TES);
    expect(() => decryptSecret(teracak, KUNCI_LAIN)).toThrow(PlaylyError);
  });

  it("data yang diubah orang di database -> ditolak (ada segel/auth tag)", () => {
    const teracak = encryptSecret(KUNCI_API, KUNCI_TES);
    const [v, iv, isi, tag] = teracak.split(".");
    const isiDiutak = `${v}.${iv}.${isi.slice(0, -2)}AA.${tag}`;
    expect(() => decryptSecret(isiDiutak, KUNCI_TES)).toThrow(PlaylyError);
  });

  it("format tidak dikenali -> ditolak dengan jelas", () => {
    expect(() => decryptSecret("bukan-format-kami", KUNCI_TES)).toThrow(PlaylyError);
  });
});

describe("parseDurationSeconds & formatDuration — durasi macam-macam bentuk", () => {
  it("angka detik apa adanya", () => {
    expect(parseDurationSeconds(125)).toBe(125);
    expect(parseDurationSeconds("125")).toBe(125);
  });

  it('teks "menit:detik" dan "jam:menit:detik"', () => {
    expect(parseDurationSeconds("2:05")).toBe(125);
    expect(parseDurationSeconds("1:02:05")).toBe(3725);
  });

  it("bentuk tak dikenali -> null (jangan mengarang angka)", () => {
    expect(parseDurationSeconds("dua menit")).toBeNull();
    expect(parseDurationSeconds(null)).toBeNull();
    expect(parseDurationSeconds(undefined)).toBeNull();
  });

  it("detik diubah jadi teks tampilan", () => {
    expect(formatDuration(125)).toBe("2:05");
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(formatDuration(0)).toBe("0:00");
  });

  it('durasi tidak diketahui tampil "-", bukan "0:00" yang menyesatkan', () => {
    expect(formatDuration(null)).toBe("-");
  });
});

describe("isAllowedPlaylyEmbedUrl — pagar domain untuk iframe", () => {
  it("domain Playly lolos", () => {
    expect(
      isAllowedPlaylyEmbedUrl("https://playly-dashboard.vercel.app/embed/1", IZIN),
    ).toBe(true);
  });

  it("subdomain Playly ikut lolos", () => {
    expect(
      isAllowedPlaylyEmbedUrl("https://cdn.playly-dashboard.vercel.app/embed/1", IZIN),
    ).toBe(true);
  });

  it("domain lain DITOLAK", () => {
    expect(isAllowedPlaylyEmbedUrl("https://situs-jahat.example/embed/1", IZIN)).toBe(
      false,
    );
  });

  it('domain yang cuma "mirip" di ujung nama DITOLAK', () => {
    expect(
      isAllowedPlaylyEmbedUrl("https://jahatplayly-dashboard.vercel.app/x", IZIN),
    ).toBe(false);
  });

  it("http (bukan https) DITOLAK", () => {
    expect(
      isAllowedPlaylyEmbedUrl("http://playly-dashboard.vercel.app/embed/1", IZIN),
    ).toBe(false);
  });

  it("daftar izin kosong = tolak semua (bukan izinkan semua)", () => {
    expect(
      isAllowedPlaylyEmbedUrl("https://playly-dashboard.vercel.app/embed/1", []),
    ).toBe(false);
  });
});

describe("normalizePlaylyVideos — terjemahkan balasan Playly", () => {
  it("bentuk { data: [...] } dengan embedUrl langsung", () => {
    const { videos, rejected } = normalizePlaylyVideos(
      {
        data: [
          {
            id: "v1",
            title: "Cinta di Ujung Senja",
            duration: 754,
            creator: "Studio Playly",
            embedUrl: "https://playly-dashboard.vercel.app/embed/v1",
            thumbnail: "https://playly-dashboard.vercel.app/t/v1.jpg",
          },
        ],
      },
      IZIN,
      POLA,
    );

    expect(rejected).toHaveLength(0);
    expect(videos).toHaveLength(1);
    expect(videos[0]).toMatchObject({
      id: "v1",
      title: "Cinta di Ujung Senja",
      durationSeconds: 754,
      durationLabel: "12:34",
      creator: "Studio Playly",
      embedUrl: "https://playly-dashboard.vercel.app/embed/v1",
    });
  });

  it("array polos di akar juga terbaca", () => {
    const { videos } = normalizePlaylyVideos(
      [{ id: "v2", title: "Eps 2", embed: "https://playly-dashboard.vercel.app/embed/v2" }],
      IZIN,
      POLA,
    );
    expect(videos.map((v) => v.id)).toEqual(["v2"]);
  });

  it("nama field alternatif (video_id, judul, creator_name) tetap dikenali", () => {
    const { videos } = normalizePlaylyVideos(
      {
        items: [
          {
            video_id: "v3",
            judul: "Judul Indonesia",
            creator_name: "Kang Dedi",
            duration: "3:00",
            player_url: "https://playly-dashboard.vercel.app/embed/v3",
          },
        ],
      },
      IZIN,
      POLA,
    );
    expect(videos[0]).toMatchObject({
      id: "v3",
      title: "Judul Indonesia",
      creator: "Kang Dedi",
      durationLabel: "3:00",
    });
  });

  it("kode tempel <iframe> diambil src-nya", () => {
    const { videos } = normalizePlaylyVideos(
      [
        {
          id: "v4",
          title: "Dari iframe",
          embed:
            '<iframe src="https://playly-dashboard.vercel.app/embed/v4" allowfullscreen></iframe>',
        },
      ],
      IZIN,
      POLA,
    );
    expect(videos[0].embedUrl).toBe("https://playly-dashboard.vercel.app/embed/v4");
  });

  it("tanpa embedUrl, alamat dirakit dari id memakai pola", () => {
    const { videos } = normalizePlaylyVideos(
      [{ id: "v5", title: "Tanpa embed" }],
      IZIN,
      POLA,
    );
    expect(videos[0].embedUrl).toBe("https://playly-dashboard.vercel.app/embed/v5");
  });

  it("video dari domain lain DIBUANG, dan alasannya dicatat", () => {
    const { videos, rejected } = normalizePlaylyVideos(
      [
        { id: "aman", embedUrl: "https://playly-dashboard.vercel.app/embed/aman" },
        { id: "jahat", embedUrl: "https://situs-jahat.example/embed/x" },
      ],
      IZIN,
      POLA,
    );
    expect(videos.map((v) => v.id)).toEqual(["aman"]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toContain("domain");
  });

  it("item tanpa id maupun embed dibuang dengan alasan jelas", () => {
    const { videos, rejected } = normalizePlaylyVideos(
      [{ title: "Cuma judul" }],
      IZIN,
      POLA,
    );
    expect(videos).toHaveLength(0);
    expect(rejected[0].reason).toContain("tidak ada alamat embed");
  });

  it("balasan aneh (bukan daftar) -> hasil kosong, bukan error", () => {
    expect(normalizePlaylyVideos(null, IZIN, POLA).videos).toEqual([]);
    expect(normalizePlaylyVideos("teks biasa", IZIN, POLA).videos).toEqual([]);
    expect(normalizePlaylyVideos({ pesan: "hai" }, IZIN, POLA).videos).toEqual([]);
  });

  it("durasi tidak dikirim -> label '-', bukan angka karangan", () => {
    const { videos } = normalizePlaylyVideos(
      [{ id: "v6", embedUrl: "https://playly-dashboard.vercel.app/embed/v6" }],
      IZIN,
      POLA,
    );
    expect(videos[0].durationSeconds).toBeNull();
    expect(videos[0].durationLabel).toBe("-");
  });
});

describe("readPlaylyConfig — setelan dari env", () => {
  it("tanpa env apa pun, pakai alamat Playly bawaan", () => {
    const c = readPlaylyConfig({});
    expect(c.baseUrl).toBe("https://playly-dashboard.vercel.app");
    expect(c.videosUrl).toBe("https://playly-dashboard.vercel.app/api/videos");
    expect(c.allowedHosts).toContain("playly-dashboard.vercel.app");
  });

  it("PLAYLY_API_URL dipakai, garis miring di ujung dirapikan", () => {
    const c = readPlaylyConfig({ PLAYLY_API_URL: "https://playly.contoh.com/" });
    expect(c.videosUrl).toBe("https://playly.contoh.com/api/videos");
  });

  it("PLAYLY_EMBED_HOSTS MENAMBAH domain, tidak menghapus domain resmi", () => {
    const c = readPlaylyConfig({ PLAYLY_EMBED_HOSTS: "cdn.contoh.com" });
    expect(c.allowedHosts).toContain("playly-dashboard.vercel.app");
    expect(c.allowedHosts).toContain("cdn.contoh.com");
  });

  it("PLAYLY_EMBED_PATH bisa mengganti pola alamat player", () => {
    const c = readPlaylyConfig({ PLAYLY_EMBED_PATH: "/v/{id}/play" });
    expect(c.embedPattern.pattern).toBe("/v/{id}/play");
  });
});

describe("parseAllowedHosts — baca daftar domain dari env", () => {
  it("pisah pakai koma/spasi + huruf kecil", () => {
    expect(parseAllowedHosts("A.com, b.com  c.com")).toEqual(["a.com", "b.com", "c.com"]);
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
