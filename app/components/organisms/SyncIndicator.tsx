/**
 * @layer organism
 * @description Full sync status indicator with all five states.
 *   Floating badge at bottom-left of canvas.
 *   idle → invisible, pending → pulsing dot + "Unsaved changes",
 *   syncing → spinner + "Saving...", error → red dot + "Sync failed — tap to retry",
 *   offline → cloud-slash icon + "Offline — will sync"
 * @consumes SyncStatus from Zustand syncSlice
 * @emits retryAll on error click
 * @diffAware false
 * @tiltEnabled false
 */

import { useStore } from "../../lib/store.js";
import { Spinner } from "../atoms/Spinner.js";
import type { SyncStatus } from "../../lib/store/syncSlice.js";

const STATUS_CONFIG: Record<
  SyncStatus,
  { visible: boolean; label: string; dotClass: string }
> = {
  idle: { visible: false, label: "", dotClass: "" },
  pending: {
    visible: true,
    label: "Unsaved changes",
    dotClass: "bg-diff-added animate-pulse",
  },
  syncing: { visible: true, label: "Saving…", dotClass: "" },
  error: {
    visible: true,
    label: "Sync failed — tap to retry",
    dotClass: "bg-diff-removed",
  },
  offline: {
    visible: true,
    label: "Offline — will sync",
    dotClass: "bg-zinc-500",
  },
};

export function SyncIndicatorOrganism() {
  const status = useStore((s) => s.status);
  const retryAll = useStore((s) => s.retryAll);

  const config = STATUS_CONFIG[status];
  if (!config.visible) return null;

  const isError = status === "error";
  const isSyncing = status === "syncing";
  const isOffline = status === "offline";

  return (
    <button
      type="button"
      onClick={isError ? retryAll : undefined}
      className={`absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-full bg-zinc-900/80 px-3 py-1.5 text-xs backdrop-blur-sm ${
        isError ? "cursor-pointer hover:bg-zinc-800" : "cursor-default"
      }`}
      aria-label={config.label}
    >
      {isSyncing ? (
        <Spinner size={12} className="text-relation-iterates-on" />
      ) : isOffline ? (
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="text-zinc-400"
          aria-hidden="true"
        >
          <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
        </svg>
      ) : (
        <span
          className={`h-2.5 w-2.5 rounded-full ${config.dotClass}`}
          aria-hidden="true"
        />
      )}
      <span className="text-zinc-300">{config.label}</span>
    </button>
  );
}
