/**
 * @layer atom
 * @description 64×40px image/video thumbnail with object-cover and fallback.
 * @consumes src, alt, type (optional)
 * @emits none
 * @diffAware false
 * @tiltEnabled false
 */

export type MediaThumbProps = {
  src: string;
  alt: string;
  /** Media type — defaults to "img". */
  type?: "img" | "video";
  className?: string;
};

export function MediaThumb({
  src,
  alt,
  type = "img",
  className = "",
}: MediaThumbProps) {
  const baseClass =
    "h-72 w-auto flex-shrink-0 rounded object-cover bg-zinc-800";

  if (type === "video") {
    return (
      <div
        className={`${baseClass} relative flex items-center justify-center ${className}`}
      >
        <video
          src={src}
          className="h-full w-full rounded object-cover"
          muted
          aria-label={alt}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-white/80"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${baseClass} ${className}`}
      loading="lazy"
    />
  );
}
