// Penjaga DUA temuan owner 2026-11-09 saat menguji isian manual di produksi:
//
//   1. "tidak semua muncul di film untuk tahun dan durasi"
//   2. "durasi kamu seragamkan dengan cara penulisan film lainnya"
//
// Keduanya ternyata punya sebab yang berbeda, dan keduanya rusak-SENYAP —
// tak ada error, tak ada halaman gagal, cuma angka yang salah atau hilang di
// pojok poster. Tes ini yang MERAH kalau sebabnya kambuh.
//
// Dibaca dari BERKAS SUMBER, bukan dengan merender: yang dijaga di sini adalah
// keputusan konfigurasi (`revalidate`) dan kehadiran pratinjau — keduanya tidak
// punya keluaran yang bisa diperiksa dari HTML satu komponen.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Baca berkas sumber dengan akhiran baris DINORMALKAN.
 *
 * 🪤 WAJIB lewat sini, jangan `readFileSync` langsung. Git menulis berkas
 * sumber dengan CRLF saat checkout di Windows, jadi pola ber-`\n` yang ditulis
 * di tes TIDAK PERNAH cocok — dan itu membuat tes hijau di satu rilis lalu
 * merah di rilis berikutnya tanpa ada yang mengubah kodenya. Sudah menipu satu
 * sesi penuh (tests/episode-naik-ke-sidebar.test.ts, 2026-11-09).
 */
function bacaSumber(berkas: string): string {
  return readFileSync(join(process.cwd(), berkas), "utf-8").replace(
    /\r\n/g,
    "\n",
  );
}

describe("temuan 1 — halaman publik menyegarkan diri dengan tundaan yang SAMA", () => {
  // Keempatnya membaca sumber yang sama persis (getPlaylyVideosGabunganCached)
  // dan memajang kartu yang sama. Tundaan yang berbeda bukan pilihan teknis
  // yang netral: ia terbaca admin sebagai "isian saya hilang di sebagian
  // halaman", dan tak ada satu pun pesan yang menjelaskannya.
  const halamanPublik = [
    "app/page.tsx",
    "app/beranda/page.tsx",
    "app/discover/page.tsx",
    "app/film/page.tsx",
  ];

  it("regresi: /film menyimpan salinan 5x lebih lama dari saudaranya", () => {
    // Terukur 2026-11-09 di produksi: objek video yang SAMA berisi
    // `durationLabel: "1:45"` di /discover tapi masih `"-"` di /film, karena
    // halaman itu memakai revalidate 300 sementara tiga lainnya 60.
    const angka = halamanPublik.map((berkas) => {
      const cocok = bacaSumber(berkas).match(
        /export const revalidate = (\d+)/,
      );
      expect(cocok, `${berkas} tidak menyatakan revalidate`).not.toBeNull();
      return { berkas, detik: Number(cocok![1]) };
    });

    const berbeda = angka.filter((a) => a.detik !== angka[0].detik);
    expect(
      berbeda,
      `tundaan tidak seragam: ${angka.map((a) => `${a.berkas}=${a.detik}`).join(", ")}`,
    ).toEqual([]);
  });

  it("tundaannya tidak melebihi TTL katalog — kalau lebih, isian manual tertahan", () => {
    // CATALOG_TTL_SECONDS (lib/dramas.ts) yang menahan peta isian manual.
    // Halaman yang menyimpan salinan LEBIH LAMA dari itu membuat admin
    // menunggu tanpa tahu berapa lama.
    const ttl = Number(
      bacaSumber("lib/dramas.ts").match(
        /CATALOG_TTL_SECONDS = (\d+)/,
      )![1],
    );
    for (const berkas of halamanPublik) {
      const detik = Number(
        bacaSumber(berkas).match(/export const revalidate = (\d+)/)![1],
      );
      expect(detik, `${berkas} menahan isian manual lebih lama dari katalog`)
        .toBeLessThanOrEqual(ttl);
    }
  });
});

describe("temuan 2 — panel isian memperlihatkan hasil bacaan sebelum disimpan", () => {
  const PANEL = "app/components/admin/PlaylyVisibilityManager.tsx";

  it("pratinjau benar-benar terpasang — dikunci lewat NAMA FUNGSI", () => {
    // Sengaja mencari `jelaskanDurasiManual`, bukan kata "pratinjau" atau
    // tanda "=": kalimat apa pun di komentar bisa lolos sebagai bukti palsu,
    // pemanggilan fungsi tidak. Pelajaran dari penjaga kotak-cari 2026-11-09,
    // yang sempat dilaporkan ada padahal yang terhitung cuma teks komentar.
    const isi = bacaSumber(PANEL);
    expect(isi).toContain("jelaskanDurasiManual");
    expect(isi).toContain('from "@/lib/meta-video-manual"');
  });

  it("petunjuknya mengajarkan bentuk kartu, bukan aturan lama menit.detik", () => {
    // Petunjuk lama ("Durasi ditulis menit.detik") adalah yang menyesatkan
    // owner: ia menyalin "1:47:00" dari kartu dan mendapat 1 menit.
    const isi = bacaSumber(PANEL);
    expect(isi).toContain("persis seperti yang tampil di kartu");
    expect(isi).toContain("1:47:00");
  });

  it("panel menyebut berapa lama perubahan sampai ke situs", () => {
    // Tanpa kalimat ini admin menyimpan lalu melihat situs, tidak menemukan
    // perubahannya, dan menyimpulkan simpanannya gagal — persis yang terjadi.
    expect(bacaSumber(PANEL)).toMatch(/tampil di situs dalam/i);
  });
});
