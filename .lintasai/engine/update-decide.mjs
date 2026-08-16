// engine/update-decide.mjs — GERBANG KEPUTUSAN "boleh tukar kit, atau berhenti?".
//
// Dipecah dari update-kit.mjs (Fase E 2026-07-25): isi + tiap teks pesan dipindah APA ADANYA.
// KENAPA berdiri sendiri: ini satu-satunya tempat aturan boleh/tidak-boleh update diputuskan, dan ia
// MURNI (nol I/O — pemanggil yang menyediakan fakta lalu mengeksekusi). Jadi tiap aturan bisa diuji
// tanpa jaringan/disk (tests/update-npm-decision.test.mjs).
import { eqCI } from './fs-text.mjs'
import { parseDotNetVersion, compareDotNetVersion } from './update-changelog.mjs'

// Keputusan jalur npm: BOLEH tukar kit, atau BERHENTI? Murni (tanpa I/O) supaya tiap aturan bisa
// diuji tanpa menyentuh disk/jaringan; pemanggil yang menyediakan fakta + mengeksekusi.
//
// Yang dijaga di sini (semua dari audit + riset 2026-07-15):
//  (a) sumber == tujuan -> menyalin folder ke dirinya sendiri = tak bermakna. Terjadi kalau update
//      dijalankan DARI kit terpasang (node .lintasai/update-kit.mjs) alih-alih lewat npx.
//  (b) JEBAKAN npx (paling penting): `npx lintasai update` TAK dijamin menjalankan versi terbaru -
//      dokumentasi npm: "Package names provided without a specifier will be matched with whatever
//      version exists in the local project", dan cache npx membekukan versi (npm/cli#6179; baru
//      diperbaiki sebagian di npm 11.2.0 - klien ber-npm 10.x masih kena). Tanpa gerbang ini, updater
//      LAMA akan memasang kit LAMA sambil melapor "sukses" = kelas bug paling senyap.
//  (c) TUF anti-rollback ("attacker presents files older than those the client has already seen"):
//      JANGAN turunkan versi kit klien tanpa izin eksplisit.
// FAIL-OPEN untuk (b): latestNpmVersion null (offline/registry diblokir) -> JANGAN memblokir update;
// pengetahuan yang tak ada bukan alasan menahan klien (pemanggil melapor "belum bisa dibandingkan").
// `paksaRefresh` (2026-07-26): folder kit BARU SAJA diganti nama oleh migrasi. Isi kit di disk
// berasal dari SEBELUM rename, jadi kodenya masih mencari folder dengan nama LAMA -> rak/registry
// tak ketemu, routing skill mati diam-diam. Nomor versi bisa saja SAMA (mis. update dijalankan dari
// paket dengan versi yang sama), tapi isinya WAJIB tetap disegarkan. Ini HANYA menimpa 'uptodate';
// semua cabang 'stop' (sumber==tujuan / updater bukan terbaru / tolak turun-versi) TETAP menang
// karena itu pagar keamanan, bukan optimasi.
export function decideNpmUpdate({
  selfKitDir,
  kitDir,
  selfVersion,
  installedVersion,
  latestNpmVersion = null,
  allowDowngrade = false,
  paksaRefresh = false,
}) {
  const sama = (a, b) => eqCI(String(a ?? '').replace(/[\\/]+$/, ''), String(b ?? '').replace(/[\\/]+$/, ''))
  if (sama(selfKitDir, kitDir)) {
    return {
      action: 'stop',
      reason: 'sumber-sama-dengan-tujuan',
      message:
        'Update ini dijalankan DARI kit yang sedang terpasang, jadi tak ada versi baru untuk disalin.\n' +
        "Jalankan lewat npx supaya npm mengambilkan versi terbaru: 'npx lintasai@latest update'",
    }
  }

  const bersih = (v) => String(v ?? '').replace(/^v/, '').trim()
  const selfV = bersih(selfVersion)
  if (!selfV || parseDotNetVersion(selfV) === null) {
    return {
      action: 'stop',
      reason: 'versi-diri-tak-terbaca',
      message:
        'Tidak bisa memastikan versi paket lintasAI yang sedang berjalan (CHANGELOG.md-nya tak terbaca).\n' +
        "Demi aman, kit kamu TIDAK diubah. Coba: 'npx lintasai@latest update'",
    }
  }

  // (b) Gerbang versi-diri - hanya kalau kita TAHU versi terbaru (fail-open).
  const latestV = bersih(latestNpmVersion)
  if (latestV && parseDotNetVersion(latestV) !== null) {
    const c = compareDotNetVersion(selfV, latestV)
    if (c !== null && c < 0) {
      return {
        action: 'stop',
        reason: 'updater-bukan-terbaru',
        message:
          `Perintah update yang berjalan ini versi v${selfV}, padahal yang terbaru v${latestV}.\n` +
          'Kalau diteruskan, kit kamu justru dipasangi versi lama. Kit TIDAK diubah.\n' +
          "Jalankan ini supaya dapat yang terbaru: 'npx lintasai@latest update'",
      }
    }
  }

  const instV = bersih(installedVersion)
  const instTerbaca = instV && instV !== 'unknown' && parseDotNetVersion(instV) !== null
  if (instTerbaca) {
    const c = compareDotNetVersion(instV, selfV)
    if (c === 0) {
      if (paksaRefresh) {
        return {
          action: 'proceed',
          reason: 'refresh-pasca-migrasi',
          message: `Versi kit tetap v${instV}, TAPI folder kit baru saja diganti nama - isi kit disegarkan supaya kodenya menunjuk folder yang benar.`,
          fromVersion: instV,
          toVersion: selfV,
        }
      }
      return { action: 'uptodate', reason: 'sudah-terbaru', message: `Kit kamu sudah v${instV} - sama dengan versi terbaru yang tersedia. Tidak ada yang perlu diubah.` }
    }
    if (c !== null && c > 0 && !allowDowngrade) {
      return {
        action: 'stop',
        reason: 'tolak-turun-versi',
        message:
          `Kit terpasang (v${instV}) lebih BARU dari paket yang mau dipasang (v${selfV}).\n` +
          'Menurunkan versi bisa merusak berkas yang sudah menyesuaikan versi baru, jadi dihentikan.\n' +
          "Kalau memang sengaja mau turun versi, ulangi dengan '--allow-downgrade'.",
      }
    }
  }

  return {
    action: 'proceed',
    reason: instTerbaca ? 'ada-update' : 'versi-terpasang-tak-diketahui',
    message: instTerbaca ? `Update tersedia: v${instV} -> v${selfV}` : `Akan memasang v${selfV} (versi terpasang tak diketahui).`,
    fromVersion: instTerbaca ? instV : null,
    toVersion: selfV,
  }
}
