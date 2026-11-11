// @vitest-environment jsdom
//
// Penjaga permanen: HALAMAN VIDEO PLAYLY TIDAK BOLEH MENYANDERA LAYAR SELAMA
// MEMERIKSA BERKAS VIDEO KE PLAYLY (owner 2026-11-11: "kenapa ketika saya klik
// kotak merah IMDb lama terbuka nya").
//
// 🪤 AKARNYA, supaya tidak kambuh. Panel ini menandai video yang catatannya ada
// di Playly tapi BERKASNYA tidak. Memeriksanya = satu permintaan PER VIDEO ke
// Playly, maksimal 4 sekaligus (PLAYLY_MAKS_BERSAMAAN). Dengan 489 video itu
// ~123 giliran berurutan; satu perjalanan ke Playly terukur ≥0,39 detik, jadi
// lantainya ≥47 detik. Dulu halaman meng-`await` pemeriksaan itu sebelum
// menggambar apa pun, sehingga menu terasa mati total selama itu.
//
// KENAPA MESIN YANG MENJAGANYA: yang diperbaiki adalah URUTAN TAMPIL, dan itu
// hidup di state React. `next build`, `tsc`, dan screenshot tetap hijau walau
// perbaikannya dibatalkan — satu-satunya yang berubah cuma lamanya layar diam,
// dan tidak ada yang melaporkannya sampai owner mengeluh lagi.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mesin kerja project ini server RDP bersama puluhan penyewa, jadi plafonnya
// dinaikkan. Tes di bawah menunggu KONDISI (tungguSampai), bukan jeda tetap —
// di mesin sepi selesai dalam puluhan milidetik.
vi.setConfig({ testTimeout: 20_000, hookTimeout: 20_000 });

// AdminSidebar (dipakai loading.tsx) membaca alamat lewat next/navigation yang
// tidak ada di luar Next. Ditiru seadanya — yang diuji di sini bukan sidebar-nya.
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/videos/playly" }));

import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import PlaylyVisibilityManager from "../app/components/admin/PlaylyVisibilityManager";
import MemuatHalamanPlayly from "../app/admin/videos/playly/loading";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyGlobal = globalThis as any;
anyGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const video = (id: string, title: string) => ({
  id,
  title,
  durationSeconds: 120,
  durationLabel: "2:00",
  creator: "dramaku",
  embedUrl: "https://playly-hosting-video.up.railway.app/179342855458/embed",
  thumbnail: null,
});

const VIDEO_A = video("v1", "Pendekar Pedang Yang Diremehkan");
const VIDEO_B = video("v2", "Kaisar Kembali Ke Masa Lalu");

const PESAN_MEMERIKSA = "Memeriksa berkas tiap video ke Playly";

/** Jawaban tiruan dari /api/admin/playly/belum-siap. */
let jawabanEndpoint: (() => Promise<Response>) | null = null;
let permintaan: { url: string; ids: string[] }[] = [];

function pasangFetchTiruan() {
  permintaan = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
    permintaan.push({ url, ids: JSON.parse(String(init?.body ?? "{}")).ids ?? [] });
    if (!jawabanEndpoint) throw new Error("jawaban endpoint belum disiapkan");
    return jawabanEndpoint();
  };
}

const balas = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

function panel(belumSiapIds?: string[]) {
  return h(PlaylyVisibilityManager, {
    videos: [VIDEO_A, VIDEO_B],
    initialHidden: [],
    ...(belumSiapIds ? { belumSiapIds } : {}),
    fetchError: null,
    source: "mitra" as const,
    creators: ["dramaku"],
  });
}

let wadah: HTMLDivElement | null = null;
let akar: Root | null = null;

async function pasang(belumSiapIds?: string[]) {
  wadah = document.createElement("div");
  document.body.appendChild(wadah);
  akar = createRoot(wadah);
  await act(async () => {
    akar!.render(panel(belumSiapIds));
  });
  return wadah;
}

