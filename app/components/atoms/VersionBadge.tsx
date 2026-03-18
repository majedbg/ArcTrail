/**
 * @layer atom
 * @description Displays a version string with monospace styling.
 * @consumes versionString: string
 * @emits none
 * @diffAware false
 * @tiltEnabled false
 */

export type VersionBadgeProps = {
  /** Raw version string, e.g. "AI.RCA1-LO.LAP1". */
  versionString: string;
  className?: string;
};

export function VersionBadge({
  versionString,
  className = "",
}: VersionBadgeProps) {
  return (
    <code
      className={`inline-flex items-center rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-300 ${className}`}
    >
      {versionString}
    </code>
  );
}
