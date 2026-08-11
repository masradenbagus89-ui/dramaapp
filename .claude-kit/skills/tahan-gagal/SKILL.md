---
nama: tahan-gagal
deskripsi: Panggilan layanan luar yang tahan-banting — coba-ulang berjeda (retry+backoff+jitter) + saklar-pemutus (circuit breaker), supaya 1 layanan rewel tak menyeret seluruh sistem.
divisi: backend
pemicu: [retry, coba-ulang, coba-lagi, timeout, circuit-breaker, saklar-pemutus, backoff, api-eksternal, api-pihak-ketiga, layanan-luar, tahan-gagal, resilience]
rawan_keamanan: false
menggantikan: []
---

# Skill: Tahan-Gagal — panggilan API eksternal yang tahan-banting (kelas industri)

> **Kapan skill ini aktif:** prompt menyentuh "panggil API luar / layanan pihak-ketiga / retry / timeout / sering gagal-sementara / bikin tahan-banting". Dispatcher `rak-pemicu` menyalakannya otomatis saat menulis/menilai kode yang memanggil layanan luar rapuh (Supabase/Cloudflare/Stripe/gateway/dll).
>
> 🙂 **Analogi:** dua pengaman ini seperti **nelpon CS yang sibuk** (retry: putus → tunggu → coba lagi, makin sibuk makin lama — bukan pencet ulang 100×) + **MCB listrik** (saklar-pemutus: korslet terus → putuskan aliran biar tak kebakaran, 1 alat rusak tak menyeret seluruh rumah).

Skill ini **advisory** (§4.17): otak native memutuskan adopsi/adaptasi/abaikan tiap 📐/💡. Ini **TAMBAHAN**, bukan pengganti larangan "catch kosong" (§5 — tetap berlaku): bikin panggilan ke layanan luar tahan saat sibuk/lelet/sempat mati. Untuk saklar-pemutus, **utamakan library teruji** ketimbang menulis sendiri (cek dokumentasi versi terpasang, §8.2 A3).

---

## 1. Kontrak (yang HARUS benar — sebelum bilang "sudah tahan-gagal")

- 🔒 **HASIL — tahan-gagal ≠ menyembunyikan gagal.** Saat semua percobaan habis / saklar terbuka → **kembalikan pesan ramah ke user** ("Layanan sedang sibuk, coba lagi sebentar lagi") + 4 state UI (§10) — BUKAN layar error mentah / stack trace / spinner selamanya. Dan **tiap percobaan tetap dicatat** (log terstruktur) — jangan telan diam-diam (tetap tunduk larangan `catch {}` kosong, §12).
- 🔒 **HASIL — JANGAN ulang operasi tak-idempoten tanpa pengaman.** "Buat pembayaran" yang diulang bisa menagih 2×. Pakai idempotency-key (kunci sekali-pakai per-transaksi supaya operasi sama tak diproses/ditagih 2×) penyedia dulu → `skills/pembayaran/SKILL.md`.

---

## 2. Cara rakit — 2 lapis pertahanan (dipakai bareng)

**Kapan PAKAI (jangan di mana-mana):**
- ✅ Panggilan jaringan ke layanan luar yang gagalnya **sementara**: timeout, koneksi putus, `5xx`, `429` (kena rate-limit). Layak dicoba-ulang.
- ❌ JANGAN ulang error **`4xx` selain 429** (`400`/`401`/`403`/`404`) — itu salah **permanen**; ulang cuma buang waktu.

1. 📐 **Lapis 1 — Coba-ulang berjeda makin lama (retry + exponential backoff + jitter):** gagal-sementara → tunggu lalu coba lagi, jeda makin panjang (~0,5d→1d→2d) + **acak kecil (jitter)** biar klien tak menyerbu di detik yang sama. Batas: **maks ~3 percobaan** + **batas-atas jeda** (mis. 10d). Hormati header `Retry-After` dari `429`. Bungkus tiap percobaan dengan **timeout** (`AbortController`/`context.WithTimeout`) supaya 1 panggilan macet tak menahan antrean.
2. 📐 **Lapis 2 — Saklar-pemutus (circuit breaker):** layanan luar **jelas tumbang** (gagal beruntun ~5×) → **berhenti** memanggil selama jeda (mis. 30d), langsung kembalikan pesan ramah/data cadangan (`OPEN` = tolak-cepat). Sesudah jeda, coba **1 probe** (`HALF_OPEN`): sukses → buka lagi (`CLOSED`); gagal → tutup lagi. Ini mencegah **cascading failure** (1 layanan tumbang menyeret seluruh sistem karena semua permintaan antre menunggu timeout).
3. 🔒 **HASIL — JANGAN bikin algoritma kripto/keamanan sendiri**, dan untuk saklar-pemutus **utamakan library teruji** (banyak tersedia per-stack) ketimbang menulis sendiri yang rawan bug (sejalan §5).

🙂 **Non-Programmer (ringkasan):** dua pengaman ini bikin aplikasimu **tidak gampang tumbang gara-gara layanan orang lain rewel** — seperti aplikasi bank yang otomatis coba lagi saat jaringan lelet, lalu bilang "coba lagi nanti" dengan sopan saat sistem gangguan (bukan nge-hang layar putih).

