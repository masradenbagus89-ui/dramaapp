#!/usr/bin/env node
// CLI studio — satu perintah per tahap workflow.
//
// Urutan yang dirancang: naskah -> storyboard -> biaya -> render -> pemutar.
// Tiap tahap bisa dijalankan sendiri supaya owner bisa berhenti dan memeriksa
// di mana pun, bukan dipaksa menjalankan satu tombol besar yang hasilnya baru
// kelihatan di akhir.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { muatBibel } from "../lib/naskah/bibel-karakter.mjs";
import { muatNaskah, totalDurasi } from "../lib/naskah/naskah-episode.mjs";
import { susunStoryboard } from "../lib/naskah/storyboard.mjs";
import { estimasiBiaya, gerbangBiaya } from "../lib/biaya.mjs";
import { muatKonfigurasi, pilihMesin, folderKeluaran } from "../lib/konfigurasi.mjs";
import { renderEpisode } from "../lib/render/episode.mjs";
import { tulisPemutar } from "../lib/render/pemutar.mjs";

const BANTUAN = `
drama-ai-studio — produksi serial drama pendek China (vertikal 9:16)

  node bin/studio.mjs naskah <ep>        periksa naskah & tampilkan ringkasannya
  node bin/studio.mjs storyboard <ep>    susun storyboard + simpan JSON-nya
  node bin/studio.mjs biaya <ep>         perkiraan biaya (lokal vs berbayar)
  node bin/studio.mjs render <ep>        render episode jadi MP4
  node bin/studio.mjs pemutar            buat halaman pemutar untuk semua episode

Pilihan untuk "render":
  --gambar             GRATIS: ambil foto AI tiap adegan (butuh internet,
                       ±5-10 menit sekali ambil, sesudah itu dipakai ulang)
  --suara              GRATIS: ucapkan dialog Mandarin (butuh internet;
                       satu suara untuk semua tokoh, dibedakan geseran nada)
  --mesin lokal        (bawaan) kartu gradasi, nol panggilan internet
  --mesin berbayar     pakai mesin video & suara AI — BUTUH kunci API + izin
  --setujui-biaya      persetujuan sekali-pakai untuk render berbayar
  --simpan-kerja       jangan hapus klip per-shot (untuk diperiksa manual)
`;

main().catch((e) => {
  // Pesan galat ditulis untuk dibaca manusia, bukan ditumpahkan sebagai stack.
  console.error(`\n✖ ${e.message}\n`);
  process.exit(1);
});

async function main() {
  const argv = process.argv.slice(2);
  const perintah = argv[0];
  const bendera = new Set(argv.filter((a) => a.startsWith("--")));
  const nilaiBendera = (nama, bawaan) => {
    const i = argv.indexOf(`--${nama}`);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : bawaan;
  };
  const nomorEpisode = Number(argv[1]);

  if (!perintah || bendera.has("--help")) return console.log(BANTUAN);

  if (perintah === "pemutar") return await perintahPemutar();

  if (!Number.isInteger(nomorEpisode) || nomorEpisode < 1) {
    throw new Error(`Nomor episode tidak sah. Contoh: node bin/studio.mjs ${perintah} 1`);
  }

  const bibel = muatBibel();
  const naskah = muatNaskah(nomorEpisode, bibel);
  const papan = susunStoryboard(naskah, bibel);

  switch (perintah) {
    case "naskah":
      return perintahNaskah(naskah, papan);
    case "storyboard":
      return perintahStoryboard(papan, nomorEpisode);
    case "biaya":
      return perintahBiaya(papan);
    case "render":
      return await perintahRender(papan, nomorEpisode, {
        mode: nilaiBendera("mesin", "lokal"),
        disetujui: bendera.has("--setujui-biaya"),
        simpanKerja: bendera.has("--simpan-kerja"),
        pakaiGambar: bendera.has("--gambar"),
        pakaiSuara: bendera.has("--suara"),
      });
    default:
      throw new Error(`Perintah "${perintah}" tidak dikenal.\n${BANTUAN}`);
  }
}

function perintahNaskah(naskah, papan) {
  console.log(`\nEpisode ${naskah.episode} — ${naskah.judulMandarin} (${naskah.judulIndonesia})`);
  console.log(`Serial  : ${papan.serialMandarin} / ${papan.serialIndonesia}`);
  console.log(`Durasi  : ${totalDurasi(naskah)} detik · ${naskah.shot.length} shot`);
  console.log(`Dialog  : ${naskah.shot.filter((s) => s.dialog).length} baris\n`);
  console.log(`Sinopsis: ${naskah.sinopsis}\n`);
  for (const s of papan.shot) {
    const waktu = `${pad(s.mulaiDetik)}-${pad(s.selesaiDetik)}`;
    const tokoh = s.karakterNama.length ? ` [${s.karakterNama.join(", ")}]` : "";
    console.log(`  ${s.id} ${waktu}  ${s.lokasiNama}${tokoh}`);
    if (s.dialog) console.log(`        ${s.dialog.mandarin}  →  ${s.dialog.indonesia}`);
  }
  console.log("\n✔ Naskah lolos pemeriksaan terhadap Character Bible.\n");
}

function perintahStoryboard(papan, nomorEpisode) {
  const folder = folderKeluaran(nomorEpisode);
  mkdirSync(folder, { recursive: true });
  const berkas = join(folder, `storyboard-${String(nomorEpisode).padStart(2, "0")}.json`);
  writeFileSync(berkas, JSON.stringify(papan, null, 2), "utf8");
  console.log(`\n✔ Storyboard ${papan.shot.length} shot disimpan: ${berkas}`);
  console.log(`\nContoh prompt video (shot ${papan.shot[0].id}):\n${papan.shot[0].promptVideo}\n`);
}

