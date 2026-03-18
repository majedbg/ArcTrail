/**
 * @layer atom
 * @description Removable tag pill with label and optional close button.
 * @consumes label, onRemove (optional)
 * @emits onRemove
 * @diffAware false
 * @tiltEnabled false
 */

export type TagProps = {
  label: string;
  /** When provided, renders a close button that calls this handler. */
  onRemove?: () => void;
  className?: string;
};

export function Tag({ label, onRemove, className = "" }: TagProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 ${className}`}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          aria-label={`Remove ${label}`}
        >
          <svg
            width={8}
            height={8}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
