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

type PropBelumSiap = string[] | Promise<string[]>;

function panel(belumSiapIds: PropBelumSiap) {
  return h(PlaylyVisibilityManager, {
    videos: [VIDEO_A, VIDEO_B],
    initialHidden: [],
    belumSiapIds,
    fetchError: null,
    source: "mitra" as const,
    creators: ["dramaku"],
  });
}

let wadah: HTMLDivElement | null = null;
let akar: Root | null = null;

async function pasang(belumSiapIds: PropBelumSiap) {
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
        `menunggu ${label} lewat ${batasMs}ms — rantai promise kemungkinan PUTUS, bukan sekadar lambat`,
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
});

afterEach(async () => {
  if (akar) await act(async () => akar!.unmount());
  wadah?.remove();
});

describe("panel Playly tidak menunggu pemeriksaan berkas sebelum tampil", () => {
  it("tabel video SUDAH tergambar saat pemeriksaan masih berjalan", async () => {
    // Promise yang tidak pernah selesai = keadaan "Playly sedang lambat".
    const el = await pasang(new Promise<string[]>(() => {}));

    // Inilah yang dulu kosong selama ~47 detik.
    expect(el.textContent).toContain(VIDEO_A.title);
    expect(el.textContent).toContain(VIDEO_B.title);
  });

  it("mengatakan apa adanya bahwa pemeriksaannya BELUM selesai", async () => {
    const el = await pasang(new Promise<string[]>(() => {}));

    // Tanpa baris ini, tabel tanpa satu pun penanda terbaca sebagai "semua
    // video aman" — kesimpulan yang salah dan tak ada yang mengoreksinya.
    expect(el.textContent).toContain(PESAN_MEMERIKSA);
    // Angka "Tampil ke penonton" PASTI kelebihan selagi memeriksa, jadi
    // sengaja belum ditampilkan sebagai angka.
    expect(el.textContent).toContain("…");
  });

  it("penanda 'belum siap' muncul SESUDAH pemeriksaan selesai", async () => {
    let selesaikan: ((ids: string[]) => void) | null = null;
    const nanti = new Promise<string[]>((res) => {
      selesaikan = res;
    });
    const el = await pasang(nanti);

    expect(el.textContent).not.toContain("1 video belum siap");

    await act(async () => {
      selesaikan!([VIDEO_B.id]);
    });
    await tungguSampai(
      () => el.textContent?.includes("1 video belum siap") ?? false,
      "penanda 'belum siap' tergambar",
    );

    // Keterangan "sedang memeriksa" harus HILANG begitu hasilnya tiba —
    // kalau tidak, ia berputar selamanya dan jadi kebisingan.
    expect(el.textContent).not.toContain(PESAN_MEMERIKSA);
  });

  it("pemeriksaan yang GAGAL tidak merusak panel", async () => {
    // Gagal memeriksa bukan alasan menghapus alat kerja admin dari layar —
    // jebakan yang sama pernah kena di tests/panel-playly-tahan-gangguan.ts.
    const el = await pasang(Promise.reject(new Error("Playly tidak menjawab")));

    await tungguSampai(
      () => !(el.textContent?.includes(PESAN_MEMERIKSA) ?? true),
      "keterangan 'sedang memeriksa' berhenti",
    );
    expect(el.textContent).toContain(VIDEO_A.title);
    expect(el.textContent).toContain("Tampil ke penonton");
  });

  it("bentuk ARRAY lama tetap bekerja persis seperti dulu", () => {
    // Pemanggil & tes lama mengirim array. Kalau ini merah, perubahan tadi
    // memutus pemanggil lain — bukan sekadar menambah kemampuan.
    const html = renderToStaticMarkup(panel([VIDEO_B.id]));

    expect(html).toContain("1 video belum siap");
    expect(html).not.toContain(PESAN_MEMERIKSA);
    expect(html).toContain(VIDEO_A.title);
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

    // Yang dilarang SPESIFIK: halaman menunggu hasilnya. `await` DI DALAM
    // periksaBerkasBelumSiap sendiri justru benar dan harus tetap ada.
    expect(sumber).not.toMatch(/await\s+periksaBerkasBelumSiap/);
    expect(sumber).toContain(
      "const belumSiapIds = periksaBerkasBelumSiap(mitra.videos, konfigurasi)",
    );
  });

  it("pemeriksaannya tetap DIBATASI 4 sekaligus, bukan dilepas serentak", () => {
    // Pelajaran 2026-10-06: melepas 172 panggilan sekaligus membuat Playly
    // timeout dan SELURUH sampul di halaman PENONTON ikut kosong. Memindahkan
    // pemeriksaan ke latar belakang tidak boleh diam-diam membuang pagar itu.
    const sumber = readFileSync("app/admin/videos/playly/page.tsx", "utf8");

    expect(sumber).toMatch(/await\s+petaBerbatasPlayly\(videos,/);
    expect(sumber).not.toMatch(/Promise\.all\(\s*videos/);
  });
});
