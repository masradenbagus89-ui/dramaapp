import { describe, expect, it } from "vitest";
import {
  kualitasDariUnduhan,
  lengkapiKualitasVideo,
} from "@/lib/kualitas-video";
import type { LinkUnduhanPublik } from "@/lib/playly-unduhan";

const link = (quality: "1080p" | "480p"): LinkUnduhanPublik => ({
  provider: "google",
  quality,
  url: "https://contoh.test/berkas",
});

describe("kualitasDariUnduhan", () => {
  it("ada berkas 1080p -> HD", () => {
    expect(kualitasDariUnduhan([link("1080p")])).toBe("HD");
  });

  it("1080p menang walau 480p ikut ada", () => {
    expect(kualitasDariUnduhan([link("480p"), link("1080p")])).toBe("HD");
  });

  it("hanya 480p -> SD", () => {
    expect(kualitasDariUnduhan([link("480p")])).toBe("SD");
  });

  // Penjaga aturan JUJUR: belum punya link unduhan BUKAN berarti mutunya
  // rendah. Kalau ini berubah jadi "SD", poster akan memajang mutu rendah pada
  // film yang tak pernah diperiksa siapa pun — dan tak ada error yang memberi
  // tahu, persis jenis kerusakan senyap yang dilarang project ini.
  it("tidak ada link -> null, BUKAN SD", () => {
    expect(kualitasDariUnduhan([])).toBeNull();
    expect(kualitasDariUnduhan(undefined)).toBeNull();
  });
});

describe("lengkapiKualitasVideo", () => {
  it("mengisi quality yang masih kosong", () => {
    const hasil = lengkapiKualitasVideo([
      { quality: null, linkUnduhan: [link("1080p")] },
    ]);
    expect(hasil[0].quality).toBe("HD");
  });

  // Inilah yang membuat "bisa dikoreksi admin" benar-benar berlaku. Kalau
  // penjaga ini merah, koreksi manusia akan tertimpa tebakan otomatis tiap
  // halaman dimuat ulang — dan admin akan menyimpulkan panelnya rusak.
  it("TIDAK menimpa quality yang sudah diisi manusia", () => {
    const hasil = lengkapiKualitasVideo([
      { quality: "CAM", linkUnduhan: [link("1080p")] },
    ]);
    expect(hasil[0].quality).toBe("CAM");
  });

  it("video tanpa link dibiarkan kosong", () => {
    const hasil = lengkapiKualitasVideo([{ quality: null }]);
    expect(hasil[0].quality).toBeNull();
  });

  it("tidak mengubah array maupun objek aslinya", () => {
    const asal = [{ quality: null as string | null, linkUnduhan: [link("1080p")] }];
    const hasil = lengkapiKualitasVideo(asal);
    expect(asal[0].quality).toBeNull();
    expect(hasil).not.toBe(asal);
  });
});
