import type { MediaItem } from "~/lib/types";

interface MediaThumbProps {
  media: MediaItem;
  className?: string;
}

export function MediaThumb({ media, className = "" }: MediaThumbProps) {
  if (media.type === "img") {
    return (
      <img
        src={media.src}
        alt={media.alt || ""}
        className={`rounded object-cover ${className}`}
        loading="lazy"
      />
    );
  }

  if (media.type === "video") {
    return (
      <video
        src={media.src}
        className={`rounded object-cover ${className}`}
        controls
        muted
        playsInline
      />
    );
  }

  return null;
}

