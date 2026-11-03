// Mesin visual LOKAL — merender tiap shot jadi klip MP4 tanpa satu pun
// panggilan internet dan tanpa biaya.
//
// APA YANG DIHASILKAN: "animatic" — video pratinjau bergerak. Gambarnya bukan
// adegan fotorealistis, melainkan kartu sinematik yang warnanya, gerak
// kameranya, dan panjangnya mengikuti naskah persis. Yang dibuktikan animatic
// ini adalah SELURUH pipeline: timing, subtitle dua bahasa, penyambungan
// adegan, audio, dan ekspor MP4 9:16.
//
// KENAPA INI ADA, bukan langsung memakai mesin berbayar: owner bisa menonton
// episode utuh dan menilai cerita, ritme, serta terjemahan SEBELUM memutuskan
// membelanjakan uang. Mengganti mesin visual tidak mengubah berkas lain mana
// pun — lapisan gambarnya saja yang ditukar.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { jalankanFfmpeg, pathUntukFilter } from "../ffmpeg.mjs";
import { cariMood } from "./palet.mjs";

export const LEBAR = 1080;
export const TINGGI = 1920;
export const FPS = 24;

/** Kanvas digambar lebih besar dari bingkai akhir supaya gerak kamera punya ruang. */
const LEBAR_KANVAS = 1350;
const TINGGI_KANVAS = 2400;

/** Lama fade di awal & akhir tiap klip (detik). */
const FADE_DETIK = 0.4;

/**
 * Penguat bed audio.
 *
 * Angka ini DIUKUR, bukan dikira-kira, dan sudah dinaikkan dua kali:
 *   penguat 1    -> puncak -34,8 dB  (owner: "tidak ada suaranya")
 *   penguat 3,5  -> puncak -21,2 dB  (masih dilaporkan tak terdengar)
 *   penguat 14   -> sasaran sekitar -10 dB
 * Tidak ada suara orang di atas bed ini, jadi ia boleh keras. `amix` membagi
 * tiap masukan dengan jumlahnya, jadi pembagian itu dimatikan (`normalize=0`).
 * Cek ulang dengan:
 *   ffmpeg -i episode-01.mp4 -af volumedetect -f null -
 *   ffmpeg -i episode-01.mp4 -af "highpass=f=200,volumedetect" -f null -
 * Yang KEDUA lebih penting: speaker laptop/HP tak membunyikan di bawah 200 Hz.
 */
const PENGUAT_BED = 14;

/**
 * Seberapa pelan musik latar saat ada yang BICARA.
 * Bed setebal di atas akan menelan dialog kalau dibiarkan penuh; 0,28 membuat
 * musiknya tetap terasa tapi kalimatnya menang.
 */
const BED_SAAT_BICARA = 0.28;

/** Penguat suara dialog terhadap bed. Dialog harus jelas menang. */
const PENGUAT_UCAPAN = 2.2;

/** Jeda sebelum tokoh mulai bicara, supaya tidak menempel pada potongan shot. */
const JEDA_BICARA_DETIK = 0.45;

/** Font sistem Windows. CJK wajib msyh.ttc — tanpa itu teks Mandarin jadi kotak. */
export const FONT_CJK = "C:/Windows/Fonts/msyh.ttc";
export const FONT_LATIN = "C:/Windows/Fonts/arialbd.ttf";

/**
 * Render satu shot jadi satu klip MP4 (video + audio dalam SATU panggilan
 * ffmpeg, supaya keduanya mustahil beda panjang).
 *
 * @param {object} p
 * @param {import("../naskah/storyboard.mjs").ShotPapan} p.shot
 * @param {import("../naskah/storyboard.mjs").Storyboard} p.papan
 * @param {string} p.folderKerja  tempat berkas teks sementara ditulis
 * @param {string} p.berkasKeluar path MP4 hasil
 * @param {string|null} [p.berkasGambar] foto adegan; null = pakai kartu gradasi
 * @param {string|null} [p.berkasUcapan] suara dialog; null = hanya musik latar
 * @returns {Promise<string>} path MP4 hasil
 */
