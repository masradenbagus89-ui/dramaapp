// Penjaga DAFTAR KUALITAS di menu pemutar film (owner 2026-11-13).
//
// Angka-angka ukuran di tes ini BUKAN karangan — semuanya diukur 2026-11-13
// dari berkas film yang benar-benar tayang di produksi, lewat Chrome yang
// membaca `videoWidth`/`videoHeight`:
//
//     Sentimental Value    1916x1036
//     An Alien Asked Me…   1920x1080
//     Bolehkah Sekali Saja 1280x720
//     Ayo Balikan          1280x720
//     The Crow             1280x688
//
// Dua di antaranya (1916x1036 dan 1280x688) adalah film layar lebar yang
// gambarnya dipotong, dan justru itu yang membuat aturan "pakai tinggi saja"
// salah — ia akan melabeli film 1080p sebagai "1036p".
import { describe, it, expect } from "vitest";
import { daftarKualitas, kelasKualitas } from "../lib/kualitas-pemutar";

describe("kelasKualitas — angka yang ditampilkan ke penonton", () => {
  it("film 16:9 utuh memakai tingginya apa adanya", () => {
    expect(kelasKualitas(1920, 1080)?.label).toBe("1080p");
    expect(kelasKualitas(1280, 720)?.label).toBe("720p");
    expect(kelasKualitas(854, 480)?.label).toBe("480p");
  });

  it("🪤 film layar lebar yang dipotong tetap masuk kelas yang benar", () => {
    // 1916x1036 = "Sentimental Value". Kalau dinilai dari tingginya saja, ia
    // jatuh ke 720p — penonton melihat film 1080p disebut 720p, dan tak ada
    // satu pun error yang muncul.
    expect(kelasKualitas(1916, 1036)?.label).toBe("1080p");
    // 1280x688 = "The Crow": lebarnya 1280, jadi kelasnya 720p walau tingginya
    // cuma 688.
    expect(kelasKualitas(1280, 688)?.label).toBe("720p");
    // Kasus ekstrem: cinemascope 2.39:1 pada lebar 1920.
    expect(kelasKualitas(1920, 804)?.label).toBe("1080p");
  });

  it("ukuran yang belum diketahui = null, BUKAN tebakan", () => {
    // Sebelum metadata video dimuat, videoWidth/videoHeight keduanya 0.
    // Menebak "1080p" di sini membuat angka di layar berubah sendiri sedetik
    // kemudian — terbaca seperti menu yang berkedip rusak.
    expect(kelasKualitas(0, 0)).toBeNull();
    expect(kelasKualitas(-1, 100)).toBeNull();
    expect(kelasKualitas(Number.NaN, 1080)).toBeNull();
  });

  it("video sangat kecil tetap dapat kelas terendah, bukan null", () => {
    // null berarti "belum tahu" dan menu menampilkan Auto. Video 240p itu
    // TAHU, cuma kecil — keduanya tidak boleh tertukar.
    expect(kelasKualitas(320, 240)?.label).toBe("360p");
  });
});

describe("daftarKualitas — isi menu", () => {
  it("film 1080p menampilkan 1080p / 720p / 480p seperti contoh owner", () => {
    const opsi = daftarKualitas(1920, 1080);
    expect(opsi.map((o) => o.label)).toEqual(["1080p", "720p", "480p"]);
  });

  it("🪤 film 720p TIDAK menawarkan 1080p", () => {
    // Janji yang bahkan secara teori tidak bisa ditepati: berkasnya memang
    // tidak punya piksel sebanyak itu. Menawarkannya = menipu dua lapis.
    const opsi = daftarKualitas(1280, 720);
    expect(opsi.map((o) => o.label)).toEqual(["720p", "480p", "360p"]);
    expect(opsi.map((o) => o.label)).not.toContain("1080p");
  });

  it("kualitas asli selalu jadi baris PERTAMA (yang tercentang)", () => {
    expect(daftarKualitas(1916, 1036)[0].label).toBe("1080p");
    expect(daftarKualitas(1280, 688)[0].label).toBe("720p");
  });

  it("lencana HD hanya untuk 720p ke atas", () => {
    const opsi = daftarKualitas(1920, 1080);
    expect(opsi.find((o) => o.label === "1080p")?.lencana).toBe("HD");
    expect(opsi.find((o) => o.label === "720p")?.lencana).toBe("HD");
    expect(opsi.find((o) => o.label === "480p")?.lencana).toBeNull();
  });

  it("ukuran belum diketahui → daftar KOSONG (pemutar menampilkan Auto)", () => {
    expect(daftarKualitas(0, 0)).toEqual([]);
  });

  it("daftarnya tidak pernah lebih dari 3 baris", () => {
    // Menu pemutar itu sempit; tangga penuh (2160p…360p) akan memanjang
    // melewati tepi layar HP.
    expect(daftarKualitas(3840, 2160).length).toBe(3);
    expect(daftarKualitas(1920, 1080).length).toBe(3);
  });

  it("nilai yang disimpan sama dengan labelnya — satu nama untuk satu hal", () => {
    // Nilai dan label yang berbeda ("hd1080" vs "1080p") memaksa penerjemahan
    // di dua tempat, dan itu sumber salah-centang yang senyap.
    for (const o of daftarKualitas(1920, 1080)) expect(o.nilai).toBe(o.label);
  });
});
