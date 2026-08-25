"use client";

// Bagian "Tambah / Update Drama" di halaman admin: form input (judul, kategori,
// id, sinopsis, dst.) + tombol Scan/auto-hardlink + tombol Simpan + pesan status.
// Dipisah dari app/admin/page.tsx (rapikan kode). SEMUA data field + status +
// aksi disuplai induk lewat prop, jadi komponen ini murni menampilkan — state
// tetap tinggal di halaman, sehingga tombol Edit di "Daftar Drama" tetap bisa
// mengisi form ini lewat setter yang sama TANPA perubahan. Tampilan dirombak ke
// shadcn/ui (Card, Input, Label, Textarea, Select, Checkbox, Button) — perilaku
// & logika tetap sama persis.
import { useState, type Dispatch, type SetStateAction, type RefObject, type FormEvent } from "react";
import { slugify } from "@/lib/format";
import { MOVIE_EPISODE_COUNT, SUBTITLE_LANGS, type DramaKind } from "@/lib/types";
import { CATEGORY_OPTIONS } from "@/app/admin/constants";
import type { ScanResult } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ImdbMetadataJson = {
  title: string;
  year: string;
  poster: string;
  banner: string;
  genre: string[];
  rating: string;
  runtime: string;
  country: string;
  language: string;
  description: string;
  director: string;
  writers: string[];
  stars: string[];
  episodeCount?: number;
};

