// @vitest-environment jsdom
//
// Penjaga alur BELI-LALU-TONTON di pemutar feed — risiko yang ditulis terbuka
// di HANDOFF.md sejak 2026-10-27 dan belum pernah dibuktikan jalan.
//
// KENAPA justru ini yang dijaga mesin. Penutupan kebocoran paywall 27 Oktober
// memindahkan alamat video keluar dari HTML: alamat kini hanya LAHIR di server
// lewat /api/video-url sesudah gerbang paywall lolos. Konsekuensinya, episode
// yang BARU DIBAYAR tidak punya alamat sama sekali di halaman — alamatnya harus
// diminta ULANG, di browser, tanpa penonton memuat ulang. Kalau rantai itu
// putus, gejalanya: koin terpotong, paywall hilang, layar tetap diam. Pelanggan
// membayar lalu tak dapat apa-apa — lebih buruk daripada kebocoran yang baru
// ditutup, dan TIDAK ADA yang melaporkannya ke kita.
//
// Yang diuji di sini sengaja SISI BROWSER saja. Aturan servernya sudah dikunci
// tests/paywall-guard.test.ts + tests/video-url-route.test.ts; `fetch` di sini
// ditiru memakai aturan yang sama (ep 1-3 gratis, sisanya butuh sudah-dibuka)
// supaya yang terbukti adalah rantai state React-nya, bukan aturan yang sama
// diuji dua kali.
//
// Dipasang mount sungguhan (react-dom/client + act), mencontoh
// tests/lanjut-menonton-render.test.ts: yang dijanjikan ke owner adalah
// PERILAKU yang hidup di state React — `next build`, `tsc`, maupun screenshot
// tetap hijau walau rantai ini mati total.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Batas waktu dinaikkan dari bawaan 5 detik. BUKAN untuk menutupi tes lambat:
// tes ini menunggu KONDISI (lihat tungguSampai) jadi di mesin sepi ia selesai
// dalam puluhan milidetik. Angka besar ini cuma plafon untuk mesin yang sedang
// sibuk — mesin kerja project ini server RDP bersama puluhan penyewa, dan
// gerbang pra-rilis 2026-11-09 berhenti justru karena rantai fetch tiruan belum
// selesai saat plafon 5 detik tercapai. Kalau rantainya benar-benar MATI,
// tungguSampai yang gagal lebih dulu dengan pesan yang menyebut apa yang
// ditunggu — bukan "test timed out" yang tak memberi petunjuk apa pun.
vi.setConfig({ testTimeout: 20_000, hookTimeout: 20_000 });

// Tes ini menguji perilaku SAAT KOIN/IKLAN MENYALA, dan sejak 2026-10-28
// saklarnya DIJEDA di lib/saklar-fitur.ts (keputusan owner). Saklarnya dipaku
// MENYALA di sini dengan sengaja: perilaku paywall/iklan harus tetap terbukti
// hijau selama dijeda, kalau tidak jalur "nyalakan kembali" berangkat tanpa
// satu pun penjaga. Keadaan JEDA-nya diuji terpisah di tests/jeda-koin-iklan.test.ts.
vi.mock("@/lib/saklar-fitur", () => ({
  PAYWALL_ENABLED: true,
  ADS_ENABLED: true,
}));
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { COIN_PER_EPISODE, FREE_EPISODES } from "../lib/coins";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyGlobal = globalThis as any;
anyGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const DRAMA = "drama-premium-uji";
const EP_DIBELI = FREE_EPISODES + 1; // episode berbayar pertama
const TOTAL_EP = 20;

/** Episode yang sudah dibayar — persis seperti `unlockedEps` milik server. */
const sudahDibayar = new Set<number>();
/** Jejak tiap permintaan /api/video-url, untuk membuktikan permintaan ULANG. */
let mintaAlamat: number[] = [];
/**
 * Keadaan `src` pada SETIAP panggilan play(). Inti tes ke-3: play() yang
 * dipanggil saat elemen masih tanpa alamat tidak memutar apa pun.
 */
let panggilanPlay: (string | null)[] = [];
/**
 * Saat permintaan `fetch` TERAKHIR masuk. Dipakai tungguTenang untuk tahu
 * rantai permintaan sudah habis — bukan menebaknya dari jumlah gelombang.
 */
let waktuFetchTerakhir = 0;

