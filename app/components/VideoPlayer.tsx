"use client";

import { useEffect, useRef, useState } from "react";
import { subtitleLabel } from "@/lib/types";
import { subtitleUrl } from "@/lib/subtitles";

const FALLBACK = "/sample.mp4";

export default function VideoPlayer({
  src,
  poster,
  dramaId,
  ep,
  subtitles = [],
}: {
  src: string;
  poster?: string;
  // Diisi kalau mau menampilkan subtitle (CC native browser).
  dramaId?: string;
  ep?: number;
  subtitles?: string[];
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setUsingFallback(false);
    setCurrentSrc(src);
  }, [src]);

  const onError = () => {
    if (!usingFallback) {
      setUsingFallback(true);
      setCurrentSrc(FALLBACK);
    }
  };

  const showSubs = !usingFallback && dramaId && ep && subtitles.length > 0;

  return (
    <div className="relative h-full w-full">
      <video
        ref={ref}
        key={currentSrc}
        src={currentSrc}
        poster={poster}
        controls
        autoPlay
        playsInline
        onError={onError}
        className="h-full w-full object-contain"
      >
        {showSubs &&
          subtitles.map((code) => (
            <track
              key={code}
              kind="subtitles"
              srcLang={code}
              label={subtitleLabel(code)}
              src={subtitleUrl(dramaId, ep, code)}
            />
          ))}
      </video>
      {usingFallback && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-black/80 px-2 py-1 text-[11px] text-amber-300">
          Video sample — file asli belum diupload
        </div>
      )}
    </div>
  );
}
