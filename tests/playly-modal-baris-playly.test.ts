// @vitest-environment jsdom
//
// Penjaga BARIS "Playly" di popup Pilih provider download (2026-11-06).
//
// KENAPA diuji terpisah dari tests/playly-modal-provider.test.ts: berkas itu
// mengunci keputusan OWNER soal bentuk & isi popup (popup mengambang, satu baris
// per provider). Yang di sini mengunci hal lain — baris tambahan yang datanya
// diambil dari JARINGAN saat popup dibuka — dan nilainya ada di tiga hal yang
// semuanya terlihat normal di tangkapan layar walau rusak:
//
//   1. KAPAN ditanyakan. Bukan saat halaman digambar: field `unduh` hanya ada di
//      endpoint detail Playly (1 panggilan per video), dan menanyakannya untuk
//      seluruh daftar adalah pola yang pada 2026-10-06 mengosongkan SELURUH
//      poster situs. Juga NOL panggilan untuk pemanggil yang tidak mengirim
//      videoId — itu janji "pemanggil lama tidak berubah".
//   2. TUJUAN LINK + rel. Alamatnya milik Playly, bukan server DramaKu; tanpa
//      `noopener` halaman tujuan bisa menyetir tab DramaKu lewat window.opener.
//   3. GAGAL-AMAN. Playly mati / izin dicabut / balasan aneh -> barisnya tidak
//      digambar dan provider lain TETAP tampil. Kalau ini salah, satu gangguan
//      di sisi Playly mematikan seluruh daftar unduhan.
//
// JSX sengaja tidak dipakai (createElement langsung) supaya berkas ini tetap .ts
// dan cocok dengan `include` di vitest.config.ts — alasan yang sama dengan
// tests/playly-modal-provider.test.ts.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import InfoVideoPlayly from "../app/components/player/InfoVideoPlayly";
import type { LinkUnduhanPublik } from "../lib/playly-unduhan";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const BASE = "https://playly-hosting-video.up.railway.app";
const ID = "1788093325344";

/** Satu provider yang diisi admin, supaya bisa dibuktikan ia tetap tampil. */
const PROVIDER: LinkUnduhanPublik[] = [
  { provider: "mega", quality: "1080p", url: "https://mega.nz/file/a" },
];

let container: HTMLDivElement;
let root: Root;
/** Alamat yang benar-benar diminta komponen — inti dari tes "kapan ditanyakan". */
let diminta: string[];

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  diminta = [];
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

/**
 * Ganti `fetch` dengan tiruan. `balasan` = isi JSON; `ok: false` menirukan
 * 404/502 dari endpoint kita; `tolak: true` menirukan jaringan putus.
 */
function pasangFetch(
  balasan: unknown,
  { ok = true, tolak = false }: { ok?: boolean; tolak?: boolean } = {},
) {
  vi.stubGlobal("fetch", (alamat: unknown) => {
    diminta.push(String(alamat));
    if (tolak) return Promise.reject(new Error("jaringan putus"));
    return Promise.resolve({
      ok,
      json: () => Promise.resolve(balasan),
    } as Response);
  });
}

/**
 * Balasan endpoint kita. Bentuknya `pilihan: {res,label}[]` — satu-satunya bentuk
 * yang keluar dari /api/playly/unduh, karena server sudah menormalkan kedua
 * bentuk Playly (`resolusi` & `pilihan`) jadi satu di
 * lib/playly-unduh-langsung.ts. Di sini tulisan dibuat sama dengan nilainya
 * supaya kasus "tulisan BEDA dari nilai" punya tes sendiri di bawah.
 */
function balasanUnduh(res: string[]) {
  return {
    ok: true,
    alasan: "ada",
    unduh: {
      url: `${BASE}/unduh/${ID}`,
      pilihan: res.map((r) => ({ res: r, label: r })),
    },
  };
}

