"use client";

import Link from "next/link";
import type { Drama } from "@/lib/types";
import { teaserSrc } from "@/lib/hero-teaser";
import { genreTextClass } from "@/lib/genre-accent";
import Poster from "./Poster";

export default function DramaCard({ drama }: { drama: Drama }) {
  // Lewat /api/teaser (same-origin), bukan alamat tunnel langsung. Alasannya
  // sama dengan hero (lib/hero-teaser.ts:50): alamat tunnel dibaca di SISI
  // SERVER, jadi cuplikan ikut alamat terbaru tanpa perlu redeploy — komponen
  // client tak bisa melakukan itu karena env NEXT_PUBLIC_* dibakar saat build.
  const previewSrc = teaserSrc(drama.id);

  return (
    <Link
      href={`/drama/${drama.id}`}
      className="group block transition-transform hover:-translate-y-1"
    >
      <Poster
        drama={drama}
        previewSrc={previewSrc}
        className="shadow-sm transition-shadow group-hover:shadow-lg group-hover:shadow-amber-500/20"
      />
      <div className="mt-2 px-0.5">
        <h3 className="line-clamp-2 text-sm font-semibold text-white">
          {drama.title}
        </h3>
        <p className={`mt-1 text-xs ${genreTextClass(drama.category)}`}>
          {drama.category}
          {drama.year ? ` · ${drama.year}` : ""}
          {` · ${drama.episodes} eps`}
          {drama.imdbRating ? ` · ★ ${drama.imdbRating}` : ""}
        </p>
      </div>
    </Link>
  );
}