export async function renderShotLokal({
  shot,
  papan,
  folderKerja,
  berkasKeluar,
  berkasGambar = null,
  berkasUcapan = null,
}) {
  mkdirSync(folderKerja, { recursive: true });
  const mood = cariMood(shot.mood);
  const durasi = shot.durasiDetik;
  const totalFrame = Math.max(1, Math.round(durasi * FPS));
  const mulaiFadeKeluar = Math.max(0, durasi - FADE_DETIK);

  // --- Sumber gambar & suara --------------------------------------------
  // Dua kemungkinan lapisan dasar; SISA rantainya (gerak kamera, grain,
  // vignette, plakat, fade, audio) sengaja dipakai bersama supaya kedua mode
  // menghasilkan tampilan dan panjang yang sama persis.
  const sumberGambar = berkasGambar
    ? ["-loop", "1", "-framerate", String(FPS), "-t", String(durasi), "-i", berkasGambar]
    : [
        "-f", "lavfi", "-i",
          `gradients=s=${LEBAR_KANVAS}x${TINGGI_KANVAS}:r=${FPS}:d=${durasi}` +
          `:type=${mood.gradasi}:nb_colors=3` +
          `:c0=${mood.warna[0]}:c1=${mood.warna[1]}:c2=${mood.warna[2]}` +
          `:x0=${Math.round(LEBAR_KANVAS / 2)}:y0=${Math.round(TINGGI_KANVAS * 0.34)}` +
          `:speed=0.005:seed=${bijiDariId(shot.id)}`,
      ];

  const sumber = [
    ...sumberGambar,
    // TIGA nada membentuk akor. Sebelumnya dua nada sub-bass (65-196 Hz) dan
    // hasilnya terukur hening di speaker laptop/HP — lihat catatan di palet.mjs.
    ...mood.nadaHz.flatMap((hz) => [
      "-f", "lavfi", "-i", `sine=f=${hz}:d=${durasi}:sample_rate=48000`,
    ]),
    ...(berkasUcapan ? ["-i", berkasUcapan] : []),
  ];

  // Foto dari layanan gratis hanya 576x1024, jadi diperbesar ~2,3x ke kanvas.
  // `lanczos` dipilih karena paling tahan terhadap pembesaran, lalu `unsharp`
  // ringan mengembalikan sebagian ketajaman yang hilang. Tanpa keduanya
  // gambarnya terlihat berkabut setelah gerak kamera menambah pembesaran lagi.
  const siapkanDasar = berkasGambar
    ? `scale=${LEBAR_KANVAS}:${TINGGI_KANVAS}:flags=lanczos,unsharp=5:5:0.7:5:5:0.0,setsar=1,`
    : "";

  // --- Rantai gambar ------------------------------------------------------
  // zoompan dengan d=1 memproses tiap frame masuk sekali; `on` adalah nomor
  // frame keluar, jadi zoom bergerak mulus sepanjang shot.
  //
  // Zoom dimulai dari 1,05 (bukan 1,0) dengan sengaja: pembesaran awal itu
  // menyisakan ruang di tepi, dan ruang itulah yang dipakai GESER kamera di
  // bawah. Tanpa ruang tersebut geseran akan menarik tepi kosong ke dalam
  // bingkai dan muncul garis hitam.
  const ZOOM_AWAL = 1.05;
  const GESER_PIKSEL = 40;
  // Arah geser bergantian antar shot supaya potongan berurutan tidak terasa
  // seragam; diturunkan dari id shot agar hasilnya selalu bisa diulang.
  const arah = bijiDariId(shot.id) % 2 === 0 ? 1 : -1;

  const gerakKamera =
    `zoompan=z='min(${(ZOOM_AWAL + mood.zoom).toFixed(3)},${ZOOM_AWAL}+${mood.zoom.toFixed(3)}*on/${totalFrame})'` +
    `:x='iw/2-(iw/zoom/2)+${arah}*${GESER_PIKSEL}*(on/${totalFrame}-0.5)'` +
    `:y='ih/2-(ih/zoom/2)*0.88':d=1:s=${LEBAR}x${TINGGI}:fps=${FPS}`;

  const rantaiGambar = [
    `[0:v]${siapkanDasar}${gerakKamera}`,
    "noise=alls=5:allf=t",          // grain halus; angka besar membengkakkan ukuran berkas
    "vignette=PI/4.2",
    "eq=contrast=1.10:saturation=0.95",
    ...plakatTeks(shot, papan, folderKerja, Boolean(berkasGambar)),
    `fade=t=in:st=0:d=${FADE_DETIK}`,
    `fade=t=out:st=${mulaiFadeKeluar.toFixed(3)}:d=${FADE_DETIK}`,
    "format=yuv420p[v]",
  ].join(",");

  // --- Rantai suara -------------------------------------------------------
  // Dua nada dasar + gema pendek = bed ambient. Lowpass membuang kesan
  // "nada uji" yang melekat pada sinus murni.
  // lowpass 2400 Hz, BUKAN 340: pada 340 Hz nada akor 440-588 Hz justru ikut
  // ditekan sampai nyaris hilang — penyebab kedua kenapa bed-nya tak terdengar.
  // tremolo memberi denyut pelan supaya nada tahan panjang tidak terasa mati.
  const masukanSuara = mood.nadaHz.map((_, i) => `[${i + 1}:a]`).join("");
  const volumeBed = mood.volume * PENGUAT_BED * (berkasUcapan ? BED_SAAT_BICARA : 1);
  const bed =
    `${masukanSuara}amix=inputs=${mood.nadaHz.length}:duration=longest:normalize=0,` +
    `lowpass=f=2400,tremolo=f=0.22:d=0.18,aecho=0.8:0.85:140:0.3,` +
    `volume=${volumeBed.toFixed(3)}[bed]`;

  // Jaring pengaman di ujung: penguat sebesar itu bisa melewati batas digital
  // pada mood paling keras, dan suara yang melewati batas terdengar PECAH,
  // bukan keras. alimiter menahannya tanpa perlu menurunkan mood lain.
  const penutup =
    `alimiter=limit=0.89,` +
    `afade=t=in:st=0:d=0.6,afade=t=out:st=${Math.max(0, durasi - 0.6).toFixed(3)}:d=0.6,` +
    `aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a]`;

  let rantaiSuara;
  if (!berkasUcapan) {
    rantaiSuara = `${bed.replace("[bed]", "")},${penutup}`;
  } else {
    const iUcapan = mood.nadaHz.length + 1;
    const ucapan =
      `[${iUcapan}:a]${geserNadaFilter(shot.geserNadaDialog ?? 0)}` +
      `aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,` +
      `volume=${PENGUAT_UCAPAN},` +
      `adelay=${Math.round(JEDA_BICARA_DETIK * 1000)}|${Math.round(JEDA_BICARA_DETIK * 1000)}[sp]`;
    // duration=first: panjang campuran mengikuti bed (= panjang shot), jadi
    // dialog yang kepanjangan terpotong rapi alih-alih memperpanjang adegan.
    rantaiSuara =
      `${bed};${ucapan};[bed][sp]amix=inputs=2:duration=first:normalize=0,${penutup}`;
  }

  await jalankanFfmpeg(
    [
      "-y", "-hide_banner", "-loglevel", "error",
      ...sumber,
      "-filter_complex", `${rantaiGambar};${rantaiSuara}`,
      "-map", "[v]", "-map", "[a]",
      "-t", String(durasi),
      "-c:v", "libx264", "-preset", "medium", "-crf", "23",
      "-profile:v", "high", "-level", "4.0",
      "-r", String(FPS),
      "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
      "-movflags", "+faststart",
      berkasKeluar,
    ],
    { label: `shot ${shot.id}` }
  );

  return berkasKeluar;
}

