// Penjaga mesin gambar gratis + mekanisme konsistensi wajah.
//
// Tes di sini TIDAK menyentuh jaringan. Yang diuji adalah bagian yang
// menentukan apakah wajah tokoh tetap sama di 10 episode — dan itu murni
// perkara angka seed serta susunan prompt, yang semuanya bisa diperiksa
// tanpa mengunduh satu gambar pun.

import { test } from "node:test";
import assert from "node:assert/strict";
import { muatBibel, cariKarakter } from "../lib/naskah/bibel-karakter.mjs";
import { muatNaskah } from "../lib/naskah/naskah-episode.mjs";
import { susunStoryboard, kostumBabak } from "../lib/naskah/storyboard.mjs";
import { susunAlamat } from "../lib/penyedia/gambar-gratis.mjs";

const bibel = muatBibel();
const papan = susunStoryboard(muatNaskah(1, bibel), bibel);

test("tokoh yang sama SELALU dapat seed yang sama — inti konsistensi wajah", () => {
  // Seed diambil dari tokoh UTAMA (yang pertama disebut) shot itu. Satu gambar
  // cuma punya satu seed, jadi untuk adegan dua tokoh harus dipilih salah satu;
  // yang dipilih adalah tokoh yang jadi fokus adegan.
  const utamaWanxing = papan.shot.filter((s) => s.karakterNama[0] === "Lin Wanxing");
  assert.ok(utamaWanxing.length >= 5, "Wanxing harus jadi fokus di banyak adegan");
  const biji = new Set(utamaWanxing.map((s) => s.bijiGambar));
  assert.equal(
    biji.size,
    1,
    `Wanxing memakai ${biji.size} seed berbeda — wajahnya akan berubah antar-adegan`
  );
});

test("tokoh BERBEDA dapat seed berbeda", () => {
  const seedDari = (nama) =>
    papan.shot.find((s) => s.karakterNama[0] === nama)?.bijiGambar;
  assert.notEqual(seedDari("Lin Wanxing"), seedDari("Su Tian"));
  assert.notEqual(seedDari("Lin Wanxing"), seedDari("Gu Chenzhou"));
});

test("seed selalu sama tiap kali storyboard disusun ulang (hasil bisa diulang)", () => {
  const lagi = susunStoryboard(muatNaskah(1, bibel), bibel);
  assert.deepEqual(
    lagi.shot.map((s) => s.bijiGambar),
    papan.shot.map((s) => s.bijiGambar)
  );
});

test("prompt SELALU dibuka jenis kamera", () => {
  // Jenis shot cuma 2-4 kata tapi harus di depan: saat ia ditaruh di belakang,
  // adegan "keluar dari gerbang penjara" keluar sebagai potret studio.
  for (const s of papan.shot) {
    assert.ok(s.promptVideo.startsWith(s.kamera), `shot ${s.id} tidak dibuka jenis kamera`);
  }
});

test("fokus \"wajah\" memakai deskripsi PENUH; fokus \"adegan\" memakai yang RINGKAS", () => {
  const wanxing = cariKarakter(bibel, "wanxing");
  const sWajah = papan.shot.find((x) => x.id === "s08");   // extreme close-up mata
  const sAdegan = papan.shot.find((x) => x.id === "s01");  // wide shot keluar penjara

  assert.ok(sWajah.promptVideo.includes(wanxing.promptVisual), "close-up kehilangan deskripsi penuh");
  assert.ok(
    !sAdegan.promptVideo.includes(wanxing.promptVisual),
    "wide shot masih memakai deskripsi wajah panjang — hasilnya akan jadi pas foto"
  );
  assert.ok(sAdegan.promptVideo.includes(wanxing.promptRingkas), "wide shot kehilangan deskripsi ringkas");
});

test("fokus \"objek\" tidak menyebut tokoh sama sekali", () => {
  // s02 = extreme close-up telapak tangan memegang liontin. Menyebut wajah di
  // sini membuat mesin gambar menggambar wajah dan liontinnya hilang.
  const s = papan.shot.find((x) => x.id === "s02");
  const wanxing = cariKarakter(bibel, "wanxing");
  assert.ok(!s.promptVideo.includes(wanxing.promptVisual));
  assert.ok(!s.promptVideo.includes(wanxing.promptRingkas));
  assert.match(s.promptVideo, /jade teardrop pendant/);
});

