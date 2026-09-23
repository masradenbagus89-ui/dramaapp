// Penjaga tombol Unduh di halaman detail drama (/drama/[id]).
//
// Dua hal yang dikunci di sini, keduanya kerusakan SENYAP kalau lepas:
//
// 1) PAYWALL. Tombol ini hanya boleh menawarkan episode yang memang gratis
//    untuk semua orang. Kalau suatu saat ada yang menaikkan DETAIL_DOWNLOAD_EP
//    ke episode berbayar, halaman detail berubah jadi pintu belakang yang
//    melewati koin — tanpa pesan error, tanpa ada yang melapor.
//
// 2) JALUR UNDUH. Alamatnya wajib relatif (lewat /api/download), BUKAN alamat
//    tunnel yang ditempel langsung. Halaman detail di-cache (revalidate = 60 +
//    generateStaticParams), sedangkan alamat tunnel berganti tiap PC backup
//    restart — alamat yang dibakar ke HTML akan menunjuk ke tempat yang sudah
//    mati. Route-nya force-dynamic, jadi ia selalu bertanya ulang.
//
// Route /api/download sendiri sudah punya penjaga terpisah di
// tests/download-redirect.test.ts (wajib menunjuk, bukan menyalurkan).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { FREE_EPISODES, PAYWALL_ENABLED, isEpisodeLocked } from "@/lib/coins";
import {
  DETAIL_DOWNLOAD_EP,
  detailDownloadUrl,
  downloadFileName,
} from "@/lib/video";

describe("tombol Unduh halaman detail — TIDAK boleh melewati paywall", () => {
  it("episode yang ditawarkan masih di dalam jatah gratis", () => {
    expect(DETAIL_DOWNLOAD_EP).toBeGreaterThanOrEqual(1);
    expect(DETAIL_DOWNLOAD_EP).toBeLessThanOrEqual(FREE_EPISODES);
  });

  it("episode itu tidak terkunci walau dramanya premium & penonton bukan admin", () => {
    const terkunci = isEpisodeLocked(DETAIL_DOWNLOAD_EP, {
      premium: true,
      isAdmin: false,
      unlocked: new Set<number>(),
    });
    expect(terkunci).toBe(false);
  });

  it("paywall memang menyala — kalau mati, tes di atas jadi hijau palsu", () => {
    // Bukan menguji tombol, tapi menguji PREMIS tes di atasnya. Tanpa baris ini
    // mematikan PAYWALL_ENABLED membuat tes ini lulus untuk alasan yang salah.
    expect(PAYWALL_ENABLED).toBe(true);
  });
});

describe("alamat unduh — wajib lewat route, bukan alamat tunnel", () => {
  it("relatif ke situs sendiri (tak ada http/tunnel yang ditempel)", () => {
    const url = detailDownloadUrl("drama-uji");
    expect(url.startsWith("/api/download?")).toBe(true);
    expect(url.includes("://")).toBe(false);
  });

  it("membawa id + ep yang benar", () => {
    expect(detailDownloadUrl("drama-uji")).toBe(
      `/api/download?id=drama-uji&ep=${DETAIL_DOWNLOAD_EP}`,
    );
  });

  it("id yang mengandung karakter aneh di-encode, tidak menyuntik query baru", () => {
    // Tanpa encodeURIComponent, id berisi "&" bisa menambahkan parameter
    // sendiri ke alamat dan menggeser arti ep.
    const url = detailDownloadUrl("aneh&ep=99");
    expect(url).toBe(`/api/download?id=aneh%26ep%3D99&ep=${DETAIL_DOWNLOAD_EP}`);
    expect(url.split("ep=").length - 1).toBe(1);
  });
});

describe("nama berkas unduhan", () => {
  it("seragam dengan tombol unduh di player: <id>-ep<n>.mp4", () => {
    expect(downloadFileName("drama-uji", 1)).toBe("drama-uji-ep1.mp4");
  });
});

// 3) TERPASANG. Penjaga ini lahir dari cacat NYATA 2026-09-22: komponen
//    DownloadButton, fungsi pembantunya, dan tes di atas semuanya ada dan
//    HIJAU - tapi tak ada satu berkas pun yang mengimpornya, jadi tombolnya
//    tidak pernah tergambar sama sekali. Tes yang hanya menguji fungsi murni
//    buta terhadap itu; yang membuktikan fiturnya ADA cuma pemeriksaan bahwa
//    halaman detail benar-benar memakainya.
//
//    Dicocokkan ke PERNYATAAN IMPORT UTUH, bukan sekadar nama komponen yang
//    muncul di mana saja: penjaga cocok-kata ikut menangkap komentar dan jadi
//    hijau palsu (pelajaran antrean-deploy 2026-09-22).
const BERKAS_DETAIL = "app/drama/[id]/page.tsx";
const IMPORT_WAJIB =
  'import DownloadButton from "@/app/components/DownloadButton";';

const sumberDetail = readFileSync(
  fileURLToPath(new URL(`../${BERKAS_DETAIL}`, import.meta.url)),
  "utf8",
);

describe("tombol Unduh BENAR-BENAR terpasang di halaman detail", () => {
  it("halaman detail mengimpornya lewat pernyataan import utuh", () => {
    expect(sumberDetail).toContain(IMPORT_WAJIB);
  });

  it("dan benar-benar merendernya, bukan sekadar mengimpor", () => {
    expect(sumberDetail).toContain("<DownloadButton");
  });

  it("tombolnya diberi id drama + jumlah episode supaya labelnya jujur", () => {
    // DownloadButton memakai `episodes` untuk memilih label "DOWNLOAD EP 1"
    // (serial) atau "DOWNLOAD" (film). Tanpa prop itu labelnya menjanjikan
    // seluruh serial padahal yang diambil cuma satu episode.
    const mulai = sumberDetail.indexOf("<DownloadButton");
    const tag = sumberDetail.slice(mulai, sumberDetail.indexOf("/>", mulai) + 2);
    expect(tag).toContain("dramaId=");
    expect(tag).toContain("episodes=");
  });
});