function jawab(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Alamat palsu yang bentuknya meniru hasil tanda tangan HMAC berumur 6 jam. */
const alamatVideo = (ep: number) =>
  "https://contoh-tunnel.trycloudflare.com/videos/" +
  DRAMA +
  "/ep" +
  ep +
  ".mp4?exp=1&sig=abc";

function pasangFetch() {
  anyGlobal.fetch = vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    waktuFetchTerakhir = Date.now();

    if (url.startsWith("/api/coins?")) {
      return jawab({
        loggedIn: true,
        isAdmin: false,
        balance: 100,
        unlockedEps: [...sudahDibayar],
        config: {
          freeEpisodes: FREE_EPISODES,
          coinPerEpisode: COIN_PER_EPISODE,
          rewardPerAd: 4,
          checkinBonus: 15,
          dailyAdLimit: 12,
        },
      });
    }

    if (url.startsWith("/api/coins/unlock")) {
      const { ep } = JSON.parse(String(init?.body ?? "{}")) as { ep: number };
      sudahDibayar.add(ep);
      return jawab({ ok: true, balance: 100 - COIN_PER_EPISODE });
    }

    if (url.startsWith("/api/video-url")) {
      const ep = Number(new URLSearchParams(url.split("?")[1]).get("ep"));
      mintaAlamat.push(ep);
      // Aturan SAMA dengan lib/paywall-guard.ts: jatah gratis lolos, sisanya
      // hanya kalau sudah dibayar. Ditolak = TANPA alamat di badan respons.
      if (ep > FREE_EPISODES && !sudahDibayar.has(ep)) {
        return jawab({ error: "Episode ini terkunci." }, 403);
      }
      return jawab({ url: alamatVideo(ep) });
    }

    return jawab({ ok: true });
  });
}

let container: HTMLDivElement;
let root: Root;

/**
 * Satu putaran: beri kesempatan permintaan `fetch` tiruan selesai, lalu
 * kerjakan pekerjaan React yang menunggu (efek + render) di dalam `act`.
 *
 * KENAPA ADA JEDA ASLI, bukan cuma `await act(async () => {})`: rantai di
 * komponen ini berlapis (jawaban dompet -> state `unlocked` berubah -> efek
 * minta alamat -> jawaban alamat -> state `srcMap` berubah -> efek memulai
 * pemutaran). Satu gelombang hanya melepaskan satu lapis microtask, jadi
 * "berapa gelombang yang cukup" bergantung kecepatan mesin — itulah sumber
 * kerapuhan yang diperbaiki di sini.
 */
async function putaran() {
  await act(async () => {
    await new Promise((selesai) => setTimeout(selesai, 10));
  });
}

/**
 * Tunggu sampai `syarat` TERPENUHI — bukan sampai sejumlah gelombang habis.
 *
 * Inilah inti perbaikan 2026-11-10. Versi lama menunggu dengan jumlah
 * `await act(async () => {})` yang TETAP; begitu mesin sibuk (mesin kerja
 * project ini server RDP bersama puluhan penyewa) rantai di atas belum selesai
 * saat pemeriksaan dijalankan, dan tes gagal padahal kodenya sehat. Gagalnya
 * acak, jadi gerbang pra-rilis berhenti di berkas yang tak ada hubungannya
 * dengan perubahan yang sedang diuji (terjadi 2026-11-09).
 *
 * `label` wajib: pesan gagalnya harus menyebut apa yang ditunggu, kalau tidak
 * sesi berikutnya cuma melihat "timed out" tanpa petunjuk.
 */
async function tungguSampai(
  syarat: () => boolean,
  label: string,
  batasMs = 8_000,
) {
  const batas = Date.now() + batasMs;
  while (!syarat()) {
    if (Date.now() > batas) {
      throw new Error(
        "menunggu " +
          label +
          " lewat " +
          batasMs +
          "ms — rantai alamat video kemungkinan PUTUS, bukan sekadar lambat",
      );
    }
    await putaran();
  }
}

/**
 * Tunggu sampai tak ada permintaan `fetch` baru selama `jedaMs`.
 *
 * Dipakai sebagai TITIK AWAL yang tenang sebelum sebuah tes mengklik tombol:
 * jumlah permintaan saat halaman dibuka bisa 1 atau 2 tergantung mana yang
 * dijawab lebih dulu — dompet atau penolakan 403 — dan itu BUKAN perilaku yang
 * dijanjikan ke penonton, jadi tidak boleh ikut dihitung sebagai hasil.
 */
async function tungguTenang(jedaMs = 250, batasMs = 8_000) {
  const batas = Date.now() + batasMs;
  while (Date.now() - waktuFetchTerakhir < jedaMs) {
    if (Date.now() > batas) return;
    await putaran();
  }
}

