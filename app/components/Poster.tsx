import type { Drama } from "@/lib/types";
import { PAYWALL_ENABLED } from "@/lib/coins";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

type Props = {
  drama: Drama;
  className?: string;
  showBadge?: boolean;
};

export default function Poster({ drama, className, showBadge = true }: Props) {
  return (
    <div
      className={cn(
        "relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-gradient-to-br",
        drama.gradient,
        className,
      )}
    >
      {drama.posterImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={drama.posterImage}
          alt={drama.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10">
            <div className="title-gold line-clamp-4 text-sm leading-snug">
              {drama.title}
            </div>
          </div>
        </>
      )}

      {showBadge && PAYWALL_ENABLED && drama.premium && (
        <Badge className="absolute right-2 top-2 gap-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow">
          🪙 Premium
        </Badge>
      )}
      {showBadge && !drama.premium && drama.exclusive && (
        <Badge
          variant="secondary"
          className="absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
        >
          Exclusive
        </Badge>
      )}

      <Badge
        variant="secondary"
        className="absolute left-2 top-2 gap-1 bg-black/60 px-2 py-0.5 text-[11px] font-normal text-white"
      >
        <Star className="size-3 fill-amber-400 text-amber-400" />
        {drama.views}
      </Badge>
    </div>
  );
}