type ImdbDraftPreview = {
  imdbId: string;
  slug: string;
  title: string;
  year: string;
  synopsis: string;
  posterImage: string | null;
  banner: string;
  genre: string;
  genreList: string[];
  stars: string;
  starList: string[];
  director: string;
  writer: string;
  writerList: string[];
  runtime: string;
  contentRating: string;
  imdbRating: string;
  imdbVotes: string;
  country: string;
  language: string;
  kind: string;
  episodeCount: number | null;
  suggestedCategory: string | null;
};

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
  kind,
  setKind,
  posterImage,
  setPosterImage,
  heroImage,
  setHeroImage,
  subtitles,
  setSubtitles,
  premium,
  setPremium,
  imdbIdMeta,
  setImdbIdMeta,
  year,
  setYear,
  contentRating,
  setContentRating,
  runtime,
  setRuntime,
  imdbRating,
  setImdbRating,
  imdbVotes,
  setImdbVotes,
  genre,
  setGenre,
  director,
  setDirector,
  writer,
  setWriter,
  stars,
  setStars,
  country,
  setCountry,
  language,
  setLanguage,
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
  kind: DramaKind;
  setKind: Dispatch<SetStateAction<DramaKind>>;
  posterImage: string;
  setPosterImage: Dispatch<SetStateAction<string>>;
  heroImage: string;
  setHeroImage: Dispatch<SetStateAction<string>>;
  subtitles: string[];
  setSubtitles: Dispatch<SetStateAction<string[]>>;
  premium: boolean;
  setPremium: Dispatch<SetStateAction<boolean>>;
  imdbIdMeta: string;
  setImdbIdMeta: Dispatch<SetStateAction<string>>;
  year: string;
  setYear: Dispatch<SetStateAction<string>>;
  contentRating: string;
  setContentRating: Dispatch<SetStateAction<string>>;
  runtime: string;
  setRuntime: Dispatch<SetStateAction<string>>;
  imdbRating: string;
  setImdbRating: Dispatch<SetStateAction<string>>;
  imdbVotes: string;
  setImdbVotes: Dispatch<SetStateAction<string>>;
  genre: string;
  setGenre: Dispatch<SetStateAction<string>>;
  director: string;
  setDirector: Dispatch<SetStateAction<string>>;
  writer: string;
  setWriter: Dispatch<SetStateAction<string>>;
  stars: string;
  setStars: Dispatch<SetStateAction<string>>;
  country: string;
  setCountry: Dispatch<SetStateAction<string>>;
  language: string;
  setLanguage: Dispatch<SetStateAction<string>>;
  effectiveId: string;
  scanning: boolean;
  scanResult: ScanResult | null;
  submitting: boolean;
  message: { type: "ok" | "error"; text: string } | null;
  formRef: RefObject<HTMLFormElement | null>;
  onScan: () => void;
  onSubmit: (e: FormEvent) => void;
}) {
  // Film = 1 video utuh; dipakai berulang di bawah untuk menyembunyikan kolom
  // yang tak berlaku (jumlah episode, centang berbayar).
  const isFilm = kind === "movie";

  const [imdbId, setImdbId] = useState("");
  const [imdbLoading, setImdbLoading] = useState(false);
  const [imdbError, setImdbError] = useState<string | null>(null);
  const [imdbDraft, setImdbDraft] = useState<ImdbDraftPreview | null>(null);
  const [imdbMetadata, setImdbMetadata] = useState<ImdbMetadataJson | null>(
    null,
  );

  const fetchImdbDraft = async () => {
    setImdbError(null);
    setImdbDraft(null);
    setImdbMetadata(null);
    const id = imdbId.trim();
    if (!id) return;
    setImdbLoading(true);
    try {
      const res = await fetch(
        `/api/generate-from-imdb?imdbId=${encodeURIComponent(id)}`,
      );
      const data = (await res.json()) as {
        ok?: boolean;
        draft?: ImdbDraftPreview;
        metadata?: ImdbMetadataJson;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setImdbError(data.error ?? `Gagal mengambil draft (HTTP ${res.status})`);
        return;
      }
      if (data.draft) setImdbDraft(data.draft);
      if (data.metadata) setImdbMetadata(data.metadata);
    } catch (err) {
      setImdbError(err instanceof Error ? err.message : "Koneksi gagal");
    } finally {
      setImdbLoading(false);
    }
  };

  const applyImdbDraft = () => {
    if (!imdbDraft) return;
    setTitle(imdbDraft.title);
    setId(imdbDraft.slug);
    setSynopsis(imdbDraft.synopsis);
    if (imdbDraft.posterImage) {
      setPosterImage(imdbDraft.posterImage);
    }
    // Banner lebar hanya kalau ada (TMDB). Jangan salin poster tegak ke hero —
    // di halaman drama poster yang sama sebagai backdrop 16:9 kelihatan pecah.
    setHeroImage(imdbDraft.banner || "");
    if (
      imdbDraft.suggestedCategory &&
      (CATEGORY_OPTIONS as readonly string[]).includes(imdbDraft.suggestedCategory)
    ) {
      setCategory(imdbDraft.suggestedCategory);
    }
    setImdbIdMeta(imdbDraft.imdbId);
    setYear(imdbDraft.year);
    setContentRating(imdbDraft.contentRating);
    setRuntime(imdbDraft.runtime);
    setImdbRating(imdbDraft.imdbRating);
    setImdbVotes(imdbDraft.imdbVotes);
    setGenre(imdbDraft.genre);
    setDirector(imdbDraft.director);
    setWriter(imdbDraft.writer);
    setStars(imdbDraft.stars);
    setCountry(imdbDraft.country);
    setLanguage(imdbDraft.language);
    // OMDb sudah tahu ini film atau serial → ikut memilih jenis tayangan supaya
    // admin tak perlu mengubahnya manual. Tipe lain ("episode"/"game"/kosong)
    // dibiarkan apa adanya.
    if (imdbDraft.kind === "movie") {
      setKind("movie");
      setEpisodes(MOVIE_EPISODE_COUNT);
    } else if (imdbDraft.kind === "series") {
      setKind("series");
    }
    if (
      imdbDraft.kind === "series" &&
      imdbDraft.episodeCount &&
      imdbDraft.episodeCount > 0 &&
      !scanResult
    ) {
      setEpisodes(imdbDraft.episodeCount);
    }
    setImdbDraft(null);
    setImdbMetadata(null);
    setImdbError(null);
  };

  return (
    <section id="tambah">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Tambah / Update Drama</h2>
      </div>
      <div className="mb-3 rounded-xl border border-amber-700/60 bg-amber-900/15 px-4 py-3 text-xs text-amber-200">
        <p className="font-semibold">📋 Workflow self-hosted:</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5">
          <li>Taruh file video di PC backup, folder <code className="text-amber-100">{`<drama-id>`}</code>. Nama file <strong>bebas</strong> (raw): mis. <code className="text-amber-100">ep01.mp4</code>, <code className="text-amber-100">Video 1.mp4</code>, dst. <strong>Film</strong> cukup SATU file.</li>
          <li>Isi form di bawah — judul, kategori, sinopsis, dan <strong>jenis tayangan</strong> (Serial atau Film).</li>
          <li>Klik <strong>🪄 Scan & auto-hardlink</strong> → agent di PC backup auto-rename (kalau perlu) ke <code className="text-amber-100">1.mp4 2.mp4 ...</code> + scan jumlah episode.</li>
          <li>Klik <strong>Simpan drama</strong> → tersimpan langsung ke database, tampil seketika (tanpa redeploy).</li>
        </ol>
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 md:p-5">
        <h3 className="mb-1 text-sm font-semibold text-white">
          ✨ Isi otomatis dari IMDb
        </h3>
        <p className="mb-3 text-xs text-zinc-500">
          Masukkan ID IMDb (contoh: tt19869990). Judul, tahun, poster, genre,
          rating, durasi, negara, bahasa, sinopsis, director, writers, stars,
          dan jumlah episode (kalau series) diambil otomatis. Banner lebar
          terisi kalau kunci TMDB ada; kalau tidak, poster dipakai sebagai hero.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="imdb-id" className="text-sm text-zinc-300">
              ID IMDb
            </Label>
            <Input
              id="imdb-id"
              value={imdbId}
              onChange={(e) => setImdbId(e.target.value)}
              placeholder="tt19869990"
              className="rounded-lg border-zinc-700 bg-zinc-900 font-mono text-white focus-visible:border-amber-400 focus-visible:ring-0"
            />
          </div>
          <Button
            type="button"
            onClick={fetchImdbDraft}
            disabled={imdbLoading || !imdbId.trim()}
            variant="outline"
            className="rounded-lg border-indigo-400/60 bg-indigo-400/10 font-semibold text-indigo-300 hover:bg-indigo-400/20 hover:text-indigo-200"
          >
            {imdbLoading ? "Mengambil..." : "Ambil draft"}
          </Button>
        </div>

        {imdbError && (
          <div className="mt-3 rounded-lg border border-red-700 bg-red-900/30 px-3 py-2 text-xs text-red-300">
            {imdbError}
          </div>
        )}

        {imdbDraft && (
          <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-950/60 p-3">
            <div className="flex gap-3">
              {imdbDraft.posterImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imdbDraft.posterImage}
                  alt={`Poster ${imdbDraft.title}`}
                  className="h-36 w-24 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-36 w-24 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-xs text-zinc-500">
                  tanpa poster
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">
                  {imdbDraft.title}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {[
                    imdbDraft.year,
                    imdbDraft.contentRating,
                    imdbDraft.runtime,
                    imdbDraft.country,
                    imdbDraft.kind === "series" && imdbDraft.episodeCount
                      ? `${imdbDraft.episodeCount} episode`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {(imdbDraft.imdbRating || imdbDraft.imdbVotes) && (
                  <p className="mt-1 text-xs text-amber-300">
                    IMDb {imdbDraft.imdbRating || "—"}/10
                    {imdbDraft.imdbVotes ? ` · ${imdbDraft.imdbVotes} votes` : ""}
                  </p>
                )}
                {imdbDraft.genreList?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {imdbDraft.genreList.map((g) => (
                      <span
                        key={g}
                        className="rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] text-zinc-300"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 line-clamp-3 text-xs text-zinc-500">
                  {imdbDraft.synopsis}
                </p>
                <dl className="mt-2 space-y-0.5 text-xs text-zinc-400">
                  {imdbDraft.language && (
                    <div>
                      <dt className="inline font-semibold text-zinc-300">Bahasa: </dt>
                      <dd className="inline">{imdbDraft.language}</dd>
                    </div>
                  )}
                  {imdbDraft.director && (
                    <div>
                      <dt className="inline font-semibold text-zinc-300">Director: </dt>
                      <dd className="inline text-indigo-300">{imdbDraft.director}</dd>
                    </div>
                  )}
                  {imdbDraft.writerList?.length > 0 && (
                    <div>
                      <dt className="inline font-semibold text-zinc-300">Writers: </dt>
                      <dd className="inline text-indigo-300">
                        {imdbDraft.writerList.join(" · ")}
                      </dd>
                    </div>
                  )}
                  {imdbDraft.starList?.length > 0 && (
                    <div>
                      <dt className="inline font-semibold text-zinc-300">Stars: </dt>
                      <dd className="inline text-indigo-300">
                        {imdbDraft.starList.join(" · ")}
                      </dd>
                    </div>
                  )}
                </dl>
                {imdbDraft.suggestedCategory && (
                  <p className="mt-1 text-xs text-emerald-400">
                    Kategori cocok: {imdbDraft.suggestedCategory}
                  </p>
                )}
                {imdbDraft.kind === "series" && !imdbDraft.episodeCount && (
                  <p className="mt-1 text-xs text-amber-400/80">
                    Series terdeteksi, jumlah episode IMDb belum terhitung — isi manual atau Scan folder.
                  </p>
                )}
              </div>
            </div>
            {imdbDraft.banner && (
              <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imdbDraft.banner}
                  alt={`Banner ${imdbDraft.title}`}
                  className="h-28 w-full object-cover"
                />
              </div>
            )}
            {imdbMetadata && (
              <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-zinc-800 bg-black/40 p-3 text-[11px] leading-5 text-zinc-300">
                {JSON.stringify(imdbMetadata, null, 2)}
              </pre>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={applyImdbDraft}
                className="rounded-lg bg-amber-400 px-4 font-semibold text-black hover:bg-amber-300"
              >
                Isi form ini
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setImdbDraft(null);
                  setImdbMetadata(null);
                }}
                variant="outline"
                className="rounded-lg border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Batal
              </Button>
            </div>
          </div>
        )}
      </div>

      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 md:p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="drama-title" className="text-sm text-zinc-300">
              Judul drama *
            </Label>
            <Input
              id="drama-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Misal: Putri Ajaib Yang Hilang"
              className="rounded-lg border-zinc-700 bg-zinc-900 text-white focus-visible:border-amber-400 focus-visible:ring-0"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="drama-category" className="text-sm text-zinc-300">
              Kategori *
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                id="drama-category"
                className="w-full rounded-lg border-zinc-700 bg-zinc-900 text-white focus-visible:border-amber-400 focus-visible:ring-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="drama-kind" className="text-sm text-zinc-300">
            Jenis tayangan *
          </Label>
          <Select
            value={kind}
            onValueChange={(v) => setKind(v as DramaKind)}
          >
            <SelectTrigger
              id="drama-kind"
              className="w-full rounded-lg border-zinc-700 bg-zinc-900 text-white focus-visible:border-amber-400 focus-visible:ring-0 md:w-80"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="series">📺 Serial — pakai episode</SelectItem>
              <SelectItem value="movie">🎬 Film — 1 video utuh</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-500">
            {isFilm
              ? "Film: penonton langsung memutar SATU video — tanpa daftar episode. Taruh 1 file video di folder PC backup (nanti jadi 1.mp4). Film untuk sekarang selalu GRATIS, tanpa koin."
              : "Serial: penonton memilih dari daftar Episode 1, 2, 3, … Jumlah episodenya diisi di bagian bawah form."}
          </p>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="drama-id" className="text-sm text-zinc-300">
            ID slug <span className="text-zinc-500">(opsional — auto-generate dari judul kalau kosong; harus sama dengan nama folder di PC backup)</span>
          </Label>
          <Input
            id="drama-id"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder={
              title.trim()
                ? `auto: ${slugify(title)}`
                : "contoh: istri-tersembunyi-sang-ceo"
            }
            className="rounded-lg border-zinc-700 bg-zinc-900 font-mono text-white focus-visible:border-amber-400 focus-visible:ring-0"
          />
          {effectiveId && (
            <p className="text-xs text-zinc-500">
              Final id yang dipakai: <code className="text-amber-300">{effectiveId}</code>
            </p>
          )}
        </div>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="drama-synopsis" className="text-sm text-zinc-300">
            Sinopsis <span className="text-zinc-500">(opsional)</span>
          </Label>
          <Textarea
            id="drama-synopsis"
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            rows={3}
            placeholder="Cerita pendek tentang drama ini..."
            className="resize-y rounded-lg border-zinc-700 bg-zinc-900 text-white focus-visible:border-amber-400 focus-visible:ring-0"
          />
        </div>

        {(imdbIdMeta || director || writer || stars || imdbRating || country) && (
          <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4">
            <p className="text-sm font-semibold text-indigo-200">
              Metadata IMDb (ikut tersimpan)
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Diisi otomatis dari “Ambil draft”. Boleh dikosongkan manual kalau perlu.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">ID IMDb</Label>
                <Input
                  value={imdbIdMeta}
                  onChange={(e) => setImdbIdMeta(e.target.value)}
                  className="rounded-lg border-zinc-700 bg-zinc-900 font-mono text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Tahun</Label>
                <Input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="rounded-lg border-zinc-700 bg-zinc-900 text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Rating konten</Label>
                <Input
                  value={contentRating}
                  onChange={(e) => setContentRating(e.target.value)}
                  className="rounded-lg border-zinc-700 bg-zinc-900 text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Runtime</Label>
                <Input
                  value={runtime}
                  onChange={(e) => setRuntime(e.target.value)}
                  className="rounded-lg border-zinc-700 bg-zinc-900 text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">IMDb rating</Label>
                <Input
                  value={imdbRating}
                  onChange={(e) => setImdbRating(e.target.value)}
                  className="rounded-lg border-zinc-700 bg-zinc-900 text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">IMDb votes</Label>
                <Input
                  value={imdbVotes}
                  onChange={(e) => setImdbVotes(e.target.value)}
                  className="rounded-lg border-zinc-700 bg-zinc-900 text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs text-zinc-400">Genre (OMDb)</Label>
                <Input
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="rounded-lg border-zinc-700 bg-zinc-900 text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs text-zinc-400">Director</Label>
                <Input
                  value={director}
                  onChange={(e) => setDirector(e.target.value)}
                  className="rounded-lg border-zinc-700 bg-zinc-900 text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs text-zinc-400">Writer</Label>
                <Input
                  value={writer}
                  onChange={(e) => setWriter(e.target.value)}
                  className="rounded-lg border-zinc-700 bg-zinc-900 text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs text-zinc-400">Stars</Label>
                <Input
                  value={stars}
                  onChange={(e) => setStars(e.target.value)}
                  className="rounded-lg border-zinc-700 bg-zinc-900 text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Negara</Label>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="rounded-lg border-zinc-700 bg-zinc-900 text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Bahasa</Label>
                <Input
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="rounded-lg border-zinc-700 bg-zinc-900 text-sm text-white focus-visible:border-amber-400 focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="drama-views" className="text-sm text-zinc-300">
              Jumlah ditonton (opsional)
            </Label>
            <Input
              id="drama-views"
              value={views}
              onChange={(e) => setViews(e.target.value)}
              placeholder="contoh: 1.2M atau 500K"
              className="rounded-lg border-zinc-700 bg-zinc-900 text-white focus-visible:border-amber-400 focus-visible:ring-0"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="drama-poster" className="text-sm text-zinc-300">
              URL poster (opsional)
            </Label>
            <span className="block text-xs text-zinc-500">Gambar tegak/portrait buat card</span>
            <Input
              id="drama-poster"
              value={posterImage}
              onChange={(e) => setPosterImage(e.target.value)}
              placeholder="/posters/istri-tersembunyi-sang-ceo.png"
              className="rounded-lg border-zinc-700 bg-zinc-900 font-mono text-white focus-visible:border-amber-400 focus-visible:ring-0"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="drama-hero" className="text-sm text-zinc-300">
              URL hero / banner (opsional)
            </Label>
            <span className="block text-xs text-zinc-500">Gambar lebar/landscape buat banner besar di halaman detail. Kalau kosong, pakai poster.</span>
            <Input
              id="drama-hero"
              value={heroImage}
              onChange={(e) => setHeroImage(e.target.value)}
              placeholder="https://i.imgur.com/xxxxxxx.png"
              className="rounded-lg border-zinc-700 bg-zinc-900 font-mono text-white focus-visible:border-amber-400 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <span className="text-sm text-zinc-300">Subtitle / bahasa tersedia</span>
          <span className="block text-xs text-zinc-500">
            Centang bahasa yang file <code className="text-zinc-400">.vtt</code>-nya sudah kamu taruh di folder PC backup.
            Pola nama: <code className="text-zinc-400">{`<ep>.<kode>.vtt`}</code> — mis. <code className="text-zinc-400">1.id.vtt</code>, <code className="text-zinc-400">1.en.vtt</code>.
          </span>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
            {SUBTITLE_LANGS.map((l) => {
              const on = subtitles.includes(l.code);
              return (
                <div key={l.code} className="flex items-center gap-2">
                  <Checkbox
                    id={`subtitle-${l.code}`}
                    checked={on}
                    onCheckedChange={() =>
                      setSubtitles((prev) =>
                        prev.includes(l.code)
                          ? prev.filter((c) => c !== l.code)
                          : [...prev, l.code],
                      )
                    }
                    className="border-zinc-700 data-[state=checked]:border-amber-400 data-[state=checked]:bg-amber-400 data-[state=checked]:text-black"
                  />
                  <Label
                    htmlFor={`subtitle-${l.code}`}
                    className="cursor-pointer text-xs font-medium text-zinc-300"
                  >
                    {l.label} <span className="opacity-60">({l.code})</span>
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        {isFilm ? (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-xs text-zinc-400">
            <span className="text-sm font-semibold text-white">Film selalu gratis</span>
            <span className="mt-0.5 block">
              Centang “berbayar (koin)” sengaja tidak ditampilkan untuk film.
              Aturan koin sekarang menggratiskan 3 episode pertama, jadi film
              yang hanya punya 1 video akan tetap gratis walau dicentang —
              menampilkannya cuma menyesatkan. Mau film berbayar? bilang saja,
              aturan koinnya diubah dulu.
            </span>
          </div>
        ) : (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="drama-premium"
              checked={premium}
              onCheckedChange={(checked) => setPremium(checked === true)}
              className="mt-0.5 size-5 border-zinc-700 data-[state=checked]:border-amber-400 data-[state=checked]:bg-amber-400 data-[state=checked]:text-black"
            />
            <Label htmlFor="drama-premium" className="cursor-pointer items-start">
              <span>
                <span className="text-sm font-semibold text-white">
                  Drama berbayar (pakai koin)
                </span>
                <span className="block text-xs font-normal text-zinc-500">
                  Centang = episode di atas {/* free */}batas gratis dikunci, penonton buka pakai koin.
                  Kosongkan = drama 100% gratis. <strong className="text-amber-300/80">Drama baru default berbayar</strong>; koleksi lama biarkan kosong agar tetap gratis.
                </span>
              </span>
            </Label>
          </div>
        </div>
        )}

        <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div className="flex flex-wrap items-end gap-3">
            {isFilm ? (
              <div className="space-y-1.5">
                <span className="block text-sm text-zinc-300">Jumlah video</span>
                <p className="text-sm font-semibold text-amber-300">
                  1 video utuh — tanpa episode
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="drama-episodes" className="text-sm text-zinc-300">
                  Jumlah episode *
                </Label>
                <Input
                  id="drama-episodes"
                  type="number"
                  min={1}
                  max={999}
                  value={episodes}
                  onChange={(e) =>
                    setEpisodes(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-32 rounded-lg border-zinc-700 bg-zinc-900 text-white focus-visible:border-amber-400 focus-visible:ring-0"
                />
              </div>
            )}
            <Button
              type="button"
              onClick={onScan}
              disabled={scanning || !effectiveId}
              variant="outline"
              className="rounded-lg border-amber-400/60 bg-amber-400/10 font-semibold text-amber-300 hover:bg-amber-400/20 hover:text-amber-200"
              title={
                !effectiveId
                  ? "Isi Judul atau ID slug dulu"
                  : "Auto-hardlink (kalau perlu) + scan folder PC backup"
              }
            >
              {scanning ? "Memproses..." : "🪄 Scan & auto-hardlink"}
            </Button>
            {scanResult && (
              <div className="text-xs text-zinc-400">
                Ditemukan <strong className="text-emerald-300">{scanResult.count}</strong> file (ep 1-{scanResult.max})
                {isFilm && scanResult.count > 1 && (
                  <span className="ml-2 text-amber-300">
                    ⚠️ ini film, yang diputar hanya <code>1.mp4</code> — file lain diabaikan
                  </span>
                )}
                {!isFilm && scanResult.missing.length > 0 && (
                  <span className="ml-2 text-amber-300">
                    ⚠️ ada gap: ep {scanResult.missing.join(", ")} tidak ada
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Cek folder <code className="text-zinc-400">{`<tunnel-url>/${effectiveId || "<drama-id>"}/`}</code>. Kalau file masih raw (mis. <code className="text-zinc-400">Video PM 1.mp4</code>), agent di PC backup auto-bikin hardlink <code className="text-zinc-400">N.mp4</code> dulu, baru hitung.
            {isFilm && (
              <> Untuk film, yang dibutuhkan cuma <code className="text-zinc-400">1.mp4</code> (subtitle: <code className="text-zinc-400">1.id.vtt</code>).</>
            )}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-amber-400 px-6 py-2.5 font-semibold text-black hover:bg-amber-300"
          >
            {submitting ? "Menyimpan..." : "Simpan drama"}
          </Button>
          <span className="text-xs text-zinc-500">
            Tersimpan langsung ke database (Supabase) — instan, tanpa redeploy
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
