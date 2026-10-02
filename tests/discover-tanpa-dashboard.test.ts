// Penjaga permanen: halaman katalog lengkap (/discover) TIDAK boleh lagi
// menggambar seksi "Video terbaru" dari jalur dashboard upload Playly.
//
// KENAPA SEKSI ITU DILEPAS (owner, 2026-10-02): jalur dashboard menolak
// SELURUH daftarnya — terukur di produksi 20 dari 20 video gagal dengan alasan
// "tidak ada alamat video", karena Playly memang tidak menyertakan alamat
// berkas di daftar (hanya saat video diputar). Akibatnya penonton melihat kotak
// kosong bertulisan "Belum ada video yang di-upload dari dashboard" — kalimat
// yang KELIRU: videonya ada, cuma ditolak.
//
// Dan memperbaikinya tidak ada gunanya: ke-20 video itu TERBUKTI video yang
// sama dengan yang sudah tampil sehat di /film dan /beranda lewat jalur
// katalog, dicocokkan per judul (Furiosa, Despicable Me 4, Deadpool & Wolverine,
// Badland Hunters, Bad Boys Ride or Die). Jadi seksi itu duplikat yang rusak.
//
// ⚠️ TES INI MENYARING KOMENTAR LEBIH DULU, dan itu bukan kehati-hatian
// berlebihan: berkas yang diuji SENGAJA menyimpan penjelasan panjang yang
// menyebut nama komponennya, supaya sesi berikutnya tahu kenapa ia dilepas.
// Tanpa penyaringan, tes ini akan merah karena penjelasannya sendiri. Pola
// "tes cocok-teks tertipu komentar" sudah kambuh tiga kali di project ini
// (tercatat 2026-09-22 dan dua kali pada 2026-09-26).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const HALAMAN = join(process.cwd(), "app", "discover", "page.tsx");

/**
 * Buang komentar blok dan komentar baris, sisakan kode yang benar-benar jalan.
 *
 * `//` harus didahului AWAL BARIS atau SPASI — bukan sembarang `//`. Tanpa
 * syarat itu, alamat seperti "https://..." di dalam string ikut terpotong dan
 * penyaring ini malah merusak kode yang sedang diperiksanya. Komentar yang
 * menempel di akhir baris kode juga ikut terbuang, bukan cuma yang berdiri
 * sendiri di awal baris — versi pertama fungsi ini melewatkannya, dan tes
 * "penyaring komentar benar-benar bekerja" di bawah yang menangkapnya.
 */
function tanpaKomentar(isi: string): string {
  return isi
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1");
}

describe("/discover tidak lagi memakai jalur dashboard upload", () => {
  const kode = tanpaKomentar(readFileSync(HALAMAN, "utf-8"));

  it("tidak mengimpor maupun merender DashboardVideoGrid", () => {
    expect(kode).not.toContain("DashboardVideoGrid");
  });

  it("tidak membaca env DASHBOARD_API_URL", () => {
    // Kalau env ini dibaca lagi di sini, artinya seksi itu (atau penggantinya)
    // kembali masuk ke halaman penonton.
    expect(kode).not.toContain("DASHBOARD_API_URL");
  });

  it("komponennya benar-benar dihapus, bukan cuma tidak dipakai", () => {
    // Dead code yang ditinggalkan akan dipungut lagi oleh sesi berikutnya yang
    // mengira ia masih terpakai.
    expect(() =>
      readFileSync(join(process.cwd(), "app", "components", "DashboardVideoGrid.tsx")),
    ).toThrow();
  });

  // Jaring pengaman untuk penyaring di atas: kalau `tanpaKomentar` suatu saat
  // rusak dan berhenti membuang apa pun, ketiga tes di atas berubah jadi hijau
  // palsu tanpa ada yang menyadarinya.
  it("penyaring komentar benar-benar bekerja", () => {
    const contoh = "const a = 1; // DashboardVideoGrid\n/* DASHBOARD_API_URL */\nconst b = 2;";
    const bersih = tanpaKomentar(contoh);
    expect(bersih).not.toContain("DashboardVideoGrid");
    expect(bersih).not.toContain("DASHBOARD_API_URL");
    expect(bersih).toContain("const b = 2");
  });

  it("isi halaman yang SEHAT tetap ada (bukan terhapus kebablasan)", () => {
    // Yang dilepas hanya seksi paling bawah. Katalog dramanya harus utuh.
    expect(kode).toContain("DramaBrowser");
    expect(kode).toContain("getAllDramasCachedSafe");
  });
});
