/**
 * @layer atom
 * @description Pulsing dot indicator for sync status (dot variant only).
 *   idle → hidden, pending → amber pulse, syncing → blue pulse, error → red, offline → gray.
 * @consumes status: SyncStatus
 * @emits none
 * @diffAware false
 * @tiltEnabled false
 */

import type { SyncStatus } from "../../lib/store/syncSlice.js";

export type SyncIndicatorProps = {
  status: SyncStatus;
  className?: string;
};

const STATUS_CLASSES: Record<SyncStatus, string> = {
  idle: "hidden",
  pending: "bg-diff-added animate-pulse",
  syncing: "bg-relation-iterates-on animate-pulse",
  error: "bg-diff-removed",
  offline: "bg-zinc-500",
};

const STATUS_LABELS: Record<SyncStatus, string> = {
  idle: "Synced",
  pending: "Unsaved changes",
  syncing: "Saving",
  error: "Sync failed",
  offline: "Offline",
};

export function SyncIndicator({
  status,
  className = "",
}: SyncIndicatorProps) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_CLASSES[status]} ${className}`}
      role="status"
      aria-label={STATUS_LABELS[status]}
      title={STATUS_LABELS[status]}
    />
  );
}
