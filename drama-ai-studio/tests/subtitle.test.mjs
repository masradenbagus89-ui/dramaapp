// Penjaga subtitle.
//
// Tes terpenting di berkas ini adalah "WrapStyle 0". Itu bukan kerapian:
// dengan WrapStyle 2, kalimat Indonesia yang panjang TIDAK dibungkus melainkan
// dipotong di tepi layar — tanpa error, tanpa peringatan, dan build tetap
// hijau. Cacat itu benar-benar terjadi saat episode 1 pertama dirender dan
// hanya ketahuan dengan melihat frame hasilnya. Tes ini menguncinya.

import { test } from "node:test";
import assert from "node:assert/strict";
import { muatBibel } from "../lib/naskah/bibel-karakter.mjs";
import { muatNaskah } from "../lib/naskah/naskah-episode.mjs";
import { susunStoryboard } from "../lib/naskah/storyboard.mjs";
import { buatAss, buatSrt } from "../lib/naskah/subtitle.mjs";

const bibel = muatBibel();
const papan = susunStoryboard(muatNaskah(1, bibel), bibel);
const ass = buatAss(papan);
const srt = buatSrt(papan);

test("ASS memakai WrapStyle 0 — pembungkusan baris HARUS hidup", () => {
  assert.match(ass, /^WrapStyle:\s*0$/m, "WrapStyle bukan 0: subtitle panjang akan terpotong di tepi layar");
});

test("ASS memakai font CJK untuk baris Mandarin", () => {
  assert.match(ass, /Style: Mandarin,Microsoft YaHei,/);
});

test("baris Mandarin duduk LEBIH TINGGI daripada baris Indonesia", () => {
  const ambilMarginV = (nama) => {
    const baris = ass.split("\n").find((b) => b.startsWith(`Style: ${nama},`));
    assert.ok(baris, `gaya ${nama} tidak ada`);
    return Number(baris.split(",").at(-2));
  };
  // MarginV diukur dari BAWAH layar, jadi angka lebih besar = posisi lebih atas.
  assert.ok(
    ambilMarginV("Mandarin") > ambilMarginV("Indonesia"),
    "Mandarin harus di atas Indonesia; kalau terbalik keduanya saling menimpa"
  );
});

test("tiap dialog menghasilkan DUA baris: Mandarin dan Indonesia", () => {
  const jumlahDialog = papan.shot.filter((s) => s.dialog).length;
  const baris = ass.split("\n").filter((b) => b.startsWith("Dialogue:"));
  assert.equal(baris.length, jumlahDialog * 2);
});

test("narasi batin memakai gaya miring yang berbeda dari dialog biasa", () => {
  const narasi = papan.shot.find((s) => s.dialog?.tipe === "narasi");
  assert.ok(narasi, "episode 1 harus punya narasi batin");
  const barisNarasi = ass
    .split("\n")
    .filter((b) => b.startsWith("Dialogue:") && b.includes(narasi.dialog.indonesia));
  assert.ok(barisNarasi.some((b) => b.includes(",IndonesiaBatin,")), "narasi tidak memakai gaya batin");
});

test("subtitle tidak pernah keluar dari jendela waktu shot-nya", () => {
  for (const baris of ass.split("\n").filter((b) => b.startsWith("Dialogue:"))) {
    const [, mulai, selesai] = baris.split(",");
    assert.ok(keDetik(mulai) < keDetik(selesai), `jendela waktu terbalik: ${baris}`);
    assert.ok(keDetik(selesai) <= papan.totalDetik, `subtitle melewati akhir episode: ${baris}`);
  }
});

test("urutan subtitle selalu maju, tidak pernah mundur", () => {
  const mulai = ass
    .split("\n")
    .filter((b) => b.startsWith("Dialogue:"))
    .map((b) => keDetik(b.split(",")[1]));
  for (let i = 1; i < mulai.length; i++) {
    assert.ok(mulai[i] >= mulai[i - 1], "ada subtitle yang waktunya mundur");
  }
});

test("SRT memakai koma sebagai pemisah milidetik (bukan titik)", () => {
  assert.match(srt, /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/);
  assert.ok(!/\d{2}:\d{2}:\d{2}\.\d{3} -->/.test(srt), "format SRT salah: pakai titik, bukan koma");
});

test("SRT hanya memuat bahasa Indonesia — bukan Mandarin", () => {
  assert.ok(!/[一-鿿]/.test(srt), "SRT kebocoran aksara Han; berkas ini khusus Indonesia");
  assert.match(srt, /Orang yang datang menagih utang\./);
});

test("nomor urut SRT berurutan mulai dari 1", () => {
  const nomor = srt
    .split("\n\n")
    .filter(Boolean)
    .map((blok) => Number(blok.split("\n")[0]));
  assert.deepEqual(nomor, nomor.map((_, i) => i + 1));
});

function keDetik(t) {
  const [j, m, d] = t.trim().split(":");
  return Number(j) * 3600 + Number(m) * 60 + Number(d.replace(",", "."));
}
