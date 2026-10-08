// Sinopsis + kredit film untuk halaman tonton video Playly.
//
// KENAPA ADA (owner 2026-10-08): owner membandingkan halaman video Playly
// dengan halaman film DramaKu (`/drama/[id]`) dan menemukan yang pertama jauh
// lebih miskin — "disana terlihat jelas ada sinopsis, cast, jadi filmnya
// jelas". Datanya sendiri sudah ada sejak metadata IMDb bisa dicocokkan per
// video; yang belum ada cuma tempat untuk menggambarnya.
//
// BENTUKNYA SENGAJA MENIRU app/drama/[id]/page.tsx:246-300 (heading "Sinopsis"
// + daftar <dl> Asal/Director/Writers/Stars/IMDb). Bukan gaya baru: dua halaman
// yang menyajikan hal yang sama sebaiknya terbaca sama, dan penonton tidak
// perlu belajar dua tata letak untuk satu jenis isi.
//
// Komponen SERVER (tanpa "use client"): isinya murni tampilan tanpa satu pun
// interaksi, jadi tak ada alasan mengirim JavaScript-nya ke browser.
//
// ATURAN ISI — tiap baris yang datanya kosong TIDAK digambar sama sekali, dan
// seluruh blok menghilang kalau tak ada satu pun yang terisi. Aturan yang sama
// dengan InfoVideoPlayly dan lencana poster (lib/types.ts:214-221): menuliskan
// keterangan yang tidak berasal dari data = menjanjikan sesuatu yang tak pernah
// dinilai siapa pun.
import type { PlaylyImdbMeta } from "@/lib/playly-imdb";

export default function DetailFilmPlayly({ meta }: { meta: PlaylyImdbMeta }) {
  const kredit = [
    {
      label: "Asal",
      // Negara & bahasa digabung satu baris, persis seperti halaman drama.
      nilai: [meta.country, meta.language].filter(Boolean).join(" · "),
      warna: "text-zinc-400",
    },
    { label: "Director", nilai: meta.director ?? "", warna: "text-indigo-300" },
    { label: "Writers", nilai: meta.writer ?? "", warna: "text-indigo-300" },
    { label: "Stars", nilai: meta.stars ?? "", warna: "text-indigo-300" },
  ].filter((b) => b.nilai.trim() !== "");

  // Baris angka di bawah judul: tahun, durasi, nilai IMDb. Dirangkai dari
  // daftar lalu disaring, bukan rantai ternary bersarang — isinya sering
  // separuh kosong, dan rantai ternary membuat kombinasi kosongnya sulit
  // ditelusuri saat salah satu hilang.
  const ringkas = [
    meta.year,
    meta.runtime,
    meta.rating ? `IMDb ${meta.rating}/10` : "",
    meta.contentRating,
  ].filter((t) => (t ?? "").trim() !== "");

  const adaIsi =
    meta.synopsis.trim() !== "" || kredit.length > 0 || ringkas.length > 0;
  if (!adaIsi) return null;

  return (
    <section className="mt-8">
      {ringkas.length > 0 && (
        <p className="text-sm text-zinc-400">
          {ringkas.join(" · ")}
          {meta.imdbVotes ? ` · ${meta.imdbVotes} votes` : ""}
        </p>
      )}

      {meta.synopsis.trim() !== "" && (
        <>
          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Sinopsis
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{meta.synopsis}</p>
        </>
      )}

      {(kredit.length > 0 || meta.imdbId) && (
        <dl className="mt-5 space-y-2 border-t border-zinc-800 pt-5 text-sm">
          {kredit.map((b) => (
            <div key={b.label} className="flex flex-wrap gap-x-2">
              <dt className="shrink-0 font-semibold text-zinc-200">{b.label}</dt>
              <dd className={b.warna}>{b.nilai}</dd>
            </div>
          ))}
          {meta.imdbId && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="shrink-0 font-semibold text-zinc-200">IMDb</dt>
              <dd>
                {/* rel="noopener noreferrer" WAJIB pada target="_blank":
                    tanpa noopener, halaman tujuan bisa menyetir tab kita lewat
                    window.opener. Pola yang sama dipakai halaman drama. */}
                <a
                  href={`https://www.imdb.com/title/${meta.imdbId}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 underline"
                >
                  {meta.imdbId}
                </a>
              </dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
