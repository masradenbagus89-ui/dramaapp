import type { Drama } from "@/lib/types";

type Props = {
  drama: Drama;
  className?: string;
  showBadge?: boolean;
};

export default function Poster({ drama, className = "", showBadge = true }: Props) {
  return (
    <div
      className={`relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-gradient-to-br ${drama.gradient} ${className}`}
    >
      {drama.posterImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={drama.posterImage}
          alt={drama.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {!drama.posterImage && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
      )}
      {!drama.posterImage && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10">
          <div className="title-gold line-clamp-4 text-sm leading-snug">
            {drama.title}
          </div>
        </div>
      )}
      {showBadge && drama.exclusive && (
        <div className="absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
          Exclusive
        </div>
      )}
      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">
        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-amber-400">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        {drama.views}
      </div>
    </div>
  );
}