async function pasang(props: {
  videoId?: string | null;
  linkUnduhan?: LinkUnduhanPublik[];
}) {
  await act(async () => {
    root.render(
      h(InfoVideoPlayly, {
        title: "Video Uji",
        durationLabel: "12:00",
        ...props,
      }),
    );
  });
}

function popup(): HTMLElement | null {
  return container.querySelector('[aria-label="Pilih provider download"]');
}

function tombolDownload(): HTMLButtonElement {
  const b = Array.from(container.querySelectorAll("button")).find(
    (el) => el.textContent?.trim() === "DOWNLOAD",
  );
  if (!b) throw new Error("Tombol DOWNLOAD tidak ditemukan");
  return b as HTMLButtonElement;
}

async function klik(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

/** [label baris, label tombol...] per baris tabel. */
function isiTabel(): string[][] {
  return Array.from(popup()!.querySelectorAll("tbody tr")).map((tr) => [
    tr.querySelector("td")!.textContent!.trim(),
    ...Array.from(tr.querySelectorAll("a")).map((a) => a.textContent!.trim()),
  ]);
}

function barisPlayly(): HTMLTableRowElement | undefined {
  return Array.from(popup()?.querySelectorAll("tbody tr") ?? []).find(
    (tr) => tr.querySelector("td")!.textContent!.trim() === "Playly",
  ) as HTMLTableRowElement | undefined;
}

describe("Baris Playly — KAPAN Playly ditanyakan", () => {
  it("TIDAK ditanyakan saat kotak digambar; baru saat popup dibuka", async () => {
    pasangFetch(balasanUnduh(["480p"]));
    await pasang({ videoId: ID, linkUnduhan: PROVIDER });
    expect(diminta).toEqual([]);

    await klik(tombolDownload());
    expect(diminta).toEqual([`/api/playly/unduh?id=${ID}`]);
  });

  it("NOL panggilan kalau videoId tidak dikirim (janji 'pemanggil lama tak berubah')", async () => {
    pasangFetch(balasanUnduh(["480p"]));
    await pasang({ linkUnduhan: PROVIDER });
    await klik(tombolDownload());

    expect(diminta).toEqual([]);
    expect(barisPlayly()).toBeUndefined();
    // Provider yang diisi admin tetap tampil seperti sebelumnya.
    expect(isiTabel()).toEqual([["Mega", "DOWNLOAD 1080p"]]);
  });

  it("buka-tutup-buka lagi tidak menanyakan ulang", async () => {
    pasangFetch(balasanUnduh(["480p"]));
    await pasang({ videoId: ID, linkUnduhan: PROVIDER });
    await klik(tombolDownload());
    await klik(tombolDownload()); // tutup
    await klik(tombolDownload()); // buka lagi

    expect(diminta).toHaveLength(1);
    expect(barisPlayly()).toBeDefined();
  });
});

describe("Baris Playly — isi & tujuan linknya", () => {
  it("satu tombol per resolusi, urutan dari Playly dipertahankan", async () => {
    pasangFetch(balasanUnduh(["480p", "720p", "asli"]));
    await pasang({ videoId: ID, linkUnduhan: PROVIDER });
    await klik(tombolDownload());

    // Baris provider admin di ATAS, Playly sebagai tambahan di BAWAH.
    expect(isiTabel()).toEqual([
      ["Mega", "DOWNLOAD 1080p"],
      ["Playly", "DOWNLOAD 480p", "DOWNLOAD 720p", "DOWNLOAD ASLI"],
    ]);
  });

  it("tiap tombol menunjuk ke alamat Playly + ?res= resolusinya", async () => {
    pasangFetch(balasanUnduh(["480p", "asli"]));
    await pasang({ videoId: ID });
    await klik(tombolDownload());

    const href = Array.from(barisPlayly()!.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(href).toEqual([`${BASE}/unduh/${ID}?res=480p`, `${BASE}/unduh/${ID}?res=asli`]);
  });

  it("tiap tombol buka tab baru dengan rel noopener noreferrer", async () => {
    pasangFetch(balasanUnduh(["480p", "720p"]));
    await pasang({ videoId: ID });
    await klik(tombolDownload());

    for (const a of Array.from(barisPlayly()!.querySelectorAll("a"))) {
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("tulisan tombol dari `label`, alamatnya dari `res` (boleh berbeda)", async () => {
    // Bentuk putaran 2 owner: `res` bisa berupa kode yang tak berarti bagi mata
    // ("orig"), sementara yang dibaca penonton "Asli". Kalau keduanya tertukar,
    // tombolnya tetap tergambar rapi tapi mengunduh hal yang salah — atau
    // bertulisan kode mentah. Dua-duanya tak memunculkan error apa pun.
    pasangFetch({
      ok: true,
      alasan: "ada",
      unduh: {
        url: `${BASE}/unduh/${ID}`,
        pilihan: [
          { res: "orig", label: "Asli" },
          { res: "hd", label: "1080p" },
        ],
      },
    });
    await pasang({ videoId: ID });
    await klik(tombolDownload());

    const a = Array.from(barisPlayly()!.querySelectorAll("a"));
    expect(a.map((el) => el.textContent!.trim())).toEqual([
      "DOWNLOAD ASLI",
      "DOWNLOAD 1080p",
    ]);
    expect(a.map((el) => el.getAttribute("href"))).toEqual([
      `${BASE}/unduh/${ID}?res=orig`,
      `${BASE}/unduh/${ID}?res=hd`,
    ]);
  });

  it("video yang HANYA punya unduhan Playly tetap menampilkan tabel, bukan 'belum tersedia'", async () => {
    pasangFetch(balasanUnduh(["480p"]));
    await pasang({ videoId: ID, linkUnduhan: [] });
    await klik(tombolDownload());

    expect(popup()!.textContent).not.toContain("Link unduhan belum tersedia");
    expect(isiTabel()).toEqual([["Playly", "DOWNLOAD 480p"]]);
  });
});

describe("Baris Playly — GAGAL-AMAN (provider lain tak boleh ikut hilang)", () => {
  const gagal: Array<[string, () => void]> = [
    ["Playly tidak mengizinkan (unduh: null)", () => pasangFetch({ ok: true, alasan: "tidak-diizinkan", unduh: null })],
    ["endpoint membalas gagal (404/502)", () => pasangFetch({ ok: false, error: "x" }, { ok: false })],
    ["jaringan putus", () => pasangFetch(null, { tolak: true })],
    ["balasan bukan objek", () => pasangFetch("bukan json")],
    ["daftar pilihan kosong", () => pasangFetch({ ok: true, unduh: { url: `${BASE}/unduh/${ID}`, pilihan: [] } })],
    ["pilihan bukan array", () => pasangFetch({ ok: true, unduh: { url: `${BASE}/unduh/${ID}`, pilihan: "480p" } })],
    ["pilihan berisi objek tanpa res", () => pasangFetch({ ok: true, unduh: { url: `${BASE}/unduh/${ID}`, pilihan: [{ label: "1080p" }] } })],
    ["bentuk LAMA (resolusi) dari balasan usang", () => pasangFetch({ ok: true, unduh: { url: `${BASE}/unduh/${ID}`, resolusi: ["480p"] } })],
  ];

  for (const [nama, siapkan] of gagal) {
    it(`${nama} -> tanpa baris Playly, provider admin tetap tampil`, async () => {
      siapkan();
      await pasang({ videoId: ID, linkUnduhan: PROVIDER });
      await klik(tombolDownload());

      expect(barisPlayly()).toBeUndefined();
      expect(isiTabel()).toEqual([["Mega", "DOWNLOAD 1080p"]]);
    });
  }

  it("nol provider + Playly tidak mengizinkan -> teks lamanya tetap muncul", async () => {
    pasangFetch({ ok: true, alasan: "tidak-diizinkan", unduh: null });
    await pasang({ videoId: ID, linkUnduhan: [] });
    await klik(tombolDownload());

    expect(popup()!.textContent).toContain("Link unduhan belum tersedia");
  });
});