/**
 * Susun plakat teks di atas gambar: lokasi, nomor shot, jenis kamera, tokoh,
 * dan penanda jujur "PRATINJAU · ANIMATIK".
 *
 * Teks ditulis ke berkas lalu dibaca `textfile=`, BUKAN ditempel langsung ke
 * string filter. Alasannya konkret: nama lokasi memuat spasi dan huruf
 * Mandarin, dan parser filter ffmpeg memakai koma serta titik-dua sebagai
 * pemisah — menempel teks langsung berarti satu tanda baca bisa memotong
 * seluruh rantai filter.
 *
 * @param {import("../naskah/storyboard.mjs").ShotPapan} shot
 * @param {import("../naskah/storyboard.mjs").Storyboard} papan
 * @param {string} folderKerja
 * @param {boolean} pakaiFoto  true kalau lapisan dasarnya foto AI
 * @returns {string[]} potongan filter drawtext
 */
function plakatTeks(shot, papan, folderKerja, pakaiFoto) {
  const potongan = [];

  /** Tulis teks ke berkas lalu kembalikan potongan filter drawtext-nya. */
  const tulis = (nama, teks, opsi) => {
    const berkas = join(folderKerja, `${shot.id}-${nama}.txt`);
    writeFileSync(berkas, teks, "utf8");
    const o = Object.entries(opsi).map(([k, v]) => `${k}=${v}`).join(":");
    return `drawtext=textfile='${pathUntukFilter(berkas)}':${o}`;
  };

  if (shot.kartuJudul) {
    // Kartu judul menampilkan judul SERIAL (bukan judul episode), lalu nomor
    // episode di bawahnya — urutan yang sama dipakai drama pendek Tiongkok.
    // Ukuran huruf CJK ditahan di 64: judul serial 11 aksara, dan pada 92
    // lebarnya melewati 1080 px lalu terpotong di kiri-kanan tanpa peringatan.
    potongan.push(
      tulis("judul-cn", papan.serialMandarin, {
        fontfile: `'${pathUntukFilter(FONT_CJK)}'`,
        fontcolor: "0xF2F2F2", fontsize: 64, x: "(w-text_w)/2", y: "(h-text_h)/2-120",
        shadowcolor: "0x000000AA", shadowx: 3, shadowy: 3,
      }),
      tulis("judul-id", papan.serialIndonesia.toUpperCase(), {
        fontfile: `'${pathUntukFilter(FONT_LATIN)}'`,
        fontcolor: "0xC8A96A", fontsize: 29, x: "(w-text_w)/2", y: "(h-text_h)/2-20",
      }),
      tulis("judul-ep", `EPISODE ${String(papan.episode).padStart(2, "0")}`, {
        fontfile: `'${pathUntukFilter(FONT_LATIN)}'`,
        fontcolor: "0x8FA3B8", fontsize: 30, x: "(w-text_w)/2", y: "(h-text_h)/2+90",
      }),
      tulis("judul-ep-cn", `${papan.judulMandarin} · ${papan.judulIndonesia}`, {
        fontfile: `'${pathUntukFilter(FONT_CJK)}'`,
        fontcolor: "0x8FA3B8", fontsize: 34, x: "(w-text_w)/2", y: "(h-text_h)/2+140",
      })
    );
  } else {
    potongan.push(
      tulis("lokasi", shot.lokasiNama.toUpperCase(), {
        fontfile: `'${pathUntukFilter(FONT_LATIN)}'`,
        fontcolor: "0x9FB2C4", fontsize: 32, x: 72, y: 110,
      }),
      tulis("kamera", shot.kamera, {
        fontfile: `'${pathUntukFilter(FONT_LATIN)}'`,
        fontcolor: "0x5F7284", fontsize: 25, x: 72, y: 158,
      }),
      tulis("nomor", `SHOT ${shot.urutan}/${papan.shot.length}`, {
        fontfile: `'${pathUntukFilter(FONT_LATIN)}'`,
        fontcolor: "0x5F7284", fontsize: 25, x: "w-text_w-72", y: 112,
      })
    );
    if (shot.karakterNama.length > 0) {
      potongan.push(
        tulis("tokoh", shot.karakterNama.join("  ·  "), {
          fontfile: `'${pathUntukFilter(FONT_LATIN)}'`,
          fontcolor: "0xC8A96A", fontsize: 30, x: 72, y: 1420,
        })
      );
    }
  }

  // Penanda kejujuran: penonton harus tahu persis sedang melihat apa.
  // Teksnya ikut berubah sesuai lapisan dasar yang benar-benar dipakai —
  // penanda yang isinya tidak lagi benar lebih berbahaya daripada tak ada.
  // Ditaruh di KIRI, bukan tengah: layanan gambar gratis membubuhkan
  // watermark-nya sendiri di pojok kanan bawah dan keduanya akan bertabrakan.
  potongan.push(
    tulis("tanda", pakaiFoto ? "PRATINJAU · FOTO AI + GERAK KAMERA" : "PRATINJAU · ANIMATIK · BELUM VIDEO AI", {
      fontfile: `'${pathUntukFilter(FONT_LATIN)}'`,
      fontcolor: "0x4A5A6A", fontsize: 22, x: 72, y: 1862,
    })
  );

  return potongan;
}

