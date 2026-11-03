// Episode Player — menghasilkan satu berkas HTML mandiri untuk menonton
// seluruh episode yang sudah dirender.
//
// Dibuat sebagai berkas lokal (bukan halaman yang butuh server) karena owner
// menonton dengan klik-dua-kali. Daftar episode DIPANGGANG ke dalam HTML saat
// berkas ini dibuat: halaman yang dibuka lewat `file://` tidak diizinkan
// membaca isi folder, jadi memindai folder dari dalam browser mustahil.

import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { AKAR } from "../konfigurasi.mjs";

/**
 * @typedef {{ nomor: number, berkasVideo: string, judul: string, durasiDetik: number|null, ukuranMb: number }} EntriEpisode
 */

/**
 * Pindai folder keluaran dan kumpulkan episode yang BENAR-BENAR ada berkasnya.
 * Episode yang baru punya naskah tapi belum dirender sengaja tidak masuk —
 * daftar yang memuat episode tanpa video akan terbaca seperti pemutar rusak.
 * @returns {EntriEpisode[]}
 */
export function pindaiEpisode() {
  const akarKeluaran = join(AKAR, "keluaran");
  if (!existsSync(akarKeluaran)) return [];

  const entri = [];
  for (const nama of readdirSync(akarKeluaran)) {
    const cocok = nama.match(/^episode-(\d+)$/);
    if (!cocok) continue;
    const nomor = Number(cocok[1]);
    // Dua nama mungkin ada: nama biasa, dan "-baru" yang dipakai saat render
    // tidak bisa menimpa berkas yang sedang dibuka pemutar (lihat
    // pindahkanHasil di render/episode.mjs). Yang dipakai adalah yang PALING
    // BARU — kalau tidak, pemutar diam-diam menayangkan versi lama dan owner
    // menyimpulkan render-nya gagal padahal berhasil.
    const namaVideo = videoTerbaru(join(akarKeluaran, nama), cocok[1]);
    if (!namaVideo) continue;
    const penuh = join(akarKeluaran, nama, namaVideo);

    let judul = `Episode ${nomor}`;
    let durasiDetik = null;
    const papan = join(akarKeluaran, nama, `storyboard-${cocok[1]}.json`);
    if (existsSync(papan)) {
      try {
        const p = JSON.parse(readFileSync(papan, "utf8"));
        judul = `${p.judulMandarin} · ${p.judulIndonesia}`;
        durasiDetik = p.totalDetik ?? null;
      } catch {
        // Storyboard rusak tidak boleh menghalangi menonton videonya.
      }
    }
    entri.push({
      nomor,
      berkasVideo: `${nama}/${namaVideo}`,
      judul,
      durasiDetik,
      ukuranMb: Math.round((statSync(penuh).size / 1048576) * 10) / 10,
    });
  }
  return entri.sort((a, b) => a.nomor - b.nomor);
}

/**
 * Pilih berkas video episode yang paling baru di satu folder episode.
 * @param {string} folder
 * @param {string} nomor  dua digit, mis. "01"
 * @returns {string|null} nama berkas, atau null kalau belum ada videonya
 */
function videoTerbaru(folder, nomor) {
  const calon = [`episode-${nomor}.mp4`, `episode-${nomor}-baru.mp4`]
    .filter((n) => existsSync(join(folder, n)))
    .map((n) => ({ n, waktu: statSync(join(folder, n)).mtimeMs }))
    .sort((a, b) => b.waktu - a.waktu);
  return calon.length ? calon[0].n : null;
}

/**
 * Tulis berkas pemutar. Mengembalikan path-nya.
 * @returns {string}
 */
export function tulisPemutar() {
  const daftar = pindaiEpisode();
  const berkas = join(AKAR, "keluaran", "pemutar.html");
  writeFileSync(berkas, halaman(daftar), "utf8");
  return berkas;
}

/**
 * @param {EntriEpisode[]} daftar
 * @returns {string}
 */
