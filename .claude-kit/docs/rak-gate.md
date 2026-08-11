# Palang Rak — panduan kit dibuka sebelum menyentuh titik risiko

> Versi 1.0 · 2026-07-19 · Robot: `engine/rak-gate.mjs` (Claude Code) + `engine/kimi/rak-gate-kimi.mjs` (Kimi Code)
> Keputusan + bukti pengukuran: `docs/decisions/ADR-022-petunjuk-rak-dan-palang-rak.md` (repo kit)

## Tujuan

Kit lintasAI menyimpan standar detail di folder panduan (`rules/`). Selama ini AI **boleh**
membukanya, tapi tak ada yang memastikan ia **benar-benar** membuka. Hasil pengukuran 6 prompt nyata:
dari **56 panduan yang relevan, cuma 8 yang dibuka (±14%)** — untuk tugas ringan **0%**.

Palang Rak menahan AI **sekali** sebelum ia mengubah berkas penting untuk pertama kali dalam satu
sesi, sampai panduan terkait benar-benar dibuka.

🏢 Analoginya: montir boleh punya cara sendiri, tapi buku servis mobilnya **dibuka dulu** sebelum
bongkar mesin. Isi buku tak wajib diikuti kalau kenyataan mobilnya beda — yang wajib cuma **dibaca**.

## Cara pakai

```bash
npx lintasai enable-rak-gate      # nyalakan (Claude Code; Kimi ikut kalau project punya .kimi-code/)
```

Lalu **buka chat BARU** — hook hanya dimuat saat sesi dimulai.

**Default MATI.** Ia menambah friksi, jadi yang memutuskan = pemilik project, bukan AI. AI boleh
menawarkan, **dilarang menyalakan sendiri**.

**Matikan kapan saja:** hapus blok `PreToolUse` yang memuat `rak-gate` dari `.claude/settings.json`
(dan blok `lintasai:rak-gate` dari `.kimi-code/config.toml` kalau ada).

## Apa yang terjadi saat menahan

AI menerima pesan berisi daftar panduan yang relevan. Ia membuka salah satunya, lalu **mengulang
operasi yang sama** — dan lolos. Kamu tak perlu melakukan apa pun.

## Yang WAJIB dipahami — "dibaca", bukan "dipatuhi"

Isi panduan itu **Tingkat-2**: ia boleh kalah oleh kenyataan kode project-mu. Pesan palang selalu
menyatakan itu terang-terangan:

> *Isi rak TIDAK mengikat: bentrok dengan kenyataan kode → kenyataan kode MENANG (§4.17).*

Kalau AI menyimpang dari panduan, yang diminta cuma: sebut aturan mana + kenapa tak cocok di sini +
bukti `berkas:baris` + apa gantinya. Palang ini **tidak pernah** menjadikan panduan sebagai hukum.

## Kenapa tak bisa dilewati dengan kata-kata

Yang diperiksa = **catatan pembacaan nyata** (pemanggilan alat baca), bukan pernyataan AI. Hook
penjaga memang tak pernah melihat tulisan AI — ia cuma menerima nama alat + berkas. Jadi syarat
"sebutkan panduan yang kau baca" mustahil diperiksa mesin, dan satu-satunya wujudnya adalah "tahan
sekali lalu izinkan apa pun". Palang ini tidak begitu.

## Anti-upacara — kapan ia DIAM

| Situasi | Perilaku |
|---|---|
| Menyunting berkas biasa (komponen, teks, gaya) | diam — mayoritas pekerjaan lewat sini |
| Berkas tes / hasil build / berkas hasil-generate | diam |
| Sudah membuka panduan terkait di sesi ini | diam |
| Sudah menahan **2×** di sesi ini | diam seterusnya (katup pelepas) |
| Panduan tak ada di disk (kit versi lama) | diam |
| Membuka `rules/INDEX.md` | dianggap sah — itu jalan keluar |

## Batas jujur — jangan diklaim lebih

- Ini pagar **KEPATUHAN**, bukan pagar **KEAMANAN**. Membaca lewat `Bash cat`/`Grep` tidak dihitung
  dan tidak dihalangi. Yang menjaga aksi berbahaya tetap **Palang Rem** (`docs/risk-gate.md`).
- AI bisa saja membuka panduan **hanya untuk lolos**, lalu mengabaikan isinya. Karena itu **jangan
  memakai "berapa persen panduan dibaca" sebagai bukti mutu** — mutu diukur terpisah.
- Belum terverifikasi apakah pembacaan oleh sub-agen ikut tercatat. Katup 2× menyelamatkan kalau tidak.

## Kalau ada yang aneh

Palang dirancang **fail-open**: input rusak, panduan hilang, atau state tak terbaca → ia **mengizinkan**,
tidak mengunci pekerjaan. Kalau ia terasa menghalangi berulang di luar batas 2×, matikan (lihat atas)
dan laporkan — itu bug, bukan perilaku yang diinginkan.

## Terkait

`docs/risk-gate.md` (Palang Rem — aksi berbahaya) · `docs/plan-mode-gate.md` (Lampu Hijau Plan Mode) ·
`CLAUDE_universal_v1.md` §4.17 (perkuat, jangan kurung) · §8.2 (anti-halusinasi + penegak-mesin)
