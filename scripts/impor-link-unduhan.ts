// Impor massal link unduhan video Playly dari CSV/JSON.
//
// Pakai:
//   npm run impor:unduhan -- <berkas.csv|berkas.json> [--dry-run] [--format=csv|json]
//
//   --dry-run   hanya MENAMPILKAN hasilnya (baru/diperbarui/dilewati + alasan),
//               tidak menyimpan apa pun. Jalankan ini DULU.
//   --format    paksa format; bawaannya ditebak dari akhiran nama berkas.
//
// Kolom: video (ID atau judul), provider (google|telegram|cast|mega),
// quality (1080p|480p), url. Contoh: scripts/contoh-link-unduhan.csv.
// Bentuk JSON: array objek dengan kunci yang sama.
//
// KE MANA DATANYA DITULIS ditentukan .env.local, sama seperti aplikasinya:
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY terisi -> database Supabase
//   (PRODUKSI kalau kuncinya kunci produksi); kosong -> berkas data/playly.json.
// Tujuannya dicetak di baris pertama — baca sebelum menjalankan tanpa --dry-run.
//
// Daftar video untuk pencocokan = video akun kita di Playly (termasuk yang
// disembunyikan) + video yang masuk lewat webhook. Kalau Playly tak bisa
// dihubungi, skrip BERHENTI: tanpa daftar lengkap, baris yang sah akan
// dilaporkan "video tidak ditemukan" dan itu menyesatkan.
import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";

const BERKAS_ENV = ".env.local";

function ambilArgumen(argv: string[]) {
  const berkas = argv.find((a) => !a.startsWith("--"));
  const dryRun = argv.includes("--dry-run");
  const formatArg = argv.find((a) => a.startsWith("--format="))?.split("=")[1];
  return { berkas, dryRun, formatArg };
}

async function utama(): Promise<number> {
  const { berkas, dryRun, formatArg } = ambilArgumen(process.argv.slice(2));
  if (!berkas) {
    console.error("Pakai: npm run impor:unduhan -- <berkas.csv|berkas.json> [--dry-run]");
    return 1;
  }
  const jalur = resolve(berkas);
  if (!existsSync(jalur)) {
    console.error(`Berkas tidak ditemukan: ${jalur}`);
    return 1;
  }
  const format = (formatArg ?? (extname(jalur).toLowerCase() === ".json" ? "json" : "csv")) as
    | "csv"
    | "json";
  if (format !== "csv" && format !== "json") {
    console.error(`Format "${formatArg}" tidak dikenal (pilih csv atau json).`);
    return 1;
  }

  // Env WAJIB dimuat SEBELUM modul store diimpor: lib/supabase.ts memutuskan
  // "pakai Supabase atau berkas lokal" saat modulnya dimuat. Kebalikannya
  // membuat skrip diam-diam menulis ke berkas lokal padahal maksudnya database.
  if (existsSync(BERKAS_ENV)) process.loadEnvFile(BERKAS_ENV);

  const { useSupabase } = await import("../lib/supabase");
  const { fetchPlaylyVideosKita, readPlaylyConfig } = await import("../lib/playly");
  const { getPlaylyLinkUnduhan, getPlaylyWebhookVideos, upsertPlaylyLinkUnduhan } = await import(
    "../lib/store"
  );
  const { bacaDomainUnduhan } = await import("../lib/playly-unduhan-domain");
  const { formatLaporan, jalankanImpor } = await import("../lib/playly-unduhan-impor");

  const tujuan = useSupabase
    ? `database Supabase (${new URL(process.env.SUPABASE_URL!).host})`
    : "berkas lokal data/playly.json";
  console.log(`Tujuan simpan : ${tujuan}${dryRun ? "  [DRY-RUN: tidak ada yang ditulis]" : ""}`);
  console.log(`Berkas impor  : ${jalur} (${format})`);

  const [katalog, webhook] = await Promise.all([
    fetchPlaylyVideosKita(readPlaylyConfig(), 0),
    getPlaylyWebhookVideos(),
  ]);
  if (katalog.error) {
    console.error(`BERHENTI: daftar video Playly tidak bisa diambil — ${katalog.error}`);
    return 1;
  }
  const videos = [
    ...katalog.videos.map((v) => ({ id: v.id, title: v.title })),
    ...webhook.map((v) => ({ id: v.videoId, title: v.title })),
  ];
  console.log(`Video dikenal : ${videos.length}\n`);

  try {
    const laporan = await jalankanImpor({
      teks: readFileSync(jalur, "utf-8"),
      format,
      videos,
      domain: bacaDomainUnduhan(),
      dryRun,
      bacaLama: getPlaylyLinkUnduhan,
      simpan: upsertPlaylyLinkUnduhan,
    });
    console.log(formatLaporan(laporan));
    return 0;
  } catch (err) {
    console.error(`GAGAL: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}

utama().then((kode) => process.exit(kode));