function halaman(daftar) {
  const data = JSON.stringify(daftar);
  const kosong = daftar.length === 0;

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pemutar Episode — Studio Drama AI</title>
<style>
  :root {
    --latar: #0a0d14; --panel: #121724; --garis: #1f2838;
    --teks: #e8ecf2; --redup: #8c9ab0; --aksen: #c8a96a;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--latar); color: var(--teks);
    font: 15px/1.6 "Segoe UI", system-ui, sans-serif;
    display: flex; flex-direction: column; align-items: center; padding: 28px 16px 60px;
  }
  h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: .3px; }
  .sub { color: var(--redup); font-size: 13px; margin-bottom: 24px; }
  .wadah { display: flex; gap: 28px; flex-wrap: wrap; justify-content: center; align-items: flex-start; }
  .layar { background: #000; border: 1px solid var(--garis); border-radius: 14px; overflow: hidden; }
  video { display: block; width: 360px; height: 640px; background: #000; }
  .daftar { width: 340px; }
  .judul-daftar { font-size: 12px; letter-spacing: 1.4px; color: var(--redup); margin-bottom: 10px; }
  .item {
    display: flex; gap: 12px; align-items: center; width: 100%; text-align: left;
    background: var(--panel); border: 1px solid var(--garis); color: var(--teks);
    border-radius: 10px; padding: 11px 13px; margin-bottom: 8px; cursor: pointer;
    font: inherit; transition: border-color .15s, background .15s;
  }
  .item:hover { border-color: #33415c; }
  .item[aria-current="true"] { border-color: var(--aksen); background: #171c2b; }
  .nomor {
    flex: 0 0 34px; height: 34px; border-radius: 8px; background: #1b2232;
    display: grid; place-items: center; font-weight: 700; color: var(--aksen); font-size: 13px;
  }
  .nama { flex: 1; min-width: 0; }
  .nama b { display: block; font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nama span { color: var(--redup); font-size: 12px; }
  .kosong { color: var(--redup); background: var(--panel); border: 1px dashed var(--garis); border-radius: 10px; padding: 18px; max-width: 520px; }
  code { background: #1b2232; padding: 2px 6px; border-radius: 5px; font-size: 13px; }
  .catatan { color: var(--redup); font-size: 12px; margin-top: 18px; max-width: 740px; text-align: center; }
</style>
</head>
<body>
  <h1>Studio Drama AI — Pemutar Episode</h1>
  <div class="sub">Subtitle Indonesia sudah dibakar ke dalam gambar, jadi selalu ikut terlihat.</div>

  ${
    kosong
      ? `<div class="kosong">Belum ada episode yang dirender.<br><br>
         Jalankan dulu: <code>node bin/studio.mjs render 1</code><br>
         lalu buat ulang halaman ini dengan <code>node bin/studio.mjs pemutar</code>.</div>`
      : `<div class="wadah">
    <div class="layar"><video id="pemutar" controls playsinline preload="metadata"></video></div>
    <div class="daftar">
      <div class="judul-daftar">DAFTAR EPISODE</div>
      <div id="daftar"></div>
    </div>
  </div>
  <div class="catatan">Episode berlanjut otomatis ke nomor berikutnya saat selesai.</div>`
  }

<script>
  const EPISODE = ${data};
  if (EPISODE.length) {
    const video = document.getElementById("pemutar");
    const daftar = document.getElementById("daftar");
    let aktif = -1;

    function format(d) {
      if (d == null) return "";
      const m = Math.floor(d / 60), s = Math.round(d % 60);
      return m + "m " + String(s).padStart(2, "0") + "s";
    }

    function putar(i, langsungMain) {
      aktif = i;
      const ep = EPISODE[i];
      video.src = ep.berkasVideo;
      if (langsungMain) video.play().catch(() => {});
      [...daftar.children].forEach((el, j) =>
        el.setAttribute("aria-current", j === i ? "true" : "false")
      );
    }

    EPISODE.forEach((ep, i) => {
      const b = document.createElement("button");
      b.className = "item";
      b.innerHTML =
        '<span class="nomor">' + String(ep.nomor).padStart(2, "0") + '</span>' +
        '<span class="nama"><b></b><span></span></span>';
      b.querySelector("b").textContent = ep.judul;
      b.querySelector(".nama span").textContent =
        [format(ep.durasiDetik), ep.ukuranMb + " MB"].filter(Boolean).join(" · ");
      b.addEventListener("click", () => putar(i, true));
      daftar.appendChild(b);
    });

    // Lanjut otomatis ke episode berikutnya — pola menonton drama pendek.
    video.addEventListener("ended", () => {
      if (aktif + 1 < EPISODE.length) putar(aktif + 1, true);
    });

    putar(0, false);
  }
</script>
</body>
</html>
`;
}
