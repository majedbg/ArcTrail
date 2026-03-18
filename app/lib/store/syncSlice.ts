/**
 * Sync slice — manages the pending mutation queue and overall sync status.
 *
 * The queue is the client-side buffer for optimistic mutations that haven't
 * yet been confirmed by the server. On reconnect or app resume, the queue
 * is replayed via syncToServer() in app/lib/sync.ts.
 *
 * Status transitions:
 *   idle     — queue empty, last sync succeeded
 *   pending  — mutations queued, not yet syncing
 *   syncing  — actively POSTing to server (set by sync.ts)
 *   error    — last sync attempt failed
 *   offline  — navigator.onLine === false when sync was attempted
 */

import type { StateCreator } from "zustand";

// ---------------------------------------------------------------------------
// Types (exported — also used by sync.ts and useOptimisticMutation)
// ---------------------------------------------------------------------------

export type SyncStatus =
  | "idle"
  | "pending"
  | "syncing"
  | "error"
  | "offline";

export type PendingMutation = {
  /** UUID identifying this mutation instance. */
  id: string;
  /** Action name, e.g. "createArtifact", "updateArtifact". */
  intent: string;
  /** Arbitrary payload sent to the Remix action endpoint. */
  payload: unknown;
  /** Unix timestamp (ms) when this mutation was created. */
  createdAt: number;
  /** Number of retry attempts so far. */
  retries: number;
  /** Current lifecycle status of this mutation. */
  status: SyncStatus;
};

// ---------------------------------------------------------------------------
// Slice type
// ---------------------------------------------------------------------------

export type SyncSlice = {
  pending: PendingMutation[];
  /** Aggregate status derived from the queue state. */
  status: SyncStatus;

  enqueue(mutation: PendingMutation): void;
  dequeue(id: string): void;
  /** Marks a mutation as errored; sets aggregate status to 'error'. */
  markError(id: string): void;
  /** Re-queues all errored/offline mutations as 'pending' for retry. */
  retryAll(): void;
  /** Sets the aggregate status (called by sync.ts during active sync). */
  setStatus(status: SyncStatus): void;
};

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

export const createSyncSlice: StateCreator<
  SyncSlice,
  [],
  [],
  SyncSlice
> = (set) => ({
  pending: [],
  status: "idle",

  enqueue: (mutation) =>
    set((state) => ({
      pending: [...state.pending, mutation],
      status: "pending",
    })),

  dequeue: (id) =>
    set((state) => {
      const pending = state.pending.filter((m) => m.id !== id);
      // If queue is now empty and no errors remain, return to idle
      const hasErrors = pending.some(
        (m) => m.status === "error" || m.status === "offline"
      );
      return {
        pending,
        status: pending.length === 0 ? "idle" : hasErrors ? "error" : "pending",
      };
    }),

  markError: (id) =>
    set((state) => ({
      pending: state.pending.map((m) =>
        m.id === id ? { ...m, status: "error" as SyncStatus } : m
      ),
      status: "error",
    })),

  retryAll: () =>
    set((state) => {
      const pending = state.pending.map((m) =>
        m.status === "error" || m.status === "offline"
          ? { ...m, status: "pending" as SyncStatus, retries: m.retries + 1 }
          : m
      );
      const hasAnyPending = pending.some((m) => m.status === "pending");
      return {
        pending,
        status: hasAnyPending ? "pending" : "idle",
      };
    }),

  setStatus: (status) => set({ status }),
});
