// Gerbang biaya — satu-satunya pintu menuju penyedia BERBAYAR.
//
// ATURAN YANG DITEGAKKAN BERKAS INI: tidak ada satu pun panggilan berbayar
// boleh terjadi tanpa DUA persetujuan terpisah dari owner:
//   (1) batas belanja tertulis di .env  -> STUDIO_BATAS_BIAYA_USD
//   (2) persetujuan sekali-pakai di perintah -> --setujui-biaya
// Satu saja tidak ada = ditolak. Dua-duanya dipakai karena masing-masing
// menutup kecelakaan yang berbeda: (1) menahan skrip/otomasi yang kebablasan,
// (2) menahan manusia yang salah menempel perintah.

/**
 * ⚠️ ANGKA DI BAWAH BELUM DIVERIFIKASI KE HALAMAN HARGA PENYEDIA.
 *
 * Ditulis sebagai PERKIRAAN KASAR supaya owner punya gambaran urutan besaran
 * sebelum memutuskan, bukan sebagai tagihan. Harga model video berubah sering
 * dan berbeda per-resolusi. Sebelum menyetujui belanja sungguhan, buka halaman
 * harga penyedia dan samakan angkanya di sini.
 *
 * Satuan sengaja dibuat eksplisit di nama kunci supaya salah-satuan (per detik
 * vs per klip) tidak mungkin terjadi diam-diam.
 */
export const TARIF = {
  video: {
    "fal-ai/kling-video/v1.6/standard/image-to-video": {
      usdPerDetik: 0.056,
      catatan: "Kling 1.6 standard, 5 atau 10 detik per klip",
    },
    "fal-ai/minimax/hailuo-02/standard/image-to-video": {
      usdPerDetik: 0.045,
      catatan: "MiniMax Hailuo 02 standard, 6 detik per klip",
    },
  },
  gambar: {
    "fal-ai/flux/dev": { usdPerGambar: 0.025, catatan: "gambar acuan karakter & adegan" },
  },
  suara: {
    "minimax/speech-02-turbo": {
      usdPer1000Karakter: 0.06,
      catatan: "TTS Mandarin, dihitung dari jumlah karakter Han",
    },
  },
  teks: {
    "claude-sonnet-5": {
      usdPerEpisode: 0.05,
      catatan: "perkiraan naskah + storyboard satu episode",
    },
  },
};

/** Mesin lokal: nol panggilan internet, nol biaya. Bukan nilai hiasan —
 *  dipakai perbandingan oleh gerbang di bawah. */
export const BIAYA_LOKAL_USD = 0;

/**
 * @typedef {object} BarisBiaya
 * @property {string} tahap
 * @property {string} mesin
 * @property {string} hitungan
 * @property {number} usd
 */

/**
 * Hitung perkiraan biaya satu episode untuk kombinasi mesin yang dipilih.
 * Fungsi ini MEMBACA saja — ia tidak memesan apa pun dan tidak mengubah apa pun.
 *
 * @param {import("./naskah/storyboard.mjs").Storyboard} papan
 * @param {{ visual: string, suara: string, teks?: string }} mesin
 * @returns {{ rincian: BarisBiaya[], totalUsd: number }}
 */
