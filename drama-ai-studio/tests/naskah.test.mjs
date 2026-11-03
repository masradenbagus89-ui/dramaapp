// Penjaga naskah & konsistensi karakter.
//
// Yang diuji di sini semuanya kerusakan SENYAP: salah ketik id karakter tidak
// memunculkan error apa pun, hanya menghasilkan episode dengan wajah tokoh
// yang berubah di tengah jalan. Tes ini memaksa kerusakan itu jadi berisik.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { muatBibel, cariKarakter, cariLokasi, periksaBibel } from "../lib/naskah/bibel-karakter.mjs";
import { muatNaskah, periksaNaskah, totalDurasi, DURASI_MAKS_DETIK } from "../lib/naskah/naskah-episode.mjs";
import { susunStoryboard } from "../lib/naskah/storyboard.mjs";
import { MOOD } from "../lib/penyedia/palet.mjs";

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..");
const bibel = muatBibel();

/** Naskah tiruan sependek mungkin yang masih lolos aturan durasi. */
function naskahMinimal(ubah = {}) {
  return {
    episode: 99,
    judulMandarin: "测试",
    judulIndonesia: "Uji",
    sinopsis: "uji",
    shot: [
      {
        id: "t1", lokasiId: "lobi-shengshi", karakterId: ["wanxing"],
        kamera: "medium", aksi: "berdiri", mood: "dingin-tertahan",
        durasiDetik: 10, dialog: null,
      },
      ...Array.from({ length: 6 }, (_, i) => ({
        id: `t${i + 2}`, lokasiId: "lobi-shengshi", karakterId: [],
        kamera: "wide", aksi: "ruangan", mood: "dingin-tertahan",
        durasiDetik: 10, dialog: null,
      })),
    ],
    ...ubah,
  };
}

test("Character Bible asli lolos pemeriksaan", () => {
  periksaBibel(bibel);
  assert.ok(bibel.karakter.length >= 5, "serial ini butuh minimal 5 tokoh tetap");
});

test("karakter dobel ditolak", () => {
  const utuh = (id, c) => ({ id, promptVisual: c.repeat(30), promptRingkas: c.repeat(12) });
  const rusak = { karakter: [utuh("a", "x"), utuh("a", "y")] };
  assert.throws(() => periksaBibel(rusak), /dobel/i);
});

test("karakter tanpa promptVisual layak ditolak (itu satu-satunya penjaga konsistensi wajah)", () => {
  const rusak = { karakter: [{ id: "a", promptVisual: "pendek", promptRingkas: "x".repeat(12) }] };
  assert.throws(() => periksaBibel(rusak), /promptVisual/);
});

test("promptRingkas yang tidak lebih pendek ditolak — kalau sama saja, wide shot tetap jadi close-up", () => {
  const sama = "x".repeat(40);
  assert.throws(
    () => periksaBibel({ karakter: [{ id: "a", promptVisual: sama, promptRingkas: sama }] }),
    /tidak lebih pendek/
  );
});

test("id karakter yang salah ketik berhenti di sini, bukan jadi video salah wajah", () => {
  assert.throws(() => cariKarakter(bibel, "wanxng"), /tidak ada di Character Bible/);
  assert.throws(() => cariLokasi(bibel, "lobi-salah"), /tidak ada di Character Bible/);
});

test("naskah episode 1 lolos dan panjangnya masuk format drama pendek", () => {
  const naskah = muatNaskah(1, bibel);
  const total = totalDurasi(naskah);
  assert.ok(total >= 60 && total <= DURASI_MAKS_DETIK, `total ${total} detik di luar 60-180`);
  assert.equal(naskah.shot.length, 18);
});

test("naskah yang menyebut karakter tak terdaftar ditolak", () => {
  const n = naskahMinimal();
  n.shot[0].karakterId = ["tokoh-hantu"];
  assert.throws(() => periksaNaskah(n, bibel), /tokoh-hantu/);
});

test("penutur dialog yang tidak hadir di shot-nya ditolak", () => {
  const n = naskahMinimal();
  n.shot[0].dialog = {
    tipe: "dialog", karakterId: "chenzhou",
    mandarin: "你好", pinyin: "nǐ hǎo", indonesia: "Halo",
  };
  assert.throws(() => periksaNaskah(n, bibel), /tidak terdaftar hadir/);
});

test("narasi batin BOLEH dari tokoh yang tidak tampak di shot", () => {
  const n = naskahMinimal();
  n.shot[1].dialog = {
    tipe: "narasi", karakterId: "wanxing",
    mandarin: "再等一等。", pinyin: "zài děng", indonesia: "Sabar sedikit lagi.",
  };
  assert.doesNotThrow(() => periksaNaskah(n, bibel));
});

test("nilai fokus yang salah ketik ditolak, bukan diam-diam jadi \"adegan\"", () => {
  const n = naskahMinimal();
  n.shot[0].fokus = "wajahh";
  assert.throws(() => periksaNaskah(n, bibel), /fokus "wajahh" tidak dikenal/);
});

