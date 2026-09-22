"""Jalankan berkas .sql dari supabase_migrations/ ke database dramaapp.

KENAPA ADA: PostgREST (jalur yang dipakai aplikasi) hanya bisa baca/tulis BARIS,
tidak bisa mengubah STRUKTUR tabel (ALTER TABLE). Sampai 2026-09-22 setiap
migrasi karena itu harus ditempel manual owner di Supabase Dashboard -> SQL
Editor. Skrip ini menempuh jalur lain: sambungan Postgres langsung lewat
psycopg2 (penghubung Python <-> Postgres), memakai kredensial yang sudah dipakai
scripts/perbaiki_izin_dramaapp.py.

Port 5432 = "session mode", satu-satunya port pooler Supabase yang boleh
menjalankan DDL (perintah pengubah struktur). Port 6543 (transaction mode) akan
menolaknya.

PENGAMAN (disengaja, jangan dilepas):
  - TANPA bendera --jalankan  -> hanya mensimulasi: SQL tetap dieksekusi di
    dalam transaksi lalu di-ROLLBACK, jadi tidak ada satu pun perubahan yang
    tersimpan. Gunanya: membuktikan SQL-nya benar-benar jalan SEBELUM diputuskan.
  - SEMUA berkas dijalankan dalam SATU transaksi -> gagal di tengah = tidak ada
    yang tersimpan sama sekali (tidak ada database setengah jadi).
  - Potret isi tabel SEBELUM & SESUDAH dicetak sebagai bukti, bukan sekadar
    "berhasil".
  - Password dibaca dari berkas di luar repo dan TIDAK PERNAH dicetak.

Pakai:
  python scripts/jalankan_sql_dramaapp.py supabase_migrations/add_quality_to_dramas.sql
  python scripts/jalankan_sql_dramaapp.py supabase_migrations/*.sql --jalankan
"""

import sys
from pathlib import Path

import psycopg2

HOST = "aws-1-ap-southeast-1.pooler.supabase.com"
PORT = 5432  # session mode — WAJIB untuk DDL
DB = "postgres"
USER = "creative_raden.nvblmpkwyzbpdbshyvzw"
BERKAS_PASSWORD = Path(r"C:\Users\user18\Downloads\password.txt")

# Potret yang dicetak sebelum & sesudah. Sengaja menghitung KOLOM LENCANA saja —
# cukup untuk membuktikan efeknya, tanpa menumpahkan isi tabel ke layar.
#
# Bagian `quality` dirakit TERPISAH: potret "SEBELUM" dijalankan saat kolom itu
# bisa jadi belum ada (justru migrasi inilah yang membuatnya), dan menyebut
# kolom yang belum ada membuat SELURUH transaksi batal sebelum sempat mulai.
POTRET_DASAR = """
  count(*)                                                      as total,
  count(*) filter (where year is not null and btrim(year) <> '') as ada_tahun,
  count(*) filter (where runtime is not null and btrim(runtime) <> '') as ada_durasi,
  count(imdb_rating)                                            as ada_rating
"""

POTRET_KUALITAS = """,
  count(quality)                                          as ada_kualitas,
  count(*) filter (where quality = 'CAM')                 as cam_merah,
  count(*) filter (where quality = 'HD')                  as hd_hijau
"""

CEK_KOLOM = """
select 1 from information_schema.columns
 where table_schema = 'dramaapp' and table_name = 'dramas' and column_name = 'quality'
"""


def baca_password() -> str:
    """Ambil password dari berkas berformat 'Password : <pw>'."""
    if not BERKAS_PASSWORD.exists():
        sys.exit(f"BERHENTI: berkas password tidak ada di {BERKAS_PASSWORD}")
    isi = BERKAS_PASSWORD.read_text(encoding="utf-8").strip()
    return isi.split(":", 1)[1].strip() if ":" in isi else isi


def cetak_potret(cur, judul: str) -> None:
    cur.execute(CEK_KOLOM)
    ada_kolom_kualitas = cur.fetchone() is not None

    sql = "select " + POTRET_DASAR
    if ada_kolom_kualitas:
        sql += POTRET_KUALITAS
    sql += " from dramaapp.dramas"

    cur.execute(sql)
    kolom = [d[0] for d in cur.description]
    nilai = cur.fetchone()
    print(f"  {judul}")
    if not ada_kolom_kualitas:
        print("     (kolom `quality` belum ada — wajar, migrasi inilah yang membuatnya)")
    for k, v in zip(kolom, nilai):
        print(f"     {k:<14} = {v}")


def main() -> None:
    argumen = [a for a in sys.argv[1:] if not a.startswith("--")]
    sungguhan = "--jalankan" in sys.argv

    if not argumen:
        sys.exit("BERHENTI: sebutkan minimal satu berkas .sql")

    berkas = [Path(a) for a in argumen]
    for b in berkas:
        if not b.exists():
            sys.exit(f"BERHENTI: berkas tidak ditemukan -> {b}")

    mode = "SUNGGUHAN (akan disimpan)" if sungguhan else "SIMULASI (akan dibatalkan)"
    print(f"Mode        : {mode}")
    print(f"Database    : {USER}@{HOST}:{PORT}/{DB}  schema dramaapp")
    print(f"Berkas SQL  : {', '.join(str(b) for b in berkas)}")
    print()

    conn = psycopg2.connect(
        host=HOST, port=PORT, dbname=DB, user=USER, password=baca_password(),
        sslmode="require", connect_timeout=20,
    )
    # autocommit MATI = semuanya masuk satu transaksi; kita yang memutuskan
    # commit atau rollback di bawah.
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cetak_potret(cur, "SEBELUM:")
            print()
            for b in berkas:
                sql = b.read_text(encoding="utf-8")
                cur.execute(sql)
                print(f"  ok  {b}  ({cur.rowcount if cur.rowcount >= 0 else 0} baris tersentuh di perintah terakhir)")
            print()
            cetak_potret(cur, "SESUDAH:")

        if sungguhan:
            conn.commit()
            print("\nDISIMPAN (commit).")
        else:
            conn.rollback()
            print("\nDIBATALKAN (rollback) — ini cuma simulasi.")
            print("Tambahkan --jalankan untuk benar-benar menyimpan.")
    except Exception as e:
        conn.rollback()
        print(f"\nGAGAL, semua dibatalkan (rollback). Penyebab: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
