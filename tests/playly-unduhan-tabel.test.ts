// Penjaga TABEL CEPAT link unduhan (lib/playly-unduhan-tabel.ts + komponennya).
// Yang dijaga:
//   1. Simpan dari tabel TIDAK menghapus link provider di luar tabel (Send.cm)
//      — simpanan server mengganti seluruh link video, jadi ini kerusakan senyap.
//   2. Sel salah (domain provider lain / http) ditandai SEBELUM dikirim.
//   3. "Berubah" mengabaikan spasi di tepi, supaya tombol Simpan tak menyala palsu.
//   4. Tabel menggambar 6 kolom dan isi yang sudah tersimpan.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  KOLOM_TABEL,
  barisBerubah,
  barisTersimpan,
  cekSel,
  kirimanBaris,
} from "../lib/playly-unduhan-tabel";
import { bacaDomainUnduhan } from "../lib/playly-unduhan-domain";
import type { LinkUnduhan } from "../lib/playly-unduhan";
import type { PlaylyVideo } from "../lib/playly";

const { default: PlaylyUnduhanTabel } = await import("../app/components/admin/PlaylyUnduhanTabel");

const DOMAIN = bacaDomainUnduhan({});
const WAKTU = "2026-11-16T00:00:00.000Z";
const link = (videoId: string, provider: LinkUnduhan["provider"], quality: LinkUnduhan["quality"], url: string): LinkUnduhan => ({
  videoId, provider, quality, url, createdAt: WAKTU, updatedAt: WAKTU,
});
const DRIVE = "https://drive.google.com/file/d/AAA111/view";
const SENDCM = "https://send.cm/d/xyz";
const LINKS = [
  link("v1", "google", "1080p", DRIVE),
  link("v1", "sendcm", "480p", SENDCM),
  link("v2", "mega", "480p", "https://mega.nz/file/BBB#kunci"),
];

describe("kirimanBaris", () => {
  it("link Send.cm yang sudah ada ikut terkirim, link tabel dari isian", () => {
    const kiriman = kirimanBaris(LINKS, "v1", {
      "google|1080p": ` ${DRIVE} `,
      "telegram|480p": "https://t.me/channelku/15",
    });
    expect(kiriman).toEqual([
      { provider: "sendcm", quality: "480p", url: SENDCM },
      { provider: "google", quality: "1080p", url: DRIVE },
      { provider: "telegram", quality: "480p", url: "https://t.me/channelku/15" },
    ]);
  });

  it("sel dikosongkan = link itu tidak dikirim (terhapus), link video lain tak ikut", () => {
    expect(kirimanBaris(LINKS, "v1", { "google|1080p": "" })).toEqual([
      { provider: "sendcm", quality: "480p", url: SENDCM },
    ]);
  });
});

describe("cekSel", () => {
  it("kosong & link yang benar = tanpa alasan", () => {
    expect(cekSel("google", "", DOMAIN)).toBeNull();
    expect(cekSel("google", DRIVE, DOMAIN)).toBeNull();
    expect(cekSel("telegram", "https://t.me/channelku/15", DOMAIN)).toBeNull();
  });

  it("link Mega di kolom Google & link http ditolak", () => {
    expect(cekSel("google", "https://mega.nz/file/BBB#kunci", DOMAIN)).toMatch(/bukan domain/);
    expect(cekSel("telegram", "http://t.me/channelku/15", DOMAIN)).toMatch(/https/);
  });
});

describe("barisTersimpan / barisBerubah", () => {
  it("hanya provider tabel yang masuk baris", () => {
    expect(barisTersimpan(LINKS, "v1")).toEqual({ "google|1080p": DRIVE });
  });

  it("spasi di tepi bukan perubahan; isi baru = perubahan", () => {
    const awal = barisTersimpan(LINKS, "v1");
    expect(barisBerubah(awal, { "google|1080p": `  ${DRIVE}` })).toBe(false);
    expect(barisBerubah(awal, { ...awal, "mega|480p": "https://mega.nz/file/C#k" })).toBe(true);
  });
});

describe("PlaylyUnduhanTabel (render)", () => {
  const video = (id: string, title: string) => ({ id, title }) as PlaylyVideo;

  it("menggambar 6 kolom dan isi yang sudah tersimpan", () => {
    const html = renderToStaticMarkup(
      createElement(PlaylyUnduhanTabel, {
        videos: [video("v1", "Americana (2025)"), video("v2", "Film Kedua")],
        links: LINKS,
        domain: DOMAIN,
        onTersimpan: () => {},
      }),
    );
    expect(KOLOM_TABEL).toHaveLength(6);
    for (const k of ["Google Share 1080p", "Telegram 480p", "Mega 1080p"]) expect(html).toContain(k);
    expect(html).toContain("Americana (2025)");
    expect(html).toContain(`value="${DRIVE}"`);
    // Belum ada yang diubah -> tombol simpan mati.
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[^<]*Simpan semua/);
  });
});
