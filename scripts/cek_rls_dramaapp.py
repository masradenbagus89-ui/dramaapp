"""Periksa keadaan RLS & izin schema `dramaapp` — CUMA BACA, nol perubahan.

KENAPA ADA (audit keamanan 2026-10-24): keamanan database project ini tidak bisa
dibuktikan dari repo. Berkas migrasi hanya menunjukkan apa yang NIATNYA
dijalankan, bukan apa yang BENAR-BENAR berlaku di server. Dua kali dalam audit
yang sama, catatan repo dan kenyataan database berbeda — sekali catatannya
benar (revoke tabel memang sudah jalan), sekali dugaannya salah (ketiga fungsi
ternyata masih bisa dijalankan `anon`). Skrip ini memaksa jawabannya datang dari
database, bukan dari ingatan atau catatan.

WAJIB dijalankan sesudah menambah tabel/fungsi baru di schema `dramaapp`.
Sebabnya ada di supabase_migrations/2026-10-24_rls_dan_hak_fungsi.sql bagian 3:
Postgres memberi EXECUTE ke PUBLIC untuk SETIAP fungsi baru, dan hak bawaan itu
TIDAK bisa dicabut lewat `alter default privileges` (sudah diuji, nol efek).
Jadi fungsi ke-4 akan lahir longgar lagi — skrip ini yang memberi tahu.

Pakai:
    python scripts/cek_rls_dramaapp.py

Keluar dengan status 0 kalau semua rapat, 1 kalau ada yang longgar — jadi bisa
dipakai sebagai gerbang di skrip lain, bukan cuma dibaca mata.

Nol perintah yang mengubah apa pun: hanya SELECT atas katalog sistem, dengan
autocommit mati + rollback di akhir sebagai pengaman ganda. Yang dicetak hanya
metadata (nama tabel, nama role, nama izin) — nol isi baris, nol kredensial.
"""

import sys

import psycopg2

# Alamat, nama database, user, dan lokasi berkas password diambil dari
# jalankan_sql_dramaapp.py — SENGAJA tidak ditulis ulang di sini.
#
# KENAPA: audit 2026-10-24 menandai "host pooler + username DB lengkap ditulis
# langsung di kode, di repo PUBLIK" sebagai temuan (S-7). Menyalinnya ke berkas
# kedua berarti menambah satu tempat lagi yang harus diurus kalau nanti nilainya
# diganti — dan menambah satu paparan baru untuk hal yang sudah dikeluhkan
# sendiri. Mengimpor membuat nilainya tetap hidup di SATU tempat.
#
# Aman diimpor: berkas itu hanya menjalankan main() di bawah
# `if __name__ == "__main__"`, jadi mengimpornya tidak mengeksekusi SQL apa pun.
from jalankan_sql_dramaapp import DB, HOST, USER, baca_password  # noqa: E402

# Port 6543 (transaction mode) DISENGAJA BEDA dari skrip itu (yang memakai 5432
# untuk DDL): skrip ini tak pernah menjalankan DDL, dan 5432 adalah sumber daya
# langka di project bersama ini — pernah menolak sambungan dengan "remaining
# connection slots are reserved for roles with the SUPERUSER attribute" saat
# koneksi penuh (2026-10-24, terukur 51 dari 60 koneksi terpakai).
PORT = 6543

TABEL_WAJIB_RLS = ["app_data", "dramas", "likes", "unlocks", "wallets"]

Q_RLS = """
select relname, relrowsecurity
  from pg_class
 where relnamespace = 'dramaapp'::regnamespace and relkind = 'r'
 order by relname
"""

Q_FUNGSI = """
select p.proname,
       has_function_privilege('service_role', p.oid, 'EXECUTE'),
       has_function_privilege('anon', p.oid, 'EXECUTE'),
       has_function_privilege('authenticated', p.oid, 'EXECUTE')
  from pg_proc p
 where p.pronamespace = 'dramaapp'::regnamespace
 order by p.proname
"""

Q_GRANT_TABEL = """
select grantee, table_name, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'dramaapp' and grantee in ('anon', 'authenticated', 'PUBLIC')
 order by table_name, grantee
"""