---

## 3. Powerful — pola coba-ulang siap-adaptasi

🧪 **CONTOH KASUS (ambil polanya, jangan salin mentah — netralkan ke stack + versi library terpasang):**

```ts
// Coba fn() maks 3x; jeda makin lama + acak kecil; HANYA ulang error sementara (bukan 4xx selain 429).
async function withRetry<T>(fn: () => Promise<T>, max = 3, baseMs = 500, maxMs = 10_000): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= max; attempt++) {
    try { return await fn() }
    catch (e) {
      lastErr = e
      if (attempt === max || !isRetriable(e)) throw e   // 4xx (kecuali 429) langsung lempar — jangan diulang
      const jitter = Math.random() * baseMs
      const delay = Math.min(baseMs * 2 ** (attempt - 1) + jitter, maxMs)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastErr
}
```

- 📐 CARA BAKU: `isRetriable(e)` = true HANYA untuk timeout/koneksi-putus/`5xx`/`429`. Untuk lapis-2 (saklar-pemutus) **lebih bersih pakai library teruji** daripada menulis state-machine sendiri.
- 💡 SARAN: gabungkan dengan antrean latar (retry berat = kerja worker, bukan menahan request user) → `skills/background-job/SKILL.md`.

---

## 4. Self-verify (sangkal diri sendiri SEBELUM bilang "sudah tahan-gagal" — §8.2 Aturan 3)

- [ ] Hanya error **sementara** yang diulang (uji: `400`/`403` → langsung lempar, tak diulang)?
- [ ] Retry **berbatas** (maks ~3) + backoff + jitter + batas-atas jeda + hormati `Retry-After`?
- [ ] Tiap percobaan **dibungkus timeout** (1 panggilan macet tak menahan yang lain)?
- [ ] Operasi tak-idempoten (bayar/kirim) **tak diulang tanpa idempotency-key**?
- [ ] Saklar-pemutus untuk layanan yang bisa tumbang total (pakai library teruji)?
- [ ] Saat gagal-total → **pesan ramah + 4 state UI**, tiap percobaan **tercatat di log** (bukan ditelan)?

> **Verifikasi nyata (§4.6):** jangan klaim "sudah tahan-gagal" tanpa bukti. Idealnya ada tes yang **mensimulasikan gagal-lalu-pulih** (mock yang gagal 2× lalu sukses) — selaras `skills/cakupan-tes/SKILL.md`. Verifikasi = cuma-baca (§8.2 Aturan 3).

---

## 5. Definition-of-Done (kapan skill tahan-gagal dianggap benar-selesai)

- [ ] **Kontrak (§1)** terpenuhi: gagal-total → pesan ramah + tercatat; tak-idempoten tak diulang tanpa pengaman.
- [ ] Retry-backoff-jitter-berbatas + timeout per-percobaan + (bila perlu) saklar-pemutus terpasang.
- [ ] **Edge case** diuji: gagal-lalu-pulih, gagal-terus (saklar terbuka), `429` dengan `Retry-After`, `4xx` permanen tak diulang.
- [ ] **Self-verify (§4) tercentang** dengan bukti `berkas:baris`; ada tes gagal-lalu-pulih.
- [ ] Tak ada `catch {}` kosong / spinner selamanya; user selalu dapat kabar.

---

## 6. Handoff / rujuk-silang (reuse-first — JANGAN salin, RUJUK)

- 📐 **Anti proses-dobel / idempotency-key** (sebelum meng-retry operasi bayar/kirim) → `skills/pembayaran/SKILL.md`.
- 📐 **Kerja latar / antrean tahan-restart** (retry berat sebagai job worker) → `skills/background-job/SKILL.md`.
- 📐 **Tes gagal-lalu-pulih** (mock gagal 2× lalu sukses + tes regresi) → `skills/cakupan-tes/SKILL.md`.
- 🗃️ **LATAR — kredit sumber:** pola dari ECC v2.0.0 (MIT), ditulis-ulang non-programmer; rak asal skill ini hanya di riwayat git.

---

## 7. Threat-model 3-baris + batas jujur

- 🗃️ **LATAR — Threat-model:** **Aset:** ketersediaan aplikasimu (tak ikut tumbang saat layanan luar rewel) + konsistensi (tak dobel-proses). **Mode-gagal:** cascading failure (1 layanan lambat → semua antre timeout → sistem lumpuh), retry membabi-buta (badai permintaan / menagih 2×), gagal ditelan diam-diam (user lihat layar putih). **Mitigasi:** retry-backoff-jitter-berbatas + timeout + saklar-pemutus + idempotency-key + log tiap percobaan + pesan ramah.
- 🗃️ **LATAR — Batas jujur:** pola ini menaikkan **lantai** ketahanan panggilan keluar; **tidak menggantikan** desain sistem terdistribusi menyeluruh (bulkhead, backpressure, degradasi bertingkat) untuk skala besar. Utamakan library teruji untuk saklar-pemutus; cek dokumentasi **versi terpasang**.
