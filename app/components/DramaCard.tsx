import Link from "next/link";
import type { Drama } from "@/lib/types";
import Poster from "./Poster";

export default function DramaCard({ drama }: { drama: Drama }) {
  return (
    <Link href={`/drama/${drama.id}`} className="block">
      <Poster drama={drama} />
      <div className="mt-2 px-0.5">
        <h3 className="line-clamp-2 text-sm font-semibold text-white">{drama.title}</h3>
        <p className="mt-1 text-xs text-zinc-400">
          {drama.category} | {drama.episodes} eps.
        </p>
      </div>
    </Link>
  );
}
