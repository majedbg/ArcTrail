/**
 * @layer atom
 * @description Generic colored pill badge for labels, counts, and status indicators.
 * @consumes label: string, color (optional CSS variable or token class)
 * @emits none
 * @diffAware false
 * @tiltEnabled false
 */

export type BadgeProps = {
  /** Text content of the badge. */
  label: string;
  /** Optional Tailwind color class for background (e.g. "bg-kind-concept"). */
  bgClass?: string;
  /** Optional Tailwind color class for text (e.g. "text-white"). */
  textClass?: string;
  /** Optional extra class names. */
  className?: string;
};

export function Badge({
  label,
  bgClass = "bg-zinc-700",
  textClass = "text-zinc-100",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${bgClass} ${textClass} ${className}`}
    >
      {label}
    </span>
  );
}
