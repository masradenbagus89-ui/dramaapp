// Penjaga Voice Generation (suara dialog Mandarin).
//
// Tes di sini TIDAK menyentuh jaringan. Yang diuji: alamat permintaan, dan
// mekanisme pembeda suara antar-tokoh — satu-satunya hal yang membuat lima
// tokoh tidak terdengar persis sama pada penyedia gratis bersuara tunggal.

import { test } from "node:test";
import assert from "node:assert/strict";
import { muatBibel } from "../lib/naskah/bibel-karakter.mjs";
import { muatNaskah } from "../lib/naskah/naskah-episode.mjs";
import { susunStoryboard } from "../lib/naskah/storyboard.mjs";
import { susunAlamatUcapan, PANJANG_TEKS_MAKS } from "../lib/penyedia/suara-gratis.mjs";
import { geserNadaFilter } from "../lib/penyedia/visual-lokal.mjs";

const bibel = muatBibel();
const papan = susunStoryboard(muatNaskah(1, bibel), bibel);

test("alamat ucapan meminta bahasa Mandarin dan memuat teksnya", () => {
  const u = new URL(susunAlamatUcapan("再等一等。"));
  assert.equal(u.searchParams.get("tl"), "zh-CN");
  assert.equal(u.searchParams.get("q"), "再等一等。");
  assert.equal(u.searchParams.get("client"), "tw-ob");
});

test("teks kepanjangan dipotong supaya penyedia tidak menolak", () => {
  const u = new URL(susunAlamatUcapan("是".repeat(500)));
  assert.ok(u.searchParams.get("q").length <= PANJANG_TEKS_MAKS);
});

test("tanda baca Mandarin di-encode, bukan merusak alamat", () => {
  assert.doesNotThrow(() => new URL(susunAlamatUcapan("顾总！好巧啊。&=?")));
});

test("TIAP tokoh punya geserNada — tanpa itu kelimanya terdengar sama persis", () => {
  for (const k of bibel.karakter) {
    assert.equal(
      typeof k.suara?.geserNada,
      "number",
      `"${k.id}" belum punya suara.geserNada`
    );
  }
});

test("tokoh pria digeser lebih berat daripada tokoh wanita", () => {
  const n = (id) => bibel.karakter.find((k) => k.id === id).suara.geserNada;
  assert.ok(n("chenzhou") < n("wanxing"), "CEO pria harus bersuara lebih berat dari Wanxing");
  assert.ok(n("zhenguo") < n("wanxing"), "paman pria harus bersuara lebih berat dari Wanxing");
  assert.ok(n("sutian") > n("wanxing"), "Su Tian dirancang bersuara lebih tinggi");
});

test("storyboard mengambil geserNada dari PENUTUR, bukan dari tokoh pertama di shot", () => {
  // s14: Chenzhou bicara, tapi Wanxing juga hadir dan disebut lebih dulu.
  const s = papan.shot.find((x) => x.id === "s14");
  assert.equal(s.dialog.karakterId, "chenzhou");
  assert.equal(s.geserNadaDialog, bibel.karakter.find((k) => k.id === "chenzhou").suara.geserNada);
});

test("shot tanpa dialog bergeser nada nol", () => {
  for (const s of papan.shot.filter((x) => !x.dialog)) assert.equal(s.geserNadaDialog, 0);
});

test("geser nada nol tidak menambah filter sama sekali", () => {
  assert.equal(geserNadaFilter(0), "");
});

test("geser nada turun memperlambat laju sampel lalu mengembalikan durasinya", () => {
  const f = geserNadaFilter(-5);
  const rasio = Math.pow(2, -5 / 12);
  const asetrate = Number(f.match(/asetrate=(\d+)/)[1]);
  const atempo = Number(f.match(/atempo=([\d.]+)/)[1]);

  // Diperiksa sebagai HUBUNGAN, bukan angka yang dipaku: memaku angkanya
  // membuat tes merah tiap kali pembulatan digeser satu digit, padahal yang
  // penting cuma dua hal di bawah.
  assert.equal(asetrate, Math.round(24000 * rasio), "laju sampel tidak sesuai rasio nada");
  assert.ok(Math.abs(atempo - 1 / rasio) < 0.001, "atempo tidak mengembalikan durasi aslinya");
  assert.ok(asetrate < 24000, "nada turun harus memperlambat laju sampel");
});

test("geser nada naik memakai arah sebaliknya", () => {
  const f = geserNadaFilter(2);
  const asetrate = Number(f.match(/asetrate=(\d+)/)[1]);
  const atempo = Number(f.match(/atempo=([\d.]+)/)[1]);
  assert.ok(asetrate > 24000, "nada naik harus mempercepat laju sampel");
  assert.ok(atempo < 1, "atempo harus memperlambat balik agar durasinya tetap");
});

test("atempo tetap dalam rentang yang diterima ffmpeg (0,5-100) untuk semua tokoh", () => {
  for (const k of bibel.karakter) {
    const f = geserNadaFilter(k.suara.geserNada);
    if (!f) continue;
    const atempo = Number(f.match(/atempo=([\d.]+)/)[1]);
    assert.ok(atempo >= 0.5 && atempo <= 100, `"${k.id}" menghasilkan atempo ${atempo} di luar rentang`);
  }
});
