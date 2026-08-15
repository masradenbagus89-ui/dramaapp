# Jalur video dari API pihak lain (player di-hosting mereka)

> Dibuat 2026-08-11. Jalur ini **terpisah** dari pemutar lama (video .mp4 dari PC
> backup lewat `lib/video.ts`). Yang lama tidak diubah sama sekali.

## Isi ringkas

| Bagian | Berkas | Tugasnya |
|---|---|---|
| Bentuk data + penerjemah + pagar domain | `lib/external-video.ts` | Ubah JSON penyedia (bentuk apa pun) jadi bentuk standar kita, lalu saring alamatnya |
| Jalur API | `app/api/external-videos/route.ts` | Server kita yang menjemput ke API penyedia (kunci API tidak bocor ke browser) |
| Kotak pemutar | `app/components/EmbedPlayer.tsx` | Merender `<iframe>` dengan pagar `sandbox` |
| Halaman bukti | `app/video-eksternal/page.tsx` + `app/components/ExternalVideoBrowser.tsx` | Daftar video + tinggal klik play |
| Pengunci perilaku | `tests/external-video.test.ts` | Tes supaya pagar keamanan tidak longgar diam-diam saat kode diubah nanti |

Alurnya: **API penyedia → `/api/external-videos` (saring) → halaman → `<iframe>` → video jalan.**

## Setelan (env) yang perlu diisi

Taruh di `.env.local` (lokal) atau Environment Variables (Vercel). Semua **tanpa**
`NEXT_PUBLIC_`, artinya hanya hidup di server — kunci API tidak ikut terkirim ke browser.

```env
# 1) Alamat endpoint daftar video milik penyedia (WAJIB)
EXTERNAL_VIDEO_API_URL=

# 2) Kunci API dari penyedia (kosongkan kalau API-nya terbuka)
EXTERNAL_VIDEO_API_KEY=

# 3) Cara kunci dikirim — isi SALAH SATU, atau kosongkan dua-duanya:
#    kosong semua  -> header "Authorization: Bearer <kunci>"
#    header khusus -> tulis nama headernya, mis. X-API-Key
EXTERNAL_VIDEO_API_KEY_HEADER=
#    lewat query   -> tulis nama parameternya, mis. api_key
EXTERNAL_VIDEO_API_KEY_PARAM=

# 4) PAGAR KEAMANAN (WAJIB): domain player yang boleh tampil, dipisah koma.
#    KOSONG = semua video ditolak (sengaja: "tolak dulu semua").
EXTERNAL_VIDEO_EMBED_HOSTS=player.penyedia.com, cdn.penyedia.com
```

⚠️ Kalau `EXTERNAL_VIDEO_EMBED_HOSTS` belum diisi, halaman akan tampil **kosong**
disertai catatan berapa video yang dilewati. Itu bukan bug — itu pagarnya bekerja.

## Bentuk JSON yang sudah didukung otomatis

Penerjemahnya sengaja lentur, jadi tidak perlu menunggu contoh resmi. Yang dikenali:

- Daftar di akar: `[ {...}, {...} ]`
- Daftar dibungkus: `{ "data": [...] }` — juga `items`, `results`, `videos`, `list`, `rows`, `episodes`
- Daftar bersarang satu lapis: `{ "result": { "data": [...] } }`
- Satu video langsung di akar: `{ "title": "...", "embed_url": "..." }`
- Item berupa teks kode tempel: `"<iframe src='https://...'></iframe>"` → diambil `src`-nya

Nama field yang dikenali per video:

| Isi | Nama field yang dicoba |
|---|---|
| Alamat player | `embedUrl`, `embed_url`, `embed`, `playerUrl`, `player_url`, `player`, `iframe`, `frame`, `url`, `link`, `src`, `file`, `stream` |
| Judul | `title`, `name`, `judul`, `label`, `episodeTitle`, `episode_title` |
| Poster | `poster`, `posterUrl`, `poster_url`, `thumbnail`, `thumb`, `image`, `cover`, `preview` |
| Nomor episode | `episode`, `ep`, `episodeNumber`, `episode_number`, `eps`, `nomor` |
| Pengenal | `id`, `videoId`, `video_id`, `slug`, `code`, `key`, `hash` |

Kalau nanti API Kang Dedi memakai nama lain, cukup tambahkan namanya di daftar
konstanta paling atas `lib/external-video.ts` — tidak perlu bongkar logika.

## Bentuk yang paling enak diminta ke penyedia

Kalau boleh minta, ini yang paling ringkas dan langsung cocok:

```json
{
  "data": [
    {
      "id": "abc123",
      "title": "Judul Drama - Episode 1",
      "episode": 1,
      "poster": "https://cdn.penyedia.com/poster/abc123.jpg",
      "embed_url": "https://player.penyedia.com/e/abc123"
    }
  ]
}
```

Pertanyaan yang perlu dijawab penyedia:

1. Alamat endpoint daftar videonya apa?
2. Perlu kunci API? Dikirim lewat header atau query, dan namanya apa?
3. Domain player-nya apa saja (untuk daftar izin)? Termasuk domain CDN kalau beda.
4. Ada batas pemakaian (rate limit) per menit/hari?
5. Apakah domain kita perlu didaftarkan di sisi mereka (anti-hotlink)?
6. Parameter pencarian/halaman namanya apa? (sekarang kita kirim `q`, `page`, `id`)

## Batas jujur jalur embed

Karena player-nya milik server lain dan beda domain, aplikasi kita **tidak bisa**:

- membaca posisi menit / progres nonton;
- mengendalikan tombol play/pause dari kode kita;
- menempelkan subtitle sendiri ke dalam player mereka;
- menampilkan paywall koin **di dalam** player.

Yang **masih bisa**: mengunci akses **sebelum** iframe ditampilkan (gerbang koin/login
di luar player), menampilkan iklan di luar player, komentar, dan daftar episode.

Kalau nanti fitur koin per-episode harus jalan penuh, mintalah penyedia mengirim
alamat berkas langsung (`.mp4`/`.m3u8`) supaya bisa disambungkan ke `FeedPlayer`
yang sudah punya paywall + subtitle.

## Keamanan yang sudah dipasang

- **Wajib https** — alamat `http`, `javascript:`, `data:` ditolak.
- **Daftar izin domain** — default tolak semua; subdomain ikut lolos, domain yang
  cuma mirip (`...contoh.com.evil.id`) tetap ditolak (ada tesnya).
- **Kode `<iframe>` mentah tidak pernah ditempel apa adanya** — hanya `src`-nya yang
  diambil, jadi tidak bisa diselipi skrip.
- **Alamat API hanya dari env**, tidak pernah dari input pengunjung (anti-SSRF:
  server dipaksa menembak alamat pilihan orang lain).
- **`sandbox` tanpa `allow-popups`** — menahan iklan pop-up khas penyedia embed
  gratis. Kalau player sah butuh popup, tambahkan `allow-popups` di
  `app/components/EmbedPlayer.tsx` dan catat alasannya.
- **Gagal-aman** — error apa pun dibalas status yang benar (502/503), bukan diam-diam
  "daftar kosong".
