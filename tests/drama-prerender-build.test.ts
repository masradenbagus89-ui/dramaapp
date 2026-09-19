// Penjaga permanen: halaman drama TIDAK boleh di-prerender saat build (2026-09-19).
//
// KENAPA PENJAGA INI ADA. Sebelum hari ini `generateStaticParams` memulangkan 42
// id, sehingga `next build` mem-prerender 42 halaman drama dan masing-masing
// memanggil `getDramaCached`. Pembacaan ber-cache itu tersendat melewati batas 6
// detik DI DALAM proses build sekalipun databasenya sehat — dibuktikan dengan
// menguji bentuk query yang sama persis untuk seluruh 42 judul (42/42 sukses di
// bawah 1 detik) dan memantau Supabase 3 menit tanpa putus (36/36 sukses),
// sementara `npm run build` tetap gagal 9× dengan pesan "Supabase tidak
// menjawab". Akibatnya rilis tertahan 4 hari.
//
// KENAPA SEBAGIAN TES INI MEMBACA BERKAS SUMBER, bukan menjalankan kodenya.
// Yang dijaga adalah keputusan yang akibatnya baru muncul saat `next build`:
// apakah build ikut menarik katalog dari database. Memanggil fungsinya hanya
// membuktikan nilai kembaliannya, bukan bahwa jalur databasenya sudah benar-benar
// lepas — pemanggilan yang hasilnya dibuang pun tetap menjatuhkan build. Pola ini
// mengikuti tests/playly-halaman-cached.test.ts.
//
// Tes ini rapuh terhadap perubahan kata kunci — itu disengaja: siapa pun yang
// mengembalikan prerender dipaksa membaca catatan ini lebih dulu, dan itu jauh
// lebih murah daripada gerbang rilis yang macet berhari-hari tanpa sebab jelas.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BERKAS = "app/drama/[id]/page.tsx";

const sumber = readFileSync(
  fileURLToPath(new URL(`../${BERKAS}`, import.meta.url)),
  "utf8",
);

/** Isi `generateStaticParams`, dari tanda buka sampai penutup blok di kolom 0. */
function badanGenerateStaticParams(): string {
  const mulai = sumber.indexOf("export async function generateStaticParams");
  expect(mulai, `${BERKAS} harus punya generateStaticParams`).toBeGreaterThan(-1);
  const akhir = sumber.indexOf("\n}", mulai);
  expect(akhir, "blok generateStaticParams harus tertutup").toBeGreaterThan(mulai);
  return sumber.slice(mulai, akhir);
}

describe("halaman drama tidak di-prerender saat build", () => {
  it("generateStaticParams memulangkan daftar KOSONG", async () => {
    const badan = badanGenerateStaticParams();
    expect(badan).toMatch(/return\s*\[\s*\]\s*;/);
  });

  it("generateStaticParams tidak menyentuh katalog database sama sekali", () => {
    const badan = badanGenerateStaticParams();
    // Satu pembacaan saja cukup menjatuhkan build, walau hasilnya dibuang.
    for (const pembacaCatalog of [
      "getAllDramas",
      "getAllDramasCached",
      "getDrama",
      "getDramaCached",
      "sbSelect",
    ]) {
      expect(
        badan,
        `generateStaticParams tidak boleh memanggil ${pembacaCatalog}`,
      ).not.toContain(pembacaCatalog);
    }
  });

  it("berkasnya berhenti mengimpor pembaca katalog penuh (tanpa dead code)", () => {
    const imporDramas = sumber.match(/import\s*\{([^}]*)\}\s*from\s*"@\/lib\/dramas"/);
    expect(imporDramas, `${BERKAS} harus mengimpor dari @/lib/dramas`).not.toBeNull();
    expect(imporDramas![1]).not.toMatch(/\bgetAllDramas\b/);
  });

  it("dynamicParams TETAP true — tanpa ini daftar kosong = semua halaman 404", () => {
    // Bahaya senyap: `dynamicParams = false` + daftar kosong membuat SETIAP
    // halaman drama membalas 404, dan tak ada error apa pun yang muncul di build.
    expect(sumber).toMatch(/export\s+const\s+dynamicParams\s*=\s*true\s*;/);
    expect(sumber).not.toMatch(/export\s+const\s+dynamicParams\s*=\s*false/);
  });

  it("revalidate tetap dipasang — halaman hasil kunjungan pertama wajib disimpan", () => {
    // Tanpa revalidate, tiap pengunjung membangun ulang halaman ini dari nol dan
    // gangguan database langsung terasa penonton (pelajaran /playly 2026-09-18).
    expect(sumber).toMatch(/export\s+const\s+revalidate\s*=\s*\d+\s*;/);
  });

  it("alasannya tercatat di berkasnya, bukan cuma di catatan sesi", () => {
    // Komentar yang hilang = orang berikutnya mengembalikan prerender tanpa tahu
    // kenapa dilepas, lalu gerbang rilis macet lagi tanpa sebab yang kelihatan.
    expect(sumber).toContain("2026-09-19");
    expect(sumber).toMatch(/prerender/i);
  });
});