Q_USAGE = """
select has_schema_privilege('anon', 'dramaapp', 'USAGE'),
       has_schema_privilege('authenticated', 'dramaapp', 'USAGE'),
       has_schema_privilege('service_role', 'dramaapp', 'USAGE')
"""

Q_BYPASS = """
select rolbypassrls from pg_roles where rolname = 'service_role'
"""


def main() -> int:
    print(f"Database : {USER}@{HOST}:{PORT}  schema dramaapp")
    print("Mode     : CUMA BACA (rollback di akhir)\n")

    conn = psycopg2.connect(
        host=HOST, port=PORT, dbname=DB, user=USER, password=baca_password(),
        sslmode="require", connect_timeout=25,
    )
    conn.autocommit = False
    longgar: list[str] = []
    try:
        with conn.cursor() as cur:
            # --- 1. RLS per tabel ---
            cur.execute(Q_RLS)
            rls = cur.fetchall()
            print("1. RLS per tabel")
            ada = {nama for nama, _ in rls}
            for nama, nyala in rls:
                print(f"   {nama:<10} RLS {'NYALA' if nyala else 'MATI'}")
                if not nyala:
                    longgar.append(f"RLS MATI di tabel {nama}")
            for wajib in TABEL_WAJIB_RLS:
                if wajib not in ada:
                    print(f"   {wajib:<10} (tabel tidak ditemukan)")
            # Tabel BARU yang belum masuk daftar wajib juga perlu dilihat manusia.
            for nama in sorted(ada - set(TABEL_WAJIB_RLS)):
                print(f"   catatan: `{nama}` belum ada di TABEL_WAJIB_RLS skrip ini")

            # --- 2. Hak EXECUTE fungsi ---
            cur.execute(Q_FUNGSI)
            print("\n2. Siapa boleh EXECUTE fungsi")
            for nama, sr, an, au in cur.fetchall():
                print(f"   {nama:<20} service_role={sr}  anon={an}  authenticated={au}")
                if not sr:
                    longgar.append(
                        f"service_role TIDAK boleh EXECUTE {nama} — fitur yang memakainya MATI"
                    )
                if an or au:
                    longgar.append(
                        f"{nama} masih bisa dijalankan anon/authenticated "
                        "(fungsi baru lahir begini — cabut di migrasinya)"
                    )

            # --- 3. Hak tabel untuk anon/authenticated/PUBLIC ---
            cur.execute(Q_GRANT_TABEL)
            grants = cur.fetchall()
            print("\n3. Hak TABEL untuk anon / authenticated / PUBLIC")
            if not grants:
                print("   (kosong — benar, tidak ada hak yang diberikan)")
            else:
                for g, t, p in grants:
                    print(f"   {g} punya {p} di {t}")
                    longgar.append(f"{g} punya {p} di tabel {t}")

            # --- 4. Gerbang USAGE schema ---
            cur.execute(Q_USAGE)
            an_u, au_u, sr_u = cur.fetchone()
            print("\n4. USAGE ke schema dramaapp (gerbang utamanya)")
            print(f"   anon={an_u}  authenticated={au_u}  service_role={sr_u}")
            if an_u:
                longgar.append("anon punya USAGE ke schema dramaapp — gerbang utama TERBUKA")
            if au_u:
                longgar.append("authenticated punya USAGE ke schema dramaapp")
            if not sr_u:
                longgar.append("service_role TIDAK punya USAGE — aplikasi tidak bisa jalan")

            # --- 5. service_role masih menembus RLS? ---
            cur.execute(Q_BYPASS)
            baris = cur.fetchone()
            bypass = baris[0] if baris else None
            print("\n5. service_role menembus RLS (rolbypassrls)")
            print(f"   rolbypassrls = {bypass}")
            if not bypass:
                longgar.append(
                    "service_role TIDAK lagi menembus RLS — dengan RLS nyala tanpa policy, "
                    "SELURUH query aplikasi akan mengembalikan nol baris"
                )

        print("\n" + "=" * 70)
        if longgar:
            print(f"HASIL: {len(longgar)} hal perlu dibereskan")
            for l in longgar:
                print(f"  - {l}")
            return 1
        print("HASIL: rapat — RLS nyala, fungsi hanya untuk service_role, anon nol hak.")
        return 0
    finally:
        conn.rollback()
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
