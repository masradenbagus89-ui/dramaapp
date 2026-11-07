# -*- coding: utf-8 -*-
"""
Pemeriksa tata letak .pptx. DUA pemeriksaan, karena pemeriksaan pertama saja
pernah meloloskan bug nyata (slide 4: teks butir menimpa catatan kaki):

  1. LUBER  - teks lebih tinggi daripada kotaknya sendiri.
  2. TABRAK - dua blok teks saling menimpa di layar, walau masing-masing
              "muat" di kotaknya. Inilah yang lolos sebelumnya.

Kenapa perlu: python-pptx menyimpan posisi & ukuran, TAPI tidak menghitung layout
teks - jadi "file tersimpan" bukan bukti slide terbaca rapi.
Estimasi lebar huruf dirata-ratakan, jadi hasilnya menandai yang BERISIKO,
bukan mengukur persis. Ambang toleransi sengaja longgar agar tidak ramai palsu.
"""
import math
import sys
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

EMU_IN = 914400
LEBAR_GLYPH = 0.50          # rata-rata lebar glyph Segoe UI relatif ukuran font
TOLERANSI_LUBER = 1.02      # 2% kelonggaran
TOLERANSI_TABRAK = 0.03     # inci - singgungan tipis diabaikan


def tinggi_nyata(sh):
    """Estimasi tinggi yang BENAR-BENAR dipakai teks di dalam kotak."""
    tf = sh.text_frame
    w_in = max(sh.width / EMU_IN - (tf.margin_left + tf.margin_right) / EMU_IN, 0.2)
    total = 0.0
    for par in tf.paragraphs:
        isi = "".join(r.text for r in par.runs)
        size, bold = None, False
        for r in par.runs:
            if r.font.size:
                size = r.font.size.pt
            bold = bold or bool(r.font.bold)
        size = size or 18.0
        lebar_char = (size * LEBAR_GLYPH * (1.06 if bold else 1.0)) / 72.0
        per_baris = max(int(w_in / lebar_char), 1)
        n = max(math.ceil(len(isi) / per_baris), 1) if isi else 1
        total += n * (size / 72.0) * (par.line_spacing or 1.15) * 1.02
    return total


p = Presentation(sys.argv[1])
H_SLIDE = p.slide_height
luber, tabrak, lepas = [], [], []

for idx, s in enumerate(p.slides, 1):
    blok = []
    for sh in s.shapes:
        # gambar ikut dihitung: ia MENUTUPI apa pun di bawahnya, jadi kalau
        # bertindihan dengan teks, teksnya hilang dari layar tanpa pesan error
        if sh.shape_type == MSO_SHAPE_TYPE.PICTURE:
            blok.append((sh.left / EMU_IN, sh.top / EMU_IN,
                         sh.width / EMU_IN, sh.height / EMU_IN, "[gambar]"))
            if sh.top + sh.height > H_SLIDE:
                lepas.append((idx, "[gambar]"))
            continue
        if not sh.has_text_frame or not sh.text_frame.text.strip():
            continue
        t = tinggi_nyata(sh)
        h = sh.height / EMU_IN
        ringkas = sh.text_frame.text.replace("\n", " / ")[:52]
        if t > h * TOLERANSI_LUBER:
            luber.append((idx, round(t, 2), round(h, 2), ringkas))
        if sh.top + sh.height > H_SLIDE:
            lepas.append((idx, ringkas))
        blok.append((sh.left / EMU_IN, sh.top / EMU_IN,
                     sh.width / EMU_IN, t, ringkas))

    for i in range(len(blok)):
        for j in range(i + 1, len(blok)):
            l1, t1, w1, h1, k1 = blok[i]
            l2, t2, w2, h2, k2 = blok[j]
            ox = min(l1 + w1, l2 + w2) - max(l1, l2)
            oy = min(t1 + h1, t2 + h2) - max(t1, t2)
            if ox > TOLERANSI_TABRAK and oy > TOLERANSI_TABRAK:
                tabrak.append((idx, round(oy, 2), k1, k2))

print("=== 1. TEKS LUBER DARI KOTAKNYA ===")
if not luber:
    print("    tidak ada")
for m in sorted(luber, key=lambda x: x[1] - x[2], reverse=True):
    print("    slide %d: butuh %.2f\" kotak %.2f\" | %s" % (m[0], m[1], m[2], m[3]))

print("")
print("=== 2. DUA BLOK TEKS SALING MENIMPA ===")
if not tabrak:
    print("    tidak ada")
for m in sorted(tabrak, key=lambda x: -x[1]):
    print("    slide %d: tumpang %.2f\" | \"%s\"  X  \"%s\"" % (m[0], m[1], m[2], m[3]))

print("")
print("=== 3. KELUAR KANVAS ===")
print("    tidak ada" if not lepas else "\n".join("    slide %d: %s" % x for x in lepas))

print("")
print("RINGKAS: %d luber, %d tabrakan, %d keluar kanvas" % (len(luber), len(tabrak), len(lepas)))
sys.exit(1 if (luber or tabrak or lepas) else 0)