export function estimasiBiaya(papan, mesin) {
  /** @type {BarisBiaya[]} */
  const rincian = [];

  // --- Lapisan gambar bergerak -------------------------------------------
  if (mesin.visual === "lokal") {
    rincian.push({
      tahap: "Video adegan",
      mesin: "lokal (animatic)",
      hitungan: `${papan.shot.length} shot / ${papan.totalDetik} detik`,
      usd: BIAYA_LOKAL_USD,
    });
  } else {
    const tarif = TARIF.video[mesin.visual];
    if (!tarif) throw new Error(`Tarif untuk mesin video "${mesin.visual}" belum terdaftar di TARIF.`);
    // Mesin video berbayar menagih per klip berdurasi tetap; shot 7 detik
    // tetap ditagih sebagai klip 10 detik. Dibulatkan NAIK supaya perkiraan
    // tidak pernah lebih rendah dari tagihan sebenarnya.
    const detikDitagih = papan.shot.reduce((j, s) => j + Math.ceil(s.durasiDetik / 5) * 5, 0);
    rincian.push({
      tahap: "Video adegan",
      mesin: mesin.visual,
      hitungan: `${papan.shot.length} shot / ${detikDitagih} detik ditagih`,
      usd: bulat(detikDitagih * tarif.usdPerDetik),
    });

    // Gambar acuan per shot menjaga wajah tokoh tetap sama (image-to-video).
    const tarifGambar = TARIF.gambar["fal-ai/flux/dev"];
    rincian.push({
      tahap: "Gambar acuan",
      mesin: "fal-ai/flux/dev",
      hitungan: `${papan.shot.length} gambar`,
      usd: bulat(papan.shot.length * tarifGambar.usdPerGambar),
    });
  }

  // --- Lapisan suara ------------------------------------------------------
  const jumlahHan = papan.shot.reduce(
    (j, s) => j + (s.dialog ? hitungKarakterHan(s.dialog.mandarin) : 0),
    0
  );
  if (mesin.suara === "lokal") {
    rincian.push({
      tahap: "Suara dialog",
      mesin: "lokal (bed musik, tanpa suara manusia)",
      hitungan: `${jumlahHan} karakter Han tidak disuarakan`,
      usd: BIAYA_LOKAL_USD,
    });
  } else {
    const tarif = TARIF.suara[mesin.suara];
    if (!tarif) throw new Error(`Tarif untuk mesin suara "${mesin.suara}" belum terdaftar di TARIF.`);
    rincian.push({
      tahap: "Suara dialog",
      mesin: mesin.suara,
      hitungan: `${jumlahHan} karakter Han`,
      usd: bulat((jumlahHan / 1000) * tarif.usdPer1000Karakter),
    });
  }

  // --- Lapisan teks (naskah/storyboard otomatis) --------------------------
  if (mesin.teks && mesin.teks !== "lokal") {
    const tarif = TARIF.teks[mesin.teks];
    if (!tarif) throw new Error(`Tarif untuk mesin teks "${mesin.teks}" belum terdaftar di TARIF.`);
    rincian.push({
      tahap: "Penulisan naskah",
      mesin: mesin.teks,
      hitungan: "1 episode",
      usd: bulat(tarif.usdPerEpisode),
    });
  }

  return { rincian, totalUsd: bulat(rincian.reduce((j, r) => j + r.usd, 0)) };
}

/**
 * Hadang eksekusi kalau belanja belum disetujui owner.
 *
 * Sengaja MELEMPAR, bukan mengembalikan false: pemanggil yang lupa memeriksa
 * nilai kembalian akan tetap berhenti. Pagar yang bisa diabaikan karena lupa
 * bukan pagar.
 *
 * @param {object} p
 * @param {number} p.totalUsd        perkiraan biaya perintah ini
 * @param {number} p.batasUsd        isi STUDIO_BATAS_BIAYA_USD dari .env
 * @param {boolean} p.disetujui      bendera --setujui-biaya pada perintah
 * @param {string[]} p.kunciHilang   nama env kunci API yang belum diisi
 */
export function gerbangBiaya({ totalUsd, batasUsd, disetujui, kunciHilang }) {
  if (totalUsd <= 0) return; // Mesin lokal: tak ada yang perlu disetujui.

  if (kunciHilang.length > 0) {
    throw new Error(
      `Render berbayar dibatalkan: kunci API belum diisi di .env — ${kunciHilang.join(", ")}.\n` +
        `Studio TIDAK menebak kunci dan TIDAK melanjutkan tanpa itu.`
    );
  }

  if (!(batasUsd > 0)) {
    throw new Error(
      `Render berbayar dibatalkan: STUDIO_BATAS_BIAYA_USD di .env masih 0/kosong.\n` +
        `Perkiraan biaya perintah ini USD ${totalUsd.toFixed(2)}. ` +
        `Isi batas belanja dulu kalau memang mau dilanjutkan.`
    );
  }

  if (totalUsd > batasUsd) {
    throw new Error(
      `Render berbayar dibatalkan: perkiraan USD ${totalUsd.toFixed(2)} ` +
        `melewati batas STUDIO_BATAS_BIAYA_USD = USD ${batasUsd.toFixed(2)}.`
    );
  }

  if (!disetujui) {
    throw new Error(
      `Render berbayar dibatalkan: belum ada persetujuan sekali-pakai.\n` +
        `Perkiraan biaya USD ${totalUsd.toFixed(2)} (batas Anda USD ${batasUsd.toFixed(2)}).\n` +
        `Kalau setuju, ulangi perintah yang sama dengan menambahkan: --setujui-biaya`
    );
  }
}

/**
 * Hitung karakter Han (汉字) dalam sebuah kalimat — dasar penagihan TTS.
 * Tanda baca dan spasi tidak dihitung karena penyedia pun tidak menghitungnya.
 * @param {string} teks
 * @returns {number}
 */
export function hitungKarakterHan(teks) {
  const cocok = String(teks).match(/[一-鿿]/g);
  return cocok ? cocok.length : 0;
}

function bulat(n) {
  return Math.round(n * 10000) / 10000;
}
