"use client";

// Kotak isian "Provider unduhan" di form admin drama. Dipisah dari DramaForm
// (yang sudah 700+ baris) supaya satu berkas = satu tanggung jawab.
//
// Sengaja baris-baris isian, BUKAN satu kotak teks berformat sendiri
// ("Nama | 1080p | https://..."): format buatan sendiri butuh penerjemah
// buatan sendiri, dan alamat yang mengandung tanda pemisah akan terpotong
// diam-diam. Baris isian tidak punya masalah itu, dan owner tak perlu
// menghafal aturan penulisan apa pun.
import type { Dispatch, SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  DOWNLOAD_BUTTON_COLORS,
  type DownloadButtonColor,
  type DownloadProvider,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Nama warna yang dibaca owner — istilah "blue"/"orange" tak perlu bocor ke UI. */
const LABEL_WARNA: Record<DownloadButtonColor, string> = {
  blue: "Biru",
  orange: "Oranye",
};

const KELAS_INPUT =
  "rounded-lg border-zinc-700 bg-zinc-900 text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0";

/** Baris kosong untuk entri baru. */
function barisBaru(): DownloadProvider {
  return { name: "", quality: "", url: "" };
}

export default function DownloadProviderFields({
  providers,
  setProviders,
}: {
  providers: DownloadProvider[];
  setProviders: Dispatch<SetStateAction<DownloadProvider[]>>;
}) {
  const ubah = (i: number, tambalan: Partial<DownloadProvider>) =>
    setProviders((daftar) =>
      daftar.map((p, idx) => (idx === i ? { ...p, ...tambalan } : p)),
    );

  const hapus = (i: number) =>
    setProviders((daftar) => daftar.filter((_, idx) => idx !== i));

  return (
    <div className="mt-4 rounded-xl border border-pink-500/30 bg-pink-950/10 p-4">
      <p className="text-sm font-semibold text-pink-200">
        Provider unduhan (isi modal tombol DOWNLOAD)
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">
        Dibiarkan KOSONG = tombol DOWNLOAD di halaman detail tetap bekerja
        seperti sebelumnya (mengunduh satu berkas dari PC backup). Begitu ada
        minimal satu baris terisi lengkap, tombol itu berubah jadi pembuka
        daftar pilihan ini. Baris yang nama/kualitas/alamatnya belum lengkap
        akan dibuang saat disimpan — bukan disimpan setengah jadi.
      </p>

      <div className="mt-3 space-y-3">
        {providers.map((p, i) => (
          <div
            key={i}
            className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor={`provider-nama-${i}`}
                  className="text-xs text-zinc-400"
                >
                  Nama provider
                </Label>
                <Input
                  id={`provider-nama-${i}`}
                  value={p.name}
                  onChange={(e) => ubah(i, { name: e.target.value })}
                  placeholder="Google Share"
                  className={KELAS_INPUT}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor={`provider-kualitas-${i}`}
                  className="text-xs text-zinc-400"
                >
                  Kualitas (tulisan di tombol)
                </Label>
                <Input
                  id={`provider-kualitas-${i}`}
                  value={p.quality}
                  onChange={(e) => ubah(i, { quality: e.target.value })}
                  placeholder="1080p"
                  className={KELAS_INPUT}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label
                  htmlFor={`provider-url-${i}`}
                  className="text-xs text-zinc-400"
                >
                  Alamat unduhan
                </Label>
                <Input
                  id={`provider-url-${i}`}
                  value={p.url}
                  onChange={(e) => ubah(i, { url: e.target.value })}
                  placeholder="https://t.me/..."
                  className={KELAS_INPUT}
                />
                <p className="text-xs text-zinc-500">
                  Wajib diawali http:// atau https://. Alamat dengan awalan lain
                  ditolak saat disimpan — itu pagar keamanan, bukan kerewelan.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor={`provider-warna-${i}`}
                  className="text-xs text-zinc-400"
                >
                  Warna tombol
                </Label>
                <Select
                  value={p.buttonColor ?? "blue"}
                  onValueChange={(v) =>
                    ubah(i, { buttonColor: v as DownloadButtonColor })
                  }
                >
                  <SelectTrigger
                    id={`provider-warna-${i}`}
                    className={`w-full ${KELAS_INPUT}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOWNLOAD_BUTTON_COLORS.map((w) => (
                      <SelectItem key={w} value={w}>
                        {LABEL_WARNA[w]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor={`provider-tutorial-${i}`}
                  className="text-xs text-zinc-400"
                >
                  Alamat video tutorial (opsional)
                </Label>
                <Input
                  id={`provider-tutorial-${i}`}
                  value={p.tutorialUrl ?? ""}
                  onChange={(e) => ubah(i, { tutorialUrl: e.target.value })}
                  placeholder="https://youtu.be/..."
                  className={KELAS_INPUT}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label
                  htmlFor={`provider-catatan-${i}`}
                  className="text-xs text-zinc-400"
                >
                  Catatan untuk penonton (opsional)
                </Label>
                <Input
                  id={`provider-catatan-${i}`}
                  value={p.note ?? ""}
                  onChange={(e) => ubah(i, { note: e.target.value })}
                  placeholder="Google Share agak ribet, tapi kenceng sekali."
                  className={KELAS_INPUT}
                />
                <p className="text-xs text-zinc-500">
                  Tergambar jadi kotak biru muda di ATAS tabel. Kalau alamat
                  tutorial ikut diisi, tulisan &quot;Klik disini untuk lihat
                  video tutorial&quot; otomatis ditambahkan jadi link.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={() => hapus(i)}
              className="mt-2 h-8 rounded-lg px-2 text-xs text-red-400 hover:bg-red-950/40 hover:text-red-300"
            >
              <Trash2 className="size-3.5" />
              Hapus baris ini
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => setProviders((daftar) => [...daftar, barisBaru()])}
        className="mt-3 h-9 rounded-lg border-zinc-700 bg-transparent text-xs font-semibold text-zinc-300 hover:border-pink-400 hover:text-pink-300"
      >
        <Plus className="size-3.5" />
        Tambah provider
      </Button>
    </div>
  );
}