test("shot yang kepanjangan ditolak sebelum uang dibelanjakan", () => {
  const n = naskahMinimal();
  n.shot[0].durasiDetik = 25;
  assert.throws(() => periksaNaskah(n, bibel), /melewati batas/);
});

test("episode di luar 1-3 menit ditolak", () => {
  const n = naskahMinimal({ shot: [{ id: "x", lokasiId: "lobi-shengshi", karakterId: [], kamera: "w", aksi: "a", mood: "hina", durasiDetik: 5, dialog: null }] });
  assert.throws(() => periksaNaskah(n, bibel), /di luar format drama pendek/);
});

test("storyboard: timing nyambung tanpa celah dan totalnya cocok", () => {
  const papan = susunStoryboard(muatNaskah(1, bibel), bibel);
  let jam = 0;
  for (const s of papan.shot) {
    assert.equal(s.mulaiDetik, jam, `shot ${s.id} tidak nyambung dengan shot sebelumnya`);
    jam += s.durasiDetik;
    assert.equal(s.selesaiDetik, jam);
  }
  assert.equal(papan.totalDetik, jam);
});

test("storyboard menyalin promptVisual dari Bible APA ADANYA (inti konsistensi 10 episode)", () => {
  const papan = susunStoryboard(muatNaskah(1, bibel), bibel);
  const wanxing = cariKarakter(bibel, "wanxing");
  // Hanya shot ber-fokus "wajah" yang memakai deskripsi penuh; shot wide
  // sengaja memakai versi ringkas (lihat tests/gambar.test.mjs).
  const wajahWanxing = papan.shot.filter(
    (s) => s.karakterNama.includes(wanxing.namaIndonesia) && s.fokus === "wajah"
  );
  assert.ok(wajahWanxing.length >= 3, "episode 1 harus punya beberapa close-up Wanxing");
  for (const s of wajahWanxing) {
    assert.ok(
      s.promptVideo.includes(wanxing.promptVisual),
      `shot ${s.id} tidak memuat promptVisual Wanxing utuh — wajahnya bisa berubah`
    );
  }
});

test("judul kartu pembuka memakai judul SERIAL, bukan judul episode", () => {
  const papan = susunStoryboard(muatNaskah(1, bibel), bibel);
  assert.equal(papan.serialMandarin, bibel.serial.judulMandarin);
  assert.notEqual(papan.serialMandarin, papan.judulMandarin, "judul serial dan judul episode tertukar");
});

test("setiap mood yang dipakai naskah mana pun sudah terdaftar di palet", () => {
  // Pagar masa depan: menulis episode baru dengan mood baru membuat tes ini
  // MERAH sampai warnanya didaftarkan — bukan merender episode berwarna salah.
  const berkasNaskah = readdirSync(join(AKAR, "data")).filter((f) => /^episode-\d+\.json$/.test(f));
  assert.ok(berkasNaskah.length > 0, "tidak ada satu pun berkas naskah episode");
  for (const f of berkasNaskah) {
    const n = JSON.parse(readFileSync(join(AKAR, "data", f), "utf8"));
    for (const s of n.shot) {
      assert.ok(MOOD[s.mood], `mood "${s.mood}" (${f}, shot ${s.id}) belum ada di lib/penyedia/palet.mjs`);
    }
  }
});

// --------------------------------------------------- penjaga audio & gerak
// Dua cacat ini DILAPORKAN OWNER, bukan ditemukan mesin: "tidak ada suaranya
// dan tidak bergerak". Keduanya lolos dari seluruh pemeriksaan teknis —
// audionya terukur ADA (-17,6 dB) dan kameranya terukur BERGERAK (14%).
// Yang salah: ambangnya, bukan keberadaannya.

test("nada bed audio WAJIB di atas 150 Hz — di bawah itu speaker laptop/HP diam", () => {
  for (const [nama, m] of Object.entries(MOOD)) {
    for (const hz of m.nadaHz) {
      assert.ok(
        hz > 150,
        `mood "${nama}" punya nada ${hz} Hz; speaker kecil tidak membunyikannya dan owner mendengar hening`
      );
    }
  }
});

test("tiap mood punya TIGA nada (akor), bukan dengung satu-dua nada", () => {
  for (const [nama, m] of Object.entries(MOOD)) {
    assert.equal(m.nadaHz.length, 3, `mood "${nama}" bukan akor tiga nada`);
  }
});

test("gerak kamera WAJIB minimal 0,20 — di bawah itu terbaca sebagai foto diam", () => {
  for (const [nama, m] of Object.entries(MOOD)) {
    assert.ok(
      m.zoom >= 0.2,
      `mood "${nama}" zoom ${m.zoom}; pada 0,14 owner melaporkan "tidak bergerak" padahal bingkainya berubah`
    );
  }
});
