// Subtitle Generator — menghasilkan dua berkas dari storyboard yang SAMA:
//
//  - .ass  : dipakai ffmpeg untuk MEMBAKAR subtitle ke dalam gambar. Dipilih
//            (bukan .srt) karena hanya ASS yang bisa menaruh dua baris dengan
//            gaya berbeda pada posisi berbeda — Mandarin di atas, Indonesia di
//            bawah. Di .srt keduanya akan menumpuk jadi satu blok.
//  - .srt  : subtitle Indonesia terpisah, untuk pemutar luar dan untuk nanti
//            dimasukkan ke katalog dramaapp. Tidak dibakar.
//
// Keduanya membaca waktu dari storyboard, bukan menghitung sendiri — itulah
// yang membuat subtitle mustahil bergeser dari gambarnya.

/** Jeda masuk/keluar supaya subtitle tidak menempel persis di potongan shot. */
const JEDA_MASUK_DETIK = 0.12;
const JEDA_KELUAR_DETIK = 0.22;

/** Subtitle di bawah ambang ini tidak terbaca; lebih baik ditampilkan penuh. */
const DURASI_SUBTITLE_MIN_DETIK = 0.8;

/**
 * Warna ASS ditulis terbalik: &HAABBGGRR (alpha, biru, hijau, merah) —
 * BUKAN RGB. Salah urutan tidak menimbulkan error, cuma warnanya meleset.
 */
const PUTIH = "&H00FFFFFF";
const EMAS = "&H0066D1FF"; // = #FFD166 dibalik jadi BGR
const GARIS_LUAR = "&H00101010";
const BAYANG = "&H80000000";

/**
 * Susun berkas subtitle ASS (dua bahasa, siap dibakar).
 * @param {import("./storyboard.mjs").Storyboard} papan
 * @returns {string}
 */
export function buatAss(papan) {
  const kepala = [
    "[Script Info]",
    `Title: Episode ${papan.episode} - ${papan.judulIndonesia}`,
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    // WrapStyle 0 = bungkus baris otomatis, baris atas dibuat lebih panjang.
    // JANGAN kembalikan ke 2 ("hanya pecah di \\N"): dengan 2, kalimat
    // Indonesia yang panjang tidak dibungkus melainkan DIPOTONG di tepi layar —
    // tanpa error, tanpa peringatan. Terbukti dari frame hasil render, bukan
    // dari dokumentasi.
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "YCbCr Matrix: TV.709",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    // Alignment 2 = bawah-tengah. MarginV diukur dari BAWAH, jadi angka yang
    // lebih besar menaruh baris lebih tinggi: Mandarin (330) di atas Indonesia (150).
    // Jarak 180 px itu menyediakan ruang untuk subtitle Indonesia yang terbungkus
    // jadi dua baris tanpa menabrak baris Mandarin di atasnya.
    // Margin kiri/kanan 90 px: subtitle terpanjang di episode 1 ("Berlutut begitu
    // jauh lebih enak dilihat...") pas dalam dua baris pada ukuran ini.
    `Style: Mandarin,Microsoft YaHei,50,${PUTIH},${PUTIH},${GARIS_LUAR},${BAYANG},0,0,0,0,100,100,1,0,1,3.5,1.5,2,90,90,330,1`,
    `Style: MandarinBatin,Microsoft YaHei,47,${PUTIH},${PUTIH},${GARIS_LUAR},${BAYANG},0,-1,0,0,100,100,1,0,1,3.5,1.5,2,90,90,330,1`,
    `Style: Indonesia,Arial,52,${EMAS},${EMAS},${GARIS_LUAR},${BAYANG},-1,0,0,0,100,100,0,0,1,4,2,2,90,90,150,1`,
    `Style: IndonesiaBatin,Arial,49,${EMAS},${EMAS},${GARIS_LUAR},${BAYANG},-1,-1,0,0,100,100,0,0,1,4,2,2,90,90,150,1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  const baris = [];
  for (const s of papan.shot) {
    if (!s.dialog) continue;
    const { mulai, selesai } = jendelaWaktu(s);
    const batin = s.dialog.tipe === "narasi";
    baris.push(
      eventAss(mulai, selesai, batin ? "MandarinBatin" : "Mandarin", s.dialog.mandarin),
      eventAss(mulai, selesai, batin ? "IndonesiaBatin" : "Indonesia", s.dialog.indonesia)
    );
  }

  return [...kepala, ...baris, ""].join("\n");
}

/**
 * Susun berkas subtitle SRT berbahasa Indonesia saja.
 * @param {import("./storyboard.mjs").Storyboard} papan
 * @returns {string}
 */
export function buatSrt(papan) {
  const blok = [];
  let nomor = 1;
  for (const s of papan.shot) {
    if (!s.dialog) continue;
    const { mulai, selesai } = jendelaWaktu(s);
    blok.push(
      `${nomor++}`,
      `${waktuSrt(mulai)} --> ${waktuSrt(selesai)}`,
      s.dialog.indonesia,
      ""
    );
  }
  return blok.join("\n");
}

/**
 * Hitung kapan subtitle muncul & hilang untuk satu shot.
 * Jeda hanya diterapkan bila shot-nya cukup panjang — memangkas shot pendek
 * malah membuat subtitle berkedip tanpa sempat terbaca.
 * @param {import("./storyboard.mjs").ShotPapan} s
 */
function jendelaWaktu(s) {
  const cukupPanjang =
    s.durasiDetik - JEDA_MASUK_DETIK - JEDA_KELUAR_DETIK >= DURASI_SUBTITLE_MIN_DETIK;
  if (!cukupPanjang) return { mulai: s.mulaiDetik, selesai: s.selesaiDetik };
  return {
    mulai: s.mulaiDetik + JEDA_MASUK_DETIK,
    selesai: s.selesaiDetik - JEDA_KELUAR_DETIK,
  };
}

/**
 * Satu baris Dialogue ASS. Baris baru di ASS ditulis `\N`, bukan newline asli —
 * newline asli akan memotong berkasnya dan membuat libass diam-diam melewati
 * sisa subtitle.
 */
function eventAss(mulai, selesai, gaya, teks) {
  const aman = String(teks).replace(/\r?\n/g, "\\N");
  return `Dialogue: 0,${waktuAss(mulai)},${waktuAss(selesai)},${gaya},,0,0,0,,${aman}`;
}

/** Format waktu ASS: H:MM:SS.cc (centidetik, jam tanpa nol di depan). */
function waktuAss(detik) {
  const t = Math.max(0, detik);
  const j = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const d = Math.floor(t % 60);
  const c = Math.round((t - Math.floor(t)) * 100);
  return `${j}:${dua(m)}:${dua(d)}.${dua(c === 100 ? 99 : c)}`;
}

/** Format waktu SRT: HH:MM:SS,mmm (milidetik, koma bukan titik). */
function waktuSrt(detik) {
  const t = Math.max(0, detik);
  const j = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const d = Math.floor(t % 60);
  const ms = Math.round((t - Math.floor(t)) * 1000);
  return `${dua(j)}:${dua(m)}:${dua(d)},${String(Math.min(ms, 999)).padStart(3, "0")}`;
}

function dua(n) {
  return String(n).padStart(2, "0");
}
