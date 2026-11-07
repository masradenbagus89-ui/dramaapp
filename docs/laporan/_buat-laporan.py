# -*- coding: utf-8 -*-
"""
Membangun laporan progress dramaapp sebagai .pptx asli.
Semua angka DIAMBIL DARI PEMERIKSAAN NYATA (git log + API produksi), bukan perkiraan.
"""
import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION

NAVY = RGBColor(0x0F, 0x17, 0x2A)
PANEL = RGBColor(0x1B, 0x25, 0x3C)
INK = RGBColor(0x11, 0x18, 0x27)
SLATE = RGBColor(0x47, 0x55, 0x69)
MUTED = RGBColor(0x94, 0xA3, 0xB8)
PALE = RGBColor(0xCB, 0xD5, 0xE1)
SOFT = RGBColor(0xE2, 0xE8, 0xF0)
ROSE = RGBColor(0xE1, 0x1D, 0x48)
AMBER = RGBColor(0xF5, 0x9E, 0x0B)
TEAL = RGBColor(0x0D, 0x94, 0x88)
INDIGO = RGBColor(0x4F, 0x46, 0xE5)
CARD = RGBColor(0xF1, 0xF5, 0xF9)
LINE = RGBColor(0xE2, 0xE8, 0xF0)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

FONT = "Segoe UI"
W, H = Inches(13.333), Inches(7.5)

# tangkapan layar situs produksi; dicari relatif terhadap script ini supaya
# laporan tetap bisa dibangun ulang dari folder kerja mana pun
DIR_GAMBAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gambar")

prs = Presentation()
prs.slide_width, prs.slide_height = W, H
BLANK = prs.slide_layouts[6]
GAP = Inches(0.26)


def slide_baru(bg=WHITE):
    s = prs.slides.add_slide(BLANK)
    sh = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    sh.fill.solid()
    sh.fill.fore_color.rgb = bg
    sh.line.fill.background()
    sh.shadow.inherit = False
    return s


def kotak(s, l, t, w, h, warna, radius=0.06, garis=None):
    sh = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, l, t, w, h)
    sh.fill.solid()
    sh.fill.fore_color.rgb = warna
    try:
        sh.adjustments[0] = radius
    except Exception:
        pass
    if garis is not None:
        sh.line.color.rgb = garis
        sh.line.width = Pt(1)
    else:
        sh.line.fill.background()
    sh.shadow.inherit = False
    return sh


def bar(s, l, t, w, h, warna):
    sh = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, w, h)
    sh.fill.solid()
    sh.fill.fore_color.rgb = warna
    sh.line.fill.background()
    sh.shadow.inherit = False
    return sh


