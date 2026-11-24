// Titik masuk: baca env → pilih penyimpanan → nyalakan server.
//
// Env (isi di service Railway "nobar-server", BUKAN di service situs):
//   NOBAR_SECRET              wajib, ≥32 huruf, SAMA PERSIS dengan env situs
//   NOBAR_ALLOWED_ORIGINS     wajib, daftar origin situs dipisah koma
//                             mis. https://dramaapp-production-9e88.up.railway.app
//   SUPABASE_URL              wajib di produksi
//   SUPABASE_SERVICE_ROLE_KEY wajib di produksi (server-only, menembus RLS)
//   PORT                      diisi otomatis oleh Railway
import { buatServerNobar } from "./server.ts";
import { PenyimpananMemori, type Penyimpanan } from "./penyimpanan.ts";
import { PenyimpananSupabase } from "./penyimpanan-supabase.ts";

/** Rahasia pendek bisa ditebak; 32 huruf acak = jauh di luar jangkauan tebak. */
const PANJANG_RAHASIA_MIN = 32;

function berhenti(pesan: string): never {
  console.error(`[nobar] TIDAK BISA JALAN: ${pesan}`);
  process.exit(1);
}

const produksi = process.env.NODE_ENV === "production";
const rahasia = process.env.NOBAR_SECRET ?? "";
if (rahasia.length < PANJANG_RAHASIA_MIN) {
  berhenti(`NOBAR_SECRET kosong atau kurang dari ${PANJANG_RAHASIA_MIN} huruf.`);
}

const asal = (process.env.NOBAR_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);
if (asal.length === 0) berhenti("NOBAR_ALLOWED_ORIGINS kosong — tak ada situs yang boleh menyambung.");

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
let penyimpanan: Penyimpanan;
if (supabaseUrl && supabaseKey) {
  penyimpanan = new PenyimpananSupabase(supabaseUrl, supabaseKey);
} else if (produksi) {
  // Penyimpanan memori di produksi = semua Room lenyap tiap redeploy tanpa
  // satu pun error. Lebih baik gagal keras di sini.
  berhenti("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY kosong di produksi.");
} else {
  console.warn("[nobar] env Supabase kosong → penyimpanan MEMORI (data hilang saat server mati).");
  penyimpanan = new PenyimpananMemori();
}

const { httpServer, tutup } = buatServerNobar({ penyimpanan, rahasia, asalDiizinkan: asal });
const port = Number(process.env.PORT ?? 3020);
httpServer.listen(port, () => console.log(`[nobar] siap di port ${port} · origin: ${asal.join(", ")}`));

// Railway mengirim SIGTERM saat redeploy → simpan status Room dulu sebelum mati.
for (const sinyal of ["SIGTERM", "SIGINT"] as const) {
  process.on(sinyal, async () => {
    await tutup().catch(() => undefined);
    process.exit(0);
  });
}
