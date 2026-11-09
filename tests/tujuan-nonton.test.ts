// Penjaga TUJUAN TOMBOL NONTON di halaman drama — owner 2026-11-09
// ("bisa langsung klik dan nonton tanpa harus klik episode 1 atau mulai nonton").
//
// KERUSAKAN YANG DIJAGA: sejak gambar besar hero ikut bisa diklik, halaman
// detail punya DUA jalan masuk ke tontonan — tombol kuning "Mulai/Lanjut
// Nonton" dan tombol play di tengah gambar. Kalau masing-masing merakit
// alamatnya sendiri, keduanya bisa mengarah ke episode BERBEDA di halaman yang
// sama: tombol kuning melanjutkan ke Ep 20, tombol play melempar balik ke Ep 1.
// Penonton kehilangan kemajuannya tanpa satu pun pesan error muncul.
//
// Karena itu tes ini dua lapis: perilaku fungsinya, DAN penjaga bahwa kedua
// komponen benar-benar memanggil fungsi yang sama alih-alih menyalinnya.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tujuanNonton } from "../lib/tujuan-nonton";
import type { ProgressEntry } from "../lib/progress";

function entryStub(episode: number): ProgressEntry {
  return {
    episode,
    lastWatchedAt: "2026-11-09T00:00:00.000Z",
    positionSec: 120,
    durationSec: 600,
    byEpisode: {},
  };
}

describe("tujuanNonton", () => {
  it("belum pernah ditonton → mulai dari episode 1 secara eksplisit", () => {
    const { href, label } = tujuanNonton("dewa-abadi", null);
    expect(href).toBe("/feed/dewa-abadi?ep=1");
    expect(label).toBe("Mulai Nonton");
  });

  it("sudah pernah ditonton → tanpa ?ep=, biar feed memulihkan posisi terakhir", () => {
    const { href, label } = tujuanNonton("dewa-abadi", entryStub(20));
    expect(href).toBe("/feed/dewa-abadi");
    expect(label).toBe("Lanjut Nonton");
  });

  it("id drama ikut ke alamat, bukan dibuang", () => {
    expect(tujuanNonton("master-pedang", null).href).toContain("master-pedang");
    expect(tujuanNonton("master-pedang", entryStub(3)).href).toContain("master-pedang");
  });

  it("penonton yang sudah jalan TIDAK pernah dilempar balik ke ep=1", () => {
    // Inti kerusakan yang dijaga: apa pun episodenya, yang sudah punya
    // kemajuan tidak boleh dapat alamat ber-?ep=1.
    for (const ep of [1, 2, 20, 43]) {
      expect(tujuanNonton("x", entryStub(ep)).href).not.toContain("ep=");
    }
  });
});

describe("dua jalan masuk memakai SATU aturan", () => {
  const berkas = {
    "tombol kuning": "app/components/WatchCta.tsx",
    "tombol play di gambar besar": "app/components/HeroDramaMedia.tsx",
  };

  for (const [nama, path] of Object.entries(berkas)) {
    const sumber = readFileSync(join(process.cwd(), path), "utf8");

    it(`${nama} memanggil tujuanNonton`, () => {
      expect(sumber).toContain("tujuanNonton");
    });

    it(`${nama} tidak merakit alamat /feed/ sendiri`, () => {
      // Kalau baris ini merah: jangan tambal di komponennya — ubah
      // lib/tujuan-nonton.ts supaya kedua tombol ikut berubah sekaligus.
      expect(sumber).not.toMatch(/`\/feed\/\$\{/);
    });
  }
});
