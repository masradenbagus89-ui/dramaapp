// Video Editor + Export MP4: menyambung klip tiap shot jadi satu episode,
// membakar subtitle dua bahasa, lalu MEMBUKTIKAN hasilnya.
//
// Langkah pembuktian di akhir bukan hiasan. Render bisa "berhasil" (ffmpeg
// keluar 0) sambil menghasilkan berkas yang durasinya meleset, kehilangan
// audio, atau rasionya bukan 9:16 — dan tak satu pun dari itu memunculkan
// error. Satu-satunya cara tahu adalah membaca ulang berkas jadinya.

import { mkdirSync, writeFileSync, rmSync, statSync, existsSync, openSync, closeSync, renameSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { jalankanFfmpeg, pathUntukFilter, bacaInfoVideo } from "../ffmpeg.mjs";
import { buatAss, buatSrt } from "../naskah/subtitle.mjs";
import { renderShotLokal, LEBAR, TINGGI, FPS } from "../penyedia/visual-lokal.mjs";
import { ambilGambarShot } from "../penyedia/gambar-gratis.mjs";
import { ambilUcapanShot } from "../penyedia/suara-gratis.mjs";

/** Selisih durasi yang masih dianggap wajar (detik). Sambungan MP4 membulatkan ke frame. */
const TOLERANSI_DURASI_DETIK = 1.0;

/** Folder font untuk libass; tanpa ini subtitle Mandarin jadi kotak. */
const FOLDER_FONT = "C:/Windows/Fonts";

/**
 * @typedef {object} HasilRender
 * @property {string} berkasVideo
 * @property {string} berkasSrt
 * @property {string} berkasAss
 * @property {string} berkasStoryboard
 * @property {number} jumlahShot
 * @property {number} jumlahFoto
 * @property {number} fotoGagal
 * @property {number} jumlahUcapan
 * @property {number} ucapanGagal
 * @property {number} durasiDiharapkanDetik
 * @property {number} durasiNyataDetik
 * @property {number} lebar
 * @property {number} tinggi
 * @property {boolean} adaAudio
 * @property {number} ukuranByte
 */

/**
 * Render satu episode penuh dari storyboard.
 *
 * @param {object} p
 * @param {import("../naskah/storyboard.mjs").Storyboard} p.papan
 * @param {string} p.folderKeluaran
 * @param {(pesan: string) => void} [p.lapor]  penerima kabar kemajuan
 * @param {boolean} [p.simpanBerkasKerja]      biarkan klip per-shot (untuk periksa manual)
 * @param {boolean} [p.pakaiGambar]            ambil foto adegan dari layanan gambar gratis
 * @param {boolean} [p.pakaiSuara]             ucapkan dialog Mandarin lewat layanan suara gratis
 * @returns {Promise<HasilRender>}
 */
export async function renderEpisode({
  papan,
  folderKeluaran,
  lapor = () => {},
  simpanBerkasKerja = false,
  pakaiGambar = false,
  pakaiSuara = false,
}) {
  const folderKerja = join(folderKeluaran, "kerja");
  // Folder gambar SENGAJA di luar folder kerja: folder kerja dihapus tiap
  // selesai render, sedangkan gambar harus bertahan supaya render ulang tidak
  // mengunduh 18 berkas lagi (belasan menit, dan membebani layanan gratis).
  const folderGambar = join(folderKeluaran, "gambar");
  const folderSuara = join(folderKeluaran, "suara");
  mkdirSync(folderKerja, { recursive: true });

  const nomor = String(papan.episode).padStart(2, "0");
  const berkasVideo = join(folderKeluaran, `episode-${nomor}.mp4`);
  const berkasAss = join(folderKeluaran, `episode-${nomor}.ass`);
  const berkasSrt = join(folderKeluaran, `episode-${nomor}.srt`);
  const berkasStoryboard = join(folderKeluaran, `storyboard-${nomor}.json`);

  // --- 1. Subtitle & storyboard ditulis DULU --------------------------------
  // Urutan ini disengaja: kalau render video gagal di tengah, owner tetap
  // memegang naskah, timing, dan subtitle yang bisa diperiksa.
  writeFileSync(berkasAss, buatAss(papan), "utf8");
  writeFileSync(berkasSrt, buatSrt(papan), "utf8");
  writeFileSync(berkasStoryboard, JSON.stringify(papan, null, 2), "utf8");
  lapor(`Subtitle & storyboard ditulis (${papan.shot.filter((s) => s.dialog).length} baris dialog).`);

  // Peringatan DINI, bukan penghalang: owner berhak tahu di detik pertama,
  // bukan sesudah menunggu render selesai.
  if (sedangTerkunci(berkasVideo)) {
    lapor(
      `⚠ ${berkasVideo} sedang dibuka aplikasi lain — hasilnya nanti disimpan ` +
        `dengan akhiran "-baru". Tutup pemutarnya kalau mau nama aslinya dipakai.`
    );
  }

  // --- 2. Ambil foto adegan (opsional) -------------------------------------
  /** @type {Map<string, string>} shotId -> berkas gambar */
  const gambar = new Map();
  let gambarGagal = 0;
  if (pakaiGambar) {
    lapor(`Mengambil ${papan.shot.length} foto adegan dari layanan gambar gratis...`);
    for (const shot of papan.shot) {
      const h = await ambilGambarShot({ shot, folderGambar, lapor });
      if (h.berkas) {
        gambar.set(shot.id, h.berkas);
        lapor(`  ${shot.id}: foto ${h.sumber === "cache" ? "dari simpanan" : `diunduh (percobaan ${h.percobaan})`}`);
      } else {
        gambarGagal++;
        lapor(`  ${shot.id}: ⚠ foto GAGAL diambil — shot ini memakai kartu gradasi`);
      }
    }
    lapor(`Foto siap: ${gambar.size}/${papan.shot.length}${gambarGagal ? ` (${gambarGagal} gagal)` : ""}`);
  }

  // --- 3. Ucapkan dialog (opsional) ----------------------------------------
  /** @type {Map<string, string>} shotId -> berkas suara */
  const ucapan = new Map();
  let ucapanGagal = 0;
  if (pakaiSuara) {
    const berdialog = papan.shot.filter((s) => s.dialog);
    lapor(`Membuat suara untuk ${berdialog.length} baris dialog Mandarin...`);
    for (const shot of berdialog) {
      const h = await ambilUcapanShot({ shot, folderSuara, lapor });
      if (h.berkas) {
        ucapan.set(shot.id, h.berkas);
        lapor(`  ${shot.id}: "${shot.dialog.mandarin}" ${h.sumber === "cache" ? "(dari simpanan)" : "diucapkan"}`);
      } else {
        ucapanGagal++;
      }
    }
    lapor(`Suara siap: ${ucapan.size}/${berdialog.length}${ucapanGagal ? ` (${ucapanGagal} gagal)` : ""}`);
  }

  // --- 4. Render tiap shot --------------------------------------------------
  const klip = [];
  for (const shot of papan.shot) {
    const keluar = join(folderKerja, `${shot.id}.mp4`);
    await renderShotLokal({
      shot, papan, folderKerja,
      berkasKeluar: keluar,
      berkasGambar: gambar.get(shot.id) ?? null,
      berkasUcapan: ucapan.get(shot.id) ?? null,
    });
    klip.push(keluar);
    lapor(`  shot ${shot.urutan}/${papan.shot.length} (${shot.id}, ${shot.durasiDetik}s) selesai`);
  }

  // --- 5. Sambung + bakar subtitle dalam SATU kali encode -------------------
  // Daftar sambungan memakai garis miring maju: concat demuxer memperlakukan
  // backslash sebagai escape, sehingga path Windows apa adanya akan rusak.
  const berkasDaftar = join(folderKerja, "daftar-sambung.txt");
  writeFileSync(
    berkasDaftar,
    klip.map((k) => `file '${k.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n") + "\n",
    "utf8"
  );

  const filterSubtitle =
    `subtitles='${pathUntukFilter(berkasAss)}':fontsdir='${pathUntukFilter(FOLDER_FONT)}'`;

  // Ditulis ke berkas SEMENTARA dulu, baru dipindah ke tempat akhir.
  // Alasannya nyata, bukan teori: saat owner sedang menonton episode versi
  // sebelumnya, Windows mengunci berkasnya dan ffmpeg gagal "Permission denied"
  // SETELAH menghabiskan ~100 detik kerja. Dengan cara ini hasilnya selamat
  // lebih dulu, dan masalah kunci cuma memengaruhi langkah pindah di akhir.
  const berkasSementara = join(folderKerja, `episode-${nomor}.belum-pindah.mp4`);

  lapor("Menyambung semua shot dan membakar subtitle...");
  await jalankanFfmpeg(
    [
      "-y", "-hide_banner", "-loglevel", "error",
      "-f", "concat", "-safe", "0", "-i", berkasDaftar,
      "-vf", `${filterSubtitle},format=yuv420p`,
      "-r", String(FPS),
      "-c:v", "libx264", "-preset", "medium", "-crf", "22",
      "-profile:v", "high", "-level", "4.0",
      "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
      "-movflags", "+faststart",
      berkasSementara,
    ],
    { label: `episode ${nomor}` }
  );

  // --- 6. BUKTIKAN: baca ulang berkas jadinya ------------------------------
  const info = await bacaInfoVideo(berkasSementara);
  const ukuranByte = statSync(berkasSementara).size;
  periksaHasil({ info, ukuranByte, diharapkan: papan.totalDetik, berkas: berkasSementara });

  // --- 7. Pindahkan ke tempat akhir ---------------------------------------
  const tujuan = pindahkanHasil({ dari: berkasSementara, ke: berkasVideo, lapor });

  if (!simpanBerkasKerja) rmSync(folderKerja, { recursive: true, force: true });

  return {
    berkasVideo: tujuan,
    berkasSrt,
    berkasAss,
    berkasStoryboard,
    jumlahShot: papan.shot.length,
    jumlahFoto: gambar.size,
    fotoGagal: gambarGagal,
    jumlahUcapan: ucapan.size,
    ucapanGagal,
    durasiDiharapkanDetik: papan.totalDetik,
    durasiNyataDetik: info.durasiDetik,
    lebar: info.lebar,
    tinggi: info.tinggi,
    adaAudio: info.adaAudio,
    ukuranByte,
  };
}

/**
 * Apakah berkas ini sedang dikunci aplikasi lain?
 *
 * Di Windows, berkas video yang sedang dibuka pemutar TIDAK bisa ditimpa.
 * Tidak ada yang salah dengan hal itu — yang salah kalau kita baru tahu
 * sesudah membuang 100 detik merender.
 *
 * @param {string} berkas
 * @returns {boolean}
 */
export function sedangTerkunci(berkas) {
  if (!existsSync(berkas)) return false;
  try {
    closeSync(openSync(berkas, "r+")); // "r+" butuh izin tulis, "r" tidak
    return false;
  } catch {
    return true;
  }
}

/**
 * Pindahkan hasil render ke tempat akhirnya.
 *
 * Kalau tempat akhirnya sedang dikunci (owner menonton versi sebelumnya),
 * hasilnya TIDAK dibuang: disimpan dengan akhiran `-baru` dan owner diberi
 * tahu apa yang terjadi serta apa yang harus dilakukan. Membuang hasil yang
 * sudah jadi hanya karena nama berkasnya terpakai jelas salah tukar.
 *
 * @param {{ dari: string, ke: string, lapor: (p: string) => void }} p
 * @returns {string} path berkas yang benar-benar dipakai
 */
export function pindahkanHasil({ dari, ke, lapor }) {
  if (!sedangTerkunci(ke)) {
    // renameSync gagal lintas-volume; salin-lalu-hapus aman di semua kasus.
    try {
      renameSync(dari, ke);
    } catch {
      copyFileSync(dari, ke);
    }
    return ke;
  }

  const cadangan = ke.replace(/\.mp4$/, "-baru.mp4");
  copyFileSync(dari, cadangan);
  lapor(
    `\n⚠ ${ke}\n` +
      `  sedang DIBUKA aplikasi lain (kemungkinan pemutar video Anda), jadi tidak bisa ditimpa.\n` +
      `  Hasil render TIDAK hilang — disimpan sebagai:\n` +
      `  ${cadangan}\n` +
      `  Tutup pemutarnya lalu render lagi kalau mau memakai nama aslinya.`
  );
  return cadangan;
}

/**
 * Tolak hasil render yang tidak memenuhi syarat episode drama pendek.
 * Dipisah jadi fungsi sendiri supaya bisa diuji tanpa merender apa pun.
 *
 * @param {{ info: import("../ffmpeg.mjs").InfoVideo, ukuranByte: number, diharapkan: number, berkas: string }} p
 */
export function periksaHasil({ info, ukuranByte, diharapkan, berkas }) {
  const salah = [];
  if (ukuranByte <= 0) salah.push("berkasnya kosong (0 byte)");
  if (info.lebar !== LEBAR || info.tinggi !== TINGGI) {
    salah.push(`resolusi ${info.lebar}x${info.tinggi}, seharusnya ${LEBAR}x${TINGGI} (9:16)`);
  }
  if (!info.adaAudio) salah.push("tidak ada jalur audio sama sekali");
  const selisih = Math.abs(info.durasiDetik - diharapkan);
  if (selisih > TOLERANSI_DURASI_DETIK) {
    salah.push(
      `durasi ${info.durasiDetik}s meleset ${selisih.toFixed(2)}s dari rencana ${diharapkan}s`
    );
  }
  if (salah.length > 0) {
    throw new Error(`Hasil render ditolak (${berkas}):\n - ${salah.join("\n - ")}`);
  }
}
