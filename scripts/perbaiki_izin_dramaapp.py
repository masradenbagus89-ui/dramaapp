"""Perbaiki izin schema `dramaapp` di project Supabase nvblmpkwyzbpdbshyvzw.

Dua hal yang diperbaiki (keduanya HANYA menyentuh schema `dramaapp`, tidak
mengganggu schema aplikasi lain yang menumpang project yang sama):

1. GRANT USAGE ke `service_role`.
   USAGE = izin "boleh masuk ke schema ini". Saat ini TIDAK ADA satu role pun
   yang punya, termasuk `service_role` yang dipakai server DramaApp. Akibatnya,
   walau Exposed schemas nanti dibuka di Dashboard, aplikasi tetap gagal dengan
   "permission denied for schema dramaapp". Ini langkah yang terlewat saat
   migrasi 2026-08-29.

2. REVOKE semua hak `anon` dan `authenticated`.
   `anon` mewakili anon key — kunci publik yang ditanam di browser. Project ini
   dipakai bersama 4 aplikasi lain, jadi anon key-nya kemungkinan sudah beredar.
   Saat ini kedua role itu punya hak PENUH (SELECT/INSERT/UPDATE/DELETE/TRUNCATE)
   atas 5 tabel dramaapp, sementara RLS mati. Begitu USAGE diberikan ke anon
   (pola copy-paste yang lazim), email admin + hash password penonton + saldo
   koin langsung terbuka untuk dibaca & dihapus siapa pun. DramaApp sendiri
   hanya memakai service_role dari sisi server, jadi hak anon tidak dibutuhkan.

Aman & reversibel: semua dijalankan dalam SATU transaksi (gagal di tengah =
tidak ada yang tersimpan), dan mencetak potret izin SEBELUM & SESUDAH sebagai
bukti. Untuk membatalkan: `revoke usage on schema dramaapp from service_role`.

Jalankan:  python scripts/perbaiki_izin_dramaapp.py
Port 5432 = session mode, dipakai untuk DDL (perintah yang mengubah izin).
"""

import psycopg2

HOST = "aws-1-ap-southeast-1.pooler.supabase.com"
PORT = 5432
DB = "postgres"
USER = "creative_raden.nvblmpkwyzbpdbshyvzw"
PASSWORD_FILE = r"C:\Users\user18\Downloads\password.txt"

SQL_CEK_USAGE = """
    select r.rolname, has_schema_privilege(r.rolname, 'dramaapp', 'USAGE')
    from pg_roles r
    where r.rolname in ('anon', 'authenticated', 'service_role')
    order by r.rolname
"""

SQL_CEK_GRANT = """
    select grantee, count(distinct table_name), count(*)
    from information_schema.role_table_grants
    where table_schema = 'dramaapp'
      and grantee in ('anon', 'authenticated', 'service_role')
    group by grantee
    order by grantee
"""


def potret(cur, judul: str) -> None:
    """Cetak kondisi izin saat ini — dipakai sebagai bukti sebelum/sesudah."""
    print(f"--- {judul} ---")
    cur.execute(SQL_CEK_USAGE)
    for nama, bisa in cur.fetchall():
        print(f"  USAGE schema  {nama:<14} {bisa}")
    cur.execute(SQL_CEK_GRANT)
    baris = cur.fetchall()
    if not baris:
        print("  hak atas tabel: (tidak ada satu pun)")
    for grantee, jml_tabel, jml_hak in baris:
        print(f"  hak tabel     {grantee:<14} {jml_tabel} tabel, {jml_hak} izin")
    print()


def main() -> None:
    with open(PASSWORD_FILE, encoding="utf-8") as f:
        pw = f.read().split(":", 1)[1].strip()

    conn = psycopg2.connect(
        host=HOST, port=PORT, dbname=DB, user=USER, password=pw,
        sslmode="require", connect_timeout=25,
    )
    conn.autocommit = False  # satu transaksi utuh
    cur = conn.cursor()

    potret(cur, "SEBELUM")

    cur.execute("revoke all on all tables in schema dramaapp from anon, authenticated")

    potret(cur, "SESUDAH (belum disimpan)")

    conn.commit()
    print("COMMIT berhasil — hak anon/authenticated dicabut.")

    # GRANT USAGE TIDAK bisa dikerjakan dari sini: schema `dramaapp` dimiliki
    # role `postgres`, dan `creative_raden` tidak punya GRANT OPTION. Postgres
    # TIDAK menolak perintahnya — hanya memberi warning lalu tidak melakukan
    # apa-apa. Jadi wajib diperiksa hasilnya, bukan diasumsikan berhasil.
    cur.execute("select has_schema_privilege('service_role', 'dramaapp', 'USAGE')")
    if cur.fetchone()[0]:
        print("service_role sudah punya USAGE — tidak ada sisa pekerjaan.")
    else:
        print()
        print("!! BELUM SELESAI: service_role belum punya USAGE pada schema dramaapp.")
        print("   Tanpa ini REST API balas 403 'permission denied for schema dramaapp'.")
        print("   Hanya pemilik schema (role postgres) yang bisa memberikannya.")
        print("   Minta owner project jalankan di Dashboard -> SQL Editor:")
        print()
        print("     grant usage on schema dramaapp to service_role;")
        print("     notify pgrst, 'reload schema';")

    conn.close()


if __name__ == "__main__":
    main()
