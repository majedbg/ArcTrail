/**
 * @layer atom
 * @description Animated loading spinner using CSS keyframes.
 * @consumes size, className
 * @emits none
 * @diffAware false
 * @tiltEnabled false
 */

export type SpinnerProps = {
  /** Size in pixels (default: 16). */
  size?: number;
  className?: string;
};

export function Spinner({ size = 16, className = "" }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className={`animate-spin ${className}`}
      aria-label="Loading"
      role="status"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
