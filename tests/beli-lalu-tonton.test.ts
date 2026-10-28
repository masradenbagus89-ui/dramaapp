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
 * Pasang pemutar lalu lepaskan dua gelombang permintaan yang terjadi tiap
 * halaman dibuka: (1) status dompet, (2) alamat video untuk slide sekitar.
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
  await act(async () => {});
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

    // Dihitung RELATIF, bukan diadu ke angka tetap. Saat halaman dibuka
    // alamatnya memang sudah diminta DUA kali (sekali saat mount, sekali lagi
    // setelah jawaban dompet mengubah `unlocked`) - keduanya ditolak 403, dan
    // jumlahnya bisa berubah kalau urutan muat berubah. Yang dijaga tes ini:
    // pembelian menambah SATU permintaan baru.
    const sebelum = mintaAlamat.filter((e) => e === EP_DIBELI).length;
    expect(sebelum).toBeGreaterThan(0);
    expect(videoEp(EP_DIBELI)?.getAttribute("src")).toBeNull();

    const tombol = tombolBuka();
    expect(tombol, "tombol beli episode tidak tergambar").toBeTruthy();

    await act(async () => {
      tombol!.click();
    });
    await act(async () => {}); // lepaskan permintaan alamat gelombang berikutnya

    // Tanpa permintaan ulang ini, pelanggan membayar lalu tetap tak punya
    // alamat sampai dia menebak sendiri harus memuat ulang halaman.
    expect(mintaAlamat.filter((e) => e === EP_DIBELI).length).toBe(sebelum + 1);
    expect(videoEp(EP_DIBELI)?.getAttribute("src")).toContain(
      "ep" + EP_DIBELI + ".mp4",
    );
    expect(adaPaywall()).toBe(false);
  });

  it("SESUDAH dibeli: pemutaran dimulai saat alamatnya SUDAH ada, bukan sebelumnya", async () => {
    await pasang(EP_DIBELI, true);

    await act(async () => {
      tombolBuka()!.click();
    });
    await act(async () => {});

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

    expect(videoEp(1)?.getAttribute("src")).toContain("ep1.mp4");
    expect(
      panggilanPlay.filter((src) => src?.includes("ep1.mp4")),
      "play() dipanggil " + panggilanPlay.length + "x tapi semua tanpa alamat",
    ).not.toHaveLength(0);
  });
});
