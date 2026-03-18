/**
 * @layer molecule
 * @description Displays snapshot versionString + optional displayLabel.
 * @consumes versionString: string, displayLabel: string | null
 * @emits none
 * @diffAware false
 * @tiltEnabled false
 */

import { VersionBadge } from "../atoms/VersionBadge.js";

export type SnapshotVersionLabelProps = {
  versionString: string;
  displayLabel?: string | null;
  className?: string;
};

export function SnapshotVersionLabel({
  versionString,
  displayLabel,
  className = "",
}: SnapshotVersionLabelProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <VersionBadge versionString={versionString} />
      {displayLabel && (
        <span className="text-xs text-zinc-400">{displayLabel}</span>
      )}
    </div>
  );
}
