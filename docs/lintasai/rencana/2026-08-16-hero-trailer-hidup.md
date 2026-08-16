# Hero trailer hidup — Beranda + Discover

Tanggal: 2026-08-16
Status: dikerjakan lokal, belum commit/deploy

## Maksud

Hero Beranda dan Discover memakai teaser video (episode 1, bisu) seperti IDLIX, plus geser samping/atas-bawah dan aksen warna genre. Identitas tetap emas DramaKu. Database Supabase tidak diubah.

## Yang dibangun

- `HeroPreview` menahan error: coba ulang 2× sebelum jatuh ke poster.
- `HomeHero` jeda rotasi saat trailer mutar / suara nyala; swipe HP; panah & titik lebih kelihatan.
- `/discover` memakai `HomeHero` yang sama (banner “Sedang Trending” lama dihapus).
- `TopNav` overlay transparan di `/beranda` dan `/discover`.
- Hover preview poster di desktop; chip/judul genre berwarna.

## Yang tidak dibangun

- Salin IDLIX merah / iklan
- File trailer khusus
- Deploy Vercel