test("deskripsi tokoh TIDAK memuat arahan komposisi/pencahayaan", () => {
  // "cinematic portrait lighting" dulu ada di tiap promptVisual dan memaksa
  // mesin gambar membuat pas foto walau naskah minta wide shot. Arahan
  // komposisi tempatnya di GAYA_SINEMATIK dan di kolom `kamera`, bukan di
  // identitas tokoh.
  const terlarang = /\b(portrait lighting|close-?up|wide shot|composition|camera angle)\b/i;
  for (const k of bibel.karakter) {
    assert.ok(
      !terlarang.test(k.promptVisual),
      `promptVisual "${k.id}" memuat arahan komposisi — itu mengunci jenis shot`
    );
  }
});

test("kostum babak ikut masuk prompt", () => {
  const s = papan.shot.find((x) => x.karakterNama.includes("Lin Wanxing"));
  assert.match(s.promptVideo, /wearing .*janitor uniform/);
});

test("kostum dipilih sesuai babak episodenya", () => {
  const wanxing = cariKarakter(bibel, "wanxing");
  assert.match(kostumBabak(wanxing, 1), /janitor uniform/);
  assert.match(kostumBabak(wanxing, 5), /blazer/);
  assert.match(kostumBabak(wanxing, 10), /black dress/);
  assert.equal(kostumBabak(wanxing, 99), null, "episode di luar semua babak harus null");
});

test("TIAP tokoh punya kostum untuk SELURUH episode 1-10", () => {
  // Tokoh tanpa kostum di suatu episode = pakaiannya tidak disebut di prompt =
  // mesin gambar mengarang sendiri, dan itu justru merusak konsistensi yang
  // sedang dijaga. Pagar ini berbunyi saat episode 11+ ditambahkan nanti.
  for (const k of bibel.karakter) {
    for (let ep = 1; ep <= bibel.serial.jumlahEpisode; ep++) {
      assert.ok(
        kostumBabak(k, ep),
        `"${k.id}" tidak punya kostum untuk episode ${ep} — daftarkan di kostumPerBabak`
      );
    }
  }
});

test("kostum ditulis bahasa INGGRIS, bukan Indonesia", () => {
  // Nilainya disuntikkan apa adanya ke prompt berbahasa Inggris. Kalimat
  // Indonesia di sana diabaikan mesin gambar tanpa satu pun pesan error —
  // pakaian tokoh jadi acak dan tak ada yang tahu kenapa.
  const kataIndonesia = /\b(seragam|gaun|setelan|kemeja|sepatu|abu-abu|hitam|merah|dengan|dan)\b/i;
  for (const k of bibel.karakter) {
    for (const baju of Object.values(k.kostumPerBabak)) {
      assert.ok(!kataIndonesia.test(baju), `kostum "${k.id}" masih berbahasa Indonesia: "${baju}"`);
    }
  }
});

test("pakaian HANYA disebut di kostumPerBabak, tidak dobel di promptVisual", () => {
  // Kalau disebut di dua tempat, mengubah satu saja membuat prompt bertengkar
  // sendiri ("wearing X. wearing Y") tanpa ada yang sadar.
  for (const k of bibel.karakter) {
    assert.ok(
      !/\bwearing\b/i.test(k.promptVisual),
      `promptVisual "${k.id}" masih menyebut pakaian — pindahkan ke kostumPerBabak`
    );
  }
});

test("alamat permintaan memuat seed shot-nya", () => {
  const s = papan.shot[0];
  const u = new URL(susunAlamat(s));
  assert.equal(u.searchParams.get("seed"), String(s.bijiGambar));
  assert.equal(u.searchParams.get("width"), "576");
  assert.equal(u.searchParams.get("height"), "1024");
});

test("prompt yang kepanjangan dipotong supaya alamat tidak ditolak", () => {
  const panjang = { ...papan.shot[0], promptVideo: "a".repeat(5000) };
  const u = new URL(susunAlamat(panjang));
  const prompt = decodeURIComponent(u.pathname.split("/prompt/")[1]);
  assert.ok(prompt.length <= 850, `prompt ${prompt.length} karakter, belum dipotong`);
});

test("huruf dan tanda baca di prompt di-encode, bukan dibiarkan merusak alamat", () => {
  const nakal = { ...papan.shot[0], promptVideo: "a woman & a man, 100% close-up / wide" };
  assert.doesNotThrow(() => new URL(susunAlamat(nakal)));
  const u = new URL(susunAlamat(nakal));
  assert.equal(
    decodeURIComponent(u.pathname.split("/prompt/")[1]),
    "a woman & a man, 100% close-up / wide"
  );
});
