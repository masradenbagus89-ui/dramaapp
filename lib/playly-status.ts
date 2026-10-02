// Penerjemah balasan /api/videos menjadi ringkasan status sambungan Playly.
//
// KENAPA dipisah dari komponen: percabangan 503-vs-502 di sinilah yang
// menentukan admin tahu harus memperbaiki APA (belum dipasang vs kunci
// ditolak). Sebagai fungsi murni ia bisa diuji tanpa merender React.

/** Bentuk balasan /api/videos yang kita pedulikan; field lain diabaikan. */
export type BalasanVideos = {
  ok?: boolean;
  count?: number;
  skipped?: number;
  /** Jumlah video yang dilewati PER ALASAN, mis. `{ "tidak ada alamat video": 20 }`. */
  alasanDilewati?: Record<string, number>;
  /** Beberapa JUDUL video yang dilewati, supaya admin tahu video mana. */
  contohDilewati?: string[];
  error?: string;
};

export type StatusPlayly = "tersambung" | "belum-diatur" | "gagal";

export type RingkasanPlayly = {
  status: StatusPlayly;
  jumlahVideo: number;
  dilewati: number;
  /**
   * Sebab video dilewati, siap tampil. Kosong kalau tidak ada yang dilewati.
   *
   * KENAPA ADA (2026-10-01): kartu dulu menulis "alamatnya tidak memenuhi syarat
   * keamanan" untuk SETIAP video yang dilewati — kalimat yang dipatok mati,
   * padahal ada empat alasan berbeda dan tiga di antaranya bukan soal keamanan
   * (lib/dashboard-videos.ts baris 135/140/145/148). Owner diberi tahu masalah
   * yang salah, lalu mencari kerusakan di tempat yang tidak rusak.
   */
  rincianDilewati: string;
  /**
   * Judul beberapa video yang dilewati, supaya admin tahu video MANA.
   *
   * KENAPA ADA (2026-10-01): owner mengunggah videonya sendiri lewat dashboard
   * Playly dan 20 dari 20 ditolak. Mengetahui JUMLAH dan SEBAB masih belum
   * cukup untuk bertindak — yang menentukan adalah video mana, karena hanya
   * owner yang bisa mencocokkannya dengan dashboard miliknya.
   */
  contohDilewati: string[];
  /** Kalimat utama yang dibaca admin; kosong kalau semuanya normal. */
  pesan: string;
};

/** Angka dari luar tak dipercaya buta: bukan-angka/negatif dianggap 0. */
function angkaAman(nilai: unknown): number {
  return typeof nilai === "number" && Number.isFinite(nilai) && nilai > 0
    ? Math.floor(nilai)
    : 0;
}

/**
 * Ubah hitungan per-alasan jadi satu kalimat apa adanya, mis.
 * "tidak ada alamat video (20)" atau "bukan https (3) · domain belum diizinkan (2)".
 *
 * Diurutkan dari yang TERBANYAK supaya sebab utama terbaca lebih dulu — kalau
 * 18 dari 20 video gagal karena satu hal, itu yang perlu dibereskan duluan.
 *
 * Pulang string KOSONG kalau server tidak mengirim rinciannya (balasan versi
 * lama). Pemanggil WAJIB menangani kemungkinan itu dengan kalimat netral —
 * JANGAN kembali menebak sebabnya; menebak persis itulah yang membuat kartu ini
 * salah memberi tahu selama ini.
 */
function rincikanAlasan(alasan: unknown): string {
  if (!alasan || typeof alasan !== "object" || Array.isArray(alasan)) return "";
  const baris = Object.entries(alasan as Record<string, unknown>)
    .map(([sebab, jumlah]) => ({ sebab: String(sebab).trim(), jumlah: angkaAman(jumlah) }))
    .filter((b) => b.sebab !== "" && b.jumlah > 0)
    .sort((a, b) => b.jumlah - a.jumlah)
    .map((b) => `${b.sebab} (${b.jumlah})`);
  return baris.join(" · ");
}

/** Sebanyak apa pun yang dikirim server, kartu hanya menyebut segini. */
const MAKS_NAMA_TAMPIL = 5;

/**
 * Saring daftar judul video yang ditolak sebelum masuk tampilan.
 *
 * Isinya datang dari dashboard pihak luar, jadi tidak dipercaya buta: yang
 * bukan teks dibuang, yang kosong dibuang, yang kepanjangan dipotong, dan
 * jumlahnya dibatasi supaya kartu tidak berubah jadi dinding teks saat yang
 * ditolak puluhan.
 */
function daftarNamaAman(nilai: unknown): string[] {
  if (!Array.isArray(nilai)) return [];
  return nilai
    .filter((n): n is string => typeof n === "string" && n.trim() !== "")
    .slice(0, MAKS_NAMA_TAMPIL)
    .map((n) => n.trim().slice(0, 80));
}

/**
 * Ubah (status HTTP + body) dari /api/videos jadi ringkasan siap tampil.
 *
 * Aturan gagal-AMAN (OWASP A10): apa pun yang TIDAK jelas-jelas sukses
 * dilaporkan sebagai tidak-tersambung. Lebih baik admin mengecek sambungan
 * yang ternyata sehat, daripada mengira sehat padahal mati.
 */
export function ringkasStatusPlayly(
  httpStatus: number,
  data: BalasanVideos | null,
): RingkasanPlayly {
  // 503 dipakai server kita khusus untuk "DASHBOARD_API_URL belum di-set".
  // Dibedakan dari gagal supaya admin tidak mencari kerusakan yang tak ada.
  if (httpStatus === 503) {
    return {
      status: "belum-diatur",
      jumlahVideo: 0,
      dilewati: 0,
      rincianDilewati: "",
      contohDilewati: [],
      pesan:
        data?.error ??
        "Sambungan ke dashboard Playly belum diatur (DASHBOARD_API_URL kosong).",
    };
  }

  const sukses = httpStatus >= 200 && httpStatus < 300 && data?.ok === true;
  if (!sukses) {
    return {
      status: "gagal",
      jumlahVideo: 0,
      dilewati: 0,
      rincianDilewati: "",
      contohDilewati: [],
      pesan:
        data?.error ?? `Dashboard tidak bisa dihubungi (HTTP ${httpStatus}).`,
    };
  }

  const jumlahVideo = angkaAman(data?.count);
  const dilewati = angkaAman(data?.skipped);

  // "Nol video" punya DUA arti yang berlawanan, dan membedakannya menentukan
  // admin memperbaiki apa. Dashboard yang memang masih kosong = tidak ada yang
  // rusak, tinggal unggah. Dashboard yang mengirim video lalu SEMUANYA kita
  // tolak = ada yang rusak di sini, dan kalimat "belum berisi video" akan
  // menyuruh admin mengunggah ulang video yang sebenarnya sudah ada.
  // Terjadi di produksi 2026-10-01: count 0, skipped 20.
  const pesan =
    jumlahVideo === 0
      ? dilewati > 0
        ? `Dashboard mengirim ${dilewati} video, tapi SEMUANYA ditolak sebelum sempat tampil.`
        : "Sambungan hidup, tapi dashboard belum berisi video."
      : "";

  return {
    status: "tersambung",
    jumlahVideo,
    dilewati,
    rincianDilewati: rincikanAlasan(data?.alasanDilewati),
    contohDilewati: daftarNamaAman(data?.contohDilewati),
    pesan,
  };
}
