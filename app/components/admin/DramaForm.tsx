"use client";

// Bagian "Tambah / Update Drama" di halaman admin: form input (judul, kategori,
// id, sinopsis, dst.) + tombol Scan/auto-hardlink + tombol Simpan + pesan status.
// Dipisah dari app/admin/page.tsx (rapikan kode). SEMUA data field + status +
// aksi disuplai induk lewat prop, jadi komponen ini murni menampilkan — state
// tetap tinggal di halaman, sehingga tombol Edit di "Daftar Drama" tetap bisa
// mengisi form ini lewat setter yang sama TANPA perubahan. Tampilan & perilaku
// sama persis (JSX dipindah byte-identik).
import type { Dispatch, SetStateAction, RefObject, FormEvent } from "react";
import { slugify } from "@/lib/format";
import { SUBTITLE_LANGS } from "@/lib/types";
import { CATEGORY_OPTIONS } from "@/app/admin/constants";
import type { ScanResult } from "@/lib/admin-api";

export default function DramaForm({
  id,
  setId,
  title,
  setTitle,
  category,
  setCategory,
  synopsis,
  setSynopsis,
  views,
  setViews,
  episodes,
  setEpisodes,
  posterImage,
  setPosterImage,
  heroImage,
  setHeroImage,
  subtitles,
  setSubtitles,
  premium,
  setPremium,
  effectiveId,
  scanning,
  scanResult,
  submitting,
  message,
  formRef,
  onScan,
  onSubmit,
}: {
  id: string;
  setId: Dispatch<SetStateAction<string>>;
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  category: string;
  setCategory: Dispatch<SetStateAction<string>>;
  synopsis: string;
  setSynopsis: Dispatch<SetStateAction<string>>;
  views: string;
  setViews: Dispatch<SetStateAction<string>>;
  episodes: number;
  setEpisodes: Dispatch<SetStateAction<number>>;
  posterImage: string;
  setPosterImage: Dispatch<SetStateAction<string>>;
  heroImage: string;
  setHeroImage: Dispatch<SetStateAction<string>>;
  subtitles: string[];
  setSubtitles: Dispatch<SetStateAction<string[]>>;
  premium: boolean;
  setPremium: Dispatch<SetStateAction<boolean>>;
  effectiveId: string;
  scanning: boolean;
  scanResult: ScanResult | null;
  submitting: boolean;
  message: { type: "ok" | "error"; text: string } | null;
  formRef: RefObject<HTMLFormElement | null>;
  onScan: () => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <section id="tambah">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Tambah / Update Drama</h2>
      </div>
      <div className="mb-3 rounded-xl border border-amber-700/60 bg-amber-900/15 px-4 py-3 text-xs text-amber-200">
        <p className="font-semibold">📋 Workflow self-hosted:</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5">
          <li>Taruh file video di PC backup, folder <code className="text-amber-100">{`<drama-id>`}</code>. Nama file <strong>bebas</strong> (raw): mis. <code className="text-amber-100">ep01.mp4</code>, <code className="text-amber-100">Video 1.mp4</code>, dst.</li>
          <li>Isi form di bawah — judul, kategori, sinopsis.</li>
          <li>Klik <strong>🪄 Scan & auto-hardlink</strong> → agent di PC backup auto-rename (kalau perlu) ke <code className="text-amber-100">1.mp4 2.mp4 ...</code> + scan jumlah episode.</li>
          <li>Klik <strong>Simpan drama</strong> → commit ke GitHub → Vercel auto-deploy ~1-2 menit.</li>
        </ol>
      </div>
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 md:p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm text-zinc-300">Judul drama *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Misal: Putri Ajaib Yang Hilang"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
            />
          </label>
          <label className="block">
            <span className="text-sm text-zinc-300">Kategori *</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-sm text-zinc-300">
            ID slug <span className="text-zinc-500">(opsional — auto-generate dari judul kalau kosong; harus sama dengan nama folder di PC backup)</span>
          </span>
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder={
              title.trim()
                ? `auto: ${slugify(title)}`
                : "contoh: istri-tersembunyi-sang-ceo"
            }
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400 font-mono"
          />
          {effectiveId && (
            <p className="mt-1 text-xs text-zinc-500">
              Final id yang dipakai: <code className="text-amber-300">{effectiveId}</code>
            </p>
          )}
        </label>

        <label className="mt-4 block">
          <span className="text-sm text-zinc-300">
            Sinopsis <span className="text-zinc-500">(opsional)</span>
          </span>
          <textarea
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            rows={3}
            placeholder="Cerita pendek tentang drama ini..."
            className="mt-1 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
          />
        </label>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm text-zinc-300">Jumlah ditonton (opsional)</span>
            <input
              value={views}
              onChange={(e) => setViews(e.target.value)}
              placeholder="contoh: 1.2M atau 500K"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
            />
          </label>

          <label className="block">
            <span className="text-sm text-zinc-300">URL poster (opsional)</span>
            <span className="block text-xs text-zinc-500">Gambar tegak/portrait buat card</span>
            <input
              value={posterImage}
              onChange={(e) => setPosterImage(e.target.value)}
              placeholder="/posters/istri-tersembunyi-sang-ceo.png"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400 font-mono"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm text-zinc-300">URL hero / banner (opsional)</span>
            <span className="block text-xs text-zinc-500">Gambar lebar/landscape buat banner besar di halaman detail. Kalau kosong, pakai poster.</span>
            <input
              value={heroImage}
              onChange={(e) => setHeroImage(e.target.value)}
              placeholder="https://i.imgur.com/xxxxxxx.png"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400 font-mono"
            />
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <span className="text-sm text-zinc-300">Subtitle / bahasa tersedia</span>
          <span className="block text-xs text-zinc-500">
            Centang bahasa yang file <code className="text-zinc-400">.vtt</code>-nya sudah kamu taruh di folder PC backup.
            Pola nama: <code className="text-zinc-400">{`<ep>.<kode>.vtt`}</code> — mis. <code className="text-zinc-400">1.id.vtt</code>, <code className="text-zinc-400">1.en.vtt</code>.
          </span>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUBTITLE_LANGS.map((l) => {
              const on = subtitles.includes(l.code);
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() =>
                    setSubtitles((prev) =>
                      prev.includes(l.code)
                        ? prev.filter((c) => c !== l.code)
                        : [...prev, l.code],
                    )
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    on
                      ? "border-amber-400 bg-amber-400/15 text-amber-300"
                      : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {l.label} <span className="opacity-60">({l.code})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={premium}
              onChange={(e) => setPremium(e.target.checked)}
              className="mt-0.5 h-5 w-5 accent-amber-400"
            />
            <span>
              <span className="text-sm font-semibold text-white">
                Drama berbayar (pakai koin)
              </span>
              <span className="block text-xs text-zinc-500">
                Centang = episode di atas {/* free */}batas gratis dikunci, penonton buka pakai koin.
                Kosongkan = drama 100% gratis. <strong className="text-amber-300/80">Drama baru default berbayar</strong>; koleksi lama biarkan kosong agar tetap gratis.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-sm text-zinc-300">Jumlah episode *</span>
              <input
                type="number"
                min={1}
                max={999}
                value={episodes}
                onChange={(e) =>
                  setEpisodes(Math.max(1, Number(e.target.value) || 1))
                }
                className="mt-1 w-32 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              />
            </label>
            <button
              type="button"
              onClick={onScan}
              disabled={scanning || !effectiveId}
              className="rounded-lg border border-amber-400/60 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              title={
                !effectiveId
                  ? "Isi Judul atau ID slug dulu"
                  : "Auto-hardlink (kalau perlu) + scan folder PC backup"
              }
            >
              {scanning ? "Memproses..." : "🪄 Scan & auto-hardlink"}
            </button>
            {scanResult && (
              <div className="text-xs text-zinc-400">
                Ditemukan <strong className="text-emerald-300">{scanResult.count}</strong> file (ep 1-{scanResult.max})
                {scanResult.missing.length > 0 && (
                  <span className="ml-2 text-amber-300">
                    ⚠️ ada gap: ep {scanResult.missing.join(", ")} tidak ada
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Cek folder <code className="text-zinc-400">{`<tunnel-url>/${effectiveId || "<drama-id>"}/`}</code>. Kalau file masih raw (mis. <code className="text-zinc-400">Video PM 1.mp4</code>), agent di PC backup auto-bikin hardlink <code className="text-zinc-400">N.mp4</code> dulu, baru hitung.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-amber-400 px-6 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
          >
            {submitting ? "Menyimpan ke GitHub..." : "Simpan drama"}
          </button>
          <span className="text-xs text-zinc-500">
            Commit ke <code>data/dramas.json</code> → Vercel auto-deploy ~1-2 menit
          </span>
        </div>

        {message && (
          <div
            className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              message.type === "ok"
                ? "border-emerald-700 bg-emerald-900/30 text-emerald-300"
                : "border-red-700 bg-red-900/30 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}
      </form>
    </section>
  );
}