function perintahBiaya(papan) {
  const cfg = muatKonfigurasi();
  console.log(`\nPerkiraan biaya — Episode ${papan.episode} (${papan.totalDetik} detik)\n`);
  for (const mode of ["lokal", "berbayar"]) {
    const { mesin, kunciHilang } = pilihMesin(cfg, mode);
    const { rincian, totalUsd } = estimasiBiaya(papan, mesin);
    console.log(`  ── mesin "${mode}" ──`);
    for (const r of rincian) {
      console.log(`     ${r.tahap.padEnd(18)} ${r.hitungan.padEnd(34)} USD ${r.usd.toFixed(2)}`);
    }
    console.log(`     ${"TOTAL".padEnd(18)} ${"".padEnd(34)} USD ${totalUsd.toFixed(2)}`);
    if (kunciHilang.length) console.log(`     ⚠ kunci belum ada: ${kunciHilang.join(", ")}`);
    console.log("");
  }
  console.log(`  Batas belanja Anda (STUDIO_BATAS_BIAYA_USD): USD ${cfg.batasBiayaUsd.toFixed(2)}`);
  console.log(
    `\n  ⚠ Tarif di atas PERKIRAAN dan belum diverifikasi ke halaman harga penyedia.\n` +
      `    Samakan dulu angkanya di lib/biaya.mjs sebelum dipakai mengambil keputusan belanja.\n`
  );
}

async function perintahRender(papan, nomorEpisode, { mode, disetujui, simpanKerja, pakaiGambar, pakaiSuara }) {
  if (mode !== "lokal" && mode !== "berbayar") {
    throw new Error(`--mesin hanya menerima "lokal" atau "berbayar", bukan "${mode}".`);
  }

  const cfg = muatKonfigurasi();
  const { mesin, kunciHilang } = pilihMesin(cfg, mode);
  const { totalUsd } = estimasiBiaya(papan, mesin);

  // Gerbang biaya dilewati SEBELUM satu byte pun dikirim keluar.
  gerbangBiaya({ totalUsd, batasUsd: cfg.batasBiayaUsd, disetujui, kunciHilang });

  if (mode === "berbayar") {
    // Mesin berbayar sengaja belum disambungkan: bentuk permintaan ke penyedia
    // belum pernah diuji terhadap API sungguhan di project ini, dan menebaknya
    // berarti membelanjakan uang owner untuk permintaan yang mungkin salah.
    throw new Error(
      "Mesin berbayar belum tersambung di versi ini.\n" +
        "Yang sudah siap: gerbang biaya, prompt per-shot, dan tempat colokan penyedia\n" +
        "(lib/penyedia/). Yang belum: pemanggilan API sungguhan — belum bisa diuji\n" +
        "karena belum ada kunci API. Pakai `--mesin lokal` untuk melihat episode utuh."
    );
  }

  const folder = folderKeluaran(nomorEpisode);
  mkdirSync(folder, { recursive: true });
  const lapisan = pakaiGambar ? "foto AI gratis + gerak kamera" : "kartu gradasi (animatic)";
  const suara = pakaiSuara ? "dialog Mandarin diucapkan" : "musik latar saja";
  console.log(`\nMerender Episode ${nomorEpisode} — mesin "${mode}", lapisan gambar: ${lapisan}`);
  console.log(`Suara: ${suara} · Biaya USD ${totalUsd.toFixed(2)}\n`);

  const mulai = Date.now();
  const hasil = await renderEpisode({
    papan,
    folderKeluaran: folder,
    lapor: (p) => console.log(p),
    simpanBerkasKerja: simpanKerja,
    pakaiGambar,
    pakaiSuara,
  });
  const lama = ((Date.now() - mulai) / 1000).toFixed(1);

  console.log(`\n✔ TERBUKTI DIRENDER — bukti dibaca ulang dari berkas jadinya:`);
  console.log(`    berkas    : ${hasil.berkasVideo}`);
  console.log(`    ukuran    : ${(hasil.ukuranByte / 1048576).toFixed(1)} MB`);
  console.log(`    durasi    : ${hasil.durasiNyataDetik}s (rencana ${hasil.durasiDiharapkanDetik}s)`);
  console.log(`    resolusi  : ${hasil.lebar}x${hasil.tinggi} (9:16)`);
  console.log(`    audio     : ${hasil.adaAudio ? "ada" : "TIDAK ADA"}`);
  console.log(`    shot      : ${hasil.jumlahShot}`);
  if (pakaiSuara) {
    console.log(
      `    dialog    : ${hasil.jumlahUcapan} baris diucapkan` +
        (hasil.ucapanGagal ? ` — ${hasil.ucapanGagal} gagal` : "")
    );
  }
  if (pakaiGambar) {
    console.log(
      `    foto AI   : ${hasil.jumlahFoto}/${hasil.jumlahShot} berhasil` +
        (hasil.fotoGagal ? ` — ${hasil.fotoGagal} jatuh ke kartu gradasi` : "")
    );
  }
  console.log(`    subtitle  : ${hasil.berkasSrt}`);
  console.log(`    lama kerja: ${lama} detik\n`);
}

async function perintahPemutar() {
  const berkas = tulisPemutar();
  console.log(`\n✔ Pemutar episode dibuat: ${berkas}`);
  console.log(`   Buka berkas itu dengan klik-dua-kali untuk menonton.\n`);
}

function pad(detik) {
  const m = Math.floor(detik / 60);
  const d = Math.floor(detik % 60);
  return `${String(m).padStart(2, "0")}:${String(d).padStart(2, "0")}`;
}
