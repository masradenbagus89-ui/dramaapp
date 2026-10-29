"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STARS = [1, 2, 3, 4, 5] as const;

type Summary = { average: number; count: number; mine: number | null };

const EMPTY: Summary = { average: 0, count: 0, mine: null };

/**
 * Rating penonton untuk satu drama. Menilai ulang MENGUBAH nilai lama, bukan
 * menambah suara.
 *
 * Sejak 2026-10-29 bintangnya bisa diklik TANPA akun (owner: "viewer masih
 * bisa kasih rating komen"). Identitas penilai sepenuhnya urusan server —
 * cookie `httpOnly` yang memang tak terbaca dari sini — jadi komponen ini tidak
 * lagi tahu, dan tidak perlu tahu, siapa yang sedang menilai.
 *
 * ⚠️ Akibatnya "satu suara" kini berarti satu BROWSER, bukan satu orang: hapus
 * cookie atau buka jendela samaran = bisa menilai lagi. Karena itu angka ini
 * tetap DILARANG jadi sumber structured data Google. Rinciannya di lib/tamu.ts.
 */
export default function RatingStars({
  dramaId,
  terang = false,
}: {
  dramaId: string;
  /**
   * Gambar untuk LATAR TERANG (halaman film sejak owner 2026-10-29).
   * Default `false` — WAJIB, sebab komponen ini juga dipakai di layar pemutar
   * yang harus tetap gelap (FeedPlayer, CommentsDrawer).
   */
  terang?: boolean;
}) {
  const [summary, setSummary] = useState<Summary>(EMPTY);
  const [hover, setHover] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `/api/ratings?dramaId=${encodeURIComponent(dramaId)}`,
        );
        if (!res.ok) return;
        setSummary((await res.json()) as Summary);
      } catch {
        setSummary(EMPTY);
      }
    };
    load();

    // Tetap mendengarkan pergantian akun: kalau admin masuk/keluar, suara
    // miliknya berbeda dari suara tamu di browser yang sama, jadi ringkasannya
    // harus diambil ulang.
    window.addEventListener("dramaku:auth-changed", load);
    return () => window.removeEventListener("dramaku:auth-changed", load);
  }, [dramaId]);

  const submit = async (stars: number) => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // email tidak dikirim: identitas dari cookie sesi di server.
        body: JSON.stringify({ dramaId, stars }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Gagal menyimpan rating.");
        return;
      }
      setSummary({ average: data.average, count: data.count, mine: data.mine });
    } catch {
      setError("Gagal menyimpan rating. Coba lagi.");
    } finally {
      setPending(false);
    }
  };

  // Bintang yang disorot: pratinjau hover menang, lalu suara sendiri, lalu rata-rata.
  const highlight = hover || summary.mine || Math.round(summary.average);

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        terang ? "border-zinc-200 bg-zinc-50" : "border-zinc-800 bg-zinc-900/60",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHover(0)}
        >
          {STARS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={pending}
              onClick={() => submit(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`Beri ${n} bintang`}
              className={cn(
                "cursor-pointer rounded p-0.5 transition-transform hover:scale-110",
                pending && "opacity-60",
              )}
            >
              <Star
                className={cn(
                  "size-6",
                  n <= highlight
                    ? "fill-amber-400 text-amber-400"
                    : terang
                      ? "text-zinc-300"
                      : "text-zinc-600",
                )}
              />
            </button>
          ))}
        </div>

        {summary.count > 0 ? (
          <span className={cn("text-sm", terang ? "text-zinc-700" : "text-zinc-300")}>
            <strong className={terang ? "text-zinc-900" : "text-white"}>{summary.average.toFixed(1)}</strong>
            <span className="text-zinc-500"> / 5 · {summary.count} penilai</span>
          </span>
        ) : (
          <span className="text-sm text-zinc-500">Belum ada penilaian</span>
        )}
      </div>

      {/* Tak ada lagi cabang "belum masuk": siapa pun boleh menilai. */}
      {summary.mine ? (
        <p className={cn("mt-2 text-xs", terang ? "text-zinc-600" : "text-zinc-400")}>
          Kamu memberi {summary.mine} bintang — klik bintang lain untuk mengubah.
        </p>
      ) : (
        <p className={cn("mt-2 text-xs", terang ? "text-zinc-600" : "text-zinc-400")}>Klik bintang untuk menilai.</p>
      )}

      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
