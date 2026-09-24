// Penjaga PEMASANGAN: memastikan jalur data provider unduhan benar-benar
// tersambung dari database sampai ke layar.
//
// Bedanya dengan tests/unduhan.test.ts (penyaring data) dan
// tests/download-modal-render.test.ts (tampilan komponen): kedua berkas itu
// membuktikan bahwa potongan-potongannya benar. Berkas INI membuktikan
// potongan-potongan itu benar-benar DIPASANG — hal yang tidak bisa dibuktikan
// dengan memanggil fungsinya.
//
// KENAPA PENJAGA INI ADA, dengan bukti dari repo ini sendiri: komponen
// `DownloadButton` sempat hidup sebagai KODE MATI melewati satu rilis penuh.
// Berkasnya ada (commit f65ccd6), helper-nya ada, tesnya hijau — tapi tak satu
// pun halaman mengimpornya, jadi tombolnya tidak pernah muncul di situs. Tidak
// ada error, tidak ada tes merah, tidak ada yang melapor. Jenis kerusakan
// seperti itu hanya bisa dicegat oleh penjaga yang memeriksa PEMASANGAN.
//
// Sebagian tes di sini membaca berkas sumber, bukan menjalankan kodenya —
// pola yang sama dengan tests/drama-prerender-build.test.ts.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Isi berkas sumber, akhir-baris diseragamkan supaya cocokan teks tak rapuh. */
function sumber(berkas: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../${berkas}`, import.meta.url)),
    "utf8",
  ).replace(/\r\n/g, "\n");
}

/**
 * Isi satu fungsi: dari tanda pembukanya sampai baris penutup di kolom 0.
 *
 * Dikerjakan per-baris supaya tidak perlu mencocokkan kurung bersarang —
 * gaya penulisan di repo ini selalu menutup fungsi tingkat-atas dengan "}"
 * yang menempel di kolom 0.
 */
function badanFungsi(isi: string, tandaBuka: string): string {
  const baris = isi.split("\n");
  const mulai = baris.findIndex((b) => b.includes(tandaBuka));
  expect(mulai, `tidak ketemu di sumber: ${tandaBuka}`).toBeGreaterThan(-1);
  const sisa = baris.slice(mulai + 1);
  const panjang = sisa.findIndex((b) => b === "}");
  expect(panjang, `blok tidak tertutup: ${tandaBuka}`).toBeGreaterThan(-1);
  return sisa.slice(0, panjang).join("\n");
}

describe("lib/dramas.ts — SEMUA jalur baca katalog menempelkan daftar provider", () => {
  const isi = sumber("lib/dramas.ts");

  // Keempatnya dipakai halaman yang berbeda. Satu saja terlewat, drama yang
  // dibuka lewat halaman itu kehilangan daftar providernya tanpa gejala apa pun.
  const JALUR = [
    "export async function getAllDramas(",
    "export async function getDrama(",
    "export async function getAllDramasCached(",
    "export async function getDramaCached(",
  ];

  it.each(JALUR)("%s memanggil gabungUnduhan", (tanda) => {
    expect(badanFungsi(isi, tanda)).toContain("gabungUnduhan");
  });

  it.each([
    "export async function getAllDramasCached(",
    "export async function getDramaCached(",
  ])("%s mengoper revalidate ke ambilPetaUnduhan", (tanda) => {
    // Satu pembacaan tanpa cache membuat SELURUH halaman pemanggil dibangun
    // ulang untuk TIAP pengunjung (lib/supabase.ts). Kerusakannya muncul
    // sebagai tagihan & halaman lambat, tidak pernah sebagai error.
    expect(badanFungsi(isi, tanda)).toMatch(/ambilPetaUnduhan\(\{\s*revalidate:/);
  });

  it("berkas lokal ikut disaring — ia juga tayang saat Supabase tak terjangkau", () => {
    // getAllDramasCachedSafe jatuh ke data/dramas.json, jadi isinya bisa
    // benar-benar sampai ke atribut href di halaman penonton.
    expect(badanFungsi(isi, "function readLocalDramas(")).toContain(
      "gabungUnduhan",
    );
  });
});

describe("halaman detail drama — tombolnya BENAR-BENAR terpasang", () => {
  const isi = sumber("app/drama/[id]/page.tsx");

  it("mengimpor DownloadButton", () => {
    expect(isi).toContain('from "@/app/components/DownloadButton"');
  });

  it("merendernya, bukan sekadar mengimpornya", () => {
    // Inilah tes yang akan MERAH pada keadaan sebelum perbaikan ini: dulu
    // komponennya ada tapi tidak pernah dipanggil dari halaman mana pun.
    expect(isi).toContain("<DownloadButton");
  });

  it("mengoper daftar provider drama ini ke tombolnya", () => {
    // Tanpa baris ini modalnya tidak akan pernah terisi: tombol tetap jalan,
    // tapi selamanya memakai jalur unduh lama walau datanya sudah ada.
    expect(isi).toContain("providers={drama.downloadProviders}");
  });
});

describe("halaman detail — tombolnya di POSISI yang diminta owner & melayang", () => {
  const isi = sumber("app/drama/[id]/page.tsx");

  /** Posisi penanda di sumber; gagal keras kalau penandanya sudah tidak ada. */
  const at = (penanda: string) => {
    const p = isi.indexOf(penanda);
    expect(p, `tidak ketemu di halaman detail: ${penanda}`).toBeGreaterThan(-1);
    return p;
  };

  /** Isi atribut className tombol unduh. */
  const kelasTombol = () => {
    const awal = isi.indexOf('className="sticky', at("<DownloadButton"));
    expect(awal, "tombol unduh tidak punya className sticky").toBeGreaterThan(-1);
    const buka = isi.indexOf('"', awal + "className=".length);
    return isi.slice(buka + 1, isi.indexOf('"', buka + 1));
  };

  it("berada DI BAWAH baris badge subtitle, DI ATAS heading Sinopsis", () => {
    // Urutan visual ini permintaan owner 2026-09-23. Diuji lewat urutan
    // kemunculan di sumber karena JSX digambar berurutan — tombol yang
    // diam-diam naik lagi ke atas badge tidak memicu error apa pun.
    expect(at("<DownloadButton")).toBeGreaterThan(at("{subtitleLabel(code)}"));
    expect(at("<DownloadButton")).toBeLessThan(at("          Sinopsis"));
  });

  it("melayang mengikuti layar (sticky), bukan ikut tergulung hilang", () => {
    expect(kelasTombol().startsWith("sticky ")).toBe(true);
  });

  it("jaraknya di HP menghindari BottomNav, dan turun lagi di layar >=md", () => {
    // BottomNav setinggi ~64px menempel di dasar layar HP (layout.tsx pb-16).
    // bottom-4 saja = tombol tertimbun menu; kegagalan yang HANYA muncul di HP,
    // jadi tak akan ketahuan dari layar laptop siapa pun.
    expect(kelasTombol()).toContain("bottom-20");
    expect(kelasTombol()).toContain("md:bottom-4");
  });

  it("z-index-nya cukup untuk berada di atas isi halaman", () => {
    expect(kelasTombol()).toContain("z-30");
  });

  it("kelas sticky menempel di TOMBOL, tidak di div pembungkus", () => {
    // Sticky SELALU membuat stacking context. DownloadModal dirender sebagai
    // SAUDARA tombol, jadi tombol yang dibungkus div sticky ikut mengurung
    // modalnya: modal z-50 itu lalu kalah dari BottomNav z-30 yang di luar,
    // dan tertimbun menu bawah. Cacatnya cuma kelihatan di layar kecil.
    expect(isi).not.toContain('<div className="sticky');
  });
});

describe("pemutar /feed — daftar provider sampai ke rail ikon", () => {
  it("halaman feed mengoper daftar provider ke pemutar", () => {
    expect(sumber("app/feed/[id]/page.tsx")).toContain(
      "providers={drama.downloadProviders ?? []}",
    );
  });

  it("FeedPlayer meneruskannya ke ActionRail, bukan menelannya", () => {
    // Prop yang diterima tapi tak pernah dioper = ikon Unduh yang tak pernah
    // muncul: tanpa error, tanpa tes lain yang merah.
    const isi = sumber("app/components/FeedPlayer.tsx");
    const awal = isi.indexOf("<ActionRail");
    expect(awal, "FeedPlayer tidak merender ActionRail").toBeGreaterThan(-1);
    const tag = isi.slice(awal, isi.indexOf("/>", awal));
    expect(tag).toContain("providers={providers}");
  });

  it("modal dirender DI LUAR div rail, bukan di dalamnya", () => {
    // Div rail `absolute ... z-20` membuat stacking context: modal z-50 yang
    // dipasang di dalamnya tetap tertimbun lapisan lain di layar pemutar,
    // walau angkanya lebih besar. Penutup </div> wajib mendahului modal.
    const isi = sumber("app/components/ActionRail.tsx");
    const rail = isi.indexOf('className="pointer-events-auto absolute bottom-32');
    expect(rail, "div rail tidak ketemu").toBeGreaterThan(-1);
    const tutupRail = isi.indexOf("</div>", rail);
    const modal = isi.indexOf("<DownloadModal");
    expect(modal, "ActionRail tidak merender modalnya").toBeGreaterThan(-1);
    expect(modal).toBeGreaterThan(tutupRail);
  });
});

describe("panel admin — ada pintu masuk datanya", () => {
  // Tanpa pintu masuk, seluruh fitur ini jadi modal yang tak pernah terisi:
  // kolom database tidak bisa dibuat (akses DDL tertutup), jadi satu-satunya
  // cara owner mengisi daftar provider adalah lewat form admin.
  it("route admin menyimpan daftar provider", () => {
    const isi = sumber("app/api/admin/drama/route.ts");
    expect(isi).toContain("parseDownloadProviders");
    expect(isi).toContain("simpanUnduhan");
  });

  it("form admin menampilkan kotak isiannya", () => {
    expect(sumber("app/components/admin/DramaForm.tsx")).toContain(
      "<DownloadProviderFields",
    );
  });

  it("halaman admin mengirim field itu ke server saat menyimpan", () => {
    const isi = sumber("app/admin/page.tsx");
    expect(isi).toContain("downloadProviders={downloadProviders}");
    // Ikut terkirim di body simpan — kalau baris ini hilang, owner bisa
    // mengisi form tapi isiannya tidak pernah sampai ke database.
    const adaDiBody = isi
      .split("\n")
      .some((b) => b.trim() === "downloadProviders,");
    expect(adaDiBody).toBe(true);
  });

  it("form admin terisi ulang saat drama lama di-edit", () => {
    // Tanpa ini, membuka drama yang sudah punya provider lalu menyimpannya
    // (karena mengubah hal lain) akan MENGHAPUS daftarnya diam-diam.
    expect(sumber("app/admin/page.tsx")).toContain(
      "setDownloadProviders(d.downloadProviders ?? [])",
    );
  });
});