/**
 * Potongan filter untuk menggeser nada suara tanpa mengubah panjangnya.
 *
 * Penyedia suara gratis hanya punya SATU suara untuk semua tokoh. Geseran nada
 * inilah satu-satunya pembeda pria/wanita yang bisa dilakukan tanpa biaya.
 * Caranya: `asetrate` memperlambat/mempercepat (nada DAN durasi ikut berubah),
 * lalu `atempo` mengembalikan durasinya — sisa bersihnya cuma perubahan nada.
 *
 * @param {number} semitone  negatif = lebih berat, positif = lebih tinggi
 * @returns {string} potongan filter, berakhir koma; string kosong kalau nol
 */
export function geserNadaFilter(semitone) {
  if (!semitone) return "";
  const rasio = Math.pow(2, semitone / 12);
  // Laju sumber TTS 24 kHz; asetrate memakai laju sampel, bukan nada langsung.
  return (
    `asetrate=${Math.round(24000 * rasio)},aresample=48000,` +
    `atempo=${(1 / rasio).toFixed(4)},`
  );
}

/**
 * Ubah id shot jadi angka seed yang tetap, supaya gradasi satu shot selalu
 * tergambar sama setiap kali dirender (hasil bisa diulang = bisa dibandingkan).
 * @param {string} id
 * @returns {number}
 */
function bijiDariId(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 100000;
  return h;
}
