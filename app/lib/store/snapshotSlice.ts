/**
 * Snapshot slice — tracks loaded snapshots and which one is selected or
 * being compared against.
 *
 * Snapshots are loaded by the prototype route loader and set here via
 * `setSnapshots`. The selected/compare IDs drive the SnapshotCard diff
 * highlighting in PrototypeView.
 */

import type { StateCreator } from "zustand";
import type { Snapshot } from "../types.js";

// ---------------------------------------------------------------------------
// Slice type
// ---------------------------------------------------------------------------

export type SnapshotSlice = {
  snapshots: Snapshot[];
  /** The snapshot currently displayed in detail / focused. */
  selectedSnapshotId: string | null;
  /** The snapshot used as the "before" side of a diff comparison. */
  compareSnapshotId: string | null;

  setSnapshots(snapshots: Snapshot[]): void;
  selectSnapshot(id: string | null): void;
  setCompareSnapshot(id: string | null): void;
};

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

export const createSnapshotSlice: StateCreator<
  SnapshotSlice,
  [],
  [],
  SnapshotSlice
> = (set) => ({
  snapshots: [],
  selectedSnapshotId: null,
  compareSnapshotId: null,

  setSnapshots: (snapshots) => set({ snapshots }),

  selectSnapshot: (id) => set({ selectedSnapshotId: id }),

  setCompareSnapshot: (id) => set({ compareSnapshotId: id }),
});
