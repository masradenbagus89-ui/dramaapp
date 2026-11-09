import { describe, it, expect } from "vitest";
import {
  shouldGiveUpVideo,
  teaserShouldLoop,
  swipeDirection,
  featuredHeroSlides,
  teaserSrc,
  splitHeroTitle,
  VIDEO_RETRY_LIMIT,
  nextTrailerEpisode,
  trailerClipDone,
  trailerTotalClips,
  TRAILER_CLIP_SEC,
  TRAILER_MAX_EP,
  TRAILER_MAX_ROUNDS,
} from "../lib/hero-teaser";
import type { Drama } from "../lib/types";

function stub(partial: Partial<Drama> & Pick<Drama, "id" | "title">): Drama {
  return {
    category: "Action",
    episodes: 1,
    views: "0",
    synopsis: "",
    gradient: "from-zinc-800 to-black",
    ...partial,
  };
}

describe("shouldGiveUpVideo", () => {
  it("belum menyerah di percobaan ke-2", () => {
    expect(shouldGiveUpVideo(VIDEO_RETRY_LIMIT)).toBe(false);
  });

  it("menyerah setelah lewat batas ulang", () => {
    expect(shouldGiveUpVideo(VIDEO_RETRY_LIMIT + 1)).toBe(true);
  });
});

describe("teaserShouldLoop", () => {
  it("ulang setelah melewati jendela teaser", () => {
    expect(teaserShouldLoop(31, 90, 6, 20)).toBe(true);
  });

  it("jangan loop kalau file terlalu pendek", () => {
    expect(teaserShouldLoop(10, 12, 6, 20)).toBe(false);
  });
});

describe("swipeDirection", () => {
  it("geser kiri = berikutnya", () => {
    expect(swipeDirection(200, 10, 80, 12)).toBe(1);
  });

  it("geser kanan = sebelumnya", () => {
    expect(swipeDirection(80, 10, 200, 14)).toBe(-1);
  });

  it("geser atas-bawah bukan swipe hero", () => {
    expect(swipeDirection(100, 20, 110, 200)).toBe(0);
  });

  it("ketukan pendek diabaikan", () => {
    expect(swipeDirection(100, 10, 120, 12)).toBe(0);
  });
});

describe("teaserSrc", () => {
  it("alamat same-origin, id di-encode", () => {
    expect(teaserSrc("drama-1")).toBe("/api/teaser?id=drama-1&ep=1");
    expect(teaserSrc("a b", 3)).toBe("/api/teaser?id=a%20b&ep=3");
  });
});

describe("featuredHeroSlides", () => {
  it("pilih yang punya poster, urut views", () => {
    const slides = featuredHeroSlides([
      stub({ id: "a", title: "A", views: "10", posterImage: "/a.jpg" }),
      stub({ id: "b", title: "B", views: "90", posterImage: "/b.jpg" }),
      stub({ id: "c", title: "C", views: "50" }),
    ]);
    expect(slides.map((d) => d.id)).toEqual(["b", "a"]);
  });

  it("utamakan drama berseri, bukan film 1 episode berkunjung tinggi", () => {
    const slides = featuredHeroSlides([
      stub({
        id: "movie",
        title: "Movie",
        views: "9.0M",
        episodes: 1,
        posterImage: "/m.jpg",
      }),
      stub({
        id: "series",
        title: "Series",
        views: "1.0K",
        episodes: 40,
        posterImage: "/s.jpg",
      }),
    ]);
    expect(slides[0].id).toBe("series");
  });
});

describe("splitHeroTitle", () => {
  it("pecah judul di koma menjadi 2 baris", () => {
    expect(
      splitHeroTitle(
        "Diremehkan Sebagai Gadis Desa, Ternyata Dia Legenda Terkuat",
      ),
    ).toEqual([
      "Diremehkan Sebagai Gadis Desa",
      "Ternyata Dia Legenda Terkuat",
    ]);
  });

  it("batasi maksimal 3 baris meski ada banyak koma", () => {
    expect(splitHeroTitle("A, B, C, D, E")).toEqual(["A, B, C, D, E"]);
  });

  it("kembalikan judul utuh kalau tidak ada koma", () => {
    expect(splitHeroTitle("Guru Misterius Membentuk Pasukan Rahasia")).toEqual(
      ["Guru Misterius Membentuk Pasukan Rahasia"],
    );
  });

  it("abaikan spasi berlebih", () => {
    expect(splitHeroTitle("A,  B ,C ")).toEqual(["A", "B", "C"]);
  });
});

describe("trailer montase per episode", () => {
  it("menggilir episode lalu kembali ke Ep 1 di batas TRAILER_MAX_EP", () => {
    expect(nextTrailerEpisode(1, 43)).toBe(2);
    expect(nextTrailerEpisode(TRAILER_MAX_EP, 43)).toBe(1);
  });

  it("drama pendek menggilir sebanyak episodenya saja", () => {
    expect(nextTrailerEpisode(3, 3)).toBe(1);
    expect(nextTrailerEpisode(1, 1)).toBe(1); // film: tetap Ep 1
  });

  it("jumlah episode 0/rusak tidak membuat montase kosong", () => {
    expect(nextTrailerEpisode(1, 0)).toBe(1);
    expect(trailerTotalClips(0)).toBe(TRAILER_MAX_ROUNDS);
  });

  it("total potongan = putaran x episode digilir", () => {
    expect(trailerTotalClips(43)).toBe(TRAILER_MAX_EP * TRAILER_MAX_ROUNDS);
    expect(trailerTotalClips(3)).toBe(3 * TRAILER_MAX_ROUNDS);
  });

  it("potongan selesai tepat sesudah TRAILER_CLIP_SEC dari titik mulai", () => {
    expect(trailerClipDone(5 + TRAILER_CLIP_SEC - 0.1, 5)).toBe(false);
    expect(trailerClipDone(5 + TRAILER_CLIP_SEC, 5)).toBe(true);
  });
});
