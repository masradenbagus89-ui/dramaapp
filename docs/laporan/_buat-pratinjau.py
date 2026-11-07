# -*- coding: utf-8 -*-
"""
Membuat pratinjau HTML DARI berkas .pptx yang sudah jadi.
Kenapa dibaca dari .pptx (bukan menulis ulang isinya): supaya pratinjau selalu
sama dengan file yang dipresentasikan. Kalau .pptx berubah, jalankan ulang.
Di mesin ini PowerPoint tidak terpasang, jadi ini satu-satunya cara owner
memeriksa isi slide sebelum rapat.
Catatan: grafik PowerPoint adalah objek native - di sini digambar ulang pakai CSS
dari ANGKA yang sama yang tersimpan di dalam .pptx.
"""
import html
import sys
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

EMU_IN = 914400
PX = 96.0  # 1 inci = 96 px


def px(emu):
    return round((emu / EMU_IN) * PX, 1)


def warna_dari(obj):
    try:
        if obj.type is not None and str(obj.type).startswith("MSO_FILL.BACKGROUND"):
            return None
    except Exception:
        pass
    try:
        return "#%02X%02X%02X" % tuple(obj.fore_color.rgb)
    except Exception:
        return None


def ambil_radius(sh):
    try:
        if sh.shape_type == MSO_SHAPE_TYPE.AUTO_SHAPE:
            nama = str(sh.auto_shape_type)
            if "OVAL" in nama:
                return "50%"
            if "ROUNDED" in nama:
                adj = 0.06
                try:
                    adj = float(sh.adjustments[0])
                except Exception:
                    pass
                sisi = min(sh.width, sh.height)
                return "%.1fpx" % (px(sisi) * adj)
    except Exception:
        pass
    return "0"


def render_chart(sh):
    """Gambar ulang grafik pakai CSS dari angka yang tersimpan di .pptx."""
    ch = sh.chart
    jenis = str(ch.chart_type)
    kat = list(ch.plots[0].categories)
    nilai = list(ch.series[0].values)
    w, h = px(sh.width), px(sh.height)
    palet = ["#4F46E5", "#E11D48", "#0F172A", "#0D9488", "#94A3B8"]

    if "DOUGHNUT" in jenis:
        total = sum(nilai) or 1
        stop, mulai = [], 0.0
        for i, v in enumerate(nilai):
            akhir = mulai + (v / total) * 360
            stop.append("%s %.2fdeg %.2fdeg" % (palet[i % len(palet)], mulai, akhir))
            mulai = akhir
        d = min(w, h) * 0.82
        lgd = "".join(
            '<div class="lg"><i style="background:%s"></i>%s <b>%s</b></div>'
            % (palet[i % len(palet)], html.escape(str(k)), int(v))
            for i, (k, v) in enumerate(zip(kat, nilai)))
        return (
            '<div class="chart" style="left:%.1fpx;top:%.1fpx;width:%.1fpx;height:%.1fpx">'
            '<div class="dn" style="width:%.1fpx;height:%.1fpx;background:conic-gradient(%s)">'
            '<div class="hole"></div></div><div class="lgwrap">%s</div></div>'
            % (px(sh.left), px(sh.top), w, h, d, d, ",".join(stop), lgd))

    # grafik batang
    maks = max(nilai) or 1
    tinggi_area = h - 54
    batang = ""
    for k, v in zip(kat, nilai):
        hb = max((v / maks) * tinggi_area, 2)
        batang += ('<div class="bcol"><div class="bval">%d</div>'
                   '<div class="bbar" style="height:%.1fpx"></div>'
                   '<div class="bcat">%s</div></div>'
                   % (int(v), hb, html.escape(str(k))))
    return ('<div class="chart" style="left:%.1fpx;top:%.1fpx;width:%.1fpx;height:%.1fpx">'
            '<div class="bwrap">%s</div></div>'
            % (px(sh.left), px(sh.top), w, h, batang))


def render_teks(sh):
    tf = sh.text_frame
    if not tf.text.strip():
        return ""
    isi = ""
    for par in tf.paragraphs:
        bagian = ""
        size, bold, ital, col = 18, False, False, "#111827"
        for r in par.runs:
            if r.font.size:
                size = r.font.size.pt
            bold = bold or bool(r.font.bold)
            ital = ital or bool(r.font.italic)
            try:
                col = "#%02X%02X%02X" % tuple(r.font.color.rgb)
            except Exception:
                pass
            bagian += html.escape(r.text)
        if not bagian:
            bagian = "&nbsp;"
        al = "left"
        if par.alignment is not None:
            a = str(par.alignment)
            if "CENTER" in a:
                al = "center"
            elif "RIGHT" in a:
                al = "right"
        isi += ('<p style="font-size:%.1fpx;font-weight:%s;font-style:%s;color:%s;'
                'text-align:%s;line-height:%.2f">%s</p>'
                % (size * PX / 72.0, "700" if bold else "400",
                   "italic" if ital else "normal", col, al,
                   par.line_spacing or 1.15, bagian))
    # kotak/oval berisi teks -> teks dipusatkan vertikal
    pusat = sh.has_text_frame and sh.shape_type == MSO_SHAPE_TYPE.AUTO_SHAPE
    return ('<div class="tx%s" style="left:%.1fpx;top:%.1fpx;width:%.1fpx;height:%.1fpx">%s</div>'
            % (" ctr" if pusat else "", px(sh.left), px(sh.top),
               px(sh.width), px(sh.height), isi))


