// Penjaga TAMPILAN modal provider unduhan + tombol yang membukanya.
//
// Bedanya dengan tests/unduhan.test.ts: di sana yang diuji penyaring datanya;
// DI SINI komponennya benar-benar DIRENDER lalu isi HTML-nya diperiksa. Lapisan
// ini perlu karena data yang benar masih bisa gagal sampai ke layar — dan
// kegagalannya SENYAP: tidak ada error, cuma tombol yang tidak berwarna atau
// tautan yang tidak terbuka.
//
// Tiga hal yang dikunci di sini:
//
// 1) WARNA TOMBOL. Kelasnya WAJIB utuh di kode (`bg-blue-600`), bukan dirakit
//    saat berjalan (`bg-` + warna + `-600`). Tailwind memindai kode sumber untuk
//    memutuskan kelas mana yang ikut dibundel, jadi kelas rakitan tidak akan ada
//    di CSS hasil build dan tombolnya tergambar pucat tanpa ada yang melapor.
//
// 2) TAUTAN KELUAR. Alamat provider milik pihak LUAR, jadi wajib
//    `rel="noopener noreferrer"`. Tanpa `noopener`, halaman tujuan bisa menyetir
//    tab kita lewat `window.opener`.
//
// 3) FALLBACK. Drama tanpa daftar provider WAJIB tetap memakai tombol unduh
//    lama (`/api/download`). Kalau ini lepas, mayoritas judul di katalog
//    kehilangan tombol unduhnya — kemunduran yang tak ada yang minta.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DownloadProvider } from "../lib/types";

const { default: DownloadModal } = await import(
  "../app/components/DownloadModal"
);
const { default: DownloadButton } = await import(
  "../app/components/DownloadButton"
);
const { default: ActionRail } = await import("../app/components/ActionRail");

const PROVIDERS: DownloadProvider[] = [
  {
    name: "Google Share",
    quality: "1080p",
    url: "https://drive.example/berkas",
    note: "Google Share itu agak ribet download-nya, tapi kenceng sekali.",
    tutorialUrl: "https://youtu.be/tutorial",
  },
  {
    name: "Telegram",
    quality: "480p",
    url: "https://t.me/contoh",
    buttonColor: "orange",
  },
];

function renderModal(props: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(DownloadModal, {
      open: true,
      onClose: () => {},
      providers: PROVIDERS,
      ...props,
    }),
  );
}

function renderTombol(props: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(DownloadButton, {
      dramaId: "drama-uji",
      episodes: 12,
      ...props,
    }),
  );
}

describe("DownloadModal — tabel provider", () => {
  it("memajang kepala tabel PROVIDER & DOWNLOAD dengan latar pink", () => {
    const html = renderModal();
    expect(html).toContain(">Provider<");
    expect(html).toContain(">Download<");
    // Latar pink dipasang di BARIS kepala, bukan di tiap sel — kalau kelasnya
    // pindah/hilang, tabelnya kehilangan pembeda kepala sama sekali.
    expect(html).toMatch(/<tr[^>]*class="[^"]*bg-pink-600[^"]*"/);
  });

  it("tiap provider punya satu baris: nama di kiri, tombol kualitas di kanan", () => {
    const html = renderModal();
    expect(html).toContain("Google Share");
    expect(html).toContain("Telegram");
    expect(html).toContain("DOWNLOAD 1080p");
    expect(html).toContain("DOWNLOAD 480p");
    expect((html.match(/<tr/g) ?? []).length).toBe(3); // 1 kepala + 2 provider
  });

  it("warna tombol: default biru, oranye kalau diminta — kelas UTUH di kode", () => {
    const html = renderModal();
    expect(html).toContain("bg-blue-600");
    expect(html).toContain("bg-orange-500");
  });

  it("tombol menunjuk ke alamat provider, dibuka aman di tab baru", () => {
    const html = renderModal();
    expect(html).toContain('href="https://drive.example/berkas"');
    expect(html).toContain('href="https://t.me/contoh"');
    // Semua tautan keluar wajib punya kedua penjaga ini.
    const keluar = html.match(/<a [^>]*target="_blank"[^>]*>/g) ?? [];
    expect(keluar.length).toBeGreaterThanOrEqual(3); // 2 provider + 1 tutorial
    for (const a of keluar) expect(a).toContain('rel="noopener noreferrer"');
  });

  it("TIDAK lewat proxy internal — ini link eksternal milik provider", () => {
    expect(renderModal()).not.toContain("/api/download");
  });

  it("catatan tergambar sebagai banner biru muda + link tutorial yang bisa diklik", () => {
    const html = renderModal();
    expect(html).toContain("agak ribet download-nya");
    expect(html).toContain("bg-sky-100");
    expect(html).toContain("Klik disini untuk lihat video tutorial");
    expect(html).toContain('href="https://youtu.be/tutorial"');
  });

  it("catatan tanpa alamat tutorial: bannernya tetap ada, linknya tidak", () => {
    const html = renderModal({
      providers: [{ ...PROVIDERS[0], tutorialUrl: undefined }],
    });
    expect(html).toContain("agak ribet download-nya");
    expect(html).not.toContain("Klik disini untuk lihat video tutorial");
  });

  it("layar sempit: kolom tombol selebar isinya & tak boleh turun baris", () => {
    // Inilah mekanisme yang membuat tombol tidak terpotong di HP — nama
    // provider yang mengalah (boleh turun baris), bukan tombolnya.
    const html = renderModal();
    expect(html).toMatch(/<td[^>]*class="[^"]*w-px[^"]*whitespace-nowrap/);
    expect(html).toMatch(/<td[^>]*class="[^"]*break-words/);
  });

  it("tertutup atau daftar kosong = tidak menggambar apa pun", () => {
    expect(renderModal({ open: false })).toBe("");
    expect(renderModal({ providers: [] })).toBe("");
  });
});

