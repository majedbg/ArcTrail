/**
 * @layer molecule
 * @description Horizontal scrollable row of MediaThumb atoms.
 * @consumes items: MediaItem[]
 * @emits onSelect (optional)
 * @diffAware false
 * @tiltEnabled false
 */

import type { MediaItem } from "../../lib/types.js";
import { MediaThumb } from "../atoms/MediaThumb.js";

export type MediaCarouselProps = {
  items: MediaItem[];
  /** Called when a thumbnail is clicked. */
  onSelect?: (index: number) => void;
  className?: string;
};

export function MediaCarousel({
  items,
  onSelect,
  className = "",
}: MediaCarouselProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={`flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 ${className}`}
      role="list"
    >
      {items.map((item, i) => (
        <button
          key={`${item.src}-${i}`}
          type="button"
          className="flex-shrink-0 rounded transition-opacity hover:opacity-80"
          onClick={() => onSelect?.(i)}
          role="listitem"
        >
          <MediaThumb src={item.src} alt={item.alt} type={item.type} />
        </button>
      ))}
    </div>
  );
}
