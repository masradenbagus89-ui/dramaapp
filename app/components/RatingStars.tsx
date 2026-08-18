"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readUser, type User } from "@/lib/auth";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STARS = [1, 2, 3, 4, 5] as const;

type Summary = { average: number; count: number; mine: number | null };

const EMPTY: Summary = { average: 0, count: 0, mine: null };

/**
 * Rating penonton untuk satu drama. Satu email = satu suara; menilai ulang
 * MENGUBAH nilai lama, bukan menambah suara.
 *
 * Catatan: angka ini belum tahan pemalsuan (identitas viewer masih di-assert
 * klien — lihat BATAS JUJUR di lib/store.ts), jadi sengaja TIDAK dipakai
 * sebagai sumber structured data Google.
 */
export default function RatingStars({ dramaId }: { dramaId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary>(EMPTY);
  const [hover, setHover] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const current = readUser();
    setUser(current);

    const load = async (u: User | null) => {
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
    load(current);

    const onAuthChanged = () => {
      const next = readUser();
      setUser(next);
      load(next);
    };
    window.addEventListener("dramaku:auth-changed", onAuthChanged);
    return () => window.removeEventListener("dramaku:auth-changed", onAuthChanged);
  }, [dramaId]);

  const submit = async (stars: number) => {
    if (!user || pending) return;
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHover(0)}
        >
          {STARS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={!user || pending}
              onClick={() => submit(n)}
              onMouseEnter={() => user && setHover(n)}
              aria-label={`Beri ${n} bintang`}
              className={cn(
                "rounded p-0.5 transition-transform",
                user ? "cursor-pointer hover:scale-110" : "cursor-default",
                pending && "opacity-60",
              )}
            >
              <Star
                className={cn(
                  "size-6",
                  n <= highlight
                    ? "fill-amber-400 text-amber-400"
                    : "text-zinc-600",
                )}
              />
            </button>
          ))}
        </div>

        {summary.count > 0 ? (
          <span className="text-sm text-zinc-300">
            <strong className="text-white">{summary.average.toFixed(1)}</strong>
            <span className="text-zinc-500"> / 5 · {summary.count} penilai</span>
          </span>
        ) : (
          <span className="text-sm text-zinc-500">Belum ada penilaian</span>
        )}
      </div>

      {/* Pre-mortem rencana: jangan diam saat belum masuk — beri ajakan jelas. */}
      {!user ? (
        <p className="mt-2 text-xs text-zinc-400">
          <Link href="/login" className="font-semibold text-amber-400 hover:underline">
            Masuk
          </Link>{" "}
          untuk memberi rating drama ini.
        </p>
      ) : summary.mine ? (
        <p className="mt-2 text-xs text-zinc-400">
          Kamu memberi {summary.mine} bintang — klik bintang lain untuk mengubah.
        </p>
      ) : (
        <p className="mt-2 text-xs text-zinc-400">Klik bintang untuk menilai.</p>
      )}

      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