def render_gambar(sh):
    """Tangkapan layar ditanam sebagai data URI, supaya berkas HTML ini tetap utuh
    walau dipindah/disalin ke folder lain (tidak bergantung folder gambar/)."""
    import base64
    im = sh.image
    b64 = base64.b64encode(im.blob).decode("ascii")
    return ('<img class="pic" style="left:%.1fpx;top:%.1fpx;width:%.1fpx;height:%.1fpx" '
            'src="data:%s;base64,%s">'
            % (px(sh.left), px(sh.top), px(sh.width), px(sh.height),
               im.content_type, b64))


masuk, keluar = sys.argv[1], sys.argv[2]
prs = Presentation(masuk)
SW, SH = px(prs.slide_width), px(prs.slide_height)

bagian = []
for no, s in enumerate(prs.slides, 1):
    el = []
    for sh in s.shapes:
        if sh.has_chart if hasattr(sh, "has_chart") else False:
            el.append(render_chart(sh))
            continue
        if sh.shape_type == MSO_SHAPE_TYPE.PICTURE:
            el.append(render_gambar(sh))
            continue
        bentuk_saja = ""
        try:
            if sh.shape_type == MSO_SHAPE_TYPE.AUTO_SHAPE:
                bg = warna_dari(sh.fill)
                br = ""
                try:
                    if sh.line.fill.type is not None and "BACKGROUND" not in str(sh.line.fill.type):
                        br = "border:1px solid #%02X%02X%02X;" % tuple(sh.line.color.rgb)
                except Exception:
                    pass
                if bg:
                    bentuk_saja = ('<div class="sp" style="left:%.1fpx;top:%.1fpx;width:%.1fpx;'
                                   'height:%.1fpx;background:%s;border-radius:%s;%s"></div>'
                                   % (px(sh.left), px(sh.top), px(sh.width), px(sh.height),
                                      bg, ambil_radius(sh), br))
        except Exception:
            pass
        if bentuk_saja:
            el.append(bentuk_saja)
        if sh.has_text_frame:
            t = render_teks(sh)
            if t:
                el.append(t)
    bagian.append('<div class="wrap"><div class="no">Slide %d dari %d</div>'
                  '<div class="slide">%s</div></div>' % (no, len(prs.slides), "".join(el)))

CSS = """
*{margin:0;padding:0;box-sizing:border-box}
body{background:#64748B;font-family:"Segoe UI",system-ui,sans-serif;padding:26px 0 60px}
.hd{max-width:%(w).0fpx;margin:0 auto 22px;color:#fff}
.hd h1{font-size:25px;font-weight:700}
.hd p{font-size:13px;opacity:.92;margin-top:6px;line-height:1.5}
.wrap{max-width:%(w).0fpx;margin:0 auto 30px}
.no{color:#F1F5F9;font-size:12px;font-weight:600;margin-bottom:7px;letter-spacing:.4px}
.slide{position:relative;width:%(w).0fpx;height:%(h).0fpx;background:#fff;overflow:hidden;
 box-shadow:0 10px 30px rgba(0,0,0,.34);border-radius:3px}
.sp,.tx,.chart,.pic{position:absolute}
.pic{object-fit:fill;border:1px solid #CBD5E1}
.tx p{white-space:pre-wrap}
.tx.ctr{display:flex;flex-direction:column;justify-content:center}
.chart{display:flex}
.bwrap{display:flex;align-items:flex-end;justify-content:space-around;width:100%%;height:100%%;
 border-bottom:1px solid #E2E8F0;padding:0 6px}
.bcol{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;flex:1}
.bval{font-size:15px;font-weight:700;color:#0F172A;margin-bottom:5px}
.bbar{width:62%%;background:#E11D48;border-radius:3px 3px 0 0}
.bcat{font-size:14px;color:#475569;padding-top:9px;position:absolute;bottom:-29px}
.dn{position:relative;border-radius:50%%;display:flex;align-items:center;justify-content:center;
 flex:0 0 auto;align-self:center}
.dn .hole{width:50%%;height:50%%;background:#fff;border-radius:50%%}
.lgwrap{align-self:center;padding-left:16px}
.lg{font-size:14px;color:#111827;margin:7px 0;display:flex;align-items:center}
.lg i{width:13px;height:13px;border-radius:3px;margin-right:9px;display:inline-block}
.lg b{margin-left:6px}
@page{size:%(w).0fpx %(h).0fpx;margin:0}
@media print{body{background:#fff;padding:0}.hd,.no{display:none}
 .wrap{margin:0;max-width:none}
 .slide{box-shadow:none;page-break-after:always;border-radius:0}}
""" % {"w": SW, "h": SH}

HTML = """<!doctype html>
<html lang="id"><head><meta charset="utf-8">
<title>Pratinjau - Laporan Progress dramaapp</title>
<style>%s</style></head><body>
<div class="hd"><h1>Pratinjau laporan - dramaapp</h1>
<p>Ini pratinjau dari berkas 2026-11-06-laporan-progress-dramaapp.pptx, dibangun langsung dari
berkas itu supaya isinya persis sama. Grafik digambar ulang dengan CSS dari angka yang sama.
Untuk mencetak jadi PDF: tekan Ctrl+P lalu pilih Save as PDF (tiap slide jadi 1 halaman).</p></div>
%s</body></html>""" % (CSS, "".join(bagian))

with open(keluar, "w", encoding="utf-8") as f:
    f.write(HTML)
print("PRATINJAU:", keluar)
print("slide dirender:", len(prs.slides._sldIdLst))
