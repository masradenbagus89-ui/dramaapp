import Link from "next/link";
import { getAllDramas } from "@/lib/dramas";
import type { Drama } from "@/lib/types";
import Poster from "../components/Poster";

export const dynamic = "force-dynamic";

function parseViews(s: string): number {
  const m = s.trim().match(/^([0-9.]+)\s*([kKmMbB]?)$/);
  if (!m) return Number(s) || 0;
  const num = parseFloat(m[1]);
  const mult =
    m[2].toLowerCase() === "m"
      ? 1_000_000
      : m[2].toLowerCase() === "k"
        ? 1_000
        : m[2].toLowerCase() === "b"
          ? 1_000_000_000
          : 1;
  return num * mult;
}

function formatViews(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

const CATEGORY_COLORS: Record<string, string> = {
  Romance: "bg-rose-500",
  Tycoon: "bg-amber-500",
  Harem: "bg-pink-500",
  "Time Travel": "bg-violet-500",
  Action: "bg-orange-500",
  Comedy: "bg-yellow-500",
  Fantasy: "bg-emerald-500",
};

const APP_FEATURES = [
  { n: "1", label: "BERANDA", title: "Drama populer", color: "from-amber-500/30 to-rose-500/20", accent: "bg-amber-400" },
  { n: "2", label: "DISCOVER", title: "Cari per kategori", color: "from-rose-500/30 to-purple-500/20", accent: "bg-rose-400" },
  { n: "3", label: "WATCH", title: "Player otomatis", color: "from-violet-500/30 to-blue-500/20", accent: "bg-violet-400" },
  { n: "4", label: "MY LIST", title: "Simpan favorit", color: "from-emerald-500/30 to-teal-500/20", accent: "bg-emerald-400" },
  { n: "5", label: "PROFILE", title: "Akun & setting", color: "from-blue-500/30 to-indigo-500/20", accent: "bg-blue-400" },
] as const;

export default function LandingPage() {
  const dramas = getAllDramas();
  const featured = dramas.slice(0, 6);
  const totalEpisode = dramas.reduce((a, d) => a + d.episodes, 0);
  const totalViews = dramas.reduce((a, d) => a + parseViews(d.views), 0);

  const categoryCounts = new Map<string, number>();
  for (const d of dramas)
    categoryCounts.set(d.category, (categoryCounts.get(d.category) ?? 0) + 1);
  const byCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]);
  const maxCategoryCount = byCategory[0]?.[1] ?? 1;

  return (
    <div className="mx-auto max-w-7xl gap-5 px-4 py-5 lg:grid lg:grid-cols-[280px_1fr] md:px-6">
      {/* SIDEBAR */}
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-amber-900/40 via-rose-900/30 to-zinc-950 p-4">
          <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
            Drama China · ID
          </span>
          <h1 className="title-gold mt-3 text-2xl leading-tight">
            Cerita pendek,
            <br />
            <span className="text-white not-italic">emosi panjang.</span>
          </h1>
          <p className="mt-2 text-xs text-zinc-300">
            DramaKu — gratis, tanpa daftar, langsung tonton.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/discover"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-1.5 text-xs font-bold text-black hover:bg-amber-300"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3 fill-black">
                <path d="M8 5v14l11-7z" />
              </svg>
              Mulai Nonton
            </Link>
            <Link
              href="/shorts"
              className="rounded-full border border-zinc-600 bg-black/40 px-4 py-1.5 text-xs font-semibold text-white hover:border-amber-400 hover:text-amber-400"
            >
              Shorts
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Distribusi Kategori
          </h2>
          <div className="mt-3 space-y-2">
            {byCategory.length === 0 ? (
              <p className="text-xs text-zinc-500">Belum ada drama.</p>
            ) : (
              byCategory.map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 truncate text-[11px] text-zinc-300">
                    {cat}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full ${CATEGORY_COLORS[cat] ?? "bg-zinc-500"}`}
                      style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-5 shrink-0 text-right text-[11px] text-zinc-400">
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Update Terbaru
          </h2>
          <div className="mt-3 space-y-1.5">
            {dramas.slice(0, 5).map((d) => (
              <Link
                key={d.id}
                href={`/drama/${d.id}`}
                className="flex items-center gap-2 rounded-md p-1 hover:bg-zinc-800/60"
              >
                <div
                  className={`relative h-9 w-9 shrink-0 overflow-hidden rounded bg-gradient-to-br ${d.gradient}`}
                >
                  {d.posterImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.posterImage}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-white">
                    {d.title}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {d.category} · {d.views}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="mt-5 space-y-5 lg:mt-0">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total Drama"
            value={String(dramas.length)}
            accent="bg-amber-500/15 text-amber-400"
            icon="M4 6h16M4 12h16M4 18h16"
          />
          <StatCard
            label="Total Episode"
            value={String(totalEpisode)}
            accent="bg-rose-500/15 text-rose-400"
            icon="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
          <StatCard
            label="Total View"
            value={formatViews(totalViews)}
            accent="bg-emerald-500/15 text-emerald-400"
            icon="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
          <StatCard
            label="Kategori"
            value={String(byCategory.length)}
            accent="bg-blue-500/15 text-blue-400"
            icon="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
          />
        </div>

        {/* Jelajah aplikasi - kompak */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Jelajah aplikasi</h2>
              <p className="text-xs text-zinc-400">5 langkah pakai DramaKu</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {APP_FEATURES.map((f, i) => (
              <div
                key={f.n}
                className={`relative overflow-hidden rounded-xl border border-zinc-800 bg-gradient-to-b ${f.color} p-3`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${f.accent} text-[11px] font-bold text-black`}
                  >
                    {f.n}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                    {f.label}
                  </span>
                </div>
                <h3 className="mt-2 text-xs font-semibold text-white">
                  {f.title}
                </h3>
                <div className="mt-2 aspect-[9/14] w-full overflow-hidden rounded-md border border-zinc-700/60 bg-zinc-950/70">
                  <PhonePreview index={i + 1} drama={featured[i] ?? featured[0]} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Drama Populer */}
        {featured.length > 0 && (
          <section>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Drama Populer</h2>
                <p className="text-xs text-zinc-400">Pilihan terbaik untuk kamu</p>
              </div>
              <Link
                href="/discover"
                className="text-xs text-amber-400 hover:underline"
              >
                Lihat semua →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {featured.map((drama) => (
                <Link
                  key={drama.id}
                  href={`/drama/${drama.id}`}
                  className="block transition-transform hover:-translate-y-1"
                >
                  <Poster drama={drama} />
                  <h3 className="mt-2 line-clamp-2 text-xs font-semibold text-white">
                    {drama.title}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 backdrop-blur">
      <div
        className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={icon} />
        </svg>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function PhonePreview({ index, drama }: { index: number; drama?: Drama }) {
  return (
    <div className="relative h-full w-full p-1.5">
      <div className="mb-1 flex items-center justify-between text-[7px] text-zinc-400">
        <span>9:41</span>
        <span>● ●</span>
      </div>
      {index === 1 && (
        <div className="grid grid-cols-2 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`relative aspect-[3/4] rounded ${drama?.gradient ? `bg-gradient-to-br ${drama.gradient}` : "bg-zinc-800"}`}
            >
              {drama?.posterImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={drama.posterImage}
                  alt=""
                  className="absolute inset-0 h-full w-full rounded object-cover"
                />
              )}
            </div>
          ))}
        </div>
      )}
      {index === 2 && (
        <div className="space-y-1">
          <div className="flex gap-0.5">
            {["Rom", "Tim", "Fan"].map((c) => (
              <span
                key={c}
                className="rounded bg-amber-400/30 px-1 py-px text-[6px] font-bold text-amber-200"
              >
                {c}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded bg-gradient-to-br from-rose-700 to-purple-900"
              />
            ))}
          </div>
        </div>
      )}
      {index === 3 && (
        <div className="flex h-full flex-col">
          <div
            className={`relative flex-1 rounded ${drama?.gradient ? `bg-gradient-to-br ${drama.gradient}` : "bg-zinc-800"}`}
          >
            {drama?.posterImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={drama.posterImage}
                alt=""
                className="absolute inset-0 h-full w-full rounded object-cover opacity-90"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90">
                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-black">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
      {index === 4 && (
        <div className="space-y-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-1 rounded bg-zinc-800/60 p-0.5"
            >
              <div className="h-5 w-5 rounded bg-gradient-to-br from-emerald-500 to-teal-700" />
              <div className="flex-1">
                <div className="h-0.5 w-3/4 rounded bg-zinc-600" />
                <div className="mt-0.5 h-0.5 w-1/2 rounded bg-zinc-700" />
              </div>
            </div>
          ))}
        </div>
      )}
      {index === 5 && (
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-rose-500" />
          <div className="h-1 w-2/3 rounded bg-zinc-700" />
          <div className="h-0.5 w-1/2 rounded bg-zinc-800" />
          <div className="mt-1 w-full space-y-0.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-1 w-full rounded bg-zinc-800" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
