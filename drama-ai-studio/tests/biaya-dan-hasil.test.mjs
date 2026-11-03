// Penjaga gerbang biaya dan penjaga mutu hasil render.
//
// Gerbang biaya adalah pagar yang melindungi uang owner. Pagar yang tidak
// pernah diberi masukan buruk bukan pagar — jadi tiap jalur penolakan diuji
// satu per satu, bukan cuma jalur yang lolos.

import { test } from "node:test";
import assert from "node:assert/strict";
import { estimasiBiaya, gerbangBiaya, hitungKarakterHan } from "../lib/biaya.mjs";
import { periksaHasil, sedangTerkunci, pindahkanHasil } from "../lib/render/episode.mjs";
import { writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { muatBibel } from "../lib/naskah/bibel-karakter.mjs";
import { muatNaskah } from "../lib/naskah/naskah-episode.mjs";
import { susunStoryboard } from "../lib/naskah/storyboard.mjs";

const papan = susunStoryboard(muatNaskah(1, muatBibel()), muatBibel());
const MESIN_LOKAL = { visual: "lokal", suara: "lokal", teks: "lokal" };
const MESIN_BAYAR = {
  visual: "fal-ai/kling-video/v1.6/standard/image-to-video",
  suara: "minimax/speech-02-turbo",
  teks: "lokal",
};

// ---------------------------------------------------------------- estimasi
test("mesin lokal berbiaya nol", () => {
  const { totalUsd } = estimasiBiaya(papan, MESIN_LOKAL);
  assert.equal(totalUsd, 0);
});

test("mesin berbayar menghasilkan biaya lebih dari nol dan terinci", () => {
  const { rincian, totalUsd } = estimasiBiaya(papan, MESIN_BAYAR);
  assert.ok(totalUsd > 0);
  assert.ok(rincian.length >= 3, "rincian harus memisahkan video, gambar acuan, dan suara");
  assert.equal(totalUsd, bulat(rincian.reduce((j, r) => j + r.usd, 0)), "total tidak sama dengan jumlah rinciannya");
});

test("durasi tagihan DIBULATKAN NAIK ke kelipatan klip — perkiraan tak boleh di bawah tagihan asli", () => {
  const { rincian } = estimasiBiaya(papan, MESIN_BAYAR);
  const video = rincian.find((r) => r.tahap === "Video adegan");
  const detikDitagih = Number(video.hitungan.match(/(\d+) detik ditagih/)[1]);
  assert.ok(detikDitagih >= papan.totalDetik, "detik yang ditagih lebih kecil dari durasi episode");
});

test("tarif mesin yang belum terdaftar ditolak, bukan dihitung nol diam-diam", () => {
  assert.throws(
    () => estimasiBiaya(papan, { visual: "mesin-karangan", suara: "lokal" }),
    /belum terdaftar di TARIF/
  );
});

// ------------------------------------------------------------------ gerbang
test("biaya nol lewat tanpa persetujuan apa pun", () => {
  assert.doesNotThrow(() =>
    gerbangBiaya({ totalUsd: 0, batasUsd: 0, disetujui: false, kunciHilang: [] })
  );
});

test("ditolak kalau kunci API belum ada", () => {
  assert.throws(
    () => gerbangBiaya({ totalUsd: 5, batasUsd: 100, disetujui: true, kunciHilang: ["FAL_KEY"] }),
    /kunci API belum diisi/
  );
});

test("ditolak kalau batas belanja masih nol", () => {
  assert.throws(
    () => gerbangBiaya({ totalUsd: 5, batasUsd: 0, disetujui: true, kunciHilang: [] }),
    /STUDIO_BATAS_BIAYA_USD/
  );
});

test("ditolak kalau perkiraan melewati batas belanja", () => {
  assert.throws(
    () => gerbangBiaya({ totalUsd: 50, batasUsd: 10, disetujui: true, kunciHilang: [] }),
    /melewati batas/
  );
});

test("ditolak kalau belum ada persetujuan sekali-pakai, walau batas mencukupi", () => {
  assert.throws(
    () => gerbangBiaya({ totalUsd: 5, batasUsd: 100, disetujui: false, kunciHilang: [] }),
    /--setujui-biaya/
  );
});

test("lolos HANYA ketika keempat syarat terpenuhi sekaligus", () => {
  assert.doesNotThrow(() =>
    gerbangBiaya({ totalUsd: 5, batasUsd: 100, disetujui: true, kunciHilang: [] })
  );
});

test("hitung karakter Han mengabaikan tanda baca dan huruf Latin", () => {
  assert.equal(hitungKarakterHan("你好，世界！"), 4);
  assert.equal(hitungKarakterHan("Halo dunia"), 0);
});

// -------------------------------------------------------- mutu hasil render
const HASIL_BENAR = {
  info: { durasiDetik: 97, lebar: 1080, tinggi: 1920, codecVideo: "h264", adaAudio: true },
  ukuranByte: 15_000_000,
  diharapkan: 97,
  berkas: "uji.mp4",
};

test("hasil render yang benar diterima", () => {
  assert.doesNotThrow(() => periksaHasil(HASIL_BENAR));
});

test("berkas kosong ditolak walau ffmpeg keluar tanpa error", () => {
  assert.throws(() => periksaHasil({ ...HASIL_BENAR, ukuranByte: 0 }), /kosong/);
});

test("resolusi yang bukan 9:16 ditolak", () => {
  assert.throws(
    () => periksaHasil({ ...HASIL_BENAR, info: { ...HASIL_BENAR.info, lebar: 1920, tinggi: 1080 } }),
    /resolusi/
  );
});

test("video tanpa jalur audio ditolak", () => {
  assert.throws(
    () => periksaHasil({ ...HASIL_BENAR, info: { ...HASIL_BENAR.info, adaAudio: false } }),
    /audio/
  );
});

test("durasi yang meleset jauh dari rencana ditolak", () => {
  assert.throws(
    () => periksaHasil({ ...HASIL_BENAR, info: { ...HASIL_BENAR.info, durasiDetik: 61 } }),
    /meleset/
  );
});

test("selisih kecil akibat pembulatan frame TIDAK ditolak", () => {
  assert.doesNotThrow(() =>
    periksaHasil({ ...HASIL_BENAR, info: { ...HASIL_BENAR.info, durasiDetik: 97.04 } })
  );
});

function bulat(n) {
  return Math.round(n * 10000) / 10000;
}

// ------------------------------------------------- berkas hasil terkunci
// Situasi nyata: owner sedang menonton episode versi sebelumnya saat render
// ulang berjalan. Windows mengunci berkas yang sedang diputar, dan dulu itu
// membuat ffmpeg gagal "Permission denied" SESUDAH 100 detik kerja terbuang.

test("berkas yang tidak ada dianggap tidak terkunci", () => {
  assert.equal(sedangTerkunci(join(tmpdir(), "berkas-yang-pasti-tidak-ada-123.mp4")), false);
});

test("berkas biasa yang bisa ditulis dianggap tidak terkunci", () => {
  const p = join(tmpdir(), `uji-kunci-${process.pid}.mp4`);
  writeFileSync(p, "isi");
  try {
    assert.equal(sedangTerkunci(p), false);
  } finally {
    rmSync(p, { force: true });
  }
});

test("hasil dipindah ke nama aslinya saat tujuan TIDAK terkunci", () => {
  const dari = join(tmpdir(), `uji-dari-${process.pid}.mp4`);
  const ke = join(tmpdir(), `uji-ke-${process.pid}.mp4`);
  writeFileSync(dari, "video baru");
  try {
    const hasil = pindahkanHasil({ dari, ke, lapor: () => {} });
    assert.equal(hasil, ke);
    assert.equal(readFileSync(ke, "utf8"), "video baru");
  } finally {
    rmSync(dari, { force: true });
    rmSync(ke, { force: true });
  }
});
