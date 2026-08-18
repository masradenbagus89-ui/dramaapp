// Tes pengunci perilaku untuk rating penonton (lib/store.ts) dan data
// terstruktur Google (lib/structured-data.ts).
//
// Yang paling penting dikunci: JSON-LD TIDAK BOLEH memuat aggregateRating
// karangan. Kalau angka IMDb tak ada, blok itu harus hilang sama sekali —
// mengirim rating palsu ke Google berisiko penalti.
import { describe, it, expect } from "vitest";
import { summarizeRatings } from "../lib/store";
import { dramaJsonLd, toJsonLdScript } from "../lib/structured-data";
import type { Drama } from "../lib/types";

const BASE: Drama = {
  id: "uji-drama",
  title: "Drama Uji",
  category: "Romance",
  episodes: 12,
  views: "1.0K",
  synopsis: "Sinopsis singkat untuk pengujian.",
  gradient: "from-rose-500 to-amber-500",
};

const URL_UJI = "https://dramaapp.vercel.app/drama/uji-drama";

describe("summarizeRatings — ringkasan rating penonton", () => {
  it("belum ada suara -> rata-rata 0, jumlah 0", () => {
    expect(summarizeRatings({})).toEqual({ average: 0, count: 0 });
  });

  it("satu suara -> rata-rata = suara itu", () => {
    expect(summarizeRatings({ "a@b.com": 4 })).toEqual({ average: 4, count: 1 });
  });

  it("rata-rata dibulatkan 1 angka di belakang koma", () => {
    // (5 + 4 + 4) / 3 = 4.333... -> 4.3
    const hasil = summarizeRatings({ "a@b.com": 5, "c@d.com": 4, "e@f.com": 4 });
    expect(hasil).toEqual({ average: 4.3, count: 3 });
  });

  it("nilai rusak (bukan angka) diabaikan, tidak bikin NaN", () => {
    const map = { "a@b.com": 4, "c@d.com": Number.NaN };
    expect(summarizeRatings(map)).toEqual({ average: 4, count: 1 });
  });
});

describe("dramaJsonLd — data terstruktur untuk Google", () => {
  it("tanpa rating IMDb -> TIDAK ada aggregateRating (jangan mengarang)", () => {
    const data = dramaJsonLd(BASE, URL_UJI);
    expect(data.aggregateRating).toBeUndefined();
    expect(data["@type"]).toBe("TVSeries");
    expect(data.name).toBe("Drama Uji");
  });

  it("ada rating IMDb + jumlah suara -> aggregateRating skala 10", () => {
    const data = dramaJsonLd(
      { ...BASE, imdbRating: "7.4", imdbVotes: "1,234" },
      URL_UJI,
    );
    expect(data.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 7.4,
      ratingCount: 1234, // koma pemisah ribuan ikut dibersihkan
      bestRating: 10,
      worstRating: 1,
    });
  });

  it("rating ada tapi jumlah suara nol -> tetap TIDAK dipasang", () => {
    const data = dramaJsonLd({ ...BASE, imdbRating: "7.4", imdbVotes: "0" }, URL_UJI);
    expect(data.aggregateRating).toBeUndefined();
  });

  it("rating 'N/A' dari OMDb tidak jadi angka palsu", () => {
    const data = dramaJsonLd(
      { ...BASE, imdbRating: "N/A", imdbVotes: "N/A" },
      URL_UJI,
    );
    expect(data.aggregateRating).toBeUndefined();
  });
});

describe("toJsonLdScript — aman ditanam di dalam <script>", () => {
  it("karakter '<' di-escape supaya tag script tak bisa ditutup lebih awal", () => {
    const jahat = dramaJsonLd(
      { ...BASE, title: "Drama </script><img src=x onerror=alert(1)>" },
      URL_UJI,
    );
    const keluaran = toJsonLdScript(jahat);
    expect(keluaran).not.toContain("</script>");
    expect(keluaran).toContain("\\u003c");
    // Tetap JSON yang valid sesudah di-escape.
    expect(() => JSON.parse(keluaran)).not.toThrow();
  });
});
