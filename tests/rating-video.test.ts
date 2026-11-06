// Penjaga RATING KETIKAN ADMIN — owner 2026-11-06: "kalau yang belum ada
// ratingnya bisa kita edit kan?".
//
// ⚠️ ANGKA INI DILIHAT PENONTON. Ia tampil di kartu video di beranda lewat
// lib/playly-publik.ts, jadi nilai ngawur bukan cuma mengotori panel admin —
// ia ikut tayang. Yang dijaga di sini adalah kerusakan yang TIDAK memunculkan
// error: angka di luar akal yang tersimpan diam-diam, rating ketikan yang
// tertimpa IMDb, dan video yang berhenti mengikuti IMDb tanpa ada yang minta.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  RATING_MAKS,
  RATING_MIN,
  parseRatingManual,
  ratingTampil,
} from "../lib/rating-video";

const PANEL = readFileSync(
  "app/components/admin/PlaylyVisibilityManager.tsx",
  "utf8",
);
const ROUTE = readFileSync("app/api/admin/playly/rating/route.ts", "utf8");
const PUBLIK = readFileSync("lib/playly-publik.ts", "utf8");
const GABUNGAN = readFileSync("lib/playly-gabungan.ts", "utf8");
const STORE = readFileSync("lib/store.ts", "utf8");

describe("aturan nilai rating (fungsi murni)", () => {
  it("menerima angka yang wajar, dibulatkan ke satu desimal", () => {
    expect(parseRatingManual("7.4")).toBe("7.4");
    expect(parseRatingManual(7.44)).toBe("7.4");
    expect(parseRatingManual("7")).toBe("7.0");
    expect(parseRatingManual("10")).toBe("10.0");
    expect(parseRatingManual("0")).toBe("0.0");
  });

  it("menerima KOMA sebagai pemisah desimal", () => {
    // Yang mengetik orang Indonesia. Menolak koma berarti angka yang sah
    // terbaca sebagai ngawur lalu diam-diam terhapus.
    expect(parseRatingManual("7,4")).toBe("7.4");
    expect(parseRatingManual("8,75")).toBe("8.8");
  });

  it("🪤 menolak nilai yang akan tayang jadi angka ngawur", () => {
    // Semua ini pernah jadi cara angka aneh lolos ke tampilan. Ditolak =
    // dipulangkan null = "hapus rating ketikan", bukan disimpan apa adanya.
    for (const ngawur of [
      "11",
      "99",
      "-1",
      "1e3",
      "7.4/10",
      "tujuh",
      "7 4",
      "  ",
      "",
      null,
      undefined,
      {},
      [],
      NaN,
      Infinity,
    ]) {
      expect(parseRatingManual(ngawur), `nilai ${String(ngawur)}`).toBeNull();
    }
  });

  it("batasnya persis 0 sampai 10, bukan sekitarnya", () => {
    expect(parseRatingManual(String(RATING_MIN))).toBe("0.0");
    expect(parseRatingManual(String(RATING_MAKS))).toBe("10.0");
    expect(parseRatingManual("10.1")).toBeNull();
  });

  it("🪤 ketikan admin MENANG atas angka IMDb", () => {
    // Kalau dibalik, angka yang baru diketik tertutup lagi oleh IMDb tanpa ada
    // yang memberi tahu — admin akan mengetiknya berkali-kali mengira gagal
    // tersimpan.
    expect(ratingTampil("9.1", "6.0")).toBe("9.1");
    expect(ratingTampil("", "6.0")).toBe("6.0");
    expect(ratingTampil(null, "6.0")).toBe("6.0");
    expect(ratingTampil(undefined, undefined)).toBeNull();
    expect(ratingTampil("   ", "6.0")).toBe("6.0");
  });
});

describe("rating ketikan disimpan TERPISAH dari data IMDb", () => {
  it("punya dokumen sendiri, bukan menumpang di playly:imdb", () => {
    // 🪤 DUA kerusakan senyap kalau dilanggar:
    //   1. panel menghitung "sudah ada IMDb" dari ada-tidaknya entri di peta
    //      itu (lib/saring-video-admin.ts) — menulis rating ke sana membuat
    //      video yang belum pernah dicocokkan HILANG dari saringan "Belum ada
    //      IMDb", padahal poster & sinopsisnya masih kosong;
    //   2. pencocokan massal MENIMPA seluruh entri `playly:imdb` milik sebuah
    //      video, jadi rating ketikan admin akan lenyap tanpa peringatan.
    expect(STORE).toContain('const PLAYLY_RATING_DOC = "playly:rating"');
    expect(STORE).toContain("export async function setPlaylyVideoRating");
    expect(STORE).toContain("export async function getPlaylyRatingCached");

    // Endpoint rating tidak boleh menyentuh peta IMDb sama sekali.
    expect(ROUTE, "endpoint rating tidak boleh menulis ke peta IMDb").not.toMatch(
      /setPlaylyVideoImdb|PLAYLY_IMDB_DOC/,
    );
  });

  it("mengosongkan berarti MENGHAPUS kunci, bukan menyimpan teks kosong", () => {
    // Entri kosong terbaca sebagai "sudah dikoreksi jadi tanpa rating",
    // sehingga angka IMDb tidak pernah dipakai lagi untuk video itu.
    const blok = STORE.slice(STORE.indexOf("export async function setPlaylyVideoRating"));
    expect(blok.slice(0, 500)).toContain("else delete baru[videoId];");
  });
});