describe("DownloadButton — memilih perilaku dari ada-tidaknya provider", () => {
  it("ADA provider: tombol biasa (pembuka modal), bukan tautan unduh langsung", () => {
    const html = renderTombol({ providers: PROVIDERS });
    expect(html).toContain("<button");
    expect(html).not.toContain('href="/api/download?id=drama-uji&amp;ep=1"');
    // Label tanpa embel-embel episode: yang ditawarkan berkas milik provider,
    // jadi "EP 1" di situ justru keterangan yang salah.
    expect(html).toContain("DOWNLOAD");
    expect(html).not.toContain("DOWNLOAD EP 1");
  });

  it("TANPA provider: persis perilaku lama — <a download> ke /api/download", () => {
    const html = renderTombol();
    expect(html).toContain('href="/api/download?id=drama-uji&amp;ep=1"');
    expect(html).toContain('download="drama-uji-ep1.mp4"');
    // Serial: nomor episode WAJIB disebut supaya tombolnya tidak menjanjikan
    // seluruh episode padahal cuma mengambil satu.
    expect(html).toContain("DOWNLOAD EP 1");
  });

  it("prop providers tidak dikirim sama sekali = tetap perilaku lama", () => {
    expect(renderTombol({ providers: undefined })).toContain("/api/download");
  });

  it("tombolnya tetap pink di kedua jalur", () => {
    expect(renderTombol()).toContain("bg-pink-600");
    expect(renderTombol({ providers: PROVIDERS })).toContain("bg-pink-600");
  });
});

describe("ActionRail — ikon Unduh di pemutar", () => {
  // Rail ini menempel di atas video yang sedang diputar, jadi inilah satu-
  // satunya jalan mengunduh TANPA keluar dari tontonan. Keputusan owner
  // 2026-09-23.
  const rail = (providers: DownloadProvider[]) =>
    renderToStaticMarkup(
      createElement(ActionRail, { dramaId: "d1", title: "Judul Uji", providers }),
    );

  it("muncul sebagai tombol berlabel Unduh saat dramanya punya provider", () => {
    const html = rail(PROVIDERS);
    expect(html).toContain('aria-label="Unduh"');
  });

  it("TIDAK digambar sama sekali kalau daftar providernya kosong", () => {
    // Tombol yang membuka daftar kosong lebih buruk daripada tanpa tombol:
    // penonton mengira unduhannya rusak. Jalur unduh lama tetap tersedia di
    // menu gerigi pemutar, jadi tak ada yang hilang.
    expect(rail([])).not.toContain('aria-label="Unduh"');
  });

  it("ikon lama tetap ada — penambahan ini bukan penggantian", () => {
    const html = rail(PROVIDERS);
    for (const label of ["Komen", "Bagikan"]) {
      expect(html).toContain(`aria-label="${label}"`);
    }
  });
});
