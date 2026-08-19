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
  error?: string;
};

export type StatusPlayly = "tersambung" | "belum-diatur" | "gagal";

export type RingkasanPlayly = {
  status: StatusPlayly;
  jumlahVideo: number;
  dilewati: number;
  pesan: string;
};

/** Angka dari luar tak dipercaya buta: bukan-angka/negatif dianggap 0. */
function angkaAman(nilai: unknown): number {
  return typeof nilai === "number" && Number.isFinite(nilai) && nilai > 0
    ? Math.floor(nilai)
    : 0;
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
      pesan:
        data?.error ?? `Dashboard tidak bisa dihubungi (HTTP ${httpStatus}).`,
    };
  }

  const jumlahVideo = angkaAman(data?.count);
  const dilewati = angkaAman(data?.skipped);
  return {
    status: "tersambung",
    jumlahVideo,
    dilewati,
    pesan:
      jumlahVideo === 0
        ? "Sambungan hidup, tapi dashboard belum berisi video."
        : "",
  };
}
