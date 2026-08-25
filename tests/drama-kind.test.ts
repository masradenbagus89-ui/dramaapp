// Penjaga fitur "Film" (1 video utuh, tanpa episode) — ditambahkan 2026-08-25.
// Yang dikunci di sini adalah aturan yang KERUSAKANNYA SENYAP kalau berubah:
//   1. judul lama (tanpa field `kind`) HARUS tetap terbaca sebagai serial,
//   2. film selalu 1 video & selalu gratis — walau body-nya bilang lain
//      (form admin bukan pagar; endpoint bisa dipanggil langsung),
//   3. data terstruktur untuk Google memakai tipe yang benar (Movie/TVSeries).
import { describe, it, expect } from "vitest";
import {
  MOVIE_EPISODE_COUNT,
  isMovie,
  resolveKindRules,
  type Drama,
} from "../lib/types";
import { dramaJsonLd } from "../lib/structured-data";

/** Drama minimal; field yang diuji ditimpa lewat `extra`. */
function drama(extra: Partial<Drama> = {}): Drama {
  return {
    id: "judul-uji",
    title: "Judul Uji",
    category: "Romance",
    episodes: 12,
    views: "1.0K",
    synopsis: "Sinopsis singkat.",
    gradient: "",
    ...extra,
  };
}

describe("isMovie — membedakan film dari serial", () => {
  it("kind 'movie' = film", () => {
    expect(isMovie(drama({ kind: "movie" }))).toBe(true);
  });

  it("kind 'series' = serial", () => {
    expect(isMovie(drama({ kind: "series" }))).toBe(false);
  });

  it("judul lama tanpa field kind tetap serial (bukan film)", () => {
    expect(isMovie(drama())).toBe(false);
  });

  it("serial yang baru punya 1 episode TIDAK dianggap film", () => {
    // Inilah alasan tandanya eksplisit, bukan tebakan dari `episodes === 1`.
    expect(isMovie(drama({ episodes: 1 }))).toBe(false);
  });
});

describe("resolveKindRules — aturan simpan untuk film vs serial", () => {
  it("film: jumlah video dipaksa 1 walau form mengirim angka lain", () => {
    const r = resolveKindRules({ kind: "movie", episodes: 40 });
    expect(r.kind).toBe("movie");
    expect(r.episodes).toBe(MOVIE_EPISODE_COUNT);
  });

  it("film: selalu gratis walau body mengirim premium true", () => {
    expect(resolveKindRules({ kind: "movie", premium: true }).premium).toBe(false);
  });

  it("film: tanpa kolom episode sama sekali tetap sah (form menyembunyikannya)", () => {
    expect(resolveKindRules({ kind: "movie" }).episodes).toBe(MOVIE_EPISODE_COUNT);
  });

  it("serial: jumlah episode diambil dari form apa adanya", () => {
    const r = resolveKindRules({ kind: "series", episodes: 24, premium: true });
    expect(r.episodes).toBe(24);
    expect(r.premium).toBe(true);
  });

  it("serial: premium tidak dikirim = jangan diubah (undefined)", () => {
    expect(resolveKindRules({ kind: "series", episodes: 3 }).premium).toBeUndefined();
  });

  it("body tanpa kind (judul lama / alat lain) diperlakukan sebagai serial", () => {
    expect(resolveKindRules({ episodes: 5 }).kind).toBe("series");
    expect(resolveKindRules({ kind: "film-panjang", episodes: 5 }).kind).toBe("series");
  });

  it("serial: angka tidak sah ditolak lewat episodes = null", () => {
    expect(resolveKindRules({ kind: "series", episodes: 0 }).episodes).toBeNull();
    expect(resolveKindRules({ kind: "series", episodes: -3 }).episodes).toBeNull();
    expect(resolveKindRules({ kind: "series", episodes: "abc" }).episodes).toBeNull();
    expect(resolveKindRules({ kind: "series" }).episodes).toBeNull();
  });

  it("serial: pecahan dibulatkan ke bawah (tak ada episode setengah)", () => {
    expect(resolveKindRules({ kind: "series", episodes: 2.9 }).episodes).toBe(2);
  });
});

describe("dramaJsonLd — tipe schema.org ikut jenis tayangan", () => {
  const url = "https://contoh.test/drama/judul-uji";

  it("film dikirim sebagai Movie, tanpa jumlah episode", () => {
    const data = dramaJsonLd(drama({ kind: "movie", episodes: 1 }), url);
    expect(data["@type"]).toBe("Movie");
    expect(data).not.toHaveProperty("numberOfEpisodes");
  });

  it("serial tetap TVSeries lengkap dengan jumlah episode", () => {
    const data = dramaJsonLd(drama({ episodes: 12 }), url);
    expect(data["@type"]).toBe("TVSeries");
    expect(data.numberOfEpisodes).toBe(12);
  });
});
