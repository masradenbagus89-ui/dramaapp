# Rencana: Detail film dari ID IMDb

- Tanggal: 2026-08-13
- Status: diimplementasi (uji localhost; belum deploy)
- Ringkas: perkuat form admin IMDb → draft lengkap dari OMDb → simpan metadata ke drama → tampil di `/drama/[id]`
- Migrasi SQL (jalankan sebelum pakai Supabase): `supabase_migrations/add_imdb_metadata_to_dramas.sql`
- Prasyarat lokal: `OMDB_API_KEY` di `.env.local` + restart `npm run dev`