/**
 * Pasang pemutar lalu tunggu sampai rantai permintaan saat halaman dibuka
 * habis: (1) status dompet, (2) alamat video untuk slide sekitar.
 * Dipisah dari beforeEach karena dua tes terakhir perlu titik awal berbeda
 * (episode berbayar vs episode gratis).
 */
async function pasang(startEp: number, premium: boolean) {
  const { default: FeedPlayer } = await import("../app/components/FeedPlayer");
  await act(async () => {
    root.render(
      h(FeedPlayer, {
        dramaId: DRAMA,
        title: "Drama Uji",
        episodes: TOTAL_EP,
        startEp,
        premium,
      }),
    );
  });
  await tungguTenang();
}

/** Elemen <video> milik episode `ep` — dicari lewat slide-nya, bukan urutan. */
const videoEp = (ep: number) =>
  container.querySelector<HTMLVideoElement>(
    '[data-idx="' + (ep - 1) + '"] video',
  );

const tombolBuka = () =>
  Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Buka • " + COIN_PER_EPISODE + " koin"),
  );

const adaPaywall = () =>
  container.textContent?.includes("Episode " + EP_DIBELI + " terkunci") ?? false;

beforeEach(async () => {
  sudahDibayar.clear();
  mintaAlamat = [];
  panggilanPlay = [];
  // Dipasang ke "sekarang", bukan 0: tungguTenang mengukur SELISIH terhadap
  // permintaan terakhir, jadi nilai 0 akan dianggap "sudah lama tenang" dan
  // penungguannya dilewati sebelum permintaan pertama sempat terjadi.
  waktuFetchTerakhir = Date.now();
  pasangFetch();

  // Penonton yang SUDAH LOGIN — tanpa ini paywall hanya menampilkan tombol
  // "Masuk", dan tombol belinya tak pernah ada untuk diklik.
  window.localStorage.clear();
  window.localStorage.setItem(
    "dramaku:user",
    JSON.stringify({
      name: "Penguji",
      email: "uji@contoh.test",
      role: "viewer",
    }),
  );

  // jsdom tidak punya mesin video maupun pengamat gulir. Keduanya diganti
  // tiruan supaya yang diukur murni keputusan komponen.
  HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
    panggilanPlay.push(this.getAttribute("src"));
    return Promise.resolve();
  };
  HTMLMediaElement.prototype.pause = function () {};
  HTMLMediaElement.prototype.load = function () {};
  Element.prototype.scrollIntoView = function () {};
  anyGlobal.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("alur beli-lalu-tonton di pemutar feed", () => {
  it("SEBELUM dibeli: paywall tampil dan episodenya tidak punya alamat video", async () => {
    await pasang(EP_DIBELI, true);

    // Ditunggu LEBIH DULU, dan ini yang membuat pemeriksaan "src kosong" di
    // bawah punya arti: alamat episode gratis hanya terpasang kalau rantai
    // permintaan benar-benar sudah jalan. Tanpa ini, `src` yang masih null bisa
    // berarti "memang tidak diberi" ATAU "belum sempat" — dua hal yang sangat
    // berbeda, dan yang kedua membuat tes lulus padahal tak membuktikan apa-apa.
    await tungguSampai(
      () =>
        videoEp(FREE_EPISODES)
          ?.getAttribute("src")
          ?.includes("ep" + FREE_EPISODES + ".mp4") ?? false,
      "alamat episode GRATIS ep" + FREE_EPISODES + " terpasang",
    );

    expect(adaPaywall()).toBe(true);
    // Inti penutupan 2026-10-27: bukan disembunyikan - memang tidak ada.
    expect(videoEp(EP_DIBELI)?.getAttribute("src")).toBeNull();
    // Jatah gratis tetap utuh: episode sebelumnya dapat alamat seperti biasa.
    expect(videoEp(FREE_EPISODES)?.getAttribute("src")).toContain(
      "ep" + FREE_EPISODES + ".mp4",
    );
  });

  it("SESUDAH dibeli: alamat diminta ULANG lalu terpasang, paywall hilang", async () => {
    await pasang(EP_DIBELI, true);

    // Tombol beli baru tergambar sesudah jawaban dompet masuk (harganya datang
    // dari sana), jadi menunggunya = bukti rantai pembukaan halaman selesai.
    await tungguSampai(
      () => tombolBuka() !== undefined,
      "tombol beli episode tergambar",
    );
    expect(mintaAlamat.filter((e) => e === EP_DIBELI).length).toBeGreaterThan(0);
    expect(videoEp(EP_DIBELI)?.getAttribute("src")).toBeNull();

    // TITIK NOL dipasang tepat sebelum klik. Jumlah permintaan saat halaman
    // dibuka sengaja TIDAK dipakai sebagai patokan: bisa 1 atau 2 tergantung
    // mana yang dijawab lebih dulu (dompet atau penolakan 403), dan itu bukan
    // janji ke penonton.
    //
    // Yang DITERBUKTIKAN angka 1 di bawah: pembelian memicu permintaan baru
    // (bukan nol — pelanggan bayar lalu layar diam) dan satu pembelian tidak
    // menghasilkan permintaan susulan. ⚠️ Ia TIDAK membuktikan pembukuan
    // `sudahDiminta` di komponen masih hidup: diuji-balik 2026-11-10 dengan
    // melumpuhkan pembukuan itu, tes ini tetap HIJAU karena permintaan berulang
    // lahir dari render ulang di LUAR jendela pengukuran ini. Kalau nanti perlu
    // dijaga, tempatnya tes terpisah yang memicu render ulang berturut-turut.
    mintaAlamat = [];

    await act(async () => {
      tombolBuka()!.click();
    });

    // Tanpa permintaan ulang ini, pelanggan membayar lalu tetap tak punya
    // alamat sampai dia menebak sendiri harus memuat ulang halaman.
    await tungguSampai(
      () =>
        videoEp(EP_DIBELI)
          ?.getAttribute("src")
          ?.includes("ep" + EP_DIBELI + ".mp4") ?? false,
      "alamat episode yang BARU DIBAYAR terpasang di elemen video",
    );

    // Dibiarkan tenang dulu supaya permintaan berulang (kalau ada) ikut
    // terhitung — kalau langsung diperiksa, permintaan kedua yang menyusul
    // sedetik kemudian tak akan pernah tertangkap tes ini.
    await tungguTenang();
    expect(mintaAlamat.filter((e) => e === EP_DIBELI).length).toBe(1);
    expect(adaPaywall()).toBe(false);
  });

  it("SESUDAH dibeli: pemutaran dimulai saat alamatnya SUDAH ada, bukan sebelumnya", async () => {
    await pasang(EP_DIBELI, true);
    await tungguSampai(
      () => tombolBuka() !== undefined,
      "tombol beli episode tergambar",
    );

    await act(async () => {
      tombolBuka()!.click();
    });
    await tungguSampai(
      () =>
        panggilanPlay.some((src) => src?.includes("ep" + EP_DIBELI + ".mp4")) ||
        false,
      "play() dijalankan SESUDAH alamat ep" + EP_DIBELI + " terpasang",
    );

    // KENAPA diperiksa begini, bukan sekadar "play() pernah dipanggil":
    // alamat video tiba BELAKANGAN (sesudah /api/video-url dijawab), jadi
    // play() yang berjalan lebih dulu menyentuh <video> yang masih tanpa
    // alamat - nol byte dimuat, layar tetap diam. Yang membuktikan penonton
    // benar-benar mendapat videonya adalah play() yang terjadi SESUDAH
    // alamatnya terpasang.
    expect(
      panggilanPlay.filter((src) => src?.includes("ep" + EP_DIBELI + ".mp4")),
      "play() dipanggil " +
        panggilanPlay.length +
        "x tapi tak satu pun saat alamat ep" +
        EP_DIBELI +
        " sudah terpasang",
    ).not.toHaveLength(0);
  });

  it("episode GRATIS: pemutaran juga dimulai sesudah alamatnya tiba", async () => {
    // Akar masalahnya sama dan TIDAK khusus paywall: sejak alamat video lahir
    // di server, SETIAP episode mulai hidup tanpa `src`. Tanpa tes ini,
    // autoplay feed (janji dasar pemutar ala Melolo) bisa mati diam-diam untuk
    // SEMUA penonton, termasuk yang tak pernah menyentuh koin.
    await pasang(1, false);
    await tungguSampai(
      () => panggilanPlay.some((src) => src?.includes("ep1.mp4")) || false,
      "play() dijalankan sesudah alamat ep1 terpasang",
    );

    expect(videoEp(1)?.getAttribute("src")).toContain("ep1.mp4");
    expect(
      panggilanPlay.filter((src) => src?.includes("ep1.mp4")),
      "play() dipanggil " + panggilanPlay.length + "x tapi semua tanpa alamat",
    ).not.toHaveLength(0);
  });
});
