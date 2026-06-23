"use client";

import Comments from "../Comments";

// Drawer komentar — buka di dalam feed tanpa meninggalkan video.
// Dipecah dari FeedPlayer (rapikan kode tingkat sedang) supaya berkas pemutar
// lebih ringkas. Pola `open`/`onClose` mengikuti RewardedAdModal & EpisodeSheet.
export default function CommentsDrawer({
  open,
  dramaId,
  onClose,
}: {
  open: boolean;
  dramaId: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <button
        className="absolute inset-0 bg-black/50"
        aria-label="Tutup komentar"
        onClick={onClose}
      />
      <div className="relative max-h-[78vh] overflow-y-auto rounded-t-2xl border-t border-zinc-800 bg-zinc-950 px-4 pb-8 pt-3 text-left">
        <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-zinc-950/95 px-4 pb-2 backdrop-blur">
          <span className="mx-auto h-1 w-10 rounded-full bg-zinc-700" />
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="absolute right-3 top-0 rounded-full p-1 text-zinc-400 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <Comments dramaId={dramaId} />
      </div>
    </div>
  );
}
