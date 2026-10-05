// -------------------------------------------------------------------------
// IMPOR MASSAL link unduhan dari CSV/JSON — logika murninya (tanpa disk/jaringan).
// Pembungkus baris perintahnya: scripts/impor-link-unduhan.ts.
//
// ATURAN (keputusan owner 2026-10-05):
//   - Kolom: video (id ATAU judul), provider, quality, url.
//   - Kolom `video` dicocokkan ke ID dulu; kalau tak ada, ke JUDUL yang sama
//     persis (tanpa beda huruf besar-kecil & spasi berlebih). Judul yang
//     dimiliki >1 video DILEWATI ("judul ganda") — menebak salah satunya berarti
//     link bisa menempel ke video yang salah tanpa ada yang tahu.
//   - Baris rusak (video tak ketemu, URL tak lolos) TIDAK menghentikan proses;
//     semuanya masuk laporan beserta alasannya.
//   - Validasinya `validasiLinkUnduhan` — gerbang yang SAMA dengan webhook &
//     panel admin (https + domain per provider).
// -------------------------------------------------------------------------
import {
  terapkanLinkUnduhan,
  validasiLinkUnduhan,
  type DomainUnduhan,
  type LinkUnduhan,
  type LinkUnduhanMasuk,
  type StatusTulis,
} from "./playly-unduhan";

export type FormatImpor = "csv" | "json";

/** Satu baris mentah dari berkas. `nomor` = nomor baris di berkas (untuk laporan). */
export type BarisImpor = {
  nomor: number;
  video: string;
  provider: string;
  quality: string;
  url: string;
};

export type VideoTerdaftar = { id: string; title: string };

export type BarisDilewati = { nomor: number; video: string; alasan: string };

export type LaporanImpor = {
  dryRun: boolean;
  /** Jumlah baris data yang terbaca dari berkas (tanpa kepala kolom). */
  total: number;
  baru: number;
  diperbarui: number;
  /** Sudah ada dengan alamat yang sama persis — tak ada yang berubah. */
  sama: number;
  dilewati: BarisDilewati[];
};

/**
 * Nama kolom yang diterima (huruf besar-kecil diabaikan). Sebutan Indonesia
 * ikut diterima karena berkasnya disusun manusia, bukan mesin.
 */
const NAMA_KOLOM: Record<string, keyof Omit<BarisImpor, "nomor">> = {
  video: "video",
  video_id: "video",
  videoid: "video",
  judul: "video",
  title: "video",
  provider: "provider",
  quality: "quality",
  kualitas: "quality",
  url: "url",
  link: "url",
};
const KOLOM_WAJIB = ["video", "provider", "quality", "url"] as const;

/**
 * Pecah teks CSV jadi baris-baris sel (RFC 4180: sel bertanda kutip boleh
 * memuat koma, baris baru, dan kutip ganda `""`). Ditulis sendiri, bukan pakai
 * paket: kebutuhannya cuma ini, dan menambah dependensi untuk 30 baris kode =
 * satu paket lagi yang harus dirawat & diperiksa keamanannya.
 */
export function pecahCsv(teks: string): { sel: string[]; nomor: number }[] {
  const hasil: { sel: string[]; nomor: number }[] = [];
  let sel: string[] = [];
  let isi = "";
  let dalamKutip = false;
  let nomor = 1;
  let nomorAwal = 1;

  const tutupBaris = () => {
    sel.push(isi);
    if (sel.some((s) => s.trim() !== "")) hasil.push({ sel, nomor: nomorAwal });
    sel = [];
    isi = "";
  };

  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (dalamKutip) {
      if (c === '"' && teks[i + 1] === '"') {
        isi += '"';
        i++;
      } else if (c === '"') {
        dalamKutip = false;
      } else {
        if (c === "\n") nomor++;
        isi += c;
      }
      continue;
    }
    if (c === '"') dalamKutip = true;
    else if (c === ",") {
      sel.push(isi);
      isi = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && teks[i + 1] === "\n") i++;
      tutupBaris();
      nomor++;
      nomorAwal = nomor;
    } else isi += c;
  }
  if (isi !== "" || sel.length > 0) tutupBaris();
  return hasil;
}

function dariObjek(rec: Record<string, unknown>, nomor: number): BarisImpor {
  const baris: BarisImpor = { nomor, video: "", provider: "", quality: "", url: "" };
  for (const [k, v] of Object.entries(rec)) {
    const kolom = NAMA_KOLOM[k.trim().toLowerCase()];
    if (kolom && (typeof v === "string" || typeof v === "number")) baris[kolom] = String(v).trim();
  }
  return baris;
}

/**
 * Baca isi berkas jadi baris-baris. MELEMPAR hanya kalau berkasnya rusak total
 * (bukan JSON, kolom wajib tak ada) — itu bukan "baris rusak", tapi berkas yang
 * salah, dan melanjutkan cuma menghasilkan laporan penuh penolakan yang membingungkan.
 */
