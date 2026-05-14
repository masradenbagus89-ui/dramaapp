"use client";

import { useEffect, useRef, useState } from "react";

const FALLBACK = "/sample.mp4";

export default function VideoPlayer({
  src,
  poster,
}: {
  src: string;
  poster?: string;
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
      />
      {usingFallback && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-black/80 px-2 py-1 text-[11px] text-amber-300">
          Video sample — file asli belum diupload
        </div>
      )}
    </div>
  );
}
