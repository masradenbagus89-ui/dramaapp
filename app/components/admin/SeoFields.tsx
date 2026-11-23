"use client";

// Kotak isian "SEO (Google & preview share)" di form admin drama. Dipisah dari
// DramaForm supaya satu berkas = satu tanggung jawab (pola DownloadProviderFields).
//
// Kolom KOSONG = dibuat otomatis saat halaman tampil, dan placeholder tiap
// kolom memperlihatkan hasil otomatis itu — admin melihat apa yang akan
// dipakai tanpa harus menekan tombol apa pun.
import { useState, type Dispatch, type SetStateAction } from "react";
import type { SeoDrama } from "@/lib/types";
import {
  SEO_DESCRIPTION_MAX,
  SEO_DESCRIPTION_MIN,
  SEO_KEYWORDS_MAX,
  SEO_KEYWORDS_MIN,
  SEO_TITLE_MAX,
  buatSeoOtomatis,
  hitungKeyword,
  type SumberSeo,
} from "@/lib/seo-drama";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const KELAS_INPUT =
  "rounded-lg border-zinc-700 bg-zinc-900 text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0";

type Kolom = keyof SeoDrama;
const KOLOM: Kolom[] = ["title", "description", "keywords"];

/** Penghitung di bawah kolom: kuning kalau di luar batas ideal, bukan blokir. */
function Penghitung({ teks, ok }: { teks: string; ok: boolean }) {
  return <p className={`text-[11px] ${ok ? "text-zinc-500" : "text-amber-300"}`}>{teks}</p>;
}

export default function SeoFields({
  seo,
  setSeo,
  sumber,
}: {
  seo: SeoDrama;
  setSeo: Dispatch<SetStateAction<SeoDrama>>;
  /** Data drama di form SAAT INI — generator membaca ini, bukan data tersimpan. */
  sumber: SumberSeo;
}) {
  const [info, setInfo] = useState<string | null>(null);
  const otomatis = sumber.title.trim() ? buatSeoOtomatis(sumber) : null;

  const ubah = (kolom: Kolom, nilai: string) => {
    setInfo(null);
    setSeo((s) => ({ ...s, [kolom]: nilai }));
  };

  const generate = () => {
    if (!otomatis) {
      setInfo("Isi Judul dulu — SEO dibuat dari data drama.");
      return;
    }
    // Isian manual yang BEDA dari hasil generator = milik admin → tanya dulu.
    const terisi = KOLOM.filter((k) => seo[k]?.trim() && seo[k]?.trim() !== otomatis[k]);
    const timpa =
      terisi.length === 0 ||
      confirm(
        "Kolom SEO sudah ada yang diisi manual. Timpa SEMUA dengan hasil otomatis?\n\n" +
          "OK = timpa semua · Batal = isi kolom yang masih kosong saja",
      );
    setSeo((s) => {
      const baru: SeoDrama = { ...s };
      for (const k of KOLOM) if (timpa || !s[k]?.trim()) baru[k] = otomatis[k];
      return baru;
    });
    setInfo(
      timpa
        ? "SEO terisi otomatis. Periksa & ubah bila perlu, lalu klik Simpan drama."
        : "Kolom kosong terisi otomatis; isian manualmu tidak diubah.",
    );
  };

  const judul = seo.title ?? "";
  const deskripsi = seo.description ?? "";
  const keyword = seo.keywords ?? "";
  const jmlKeyword = hitungKeyword(keyword);

  return (
    <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-emerald-200">SEO (Google &amp; preview share)</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Dibiarkan KOSONG = dibuat otomatis dari judul, tahun, genre &amp; sinopsis (contohnya
            terlihat samar di dalam kolom) dan selalu ikut data terbaru. Diisi = isianmu yang
            dipakai. Judul &amp; deskripsi ini juga tampil saat link dibagikan ke WhatsApp/Facebook.
          </p>
        </div>
        <Button
          type="button"
          onClick={generate}
          variant="outline"
          className="rounded-lg border-emerald-400/60 bg-emerald-400/10 font-semibold text-emerald-300 hover:bg-emerald-400/20 hover:text-emerald-200"
        >
          ✨ Generate SEO Otomatis
        </Button>
      </div>

      <div className="mt-3 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="seo-title" className="text-xs text-zinc-400">
            SEO Title (judul di Google)
          </Label>
          <Input
            id="seo-title"
            value={judul}
            onChange={(e) => ubah("title", e.target.value)}
            placeholder={otomatis?.title ?? "Isi Judul drama dulu"}
            className={KELAS_INPUT}
          />
          {judul && (
            <Penghitung
              teks={`${judul.length}/${SEO_TITLE_MAX} karakter${judul.length > SEO_TITLE_MAX ? " — kepanjangan, Google memotongnya" : ""}`}
              ok={judul.length <= SEO_TITLE_MAX}
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="seo-description" className="text-xs text-zinc-400">
            SEO Description
          </Label>
          <Textarea
            id="seo-description"
            value={deskripsi}
            onChange={(e) => ubah("description", e.target.value)}
            rows={3}
            placeholder={otomatis?.description ?? ""}
            className={`resize-y ${KELAS_INPUT}`}
          />
          {deskripsi && (
            <Penghitung
              teks={`${deskripsi.length} karakter (ideal ${SEO_DESCRIPTION_MIN}–${SEO_DESCRIPTION_MAX})`}
              ok={
                deskripsi.length >= SEO_DESCRIPTION_MIN && deskripsi.length <= SEO_DESCRIPTION_MAX
              }
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="seo-keywords" className="text-xs text-zinc-400">
            SEO Keywords (pisahkan dengan koma)
          </Label>
          <Input
            id="seo-keywords"
            value={keyword}
            onChange={(e) => ubah("keywords", e.target.value)}
            placeholder={otomatis?.keywords ?? ""}
            className={KELAS_INPUT}
          />
          {keyword && (
            <Penghitung
              teks={`${jmlKeyword} keyword (ideal ${SEO_KEYWORDS_MIN}–${SEO_KEYWORDS_MAX})${jmlKeyword > SEO_KEYWORDS_MAX ? ` — lebihnya dibuang saat disimpan` : ""}`}
              ok={jmlKeyword >= SEO_KEYWORDS_MIN && jmlKeyword <= SEO_KEYWORDS_MAX}
            />
          )}
        </div>
      </div>

      {info && <p className="mt-3 text-xs text-emerald-300">{info}</p>}
    </div>
  );
}