/** Menunggu KONDISI, bukan jumlah gelombang tetap — pelajaran bd7343c. */
async function tungguSampai(syarat: () => boolean, label: string, batasMs = 8_000) {
  const batas = Date.now() + batasMs;
  while (!syarat()) {
    if (Date.now() > batas) {
      throw new Error(
        `menunggu ${label} lewat ${batasMs}ms — rantai pengambilan kemungkinan PUTUS, bukan sekadar lambat`,
      );
    }
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
}

beforeEach(() => {
  wadah = null;
  akar = null;
  jawabanEndpoint = null;
  pasangFetchTiruan();
});

afterEach(async () => {
  if (akar) await act(async () => akar!.unmount());
  wadah?.remove();
});

describe("panel Playly tidak menunggu pemeriksaan berkas sebelum tampil", () => {
  it("tabel video SUDAH tergambar saat pemeriksaan masih berjalan", async () => {
    // Endpoint yang tidak pernah menjawab = keadaan "Playly sedang lambat".
    jawabanEndpoint = () => new Promise<Response>(() => {});
    const el = await pasang();

    // Inilah yang dulu kosong selama ~47 detik.
    expect(el.textContent).toContain(VIDEO_A.title);
    expect(el.textContent).toContain(VIDEO_B.title);
  });

  it("mengatakan apa adanya bahwa pemeriksaannya BELUM selesai", async () => {
    jawabanEndpoint = () => new Promise<Response>(() => {});
    const el = await pasang();

    // Tanpa baris ini, tabel tanpa satu pun penanda terbaca sebagai "semua
    // video aman" — kesimpulan yang salah dan tak ada yang mengoreksinya.
    expect(el.textContent).toContain(PESAN_MEMERIKSA);
    // Angka "Tampil ke penonton" PASTI kelebihan selagi memeriksa.
    expect(el.textContent).toContain("…");
  });

  it("meminta ke endpoint yang benar, membawa id video yang tampil", async () => {
    jawabanEndpoint = () => new Promise<Response>(() => {});
    await pasang();
    await tungguSampai(() => permintaan.length > 0, "permintaan terkirim");

    expect(permintaan[0].url).toBe("/api/admin/playly/belum-siap");
    expect(permintaan[0].ids).toEqual([VIDEO_A.id, VIDEO_B.id]);
  });

  it("penanda 'belum siap' muncul SESUDAH jawaban tiba", async () => {
    jawabanEndpoint = async () => balas({ ok: true, ids: [VIDEO_B.id], diperiksa: 2 });
    const el = await pasang();

    await tungguSampai(
      () => el.textContent?.includes("1 video belum siap") ?? false,
      "penanda 'belum siap' tergambar",
    );

    // Keterangan "sedang memeriksa" harus HILANG begitu hasilnya tiba —
    // kalau tidak, ia berputar selamanya dan jadi kebisingan.
    expect(el.textContent).not.toContain(PESAN_MEMERIKSA);
  });

  it("endpoint GAGAL tidak merusak panel", async () => {
    // Gagal memeriksa bukan alasan menghapus alat kerja admin dari layar —
    // jebakan yang sama pernah kena di tests/panel-playly-tahan-gangguan.ts.
    jawabanEndpoint = async () => {
      throw new Error("jaringan putus");
    };
    const el = await pasang();

    await tungguSampai(
      () => !(el.textContent?.includes(PESAN_MEMERIKSA) ?? true),
      "keterangan 'sedang memeriksa' berhenti",
    );
    expect(el.textContent).toContain(VIDEO_A.title);
    expect(el.textContent).toContain("Tampil ke penonton");
  });

  it("prop berisi daftar = NOL permintaan jaringan", async () => {
    // Pemanggil yang sudah tahu jawabannya tidak boleh memicu pemeriksaan ulang.
    const el = await pasang([VIDEO_B.id]);

    expect(permintaan).toHaveLength(0);
    expect(el.textContent).toContain("1 video belum siap");
    expect(el.textContent).not.toContain(PESAN_MEMERIKSA);
  });
});

describe("halaman Playly punya kerangka yang tampil seketika", () => {
  it("loading.tsx menggambar kerangka + keterangan sedang memuat", () => {
    const html = renderToStaticMarkup(h(MemuatHalamanPlayly));

    // Layar yang sibuk harus bisa dibedakan dari layar yang rusak.
    expect(html).toContain("Memuat…");
    expect(html).toContain("animate-pulse");
  });

  it("kerangka TIDAK membocorkan kata khas panel admin", () => {
    // 🪤 DIUKUR DI PRODUKSI 2026-11-11, bukan kekhawatiran teoretis. Versi
    // pertama loading.tsx memuat judul "Video dari Playly" + kalimat
    // "Daftarnya panjang (ratusan video)", dan KEDUANYA terkirim ke pengunjung
    // yang BELUM login: kerangka adalah "static shell" yang React kirim DULUAN,
    // sebelum app/admin/layout.tsx selesai memeriksa cookie dan menggantinya
    // dengan layar penolakan. Menu sidebar & nama endpoint tidak ikut bocor,
    // tapi dua kalimat itu sudah cukup membuat janji di layout.tsx ("isi
    // panelnya tidak pernah ikut terkirim") jadi tidak benar.
    const html = renderToStaticMarkup(h(MemuatHalamanPlayly));

    for (const rahasia of [
      "Playly",
      "Video dari",
      "ratusan video",
      "Dashboard",
      "IMDb",
      "Kelola Admin",
      "Webhook",
      "Kunci",
    ]) {
      expect(html, `kata "${rahasia}" bocor ke pengunjung yang belum login`).not.toContain(rahasia);
    }
  });

  it("page.tsx TIDAK menunggu pemeriksaan berkas selesai", () => {
    // Penjaga tingkat sumber: satu kata `await` yang dikembalikan di depan
    // petaBerbatasPlayly cukup untuk memulangkan keluhan owner, dan tidak ada
    // tes perilaku yang bisa menangkapnya (hasil akhirnya sama persis, cuma
    // ~47 detik lebih lambat).
    const sumber = readFileSync("app/admin/videos/playly/page.tsx", "utf8");

    // Halaman TIDAK BOLEH lagi memeriksa berkas sama sekali — pekerjaan itu
    // kini milik /api/admin/playly/belum-siap yang hasilnya bisa diingat.
    expect(sumber).not.toContain("fetchPlaylyDetailPublik");
    expect(sumber).not.toContain("petaBerbatasPlayly");
    expect(sumber).not.toContain("belumSiapIds");
  });
});
