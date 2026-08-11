# 🗺️ Plan Mapping — Drama-App / DramaKu

> Peta perjalanan project dari awal sampai sekarang + rencana berikutnya.
> App live: https://dramaapp.vercel.app/
>
> **Cara lihat diagram:** buka file ini di GitHub (web) atau VS Code Preview — diagram di bawah otomatis jadi peta node/flowchart.

---

## 📊 Peta Alur

```mermaid
flowchart TD
    START(["🎬 DRAMA-APP<br/>Aplikasi streaming drama China"]):::root

    START --> S1
    S1["✅ 1. Setup Project"]:::done
    S1 -.-> S1a["Ambil code dari GitHub,<br/>jalan di laptop"]:::leaf

    S1 --> S2
    S2["✅ 2. Online di Vercel"]:::done
    S2 -.-> S2a["App bisa dibuka publik:<br/>dramaapp.vercel.app"]:::leaf

    S2 --> S3
    S3["✅ 3. Video Bisa Diputar"]:::done
    S3 -.-> S3a["Video disimpan di PC backup,<br/>disalurkan lewat tunnel"]:::leaf

    S3 --> S4
    S4["✅ 4. Admin Form Otomatis"]:::done
    S4 -.-> S4a["Tambah drama tanpa<br/>edit file manual lagi"]:::leaf

    S4 --> S5
    S5["✅ 5. Auto-Hardlink"]:::done
    S5 -.-> S5a["Tambah drama baru<br/>cukup 3 klik"]:::leaf

    S5 --> S6
    S6["✅ 6. Script Otomatis"]:::done
    S6 -.-> S6a["1 command start semua +<br/>auto-update Vercel"]:::leaf

    S6 --> S7
    S7["🔜 7. Named Tunnel<br/>BERIKUTNYA"]:::next
    S7 -.-> S7a["URL video stabil selamanya,<br/>stop ganti-ganti URL"]:::leaf

    S7 --> S8
    S8["⚪ 8. Perbaikan Akhir"]:::todo
    S8 -.-> S8a["Fix bug judul panjang +<br/>keamanan admin"]:::leaf

    classDef root fill:#0d1117,stroke:#58a6ff,color:#e6edf3,stroke-width:2px
    classDef done fill:#0f2a16,stroke:#3fb950,color:#d5f5dc
    classDef next fill:#3a2f10,stroke:#d29922,color:#ffe9b0
    classDef todo fill:#21262d,stroke:#6e7681,color:#c9d1d9
    classDef leaf fill:#161b22,stroke:#444c56,color:#adbac7
```

**Keterangan warna:** 🟢 Selesai · 🟡 Dikerjakan berikutnya · ⚪ Rencana nanti
Kotak garis putus-putus = cabang/hasil dari tiap tahap.

---

## 📋 Penjelasan Singkat

### ✅ SUDAH SELESAI

| Tahap | Hasilnya |
|---|---|
| **1. Setup Project** | Code drama-app diambil dari GitHub, dijalankan di laptop. |
| **2. Online di Vercel** | App bisa dibuka siapa saja: `dramaapp.vercel.app`. |
| **3. Video Bisa Diputar** | Video disimpan di PC backup, disalurkan ke app lewat tunnel. |
| **4. Admin Form Otomatis** | Tambah drama lewat form — tidak perlu edit file manual. |
| **5. Auto-Hardlink** | Tambah drama baru cukup 3 klik (~2 menit per drama). |
| **6. Script Otomatis** | Cukup 1 command untuk start semua + auto-update Vercel. |

### 🔜 BERIKUTNYA

**7. Named Tunnel** — Saat ini URL video berubah tiap PC restart. Setelah pakai Named Tunnel, URL video **stabil selamanya** → tidak perlu update Vercel berulang.

### ⚪ RENCANA NANTI

**8. Perbaikan Akhir** — Fix bug judul drama panjang (slug ke-potong) + perkuat keamanan login admin.

---

## 📈 Posisi Sekarang
- **App:** live & jalan normal di `https://dramaapp.vercel.app/`.
- **Selesai:** Tahap 1 sampai 6.
- **Langkah berikutnya:** Tahap 7 — Named Tunnel (biar URL video tidak ganti-ganti lagi).