describe("pagar endpoint rating", () => {
  it("otorisasi dicek DI DALAM handler, bukan mengandalkan middleware", () => {
    // skills/owasp/SKILL.md §1 — CVE-2025-29927: header
    // `x-middleware-subrequest` bisa melewati cek yang hanya ada di middleware.
    expect(ROUTE).toContain("await getAdminEmail(req)");
    expect(ROUTE).toContain("isAdminRequest(req)");
    expect(ROUTE).toContain('{ status: 401 }');
  });

  it("nilai dari body lewat PENYARING, tidak pernah disimpan apa adanya", () => {
    // Kotak isian di layar BUKAN pagar: siapa pun bisa mengirim body apa saja
    // ke alamat ini, dan angka ngawur ikut tayang ke penonton.
    expect(ROUTE).toContain("parseRatingManual(body.rating)");
    expect(
      ROUTE,
      "rating mentah dari body tidak boleh langsung disimpan",
    ).not.toMatch(/setPlaylyVideoRating\(videoId, String\(body/);
  });

  it("dibatasi lajunya dan gagal-aman saat penyimpanan error", () => {
    expect(ROUTE).toContain("guardMutation(req");
    // skills/owasp/SKILL.md §1 A10: catch membalas error, TIDAK menyimpan.
    expect(ROUTE).toContain('{ status: 500 }');
  });
});

describe("rating ketikan sampai ke penonton di KEDUA jalur", () => {
  it("jalur katalog memakai ratingTampil, bukan langsung angka IMDb", () => {
    expect(PUBLIK).toContain("ratingTampil(");
    expect(PUBLIK).toContain("getPlaylyRatingCached()");
  });

  it("jalur webhook juga — kalau cuma satu, video yang sama beda angka", () => {
    // 🪤 Video bisa datang dari katalog ATAU dari webhook. Kalau hanya satu
    // jalur yang tahu rating ketikan, video yang sama menampilkan angka
    // berbeda tergantung dari mana ia datang — dan nol error memberi tahu.
    expect(GABUNGAN).toContain("ratingTampil(");
    expect(GABUNGAN).toContain("getPlaylyRatingCached()");
  });
});

describe("kotak isian di panel admin", () => {
  it("🪤 tidak menyimpan kalau nilainya tidak berubah", () => {
    // Tanpa penjaga ini, sekadar mengklik kotak lalu berpindah akan MENGUNCI
    // angka IMDb jadi rating manual — video itu lalu berhenti mengikuti IMDb
    // selamanya, tanpa ada yang memberi tahu.
    const blok = PANEL.slice(PANEL.indexOf("const simpanRating"));
    expect(blok.slice(0, 1200)).toContain("tampilSekarang");
    expect(blok.slice(0, 1200)).toMatch(/\(nilai \?\? ""\) === tampilSekarang/);
  });

  it("menyimpan saat selesai mengetik, bukan tiap huruf", () => {
    // Mengetik "7.4" akan menembak server tiga kali, dan dua di antaranya
    // menyimpan angka setengah jadi ("7", "7.") yang sempat tayang.
    const blok = PANEL.slice(PANEL.indexOf("Rating untuk {v.title}"));
    expect(blok.slice(0, 2500)).toContain("onBlur={() => simpanRating(");
    expect(
      blok.slice(0, 2500),
      "onChange tidak boleh langsung menyimpan",
    ).not.toMatch(/onChange=\{[^}]*simpanRating/);
  });

  it("kotak yang dikosongkan dikirim sebagai null, bukan teks kosong", () => {
    const blok = PANEL.slice(PANEL.indexOf("const simpanRating"));
    expect(blok.slice(0, 2000)).toContain("JSON.stringify({ videoId, rating: nilai })");
  });
});
