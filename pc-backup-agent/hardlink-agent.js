// Hardlink agent — runs on PC backup, exposed via Caddy reverse-proxy
//
// Usage:
//   $env:HARDLINK_AGENT_SECRET = "your-secret-here"
//   $env:VIDEO_SIGNING_SECRET  = "..."                  # opsional; kosong = pemeriksaan MATI
//   $env:VIDEO_ROOT = "C:\Users\USER\Downloads\video"   # optional, has default
//   node hardlink-agent.js
//
// Endpoints:
//   GET  /health           -> { ok, videoRoot }
//   GET  /_verify          -> 204 boleh / 403 tolak   (dipanggil Caddy forward_auth)
//        header: x-forwarded-uri   (diisi Caddy sendiri, bukan penonton)
//   POST /hardlink         -> { ok, action, count, ... }
//        body: { dramaId }
//        header: x-agent-secret

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const VIDEO_ROOT =
  process.env.VIDEO_ROOT || "C:\\Users\\USER\\Downloads\\video";
const PORT = parseInt(process.env.PORT || "8089", 10);
const SECRET = process.env.HARDLINK_AGENT_SECRET;

/**
 * Rahasia pemeriksa tanda tangan alamat video — HARUS sama persis dengan
 * `VIDEO_SIGNING_SECRET` di panel hosting situs.
 *
 * ⚠️ KOSONG = PEMERIKSAAN MATI, dan itu DISENGAJA (lihat alasan lengkap di
 * `periksaTandaTanganVideo`). Mengisinya = menyalakan; mengosongkannya lalu
 * menjalankan ulang agent = SAKLAR DARURAT yang mengembalikan keadaan seperti
 * sebelum Tahap B, tanpa menyentuh Caddyfile.
 */
const VIDEO_SIGNING_SECRET = (process.env.VIDEO_SIGNING_SECRET || "").trim();

// Player selalu meminta "<nomor>.mp4", dan <video> di browser hanya bisa memutar
// kontainer MP4. Kontainer lain TIDAK cukup di-rename jadi .mp4 — isinya tetap
// bukan MP4 dan browser tetap menolak → harus dikonversi dulu, dan itu wajib
// dilaporkan ke admin, bukan dilewati diam-diam.
const EKSTENSI_VIDEO_LAIN = [
  ".mkv", ".avi", ".mov", ".wmv", ".flv",
  ".ts", ".m2ts", ".webm", ".mpg", ".mpeg", ".rmvb", ".3gp",
];