def teks(s, isi, l, t, w, h, size=18, bold=False, warna=INK,
         align=PP_ALIGN.LEFT, spasi=1.15, italic=False):
    tb = s.shapes.add_textbox(l, t, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, b in enumerate(isi.split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = spasi
        r = p.add_run()
        r.text = b
        r.font.name = FONT
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.italic = italic
        r.font.color.rgb = warna
    return tb


def kepala(s, kicker, judul):
    bar(s, Inches(0), Inches(0), W, Inches(0.09), ROSE)
    teks(s, kicker.upper(), Inches(0.75), Inches(0.52), Inches(9), Inches(0.3),
         size=11, bold=True, warna=ROSE)
    teks(s, judul, Inches(0.75), Inches(0.85), Inches(11.8), Inches(0.62),
         size=30, bold=True, warna=NAVY)
    bar(s, Inches(0.75), Inches(1.56), Inches(1.3), Inches(0.045), AMBER)


def kaki(s, nomor, total=10):
    teks(s, "dramaapp - Laporan Progress - 6 November 2026",
         Inches(0.75), Inches(6.93), Inches(8), Inches(0.3), size=9.5, warna=MUTED)
    teks(s, str(nomor) + " / " + str(total), Inches(11.8), Inches(6.93),
         Inches(0.78), Inches(0.3), size=9.5, warna=MUTED, align=PP_ALIGN.RIGHT)


def kpi(s, l, t, w, angka, label, ket, warna=ROSE):
    kotak(s, l, t, w, Inches(1.72), CARD, radius=0.09)
    bar(s, l, t, Inches(0.055), Inches(1.72), warna)
    teks(s, angka, l + Inches(0.32), t + Inches(0.2), w - Inches(0.5), Inches(0.66),
         size=40, bold=True, warna=NAVY)
    teks(s, label, l + Inches(0.32), t + Inches(0.92), w - Inches(0.5), Inches(0.3),
         size=13, bold=True, warna=INK)
    teks(s, ket, l + Inches(0.32), t + Inches(1.22), w - Inches(0.5), Inches(0.42),
         size=10.5, warna=SLATE, spasi=1.05)


def poin(s, l, t, w, no, judul, isi, warna):
    d = Inches(0.46)
    c = s.shapes.add_shape(MSO_SHAPE.OVAL, l, t + Inches(0.03), d, d)
    c.fill.solid()
    c.fill.fore_color.rgb = warna
    c.line.fill.background()
    c.shadow.inherit = False
    tf = c.text_frame
    tf.margin_left = tf.margin_right = 0
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = str(no)
    r.font.name = FONT
    r.font.size = Pt(15)
    r.font.bold = True
    r.font.color.rgb = WHITE
    teks(s, judul, l + Inches(0.68), t, w - Inches(0.68), Inches(0.33),
         size=16, bold=True, warna=NAVY)
    teks(s, isi, l + Inches(0.68), t + Inches(0.34), w - Inches(0.68), Inches(0.6),
         size=12, warna=SLATE, spasi=1.18)


def gambar(s, jalur, l, t, w, h):
    """Pasang tangkapan layar + garis tepi tipis, supaya tidak menyatu dengan latar putih."""
    if not os.path.exists(jalur):
        raise SystemExit("gambar tidak ada: " + jalur +
                         "\nJalankan ulang pengambilan tangkapan layar dulu.")
    pic = s.shapes.add_picture(jalur, l, t, w, h)
    try:
        pic.line.color.rgb = RGBColor(0xCB, 0xD5, 0xE1)
        pic.line.width = Pt(1)
    except Exception:
        pass
    return pic


# ================= SLIDE 1 - Judul =================
s = slide_baru(NAVY)
bar(s, Inches(0), Inches(0), W, Inches(0.14), ROSE)
kotak(s, Inches(9.1), Inches(1.3), Inches(3.5), Inches(4.9), PANEL, radius=0.05)
teks(s, "RINGKASAN ANGKA", Inches(9.45), Inches(1.62), Inches(2.9), Inches(0.3),
     size=10.5, bold=True, warna=AMBER)
y = Inches(2.1)
for ang, lab in [("645", "commit dikerjakan"),
                 ("136", "fitur baru dirilis"),
                 ("531", "judul di katalog"),
                 ("13", "perbaikan keamanan")]:
    teks(s, ang, Inches(9.45), y, Inches(1.8), Inches(0.5), size=27, bold=True, warna=WHITE)
    teks(s, lab, Inches(9.45), y + Inches(0.46), Inches(2.9), Inches(0.3), size=11, warna=MUTED)
    y += Inches(1.02)

teks(s, "LAPORAN PROGRESS PROJECT", Inches(0.9), Inches(1.95), Inches(7.6), Inches(0.35),
     size=13, bold=True, warna=AMBER)
teks(s, "dramaapp", Inches(0.9), Inches(2.35), Inches(7.6), Inches(1.15),
     size=66, bold=True, warna=WHITE)
teks(s, "Platform streaming drama & film", Inches(0.9), Inches(3.55), Inches(7.6),
     Inches(0.45), size=21, warna=PALE)
bar(s, Inches(0.9), Inches(4.2), Inches(2.2), Inches(0.05), ROSE)
teks(s, "Periode pengembangan\n14 Mei - 5 November 2026  (6 bulan)",
     Inches(0.9), Inches(4.55), Inches(7.6), Inches(0.8), size=14, warna=SOFT, spasi=1.35)
teks(s, "Status produksi: TAYANG & SEHAT - diperiksa 6 November 2026",
     Inches(0.9), Inches(5.62), Inches(7.6), Inches(0.35), size=12.5, bold=True, warna=TEAL)
teks(s, "Disiapkan untuk rapat dengan atasan - 6 November 2026",
     Inches(0.9), Inches(6.9), Inches(8), Inches(0.3), size=10.5, warna=MUTED)

# ================= SLIDE 2 - Ringkasan eksekutif =================
s = slide_baru()
kepala(s, "Ringkasan eksekutif", "Empat angka yang merangkum 6 bulan")
kaki(s, 2)
gw = Inches(2.86)
x0 = Inches(0.75)
kpi(s, x0, Inches(1.95), gw, "645", "Commit dikerjakan",
    "Rata-rata 3-4 perubahan tercatat per hari kerja", ROSE)
kpi(s, x0 + (gw + GAP), Inches(1.95), gw, "136", "Fitur baru dirilis",
    "Plus 100 perbaikan bug yang sudah tayang", INDIGO)
kpi(s, x0 + 2 * (gw + GAP), Inches(1.95), gw, "531", "Judul di katalog",
    "42 drama berseri + 489 film & video", AMBER)
kpi(s, x0 + 3 * (gw + GAP), Inches(1.95), gw, "0,26 s", "Waktu buka situs",
    "Diukur langsung ke server produksi, status 200 OK", TEAL)

kotak(s, Inches(0.75), Inches(4.08), Inches(11.83), Inches(2.05), CARD, radius=0.05)
bar(s, Inches(0.75), Inches(4.08), Inches(0.055), Inches(2.05), NAVY)
teks(s, "Kesimpulan singkat", Inches(1.1), Inches(4.35), Inches(11.1), Inches(0.33),
     size=16, bold=True, warna=NAVY)
teks(s,
     "Dalam 6 bulan, dramaapp berkembang dari nol menjadi platform streaming yang sudah tayang, terisi katalog, dan\n"
     "berjalan stabil. Pekerjaan tidak berhenti di membangun fitur: porsi besar dipakai untuk perbaikan, pengujian, dan\n"
     "pencatatan - itulah sebabnya situs bisa dirilis berkali-kali dalam sehari tanpa mati.",
     Inches(1.1), Inches(4.78), Inches(11.1), Inches(1.1), size=13, warna=SLATE, spasi=1.42)
teks(s, "Semua angka di laporan ini diambil dari riwayat kerja (git) dan dari server produksi - bisa diperiksa ulang kapan saja.",
     Inches(1.1), Inches(5.72), Inches(11.1), Inches(0.3), size=11, italic=True, warna=MUTED)

# ================= SLIDE 3 - Produk & skala =================
s = slide_baru()
kepala(s, "Produk", "Apa yang sudah dibangun")
kaki(s, 3)
teks(s,
     "dramaapp adalah situs untuk menonton drama berseri dan film: penonton bisa mencari judul, melihat detail,\n"
     "menonton per episode, mengunduh, dan menyimpan tontonan. Di belakangnya ada panel admin untuk mengelola\n"
     "katalog, dan sambungan otomatis ke penyedia video sehingga judul baru masuk tanpa diinput manual.",
     Inches(0.75), Inches(1.95), Inches(11.83), Inches(1.1), size=14, warna=SLATE, spasi=1.42)

kpi(s, Inches(0.75), Inches(3.32), gw, "21", "Halaman siap pakai",
    "Beranda, katalog, film, pemutar, profil, admin", INDIGO)
kpi(s, Inches(0.75) + (gw + GAP), Inches(3.32), gw, "55", "Sambungan data (API)",
    "Jalur yang melayani video, login, koin, webhook", ROSE)
kpi(s, Inches(0.75) + 2 * (gw + GAP), Inches(3.32), gw, "274", "Berkas kode",
    "Tertata per tanggung jawab, bukan satu tumpukan", AMBER)
kpi(s, Inches(0.75) + 3 * (gw + GAP), Inches(3.32), gw, "135", "Berkas uji otomatis",
    "Mesin yang memeriksa ulang fitur lama tiap ada perubahan", TEAL)

kotak(s, Inches(0.75), Inches(5.42), Inches(11.83), Inches(1.12), WHITE, radius=0.05, garis=LINE)
teks(s, "Teknologi yang dipakai", Inches(1.1), Inches(5.62), Inches(3.2), Inches(0.3),
     size=12, bold=True, warna=NAVY)
teks(s, "Next.js 16   -   React 19   -   TypeScript 5   -   Tailwind CSS 4   -   Database Supabase   -   Hosting Railway",
     Inches(1.1), Inches(5.97), Inches(11.1), Inches(0.35), size=13, warna=SLATE)

# ================= SLIDE 4 - Wujud nyatanya (tangkapan layar) =================
s = slide_baru()
kepala(s, "Wujud nyatanya", "Tampilan situs yang sudah tayang")
kaki(s, 4)
teks(s, "Diambil langsung dari alamat produksi pada 6 November 2026 - bukan rancangan atau mockup.",
     Inches(0.75), Inches(1.92), Inches(11.8), Inches(0.35), size=13, warna=SLATE)

# lebar 3,74\" x tinggi 2,34\" = rasio 1,6 - sama persis dengan berkas tangkapan
# layarnya (1120x700), jadi gambar TIDAK gepeng atau terpotong
GW, GH, JARAK = Inches(3.74), Inches(2.3375), Inches(0.305)
galeri = [
    ("01-beranda.jpg", "Halaman depan",
     "Banner serial, baris poster yang bisa digeser, tab kategori, dan tombol filter."),
    ("02-daftar-film.jpg", "Daftar film & video",
     "489 judul, tiap kartu lengkap dengan rating bintang dan durasi tayang."),
    ("03-detail-drama.jpg", "Halaman detail drama",
     "Daftar episode di samping, tombol Mulai Nonton, Favorit, Bagikan, dan Unduh."),
]
for i, (berkas, jd, ket) in enumerate(galeri):
    l = Inches(0.75) + i * (GW + JARAK)
    gambar(s, os.path.join(DIR_GAMBAR, berkas), l, Inches(2.42), GW, GH)
    teks(s, jd, l, Inches(4.86), GW, Inches(0.28), size=13, bold=True, warna=NAVY)
    teks(s, ket, l, Inches(5.16), GW, Inches(0.5), size=10.5, warna=SLATE, spasi=1.2)

kotak(s, Inches(0.75), Inches(5.85), Inches(11.83), Inches(0.92), CARD, radius=0.06)
bar(s, Inches(0.75), Inches(5.85), Inches(0.055), Inches(0.92), AMBER)
teks(s, "Ketiganya dibuka dari alamat yang sama yang dipakai penonton sungguhan. Nama yang dilihat pengunjung adalah\n"
        "DramaKu - \"dramaapp\" adalah nama project-nya di sisi pengembangan.",
     Inches(1.1), Inches(6.06), Inches(11.1), Inches(0.6), size=12, warna=SLATE, spasi=1.35)

# ================= SLIDE 5 - Aktivitas bulanan =================
s = slide_baru()
kepala(s, "Aktivitas", "Ritme pengembangan per bulan")
kaki(s, 5)
teks(s, "Jumlah perubahan tercatat (commit) tiap bulan. Semakin tinggi batangnya, semakin banyak pekerjaan yang selesai bulan itu.",
     Inches(0.75), Inches(1.92), Inches(11.8), Inches(0.35), size=13, warna=SLATE)

cd = CategoryChartData()
cd.categories = ["Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November*"]
cd.add_series("Commit", (52, 121, 2, 104, 156, 173, 37))
gf = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(0.75), Inches(2.45),
                        Inches(8.55), Inches(4.0), cd)
ch = gf.chart
ch.has_legend = False
ch.font.name = FONT
ch.font.size = Pt(12)
ch.font.color.rgb = SLATE
pl = ch.plots[0]
pl.gap_width = 55
pl.has_data_labels = True
dl = pl.data_labels
dl.font.name = FONT
dl.font.size = Pt(12)
dl.font.bold = True
dl.font.color.rgb = NAVY
ser = pl.series[0]
ser.format.fill.solid()
ser.format.fill.fore_color.rgb = ROSE
try:
    ch.value_axis.visible = False
    ch.value_axis.has_major_gridlines = False
    ch.category_axis.has_major_gridlines = False
    ch.category_axis.format.line.color.rgb = LINE
except Exception:
    pass

kotak(s, Inches(9.6), Inches(2.45), Inches(2.98), Inches(4.0), CARD, radius=0.06)
teks(s, "Yang terbaca\ndari grafik", Inches(9.9), Inches(2.72), Inches(2.4), Inches(0.66),
     size=14, bold=True, warna=NAVY, spasi=1.15)
# jarak antar-butir sengaja 0,96" : butir ke-2 memakai 3 baris, dan catatan kaki
# di 6,12" harus tetap berada di dalam kartu yang berakhir di 6,45"
y = Inches(3.46)
for jd, isi in [("Tempo naik terus",
                 "Agustus sampai Oktober konsisten di atas 100 perubahan per bulan."),
                ("Oktober tertinggi",
                 "173 perubahan - bulan migrasi hosting sekaligus pengetatan keamanan."),
                ("Juli hanya 2",
                 "Bulan jeda; dicatat apa adanya, tidak disembunyikan.")]:
    teks(s, jd, Inches(9.9), y, Inches(2.4), Inches(0.28), size=12, bold=True, warna=ROSE)
    teks(s, isi, Inches(9.9), y + Inches(0.3), Inches(2.4), Inches(0.58),
         size=10.5, warna=SLATE, spasi=1.2)
    y += Inches(0.96)
teks(s, "* November dihitung sampai tanggal 5.", Inches(9.9), Inches(6.12), Inches(2.5),
     Inches(0.28), size=9.5, italic=True, warna=MUTED)

# ================= SLIDE 6 - Komposisi kerja =================
s = slide_baru()
kepala(s, "Komposisi kerja", "Ke mana 645 perubahan itu dipakai")
kaki(s, 6)
teks(s, "Membangun fitur baru hanya sebagian dari pekerjaan - porsi besar dipakai untuk memperbaiki dan mencatat.",
     Inches(0.75), Inches(1.92), Inches(11.8), Inches(0.35), size=13, warna=SLATE)

cd2 = CategoryChartData()
cd2.categories = ["Fitur baru", "Perbaikan bug", "Dokumentasi & catatan",
                  "Pemeliharaan", "Lain-lain"]
cd2.add_series("Jumlah", (136, 100, 241, 12, 156))
gf2 = s.shapes.add_chart(XL_CHART_TYPE.DOUGHNUT, Inches(0.6), Inches(2.3),
                         Inches(6.1), Inches(4.2), cd2)
ch2 = gf2.chart
ch2.has_legend = True
ch2.legend.position = XL_LEGEND_POSITION.RIGHT
ch2.legend.include_in_layout = False
ch2.font.name = FONT
ch2.font.size = Pt(12)
ch2.font.color.rgb = INK
pl2 = ch2.plots[0]
pl2.has_data_labels = True
dl2 = pl2.data_labels
dl2.font.name = FONT
dl2.font.size = Pt(11)
dl2.font.bold = True
dl2.font.color.rgb = WHITE
warna_slice = [INDIGO, ROSE, NAVY, TEAL, MUTED]
for i, pt in enumerate(pl2.series[0].points):
    pt.format.fill.solid()
    pt.format.fill.fore_color.rgb = warna_slice[i % len(warna_slice)]
    pt.format.line.color.rgb = WHITE
    pt.format.line.width = Pt(1.5)

x2 = Inches(7.0)
kotak(s, x2, Inches(2.3), Inches(5.58), Inches(4.2), CARD, radius=0.05)
teks(s, "Arti angka ini bagi project", x2 + Inches(0.35), Inches(2.58), Inches(4.9),
     Inches(0.32), size=15, bold=True, warna=NAVY)
y = Inches(3.06)
for idx, (jd, isi) in enumerate([
    ("136 fitur baru",
     "Kemampuan yang sebelumnya tidak ada - dari pemutar video sampai panel admin."),
    ("100 perbaikan bug",
     "Masalah yang ditemukan lalu ditutup; sebagian besar di hari yang sama."),
    ("241 catatan kerja",
     "Keputusan dan jebakan ditulis, agar pekerjaan bisa dilanjutkan tanpa mengulang kesalahan lama."),
    ("30 hari terakhir: 179",
     "Bulan terakhir saja menyumbang 36 fitur dan 39 perbaikan - tempo masih tinggi.")]):
    wr = [INDIGO, ROSE, NAVY, TEAL][idx]
    bar(s, x2 + Inches(0.35), y + Inches(0.05), Inches(0.05), Inches(0.62), wr)
    teks(s, jd, x2 + Inches(0.58), y, Inches(4.7), Inches(0.28), size=12.5, bold=True, warna=NAVY)
    teks(s, isi, x2 + Inches(0.58), y + Inches(0.3), Inches(4.7), Inches(0.62),
         size=10.5, warna=SLATE, spasi=1.2)
    y += Inches(0.86)

# ================= SLIDE 7 - Capaian 1 =================
s = slide_baru()
kepala(s, "Capaian 1 dari 3", "Pengalaman penonton")
kaki(s, 7)
teks(s, "Sisi yang dilihat dan dirasakan pengguna - tampilan, pencarian, dan kenyamanan menonton.",
     Inches(0.75), Inches(1.92), Inches(11.8), Inches(0.35), size=13, warna=SLATE)
y = Inches(2.52)
daftar1 = [
    ("Halaman depan dirombak total",
     "Dari halaman kosong menjadi beranda bergaya situs streaming: banner besar, deretan poster yang bisa digeser, tab kategori, dan tombol filter."),
    ("Pemutar video dibenahi",
     "Dibangun pengatur Volume Stabil dan penguat suara yang sebelumnya kosong; judul kini memudar sendiri saat film berjalan agar tidak menutupi terjemahan."),
    ("Menonton jadi berkelanjutan",
     "Daftar episode otomatis menggulung ke episode terakhir yang ditonton, ditambah panel Lanjut Menonton, riwayat, dan daftar simpanan."),
    ("Seluruh tampilan diseragamkan",
     "10 halaman disamakan ke tema terang yang konsisten, dan nama genre diterjemahkan ke bahasa Indonesia di semua sisi penonton."),
    ("Unduhan rapi dalam satu tempat",
     "Tombol DOWNLOAD membuka tabel pilihan: 4-5 penyedia dikali 2 pilihan kualitas (1080p / 480p), dibatasi hanya ke domain yang dipercaya."),
]
for i, (jd, isi) in enumerate(daftar1):
    poin(s, Inches(0.75), y, Inches(11.83), i + 1, jd, isi,
         [ROSE, INDIGO, AMBER, TEAL, NAVY][i])
    y += Inches(0.9)

# ================= SLIDE 8 - Capaian 2 =================
s = slide_baru()
kepala(s, "Capaian 2 dari 3", "Katalog terisi otomatis")
kaki(s, 8)
teks(s, "Isi situs tidak lagi diinput satu per satu - judul baru masuk sendiri lewat sambungan ke penyedia video.",
     Inches(0.75), Inches(1.92), Inches(11.8), Inches(0.35), size=13, warna=SLATE)
gw3 = Inches(3.84)
kpi(s, Inches(0.75), Inches(2.42), gw3, "42", "Drama berseri",
    "Angka yang ditampilkan halaman katalog situs", INDIGO)
kpi(s, Inches(0.75) + gw3 + GAP, Inches(2.42), gw3, "489", "Film & video",
    "Terbaca di halaman Film situs, 6 November 2026", ROSE)
kpi(s, Inches(0.75) + 2 * (gw3 + GAP), Inches(2.42), gw3, "4 - 5", "Penyedia unduhan",
    "Tiap judul punya pilihan sumber dan kualitas", AMBER)
y = Inches(4.42)
daftar2 = [
    ("Judul baru masuk dan keluar sendiri",
     "Sambungan otomatis (webhook) menambahkan video baru, dan ketika video dihapus di sumbernya judulnya ikut turun dari situs - tidak ada lagi judul mati yang menipu penonton."),
    ("Data film diisi otomatis dari IMDb",
     "Rating, sinopsis, pemain, dan sutradara ditarik lewat pencarian judul. Ada tombol Cocokkan Semua untuk mengisi massal lalu ditinjau sebelum disimpan."),
    ("Panel admin dirapikan",
     "Satu menu satu tampilan, latar terang seragam, saringan sudah / belum ada data IMDb, dan kartu peringatan bila sumber katalog diam-diam basi."),
]
for i, (jd, isi) in enumerate(daftar2):
    poin(s, Inches(0.75), y, Inches(11.83), i + 1, jd, isi, [TEAL, INDIGO, ROSE][i])
    y += Inches(0.84)

# ================= SLIDE 9 - Capaian 3 =================
s = slide_baru()
kepala(s, "Capaian 3 dari 3", "Keamanan dan kesiapan operasional")
kaki(s, 9)
teks(s, "Bagian yang tidak terlihat penonton, tapi menentukan apakah situs aman dan tidak mati saat dipakai.",
     Inches(0.75), Inches(1.92), Inches(11.8), Inches(0.35), size=13, warna=SLATE)
y = Inches(2.52)
daftar3 = [
    ("Penguncian database diaktifkan di produksi",
     "Pembatasan akses baris per baris (RLS) dinyalakan di 5 tabel dan hak akses fungsi dirapatkan - data pengguna tidak bisa lagi dibaca sembarangan dari luar."),
    ("Alamat video ditandatangani",
     "Tautan video tanpa tanda tangan sah akan ditolak, sehingga file tidak bisa dicuri dan dipasang di situs orang lain."),
    ("5 lapis pengaman browser dipasang",
     "Header keamanan standar industri ditambahkan, termasuk penyaring konten (CSP) yang dipasang bertahap agar tidak mematikan situs."),
    ("Pindah rumah hosting tanpa mati",
     "Situs dimigrasikan dari Vercel ke Railway lengkap dengan alamat pengalihan dan halaman pemeriksa kesehatan, tanpa situs sempat tidak bisa diakses."),
    ("Robot penjaga cadangan data",
     "Pemeriksaan terjadwal menguji apakah data cadangan benar-benar bisa dipulihkan - bukan sekadar ada filenya."),
]
for i, (jd, isi) in enumerate(daftar3):
    poin(s, Inches(0.75), y, Inches(11.83), i + 1, jd, isi,
         [ROSE, NAVY, INDIGO, AMBER, TEAL][i])
    y += Inches(0.9)

# ================= SLIDE 10 - Status hari ini =================
s = slide_baru(NAVY)
bar(s, Inches(0), Inches(0), W, Inches(0.14), ROSE)
teks(s, "STATUS HARI INI", Inches(0.9), Inches(0.75), Inches(8), Inches(0.33),
     size=12.5, bold=True, warna=AMBER)
teks(s, "Situs tayang dan sehat", Inches(0.9), Inches(1.12), Inches(10), Inches(0.75),
     size=38, bold=True, warna=WHITE)
bar(s, Inches(0.9), Inches(2.0), Inches(2.0), Inches(0.05), ROSE)
teks(s, "Diperiksa langsung ke server produksi pada 6 November 2026:",
     Inches(0.9), Inches(2.28), Inches(11.5), Inches(0.35), size=13, warna=PALE)

kw = Inches(3.72)
kartu = [("200 OK", "Halaman utama terbuka normal", "Tidak ada error saat diakses"),
         ("0,26 detik", "Waktu respons server", "Jauh di bawah ambang nyaman 1 detik"),
         ("Database aktif", "Sumber data terverifikasi", "Katalog ditarik dari database, bukan file cadangan")]
for i, (ang, lab, ket) in enumerate(kartu):
    l = Inches(0.9) + i * (kw + GAP)
    kotak(s, l, Inches(2.78), kw, Inches(1.62), PANEL, radius=0.07)
    bar(s, l, Inches(2.78), Inches(0.055), Inches(1.62), TEAL)
    teks(s, ang, l + Inches(0.32), Inches(2.98), kw - Inches(0.5), Inches(0.52),
         size=25, bold=True, warna=WHITE)
    teks(s, lab, l + Inches(0.32), Inches(3.56), kw - Inches(0.5), Inches(0.3),
         size=12, bold=True, warna=SOFT)
    teks(s, ket, l + Inches(0.32), Inches(3.86), kw - Inches(0.5), Inches(0.46),
         size=10, warna=MUTED, spasi=1.1)

kotak(s, Inches(0.9), Inches(4.62), Inches(11.53), Inches(1.72), PANEL, radius=0.05)
bar(s, Inches(0.9), Inches(4.62), Inches(0.055), Inches(1.72), AMBER)
teks(s, "Penutup", Inches(1.25), Inches(4.85), Inches(10.9), Inches(0.32),
     size=15, bold=True, warna=AMBER)
teks(s,
     "Enam bulan terakhir menghasilkan platform streaming yang berjalan sungguhan: 21 halaman siap pakai, 531 judul\n"
     "dalam katalog yang terisi otomatis, keamanan database sudah diaktifkan di produksi, dan hosting sudah dipindah ke\n"
     "rumah yang lebih sesuai - semuanya tanpa membuat situs mati. Tempo kerja masih tinggi: 179 perubahan dalam 30 hari terakhir.",
     Inches(1.25), Inches(5.26), Inches(10.9), Inches(1.0), size=12.5, warna=SOFT, spasi=1.4)
teks(s, "Sumber data: riwayat kerja git (645 commit) + pemeriksaan langsung ke server produksi, 6 November 2026.",
     Inches(0.9), Inches(6.88), Inches(11.5), Inches(0.3), size=10, italic=True, warna=MUTED)

out = sys.argv[1]
prs.save(out)
print("TERSIMPAN:", out)
print("jumlah slide:", len(prs.slides._sldIdLst))
