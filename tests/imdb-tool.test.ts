import { describe, it, expect } from "vitest";
import {
  isValidImdbId,
  resolveOmdbApiKey,
  splitOmdbList,
  enlargeOmdbImage,
  mapOmdbPayloadToDraft,
  toImdbMetadata,
} from "../lib/imdb-tool";

describe("resolveOmdbApiKey — kunci saja, bukan URL", () => {
  it("regresi: URL contoh OMDb yang tertempel utuh tetap mengambil apikey", () => {
    expect(
      resolveOmdbApiKey(
        "http://www.omdbapi.com/?i=tt3896198&apikey=abc12345",
      ),
    ).toBe("abc12345");
  });

  it("kunci polos tetap apa adanya", () => {
    expect(resolveOmdbApiKey("abc12345")).toBe("abc12345");
  });

  it("kosong / URL tanpa apikey jadi string kosong", () => {
    expect(resolveOmdbApiKey("")).toBe("");
    expect(resolveOmdbApiKey(undefined)).toBe("");
    expect(resolveOmdbApiKey("http://www.omdbapi.com/?i=tt3896198")).toBe("");
  });
});

describe("isValidImdbId", () => {
  it("menerima tt diikuti angka", () => {
    expect(isValidImdbId("tt2704799")).toBe(true);
    expect(isValidImdbId("TT0050083")).toBe(true);
  });

  it("menolak yang bukan ID IMDb", () => {
    expect(isValidImdbId("2704799")).toBe(false);
    expect(isValidImdbId("")).toBe(false);
  });
});

describe("splitOmdbList", () => {
  it("memecah daftar koma dan buang N/A", () => {
    expect(splitOmdbList("Comedy, Horror, Thriller")).toEqual([
      "Comedy",
      "Horror",
      "Thriller",
    ]);
    expect(splitOmdbList("N/A")).toEqual([]);
    expect(splitOmdbList("")).toEqual([]);
  });
});

describe("enlargeOmdbImage", () => {
  it("naikkan lebar poster Amazon SX300", () => {
    expect(
      enlargeOmdbImage(
        "https://m.media-amazon.com/images/M/abc@._V1_SX300.jpg",
        1200,
      ),
    ).toBe("https://m.media-amazon.com/images/M/abc@._V1_SX1200.jpg");
  });
});

describe("mapOmdbPayloadToDraft + toImdbMetadata", () => {
  const iceCreamMan = {
    Title: "Ice Cream Man",
    Year: "1995",
    Rated: "R",
    Runtime: "84 min",
    Genre: "Comedy, Horror, Thriller",
    Director: "Paul Norman",
    Writer: "David Dobkin, Sven Davison",
    Actors: "Clint Howard, Justin Isfeld, Anndi McAfee",
    Plot: "Poor Gregory. After being released from the Wishing Well Sanatorium, all he wants to do is make the children happy.",
    Language: "English",
    Country: "United States",
    Poster: "https://example.com/poster.jpg",
    imdbRating: "4.4",
    imdbVotes: "5,000",
    imdbID: "tt0110115",
    Type: "movie",
    Response: "True",
  };

  it("menghasilkan JSON metadata sesuai kontrak", () => {
    const draft = mapOmdbPayloadToDraft(iceCreamMan, {
      banner: "https://example.com/banner.jpg",
    });
    expect(toImdbMetadata(draft)).toEqual({
      title: "Ice Cream Man",
      year: "1995",
      poster: "https://example.com/poster.jpg",
      banner: "https://example.com/banner.jpg",
      genre: ["Comedy", "Horror", "Thriller"],
      rating: "4.4",
      runtime: "84 min",
      country: "United States",
      language: "English",
      description:
        "Poor Gregory. After being released from the Wishing Well Sanatorium, all he wants to do is make the children happy.",
      director: "Paul Norman",
      writers: ["David Dobkin", "Sven Davison"],
      stars: ["Clint Howard", "Justin Isfeld", "Anndi McAfee"],
    });
  });

  it("series menyertakan episodeCount di JSON", () => {
    const draft = mapOmdbPayloadToDraft(
      {
        Title: "The Glory",
        Year: "2022",
        Genre: "Crime, Drama, Thriller",
        Director: "N/A",
        Writer: "Kim Eun-sook",
        Actors: "Song Hye-kyo, Lee Do-hyun, Lim Ji-yeon",
        Plot: "A woman who suffered from school violence takes revenge.",
        Language: "Korean",
        Country: "South Korea",
        Poster: "https://example.com/glory.jpg",
        imdbRating: "8.1",
        imdbID: "tt19869990",
        Type: "series",
        totalSeasons: "1",
        Response: "True",
      },
      { episodeCount: 16 },
    );
    expect(draft.kind).toBe("series");
    expect(toImdbMetadata(draft).episodeCount).toBe(16);
    expect(toImdbMetadata(draft).writers).toEqual(["Kim Eun-sook"]);
  });
});