function jsonResponse(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function isValidDramaId(id) {
  return typeof id === "string" && /^[a-z0-9-]+$/.test(id) && id.length <= 100;
}

function daftarBerkas(folder) {
  if (!fs.existsSync(folder)) return [];
  return fs
    .readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

const isMp4 = (nama) => nama.toLowerCase().endsWith(".mp4");
const isSudahBernomor = (nama) => /^\d+\.mp4$/i.test(nama);
const isVideoLain = (nama) =>
  EKSTENSI_VIDEO_LAIN.some((ext) => nama.toLowerCase().endsWith(ext));

/**
 * Tentukan nomor episode tiap berkas mp4 dari angka pada namanya.
 *
 * Berkas TANPA angka (mis. film 1-episode "Over-Your-Dead-Body.mp4") dipetakan
 * ke episode 1 HANYA kalau dia satu-satunya kandidat. Kalau ada berkas bernomor
 * lain, menebak nomornya berisiko salah urut → dilaporkan sebagai `diabaikan`
 * supaya admin tahu, bukan hilang diam-diam.
 */
function petakanEpisode(namaBerkas) {
  const mapping = {};
  const tanpaNomor = [];
  for (const nama of namaBerkas) {
    // Ekstensi dibuang dulu: tanpa ini angka "4" pada ".mp4" ikut terbaca,
    // sehingga berkas tanpa nomor (mis. "trailer.mp4") salah jadi episode 4.
    const cocok = nama.replace(/\.[^.]+$/, "").match(/(\d+)/);
    const ep = cocok ? parseInt(cocok[1], 10) : NaN;
    if (!Number.isFinite(ep) || ep < 1) {
      tanpaNomor.push(nama);
      continue;
    }
    if (!mapping[ep]) mapping[ep] = [];
    mapping[ep].push(nama);
  }

  if (Object.keys(mapping).length === 0 && tanpaNomor.length === 1) {
    return { mapping: { 1: [tanpaNomor[0]] }, diabaikan: [] };
  }
  return { mapping, diabaikan: tanpaNomor };
}

function processHardlink(dramaId) {
  const cleanFolder = path.join(VIDEO_ROOT, dramaId);
  const rawFolder = path.join(VIDEO_ROOT, "_raw_" + dramaId);

  // Already prepared?
  if (fs.existsSync(path.join(cleanFolder, "1.mp4"))) {
    return {
      ok: true,
      action: "already-prepared",
      count: daftarBerkas(cleanFolder).filter(isSudahBernomor).length,
      message: "Folder sudah berisi pattern N.mp4, tidak ada yang perlu diubah.",
    };
  }

  const adaClean = fs.existsSync(cleanFolder);
  const adaRaw = fs.existsSync(rawFolder);
  if (!adaClean && !adaRaw) {
    return {
      ok: false,
      error: `Folder tidak ditemukan: "${cleanFolder}" atau "${rawFolder}". Drop file mp4 dulu di salah satunya.`,
    };
  }

  // Berkas mentah dipindah ke "_raw_<id>" supaya folder yang disajikan ke
  // penonton hanya berisi N.mp4. Kalau "_raw_" sudah ada, folder bersih TIDAK
  // di-rename (bentrok nama) — isinya tetap ikut dibaca sebagai kandidat,
  // supaya berkas yang baru di-drop ke folder bersih tidak terlewat.
  if (adaClean && !adaRaw) fs.renameSync(cleanFolder, rawFolder);
  if (!fs.existsSync(cleanFolder)) fs.mkdirSync(cleanFolder, { recursive: true });

  const kandidat = [
    ...daftarBerkas(rawFolder).map((nama) => ({ nama, dir: rawFolder })),
    ...daftarBerkas(cleanFolder)
      .filter((nama) => !isSudahBernomor(nama))
      .map((nama) => ({ nama, dir: cleanFolder })),
  ];
  const perluKonversi = kandidat
    .filter((k) => isVideoLain(k.nama))
    .map((k) => k.nama);
  const kandidatMp4 = kandidat.filter((k) => isMp4(k.nama));
  const asalBerkas = new Map(kandidatMp4.map((k) => [k.nama, k.dir]));

  const { mapping, diabaikan } = petakanEpisode(kandidatMp4.map((k) => k.nama));

  let created = 0;
  let sudahAda = 0;
  const duplicates = [];
  const failures = [];
  for (const epStr of Object.keys(mapping)) {
    const ep = parseInt(epStr, 10);
    const entries = mapping[ep];
    if (entries.length > 1) {
      duplicates.push({ ep, files: entries });
      continue;
    }
    const dst = path.join(cleanFolder, `${ep}.mp4`);
    if (fs.existsSync(dst)) {
      sudahAda++;
      continue;
    }
    try {
      fs.linkSync(path.join(asalBerkas.get(entries[0]), entries[0]), dst);
      created++;
    } catch (e) {
      failures.push({ ep, file: entries[0], error: e.message });
    }
  }

  const ringkasan = {
    count: created,
    duplicates,
    failures,
    needConvert: perluKonversi,
    ignored: diabaikan,
    sourceFolder: rawFolder,
    cleanFolder,
  };

  if (created === 0 && sudahAda > 0) {
    return {
      ok: true,
      action: "already-prepared",
      ...ringkasan,
      count: sudahAda,
      message: `Semua ${sudahAda} berkas N.mp4 sudah ada, tidak ada yang perlu dibuat.`,
    };
  }

  // Nol hardlink = TIDAK berhasil. Sebelumnya kasus ini tetap dibalas ok:true,
  // sehingga admin melihat "berhasil" padahal video tetap 404 saat diputar
  // (kerusakan senyap). Sekarang gagal + sebut penyebab yang bisa ditindak.
  if (created === 0) {
    const sebab = [];
    if (perluKonversi.length > 0)
      sebab.push(
        `ada ${perluKonversi.length} berkas video non-MP4 (${perluKonversi
          .slice(0, 3)
          .join(", ")}) — browser tidak bisa memutarnya, konversi dulu ke .mp4`,
      );
    if (duplicates.length > 0)
      sebab.push(
        `nomor episode ${duplicates
          .map((d) => d.ep)
          .join(", ")} punya lebih dari 1 berkas (ambigu)`,
      );
    if (diabaikan.length > 0)
      sebab.push(
        `${diabaikan.length} berkas .mp4 tanpa nomor episode di namanya (${diabaikan
          .slice(0, 3)
          .join(", ")}) — beri nama yang memuat angka, mis. "1.mp4"`,
      );
    if (failures.length > 0)
      sebab.push(`${failures.length} gagal dibuat (${failures[0].error})`);
    if (sebab.length === 0)
      sebab.push(
        `tidak ada berkas .mp4 di "${rawFolder}" maupun "${cleanFolder}"`,
      );

    return {
      ok: false,
      action: "none",
      ...ringkasan,
      error: `Tidak ada berkas N.mp4 yang bisa dibuat: ${sebab.join("; ")}.`,
    };
  }

  return {
    ok: true,
    action: "created",
    ...ringkasan,
    message:
      `Created ${created} hardlinks. ${duplicates.length} duplicates skipped. ${failures.length} failures.` +
      (perluKonversi.length > 0
        ? ` ${perluKonversi.length} berkas non-MP4 dilewati (perlu dikonversi ke .mp4).`
        : "") +
      (diabaikan.length > 0
        ? ` ${diabaikan.length} berkas .mp4 tanpa nomor diabaikan.`
        : ""),
  };
}

/**
 * Periksa tanda tangan alamat video. Dipanggil Caddy lewat `forward_auth`
 * SEBELUM berkas `.mp4` disajikan.
 *
 * KENAPA ADA (Tahap B, rencana 2026-10-27): sampai Tahap A, tunnel melayani
 * siapa pun yang tahu nama berkasnya — diukur di produksi: `206`, `video/mp4`,
 * isi diawali `ftypmp42`, tanpa login. Tahap A menutup cara MENEMUKAN alamat;
 * fungsi inilah yang mencabut alamat yang sudah terlanjur beredar.
 *
 * ⚠️ FORMATNYA MENGIKAT — wajib cermin dari `lib/video-signature.ts` di repo
 * situs. Kalau keduanya melenceng, video mati total. Karena berkas ini disalin
 * MANUAL ke PC backup (tak ikut `npm`), kecocokannya tidak bisa dijamin
 * compiler — maka dijaga tes `tests/video-signature-cocok.test.ts` yang
 * menandatangani dengan kode situs lalu memverifikasi dengan fungsi INI.
 *
 * ⚠️ RAHASIA KOSONG = LOLOSKAN SEMUA, dan ini keputusan sadar — bukan kelalaian
 * fail-open yang dilarang rak owasp A10. Bedanya penting: yang dilarang itu
 * meloloskan saat terjadi ERROR (gagal baca database, timeout). Di sini yang
 * terjadi adalah fitur BELUM DINYALAKAN, dan perilaku yang benar untuk itu
 * adalah "persis seperti sebelumnya". Kalau dibalik jadi tolak-semua, satu env
 * var yang lupa diisi di PC backup = SELURUH video mati, termasuk episode
 * gratis. Tanda tangan yang SALAH atau KEDALUWARSA tetap ditolak tegas.
 *
 * @param {string} uri path + query apa adanya (header `X-Forwarded-Uri` dari Caddy)
 * @param {string} rahasia isi VIDEO_SIGNING_SECRET
 * @param {number} sekarangDetik detik Unix sekarang
 * @returns {{ boleh: boolean, sebab: string }}
 */
function periksaTandaTanganVideo(uri, rahasia, sekarangDetik) {
  if (!rahasia) return { boleh: true, sebab: "pemeriksaan-mati" };
  if (typeof uri !== "string" || !uri.startsWith("/")) {
    return { boleh: false, sebab: "uri-tidak-sah" };
  }

  const batas = uri.indexOf("?");
  const jalur = batas === -1 ? uri : uri.slice(0, batas);
  const params = new URLSearchParams(batas === -1 ? "" : uri.slice(batas + 1));

  const tanda = params.get("signature");
  if (!tanda) return { boleh: false, sebab: "tanpa-tanda-tangan" };
  params.delete("signature");

  // `expires` WAJIB ada dan wajib ikut ditandatangani (dijamin di sisi situs).
  // Tanpa syarat ini, tanda tangan jadi berlaku selamanya.
  const expires = Number(params.get("expires"));
  if (!Number.isInteger(expires)) return { boleh: false, sebab: "expires-tidak-sah" };
  if (sekarangDetik > expires) return { boleh: false, sebab: "kedaluwarsa" };

  params.sort();
  const harapan = crypto
    .createHmac("sha256", rahasia)
    .update(`${jalur}?${params.toString()}`)
    .digest("base64url");

  // Dibandingkan TAHAN-WAKTU: perbandingan string biasa berhenti di huruf
  // pertama yang beda, sehingga lama-pembandingan membocorkan berapa banyak
  // huruf yang sudah benar — cukup untuk menebak tanda tangan huruf demi huruf.
  const a = Buffer.from(tanda, "utf8");
  const b = Buffer.from(harapan, "utf8");
  if (a.length !== b.length) return { boleh: false, sebab: "tanda-tangan-salah" };
  if (!crypto.timingSafeEqual(a, b)) {
    return { boleh: false, sebab: "tanda-tangan-salah" };
  }
  return { boleh: true, sebab: "sah" };
}

const server = http.createServer((req, res) => {
  // CORS (so admin form could also call directly if needed in future)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-agent-secret",
  );

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Rute dicocokkan dari JALUR saja, bukan `req.url` utuh.
  //
  // KENAPA (ditemukan saat uji lokal Tahap B, 2026-10-27): `forward_auth`
  // Caddy menulis ulang alamat jadi `/_verify` TAPI query aslinya ikut
  // terbawa — yang sampai ke sini `/_verify?expires=...&signature=...`.
  // Perbandingan `req.url === "/_verify"` tidak pernah cocok, permintaan
  // jatuh ke 404, dan Caddy meneruskan 404 itu ke penonton. Gejalanya
  // MENIPU: alamat tanpa query (tak bertanda tangan) tetap ditolak benar,
  // jadi pagarnya tampak bekerja — yang rusak justru alamat yang SAH.
  // Kalau ini lolos ke PC backup, SELURUH video mati.
  const jalurReq = (req.url || "").split("?")[0];

  if (req.method === "GET" && jalurReq === "/health") {
    return jsonResponse(res, 200, {
      ok: true,
      videoRoot: VIDEO_ROOT,
      port: PORT,
    });
  }

  // Dipanggil Caddy lewat `forward_auth` sebelum menyajikan berkas .mp4.
  // Caddy selalu mengirim GET dan menaruh alamat aslinya di X-Forwarded-Uri.
  // 2xx = Caddy lanjut menyajikan berkas; selain itu = balasan ini yang
  // diteruskan ke penonton.
  if (req.method === "GET" && jalurReq === "/_verify") {
    const uri = req.headers["x-forwarded-uri"];
    const hasil = periksaTandaTanganVideo(
      uri,
      VIDEO_SIGNING_SECRET,
      Math.floor(Date.now() / 1000),
    );
    if (hasil.boleh) {
      // 204: nol badan respons. Caddy hanya butuh tahu "boleh", dan apa pun
      // yang ditulis di sini akan ikut terkirim ke penonton kalau suatu saat
      // konfigurasinya salah.
      res.writeHead(204, { "Cache-Control": "no-store" });
      res.end();
      return;
    }
    // 403, BUKAN 401 (rak owasp §2: jangan tertukar). 401 berarti "login lalu
    // coba lagi" — di tunnel ini tidak ada jalur login yang bisa ditempuh
    // penonton, jadi 401 akan menyesatkan.
    //
    // `sebab` SENGAJA tidak dikirim ke penonton: membedakan "tanda tangan
    // salah" dari "kedaluwarsa" membantu orang menebak-nebak. Alasannya tetap
    // terlihat pengelola di log baris bawah.
    console.warn(`[verify] DITOLAK (${hasil.sebab}) uri=${uri}`);
    return jsonResponse(res, 403, { error: "Alamat video tidak sah." });
  }

  if (req.method === "POST" && jalurReq === "/hardlink") {
    const providedSecret = req.headers["x-agent-secret"];
    if (providedSecret !== SECRET) {
      return jsonResponse(res, 401, { error: "Unauthorized" });
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const dramaId = parsed.dramaId;
        if (!isValidDramaId(dramaId)) {
          return jsonResponse(res, 400, {
            error:
              "Invalid dramaId. Harus huruf kecil, angka, dash. Maks 100 char.",
          });
        }
        const result = processHardlink(dramaId);
        jsonResponse(res, result.ok ? 200 : 400, result);
      } catch (e) {
        jsonResponse(res, 500, { error: e.message });
      }
    });
    return;
  }

  jsonResponse(res, 404, { error: "Not found" });
});

// Server hanya dinyalakan saat berkas ini dijalankan langsung
// (`node hardlink-agent.js`). Saat di-import tes, cukup fungsinya yang dipakai —
// tanpa membuka port 8089.
if (require.main === module) {
  if (!SECRET) {
    console.error(
      "[hardlink-agent] FATAL: HARDLINK_AGENT_SECRET env var belum di-set.",
    );
    console.error("Set dulu di PowerShell:");
    console.error('  $env:HARDLINK_AGENT_SECRET = "<token-rahasia>"');
    console.error("Lalu jalankan lagi: node hardlink-agent.js");
    process.exit(1);
  }

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`[hardlink-agent] Listening on http://127.0.0.1:${PORT}`);
    console.log(`[hardlink-agent] Video root: ${VIDEO_ROOT}`);
    console.log(`[hardlink-agent] Secret set: YES (length: ${SECRET.length})`);
    console.log(
      `[hardlink-agent] Test health: curl http://127.0.0.1:${PORT}/health`,
    );
  });
}

module.exports = { petakanEpisode, processHardlink, periksaTandaTanganVideo };
