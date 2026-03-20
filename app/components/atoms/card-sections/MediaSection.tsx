/**
 * @layer atom
 * @description Optional media thumbnail row. Shows the first media item
 *   alongside an optional summary. Used by Rich cards; can be opted into
 *   by Medium cards by simply including this section.
 */

import { MediaThumb } from "../MediaThumb.js";
import type { MediaItem } from "~/lib/types.js";

export type MediaSectionProps = {
  media: MediaItem[] | null;
  summary?: string | null;
};

export function MediaSection({ media, summary }: MediaSectionProps) {
  const firstMedia = media?.[0] ?? null;
  if (!firstMedia && !summary) return null;

  return (
    <div className="media-section flex flex-col gap-2">
      {firstMedia && (
        <MediaThumb
          src={firstMedia.src}
          alt={firstMedia.alt}
          type={firstMedia.type}
        />
      )}
      {summary && (
        <p className="flex-1 text-xs text-zinc-400 line-clamp-2">{summary}</p>
      )}
    </div>
  );
}