export function bacaBerkasImpor(teks: string, format: FormatImpor): BarisImpor[] {
  const bersih = teks.replace(/^﻿/, ""); // BOM dari Excel

  if (format === "json") {
    let data: unknown;
    try {
      data = JSON.parse(bersih);
    } catch {
      throw new Error("Berkas bukan JSON yang sah.");
    }
    if (!Array.isArray(data)) throw new Error("Isi JSON wajib berupa array baris.");
    return data.map((item, i) =>
      item && typeof item === "object" && !Array.isArray(item)
        ? dariObjek(item as Record<string, unknown>, i + 1)
        : { nomor: i + 1, video: "", provider: "", quality: "", url: "" },
    );
  }

  const [kepala, ...isi] = pecahCsv(bersih);
  if (!kepala) return [];
  const peta = kepala.sel.map((n) => NAMA_KOLOM[n.trim().toLowerCase()]);
  const hilang = KOLOM_WAJIB.filter((k) => !peta.includes(k));
  if (hilang.length) {
    throw new Error(`Kolom wajib tidak ada di baris pertama CSV: ${hilang.join(", ")}.`);
  }
  return isi.map(({ sel, nomor }) => {
    const rec: Record<string, string> = {};
    sel.forEach((v, i) => {
      if (peta[i]) rec[peta[i]!] = v;
    });
    return dariObjek(rec, nomor);
  });
}

const rapikanJudul = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/** Kolom `video` -> id video. ID didahulukan; judul hanya kalau ID tak ketemu. */
export function cocokkanVideo(
  kunci: string,
  videos: VideoTerdaftar[],
): { ok: true; id: string } | { ok: false; alasan: string } {
  const k = kunci.trim();
  if (!k) return { ok: false, alasan: "kolom video kosong" };
  if (videos.some((v) => v.id === k)) return { ok: true, id: k };

  const cocok = videos.filter((v) => rapikanJudul(v.title) === rapikanJudul(k));
  if (cocok.length === 1) return { ok: true, id: cocok[0].id };
  if (cocok.length > 1) {
    return {
      ok: false,
      alasan: `judul ganda (${cocok.length} video: ${cocok.map((v) => v.id).join(", ")}) — pakai ID video`,
    };
  }
  return { ok: false, alasan: "video tidak ditemukan (bukan ID maupun judul yang ada)" };
}

/** Pisahkan baris yang siap ditulis dari yang dilewati. Murni. */
export function rencanakanImpor(
  baris: BarisImpor[],
  videos: VideoTerdaftar[],
  domain: DomainUnduhan,
): { sah: LinkUnduhanMasuk[]; dilewati: BarisDilewati[] } {
  // Video dari dua sumber bisa beririsan (katalog + webhook) — kembaran id yang
  // sama tak boleh terhitung "judul ganda".
  const unik = [...new Map(videos.map((v) => [v.id, v])).values()];
  const sah: LinkUnduhanMasuk[] = [];
  const dilewati: BarisDilewati[] = [];
  for (const b of baris) {
    const video = cocokkanVideo(b.video, unik);
    if (!video.ok) {
      dilewati.push({ nomor: b.nomor, video: b.video, alasan: video.alasan });
      continue;
    }
    const hasil = validasiLinkUnduhan({ ...b, videoId: video.id }, domain);
    if (hasil.ok) sah.push(hasil.link);
    else dilewati.push({ nomor: b.nomor, video: b.video, alasan: hasil.alasan });
  }
  return { sah, dilewati };
}

/**
 * Jalankan impor. Penyimpanan dioper dari luar (`bacaLama`/`simpan`) supaya
 * fungsi ini bisa diuji tanpa database, dan supaya --dry-run TERBUKTI tidak
 * memanggil `simpan` sama sekali (bukan sekadar "dianggap tidak menulis").
 *
 * Dry-run tetap menghitung baru/diperbarui/sama terhadap data yang ada, jadi
 * laporannya sama persis dengan yang akan terjadi kalau dijalankan sungguhan.
 */
export async function jalankanImpor(opsi: {
  teks: string;
  format: FormatImpor;
  videos: VideoTerdaftar[];
  domain: DomainUnduhan;
  dryRun: boolean;
  bacaLama: () => Promise<LinkUnduhan[]>;
  simpan: (links: LinkUnduhanMasuk[]) => Promise<StatusTulis[]>;
}): Promise<LaporanImpor> {
  const baris = bacaBerkasImpor(opsi.teks, opsi.format);
  const { sah, dilewati } = rencanakanImpor(baris, opsi.videos, opsi.domain);

  const status =
    opsi.dryRun || sah.length === 0
      ? terapkanLinkUnduhan(await opsi.bacaLama(), sah, new Date().toISOString()).status
      : await opsi.simpan(sah);

  return {
    dryRun: opsi.dryRun,
    total: baris.length,
    baru: status.filter((s) => s === "baru").length,
    diperbarui: status.filter((s) => s === "diperbarui").length,
    sama: status.filter((s) => s === "sama").length,
    dilewati,
  };
}

/** Laporan akhir dalam bahasa awam, siap dicetak ke terminal. */
export function formatLaporan(l: LaporanImpor): string {
  const kepala = l.dryRun
    ? "SIMULASI (--dry-run) — TIDAK ada yang disimpan. Beginilah hasilnya kalau dijalankan:"
    : l.baru + l.diperbarui > 0
      ? "SELESAI — perubahan sudah disimpan."
      : "SELESAI — tidak ada perubahan (semua baris sudah sama atau dilewati).";
  const baris = [
    kepala,
    `  Baris terbaca     : ${l.total}`,
    `  Berhasil (baru)   : ${l.baru}`,
    `  Diperbarui        : ${l.diperbarui}`,
    `  Sudah sama (tetap): ${l.sama}`,
    `  Dilewati          : ${l.dilewati.length}`,
  ];
  for (const d of l.dilewati) {
    baris.push(`    - baris ${d.nomor} (${d.video || "?"}): ${d.alasan}`);
  }
  return baris.join("\n");
}
